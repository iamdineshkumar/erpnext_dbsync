import frappe

def execute():
    doctype_name = "Role Profile"

    if not frappe.db.exists("DocType", doctype_name):
        frappe.throw(f"{doctype_name} Doctype does not exist")

    dt = frappe.get_doc("DocType", doctype_name)

    dt.is_tree = 1
    dt.parent_field = "parent_role_profile" 
    dt.show_name_in_global_search = 1 
    dt.save()

    frappe.clear_cache(doctype=doctype_name)

    frappe.db.commit()
    print(f"{doctype_name} updated to tree view successfully!")
