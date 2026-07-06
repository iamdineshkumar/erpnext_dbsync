import firebase_admin
from firebase_admin import credentials, firestore, auth, storage
import frappe
from datetime import datetime
# from firebase_admin import 



class FireBaseConnect:
    _db = None 

    @classmethod
    def _initialize_firebase(cls):
        if not firebase_admin._apps:
            cred = credentials.Certificate(frappe.local.conf.get("serviceAccountKey"))
            firebase_admin.initialize_app(cred, {"storageBucket": frappe.local.conf.get("fire_base_storage_bucket", "elbrit-sso.firebasestorage.app")})
            # firebase_admin.initialize_app(cred)

    @classmethod
    def get_db(cls):
        if cls._db:
            return cls._db

        cls._initialize_firebase()
        cls._db = firestore.client(
            database_id=frappe.local.conf.get("fire_base_db_name", "elbrit")
        )
        return cls._db


    @classmethod
    def upload_file(cls, local_file_path, doctype, comment, remote_blob_name, file_root="Test", migration_type="Field Migration"):
        try:
            full_blob_path = f"{file_root}/{remote_blob_name}"
            cls._initialize_firebase()
            bucket = storage.bucket()
            blob = bucket.blob(full_blob_path)
            blob.upload_from_filename(local_file_path)
            
            fields = {
                "_source": full_blob_path,
                "comment": comment,
                "committed_by": frappe.session.user,
                "deploy_on": "",
                "approved_by":"",
                "deploy_status": "Draft",
                "doctype_name": doctype,
                "_importedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "ready_to_deploy": False,
                "type":migration_type
            }
            
            cls.migrate_upsert_document(
                collection_name="migrations",
                doc_id=remote_blob_name,
                fields=fields,
            )
        
        except Exception as e:
            raise e
    
    @classmethod
    def migrate_upsert_document(cls, collection_name, doc_id, fields):
        try:
            db = cls.get_db()
            doc_ref = db.collection(collection_name).document(doc_id)
            doc = doc_ref.get()

            if doc.exists:
                doc_ref.update(fields)
            else:
                doc_ref.set(fields)

            return doc_id
        
        except Exception as e:
            raise e

    
    @classmethod
    def get_all_documents(cls, collection_name="migrations", filters=None):
        try:
            db = cls.get_db()
            query = db.collection(collection_name)
            
            if filters:
                for field, operator, value in filters:
                    query = query.where(field, operator, value)
            
            docs = query.stream()

            documents = []
            for doc in docs:
                doc_data = doc.to_dict()
                doc_data['id'] = doc.id 
                documents.append(doc_data)

            return documents
        
        except Exception as e:
            raise e
    
    @classmethod
    def update_document(cls, collection_name, doc_id, fields):
        try:
            db = cls.get_db()
            doc_ref = db.collection(collection_name).document(doc_id)
            doc_ref.update(fields)
        
        except Exception as e:
            raise e
        
    @classmethod
    def download_file(cls, local_destination_path, remote_blob_name, file_root="Test"):
        try:
    
            full_blob_path = f"{file_root}/{remote_blob_name}"
            
            cls._initialize_firebase()
            bucket = storage.bucket()
            blob = bucket.blob(full_blob_path)

            blob.download_to_filename(local_destination_path)
            print(f"File downloaded successfully to {local_destination_path}")
            return True
            
        except Exception as e:
            print(f"Error downloading file: {e}")
            return False
        
    @classmethod
    def get_deploy_file(cls):
        try:
            filters = [
                ("ready_to_deploy", "==", True),
                ("deploy_status", "==", "Pending")
            ]
            
            all_pending_docs = cls.get_all_documents(collection_name="migrations", filters=filters)
            
            matching_documents = []
            for doc in all_pending_docs:
                if doc.get("approved_by") and doc.get("approved_by").strip() != "":
                    matching_documents.append(doc)
                    
            return matching_documents

        except Exception as e:
            frappe.log_error(frappe.get_traceback(), "Start Migration Error")
            raise e
    
    # @classmethod
    # def get_deploy_file(cls):
    #     pass
