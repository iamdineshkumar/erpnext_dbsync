import frappe
from erpnext_dbsync.hooks import MIGRATELOG_DOCTYPE_NAME


def create_migrate_logger(file_name: str):
    log = frappe.new_doc(MIGRATELOG_DOCTYPE_NAME)
    log.file_name = file_name
    log.migrated_at = frappe.utils.now_datetime()
    log.is_migrated = 1
    log.save(ignore_permissions=True)
    
    return log