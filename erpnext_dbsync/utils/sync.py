import os
from pathlib import Path
import frappe
from datetime import datetime
from frappe import _
from frappe.utils import cint
from frappe.modules import get_module_path, scrub
from git import Repo
from erpnext_dbsync.setup.custom_frappe.api import custom_export_customizations
from frappe.core.doctype.data_import.data_import import export_json
from ..utils.firebase import FireBaseConnect

class GitSync:
    def __init__(self):
        settings = frappe.get_cached_doc("Data Migration Settings")
        self.repo_url = settings.github_repository_url
        self.branch_name = settings.branch
        self.username = settings.user_name
        self.token = settings.get_password("password")

    @classmethod
    def sync(cls, files, commit_message=None, branch=None, app_name="erpnext_dbsync"):
        repo_root = Path(frappe.get_app_path(app_name)).parent
        
        try:
            repo = Repo(repo_root)
            instance = cls()
            
            if not branch:
                branch = instance.branch_name

            relative_files = []
            for f in files:
                try:
                    relative_files.append(str(Path(f).relative_to(repo_root)))
                except ValueError:
                    relative_files.append(f)

            repo.index.add(relative_files)
            repo.index.commit(commit_message or "Sync changes from ERPNext DBSync")
            
            if not instance.username or not instance.token:
                frappe.throw(_("Missing Git credentials in Data Migration Settings."))

            auth_url = instance.repo_url.replace("https://", f"https://{instance.username}:{instance.token}@")
            repo.git.push(auth_url, branch or instance.branch_name)
        
        except Exception as e:
            frappe.log_error(f"Git sync failed: {str(e)}", "Git Sync Error")
            frappe.throw(_("Git sync failed. Please check Error Logs."))

def git_sync_enabled():
    return cint(frappe.db.get_single_value("Data Migration Settings", "enable_github_version_control"))

@frappe.whitelist(methods=["POST"])
def _git(branch=None, commit_msg=None, on_queue=False, Files=None):
    try:
        if not git_sync_enabled():
            frappe.throw(_("Git sync is not enabled in Data Migration Settings."))

        if Files:
            modified_files = Files
        else:
            modified_files_path = Path(frappe.get_app_path("erpnext_dbsync")) / "Files"
            if modified_files_path.exists():
                modified_files = [str(f) for f in modified_files_path.iterdir() if f.is_file()]
            else:
                modified_files = []

        if not modified_files:
            return
        
        if cint(on_queue):
            frappe.enqueue(
                method=GitSync.sync,
                queue="long",
                timeout=600,
                is_async=True,
                files=modified_files,
                commit_message=commit_msg,
                branch=branch
            )
        else:
            GitSync.sync(modified_files, commit_message=commit_msg, branch=branch)
            
    except Exception as e:
        frappe.log_error(f"Error occurred while syncing git: {str(e)}", "Git Sync Error")
        frappe.throw(_("An error occurred while syncing git. Please check Error Logs."))

@frappe.whitelist(methods=["POST"])
def generate_files_and_sync(doc):
    data_migration_doc = frappe.parse_json(doc)
    
    app = "erpnext_dbsync"
    branch = data_migration_doc.get("branch", None)
    on_queue = data_migration_doc.get("on_queue", 0)
    doctype_name = data_migration_doc.get("doc")
    commit_msg = data_migration_doc.get("commit_msg", "Sync changes from ERPNext DBSync")
    files_paths = []
    data_migration_instance = frappe.get_doc("Data Migration", doctype_name)

    if cint(frappe.db.get_single_value("Data Migration Settings", "enable_new_doctype_migration")):
        
        if data_migration_instance.new_doctype_list:     
            new_doctypes = get_new_doctype_modules(doctype_name)
            for doctype in new_doctypes:
                files_paths.extend(get_doctype_source_paths(doctype))
            
            if files_paths:
                _git(branch=branch, commit_msg=commit_msg, on_queue=on_queue, Files=files_paths)
            
    
    if cint(frappe.db.get_single_value("Data Migration Settings", "enable_doctype_field_migration")):
        
        if not cint(frappe.db.get_single_value("Data Migration Settings", "enable_firebase_version_control")):
            frappe.throw(_("Please enable firebase version control to use doctype field migration."))
        
        if data_migration_instance.field_migartion_doctype:
            doctype_list = get_field_doctype_modules(doctype_name)
            
            for doc_data in doctype_list:
                custom_export_customizations(
                    module="Erpnext Dbsync",
                    doctype=doc_data.get('module'),
                    comment=doc_data.get('comments', ""),
                    sync_on_migrate=True,
                    with_permissions=False
                )
    
    if cint(frappe.db.get_single_value("Data Migration Settings", "enable_doctype_data_migration")):
        if  data_migration_instance.doctype_data_migration:
            frappe.enqueue(
                method="erpnext_dbsync.utils.sync.execute_doctype_data_migration",
                queue="long",
                timeout=600,
                is_async=True,
                doctype_name=doctype_name,
                app=app
            )
        # execute_doctype_data_migration(doctype_name, app)
        



