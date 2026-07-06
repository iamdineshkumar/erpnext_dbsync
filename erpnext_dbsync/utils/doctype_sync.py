import frappe
from erpnext_dbsync.utils.new_doctype import create_new_doctype_json
from erpnext_dbsync.utils.modified_doctype import create_modified_doctype_json
from erpnext_dbsync.utils.trash_doctype import create_trash_doctype_json

from erpnext_dbsync.utils.decorators import migration_capture

@migration_capture()
def capture_new_doctype(doc, method=None):
    return create_new_doctype_json(doctype=doc.name, data=doc.as_dict())


@migration_capture()
def capture_trash_doctype(doc_name, data=None):
    return create_trash_doctype_json(doctype=doc_name, data=data)

@migration_capture()
def capture_doctype_fields(doc=None, method=None):
    return create_modified_doctype_json(doc.name, doc.as_dict())

@migration_capture()
def capture_new_custom_field(doc, method=None):
    return create_new_doctype_json(doctype=doc.doctype, data=transform_to_custom_field_format(doc.as_dict()))


@migration_capture()
def capture_update_custom_field(doc, method=None):
    return create_modified_doctype_json(doctype=doc.get('doctype'), data=doc)

@migration_capture()
def capture_delete_custom_field(doc, method=None):
    return create_trash_doctype_json(doctype=doc.doctype, data=doc.as_dict())

SYSTEM_FIELDS = {
    "owner", "creation", "modified", "modified_by", "docstatus",
    "__unsaved", "_assign", "_comments", "_liked_by", "_user_tags",
    "_last_update", "name", "parent", "parenttype", "parentfield", "dt"
    ,"idx", "doctype"
}

def transform_to_custom_field_format(dict_data):
    doctype = dict_data.get("dt")
   
    field_dict = {k: v for k, v in dict_data.items() if k not in SYSTEM_FIELDS}
    
    custom_field = {
        "doctype":dict_data.get("doctype"),
        doctype: [field_dict]
    }
    
    return custom_field

