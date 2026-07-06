import frappe
from .file import *
from ..hooks import SYSTEM_FIELDS

CHILD_TABLE_KEYS = ["fields", "permissions", "states", "actions", "links"]


def create_or_update(data):
    
    if data.get('doctype') == 'Customize Form':
        create_or_update_custom_form(data)
        # create_or_update_custom_form_states(data)
        return
    
    if data.get('doctype') == 'Custom Field':
        create_custom_field(data)
        return
    
    if data.get('doctype') == 'Custom Field' and data.get('deleted', False):
        delete_custom_field(data)
        return
    
    doctype_name = data.get("name")
    delete_flag = data.get("deleted", False)
    
    if not doctype_name:
        frappe.throw("DocType name is required.")
        
    if delete_flag:
        try:
            delete_doctype_only(doctype_name)
            return
        except Exception as e:
            frappe.throw(f"Error deleting DocType {doctype_name}: {e}")
            raise e
    
    if frappe.db.exists("DocType", doctype_name):
        doc = frappe.get_doc("DocType", doctype_name)
        for key in CHILD_TABLE_KEYS:
            doc.set(key, [])
    else:
        doc = frappe.new_doc("DocType")
        doc.name = doctype_name

    for key, value in data.items():
        if key not in SYSTEM_FIELDS and key not in CHILD_TABLE_KEYS:
            doc.set(key, value)

    doc.custom = 1

    for key in CHILD_TABLE_KEYS:
        items = data.get(key) or []
        for item in items:
            child_row = {k: v for k, v in item.items() if k not in SYSTEM_FIELDS}
            doc.append(key, child_row)

    try:
        doc.save(ignore_permissions=True)
        print(f"Successfully created/updated DocType: {doctype_name}")
        return doc.name
    except Exception:
        frappe.log_error(frappe.get_traceback(), "DocType Sync Error")
        raise



def delete_doctype_only(doctype_name):
    frappe.clear_cache()
    
    if not doctype_name:
        frappe.throw("No DocType specified for deletion")

    if not frappe.db.exists("DocType", doctype_name):
        frappe.throw(f"DocType '{doctype_name}' does not exist")

    frappe.db.delete("Property Setter", {"doc_type": doctype_name})

    frappe.db.delete("DocField", {"parent": doctype_name})
    frappe.db.delete("DocPerm", {"parent": doctype_name})

    frappe.db.delete("DocType", {"name": doctype_name})
    # frappe.db.commit()
    print(f"Successfully deleted DocType: {doctype_name}")
    return 



def create_or_update_custom_form(data):
    fieldname = None
    doc_type = data.get("doc_type", None)
    doc_name = "Custom Field"
    
    for index, field in enumerate(data.get("fields", [])):
        if field.get("is_custom_field") != 1:
            continue
        
        if index != 0:
            fieldname = data.get("fields")[index-1].get("fieldname")
        
        custom_field = frappe.get_all(
            doc_name,
            filters={
                "dt": doc_type,
                "fieldname": field.get("fieldname")
            },
            limit_page_length=1
        )
      
        field_values = {
            "dt": doc_type,
            "fieldname": field.get("fieldname"),
            "label": field.get("label"),
            "fieldtype": field.get("fieldtype"),
            "options": field.get("options"),
            "insert_after": fieldname,
            "translatable": field.get("translatable", 0),
        }

        if custom_field:
            doc = frappe.get_doc(doc_name, custom_field[0].name)
            updated = False
            for key, value in field_values.items():
                if getattr(doc, key) != value:
                    setattr(doc, key, value)
                    updated = True
            if updated:
                doc.save(ignore_permissions=True)
                # frappe.db.commit()
                
            print(f"Successfully created '{field['fieldname']}' to {doc_name}")
            
        else:
            frappe.get_doc({
                "doctype": doc_name,
                **field_values
            }).insert(ignore_permissions=True)
            # frappe.db.commit()
            
            print(f"Successfully updated '{field['fieldname']}' to {doc_name}")
            
            
CUSTOM_FORM_STATES_SKIP_FIELDS = ("__islocal", "__unsaved", "__unedited", "doctype", "parent", "parentfield", "parenttype", "idx")

def create_or_update_custom_form_states(parent_doctype, parent_name, states):
    parent_doc = frappe.get_doc(parent_doctype, parent_name)
    doc_name = "DocType State"

    for idx, state_data in enumerate(states, start=1):
        existing = None
        if "name" in state_data:
            try:
                existing = frappe.get_doc(doc_name, state_data["name"])
            except frappe.DoesNotExistError:
                existing = None

        if existing:
            for key, value in state_data.items():
                if key not in CUSTOM_FORM_STATES_SKIP_FIELDS:
                    existing.set(key, value)
            existing.idx = idx
            existing.save()
            
            print(f"Successfully Updated '{state_data.get('fieldname')}' to {doc_name}")
            
        else:
            new_state = frappe.get_doc({
                "doctype": doc_name,
                "parent": parent_name,
                "parentfield": "states",
                "parenttype": parent_doctype,
                "idx": idx,
                **{k: v for k, v in state_data.items() if k not in CUSTOM_FORM_STATES_SKIP_FIELDS}
            })
            parent_doc.append("states", new_state)
            
            print(f"Successfully Created '{state_data.get('fieldname')}' to {doc_name}")


    parent_doc.save()
    # frappe.db.commit()
    return parent_doc


def create_custom_field(data):
    from frappe.custom.doctype.custom_field.custom_field import create_custom_fields
    from frappe.custom.doctype.property_setter.property_setter import make_property_setter
    
    data.pop("doctype", None)
    
    print(data)

    create_custom_fields(data) 
    
    return


def delete_custom_field(data):
    doctype_name = data.get("dt")

    if not doctype_name:
        frappe.throw("Missing target DocType (dt)")
        
    if not frappe.db.exists("DocType", doctype_name):
        frappe.throw(f"DocType '{doctype_name}' does not exist")
        
    fieldname = data.get("fieldname")
    
    if not frappe.db.exists("Custom Field", {"dt": doctype_name, "fieldname": fieldname}):
        print (f"Field '{fieldname}' already not exists in {doctype_name}")
        return

    frappe.delete_doc(data.get("doctype"), data.get('name'), force=1)
    # frappe.db.commit()
    
    frappe.clear_cache(doctype=doctype_name)

    print (f"Successfully deleted '{fieldname}' to {doctype_name}")
    
    return