def execute_doctype_data_migration(doctype_name, app):

    if not cint(frappe.db.get_single_value("Data Migration Settings", "enable_firebase_version_control")):
        frappe.throw(_("Please enable firebase version control to use doctype field migration."))

    data_migration_instance = frappe.get_doc("Data Migration", doctype_name)
    raw_fixtures = frappe.parse_json(data_migration_instance.doctype_data_migration)
   
    fixtures_list = raw_fixtures if isinstance(raw_fixtures, list) else [raw_fixtures]
    
    fixtures_dir = frappe.get_app_path(app, "fixtures")
    if not os.path.exists(fixtures_dir):
        os.mkdir(fixtures_dir)

    for item in fixtures_list:
        filters = None
        or_filters = None
        fixture_dt = None
        
        if isinstance(item, dict):
            filters = item.get("filters")
            or_filters = item.get("or_filters")
            fixture_dt = item.get("doctype") or item.get("dt")
        else:
            fixture_dt = item

        if not fixture_dt:
            continue

        file_name = f"{frappe.scrub(fixture_dt)}.json"
        local_file_path = os.path.join(fixtures_dir, file_name)
        # path = os.path.join(folder_path, scrub(doctype) + ".json")
        
        
        export_json(
            fixture_dt,
            local_file_path,
            filters=filters,
            or_filters=or_filters,
            order_by="idx asc, creation asc",
        )
        timestamp = datetime.now().strftime("%Y_%m_%d_%H%M%S")
        firebase_filename = f"{timestamp}_{scrub(local_file_path)}.json"
        
        scrubbed_filename = frappe.scrub(file_name.replace(".json", "")) + ".json"
        firebase_filename = f"{timestamp}_{scrubbed_filename}"

        try:
            FireBaseConnect.upload_file(
                local_file_path=local_file_path,
                doctype=fixture_dt,
                comment=f"Data migration for {fixture_dt}", 
                remote_blob_name=firebase_filename,
                file_root="DataMigration",
                migration_type="Data Migration"
            )
        except Exception as firebase_err:
            frappe.msgprint(
                _("{0} exported locally, but Firebase sync failed: {1}")
                .format(file_name, str(firebase_err))
            )

    frappe.msgprint(_("Data migration export execution finished."))
    

def get_new_doctype_modules(parent_doctype):
    return frappe.get_all(
        "Module Multiselect",
        filters={"parent": parent_doctype},
        pluck="module"
    )

def get_field_doctype_modules(parent_doctype):
    return frappe.get_all(
        "Module Table",
        filters={"parent": parent_doctype},
        fields=["module", "comments"]
    )


def get_doctype_source_paths(doctype_name: str) -> list:
    if not frappe.db or not getattr(frappe.db, "_conn", None) or not frappe.db._conn:
        frappe.connect()

    if not frappe.db.exists("DocType", doctype_name):
        return []
        
    doc = frappe.get_cached_doc("DocType", doctype_name)
    if doc.custom:
        return []
        
    try:
        module_path = get_module_path(doc.module)
    except Exception:
        return []
        
    doctype_folder = os.path.join(module_path, "doctype", scrub(doc.name))
    
    file_paths = []
    if os.path.exists(doctype_folder):
        for root, _, files in os.walk(doctype_folder):
            file_paths.extend([
                os.path.abspath(os.path.join(root, f))
                for f in files
                if not f.endswith(('.pyc', '.pyo')) and '__pycache__' not in root
            ])
                
    return file_paths