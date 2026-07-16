from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore, storage
from werkzeug.utils import cached_property
import frappe


class FireBaseConnect:
    def __init__(self):
        self._db = None

    @cached_property
    def config(self):
        """Cache all Frappe DB settings in a single pass to minimize database hits."""
        values = frappe.db.get_value(
            "Data Migration Settings",
            "Data Migration Settings",
            [
                "fire_base_db_name",
                "collection_name",
                "field_migration_storage_name",
                "data_migration_storage_name",
                "fire_base_storage_bucket",
            ],
            as_dict=True
        ) or {}
        return values

    def _ensure_firebase_initialized(self):
        if not firebase_admin._apps:
            bucket_name = self.config.get("fire_base_storage_bucket")
            cred_path = frappe.local.conf.get("serviceAccountKey")
            
            if not cred_path:
                frappe.throw("Firebase serviceAccountKey is missing in site config.")
                
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred, {"storageBucket": bucket_name})

    def get_db(self):
        if not self._db:
            self._ensure_firebase_initialized()
            self._db = firestore.client(database_id=self.config.get("fire_base_db_name"))
        return self._db

    def _get_blob_path(self, remote_blob_name, migration_type):
        storage_field = (
            "data_migration_storage_name" 
            if migration_type == "Data Migration" 
            else "field_migration_storage_name"
        )
        file_root = self.config.get(storage_field)
        return f"{file_root}/{remote_blob_name}"

    def upload_file(self, local_file_path, doctype, comment, remote_blob_name, migration_type="Field Migration"):
        self._ensure_firebase_initialized()
        full_blob_path = self._get_blob_path(remote_blob_name, migration_type)
        
        bucket = storage.bucket()
        blob = bucket.blob(full_blob_path)
        blob.upload_from_filename(local_file_path)
        
        fields = {
            "_source": full_blob_path,
            "comment": comment,
            "committed_by": frappe.session.user,
            "deploy_on": "",
            "approved_by": "",
            "deploy_status": "Draft",
            "doctype_name": doctype,
            "_importedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "ready_to_deploy": False,
            "type": migration_type
        }
        
        self.migrate_upsert_document(
            collection_name=self.config.get("collection_name"),
            doc_id=remote_blob_name,
            fields=fields,
        )

    def migrate_upsert_document(self, doc_id, fields, collection_name=None):
        collection_name = collection_name or self.config.get("collection_name")
        doc_ref = self.get_db().collection(collection_name).document(doc_id)

        doc_ref.set(fields, merge=True)
        return doc_id

    def get_all_documents(self, collection_name=None, filters=None):
        collection_name = collection_name or self.config.get("collection_name")
        query = self.get_db().collection(collection_name)
        
        if filters:
            for field, operator, value in filters:
                query = query.where(field, operator, value)
 
        return [
            {**doc.to_dict(), "id": doc.id} 
            for doc in query.stream()
        ]

    def update_document(self, doc_id, fields, collection_name=None):
        collection_name = collection_name or self.config.get("collection_name")
        self.get_db().collection(collection_name).document(doc_id).update(fields)

    def download_file(self, local_destination_path, remote_blob_name, m_type):
        try:
            self._ensure_firebase_initialized()
            full_blob_path = self._get_blob_path(remote_blob_name, m_type)
            
            bucket = storage.bucket()
            blob = bucket.blob(full_blob_path)
            blob.download_to_filename(local_destination_path)
            return True
        except Exception as e:
            frappe.log_error(message=str(e), title="Firebase File Download Error")
            return False

    def get_deploy_file(self):
        try:
            filters = [
                ("ready_to_deploy", "==", True),
                ("deploy_status", "==", "Pending"),
            ]
            
            return self.get_all_documents(
                collection_name=self.config.get("collection_name"), 
                filters=filters
            )
        except Exception as e:
            frappe.log_error(frappe.get_traceback(), "Start Migration Error")
            raise e