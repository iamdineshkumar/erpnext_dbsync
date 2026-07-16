import frappe
from inspect import signature
from frappe import _

from frappe.handler import ( #type:ignore
    throw_permission_error,
    is_whitelisted,
    is_valid_http_method,
    add_data_to_monitor,
    build_csv_response,
    cint
    
) 

from erpnext_dbsync.utils.doctype_sync import capture_update_custom_field


def run_doc_method(method, docs=None, dt=None, dn=None, arg=None, args=None):
    """Run a whitelisted controller method"""

    if not args and arg:
        args = arg

    if dt:  # not called from a doctype (from a page)
        if not dn:
            dn = dt  # single
        doc = frappe.get_doc(dt, dn)

    else:
        docs = frappe.parse_json(docs)
        doc = frappe.get_doc(docs)
        doc._original_modified = doc.modified
        doc.check_if_latest()

    if not doc or not doc.has_permission("read"):
        throw_permission_error()

    try:
        args = frappe.parse_json(args)
    except ValueError:
        pass
    
    if docs and isinstance(docs, dict) and docs.get('doctype') == "Customize Form" and "erpnext_dbsync" in frappe.get_installed_apps() and frappe.local.conf.get("migration_capture_enabled") and method == "save_customization":
        # capture_update_custom_field(docs)
        custom_export_customizations(
            module="Erpnext Dbsync",
            doctype=doc.get('doc_type'),
            sync_on_migrate=True,
            with_permissions=False
        )

    method_obj = getattr(doc, method)
    fn = getattr(method_obj, "__func__", method_obj)

    is_whitelisted(fn)
    is_valid_http_method(fn)

    fnargs = list(signature(method_obj).parameters)

    if not fnargs or (len(fnargs) == 1 and fnargs[0] == "self"):
        response = doc.run_method(method)

    elif "args" in fnargs or not isinstance(args, dict):
        response = doc.run_method(method, args)

    else:
        response = doc.run_method(method, **args)

    frappe.response.docs.append(doc)

    if response is None:
        return

    # build output as csv
    if cint(frappe.form_dict.get("as_csv")):
        build_csv_response(response, _(doc.doctype).replace(" ", ""))
        return

    frappe.response["message"] = response
    add_data_to_monitor(methodname=method)



from frappe.modules.utils import *
from ...utils.firebase import FireBaseConnect

import os
from datetime import datetime
import frappe
from frappe import _, scrub, get_module_path
from frappe.utils import cint

def custom_export_customizations(
    module: str, doctype: str, sync_on_migrate: bool = False, with_permissions: bool = False, comment: str = "test commits"
):
    """
    Export Custom Field and Property Setter for the current document to the app folder.
    This will be synced with bench migrate and backed up to Firebase.
    """

    sync_on_migrate = cint(sync_on_migrate)
    with_permissions = cint(with_permissions)

    if not frappe.conf.developer_mode:
        frappe.throw(_("Only allowed to export customizations in developer mode"))

    custom = {
        "custom_fields": frappe.get_all("Custom Field", fields="*", filters={"dt": doctype}, order_by="name"),
        "property_setters": frappe.get_all(
            "Property Setter", fields="*", filters={"doc_type": doctype}, order_by="name"
        ),
        "custom_perms": [],
        "links": frappe.get_all("DocType Link", fields="*", filters={"parent": doctype}, order_by="name"),
        "doctype": doctype,
        "sync_on_migrate": sync_on_migrate,
    }

    if with_permissions:
        custom["custom_perms"] = frappe.get_all(
            "Custom DocPerm", fields="*", filters={"parent": doctype}, order_by="name"
        )

    for d in frappe.get_meta(doctype).get_table_fields():
        custom_export_customizations(module, d.options, sync_on_migrate, with_permissions)

    if custom["custom_fields"] or custom["property_setters"] or custom["custom_perms"]:
        folder_path = os.path.join(get_module_path(module), "custom")
        if not os.path.exists(folder_path):
            os.makedirs(folder_path)
            
        path = os.path.join(folder_path, scrub(doctype) + ".json")
        with open(path, "w") as f:
            f.write(frappe.as_json(custom))
        
        timestamp = datetime.now().strftime("%Y_%m_%d_%H%M%S")
        firebase_filename = f"{timestamp}_{scrub(doctype)}.json"

        FireBaseConnect().upload_file(
            local_file_path=path,
            doctype=doctype,
            comment=comment,
            remote_blob_name=f"{firebase_filename}",
        )

        return