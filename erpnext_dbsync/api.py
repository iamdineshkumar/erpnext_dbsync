import frappe
from frappe.modules.patch_handler import run_all
from frappe.utils.background_jobs import enqueue
from erpnext_dbsync.erpnext_dbsync.patches.v1.db_migrate import execute
from .utils.firebase import FireBaseConnect

@frappe.whitelist(methods=["POST"],  allow_guest=True)
def trigger_patch_sync():
    if frappe.session.user == "Guest":
        frappe.throw("Authentication required to access GraphQL schema.", frappe.PermissionError)

    enqueue("erpnext_dbsync.api.execute_sync_migration", queue="long")
    return {"status": "success", "message": "Migration task enqueued."}

def execute_sync_migration():
    patch_to_reset = "erpnext_dbsync.erpnext_dbsync.patches.v1.db_migrate"
    
    frappe.db.delete("Patch Log", {"patch": patch_to_reset})
    frappe.db.commit()
 
    try:
        frappe.flags.in_patch = True
        execute()
        frappe.logger().info(f"Successfully re-ran patch: {patch_to_reset}")
        
        if not frappe.db.exists("Patch Log", patch_to_reset):
            frappe.get_doc({
                "doctype": "Patch Log",
                "patch": patch_to_reset
            }).insert(ignore_permissions=True)

            frappe.db.commit()

    except Exception as e:
        frappe.log_error(title="Migration Task Failed", message=frappe.get_traceback())
        raise e

@frappe.whitelist()
def get_all_documents():
    try:
        documents = FireBaseConnect().get_all_documents()
        print("Documents retrieved from Firestore:", documents)
        return documents

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Get All Documents")
        raise e

@frappe.whitelist(methods=["POST"])
def approve_document(approve_data):
    try:
        approve_data = frappe.parse_json(approve_data)
        for doc in approve_data:
            if not isinstance(doc, dict) or "doc_id" not in doc or "fields" not in doc:
                frappe.throw("Each document must be a dictionary with 'doc_id' and 'fields' keys.")
            doc_id = doc.get("doc_id")
            fields = doc.get("fields")
            
            FireBaseConnect().update_document(doc_id, fields)
            
        return {"status": "success", "message": "Document approved."}
    
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Approve Document")
        raise e

@frappe.whitelist()
def get_deploy_documents():
    try:
        documents = FireBaseConnect().get_deploy_file()
        return documents

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Get All Documents")
        raise e


import frappe
import shutil, os
from pathlib import Path
from frappe.modules import get_module_path
from frappe import _

@frappe.whitelist(methods=["POST"])
def start_migration(files):
    try:
        module = "Erpnext Dbsync"
        files_list = frappe.parse_json(files)
        
        folder_path = os.path.join(get_module_path(module), "custom")
        fixtures_dir = frappe.get_app_path("erpnext_dbsync", "fixtures")
        
        if os.path.exists(folder_path):
            shutil.rmtree(folder_path)
        os.makedirs(folder_path)
        
        if os.path.exists(fixtures_dir):
            shutil.rmtree(fixtures_dir)
        os.makedirs(fixtures_dir)
        
        for file in files_list:
            original_file_id = file.get("id")  
            migration_type = file.get("type")
  
            clean_file_name = original_file_id.split('_', 4)[-1]
            
            if migration_type == "Field Migration":
                local_file_path = os.path.join(folder_path, clean_file_name)
            else:
                local_file_path = os.path.join(fixtures_dir, clean_file_name)
            
            all_pending_docs = FireBaseConnect().download_file(
                local_destination_path=local_file_path, 
                remote_blob_name=original_file_id, 
                m_type=migration_type
            )
            
        return {"status": "done"}

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Start Migration Error")
        raise e

import subprocess
from datetime import datetime 
@frappe.whitelist(methods=["POST"])
def execute_migration(files):
    try:
        result = subprocess.run(
            ["bench", "--site", frappe.local.site, "migrate"],
            capture_output=True,
            text=True,
            check=True
        )
        
        file_list = frappe.parse_json(files)
        
        for file in file_list:
            doc_id = file.get("id") 
            fields={
                "deploy_on":datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "deploy_status":"Complete"
            } 
            FireBaseConnect.update_document(doc_id, fields)

            
        return {
            "status": "success",
            "message": "Site Migration done!",
        }
    except subprocess.CalledProcessError as e:
        return {
            "status": "fail",
            "message": f"Site Migration:\n{e.stderr}"
        }
    except Exception as e:
        return {
            "status": "fail",
            "message": f"Unexpected error: {str(e)}"
        }

