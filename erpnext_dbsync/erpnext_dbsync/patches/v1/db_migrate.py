import frappe
from ....setup.db import migrate

def execute():    
    try:
        frappe.db.begin()
        migrate()
        frappe.db.commit()
    except Exception:
        frappe.db.rollback()
        frappe.log_error(
            frappe.get_traceback(),
            "ERPNext DBSync Patch Failed"
        )
        raise