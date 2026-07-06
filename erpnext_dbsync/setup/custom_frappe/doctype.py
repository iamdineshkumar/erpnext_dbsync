import json
import frappe
from frappe.desk.reportview import delete_bulk
from erpnext_dbsync.utils.doctype_sync import capture_trash_doctype

@frappe.whitelist(methods=["POST", "DELETE"])
def delete_items():
    
    items_json = frappe.form_dict.get("items")
    if not items_json:
        frappe.throw("No items provided for deletion")

    items = sorted(json.loads(items_json), reverse=True)

    doctype = frappe.form_dict.get("doctype")
    if not doctype:
        frappe.throw("No doctype provided")
        
    doctype_data = [
        capture_trash_doctype(item, frappe.get_doc(doctype, item).as_dict())
        for item in items
    ]

    if len(items) > 10:
        frappe.enqueue(
            "frappe.desk.reportview.delete_bulk",
            doctype=doctype,
            items=items
        )
    else:
        delete_bulk(doctype, items)

    return {"status": "success", "deleted_items": items}
