import frappe
from erpnext_dbsync.utils.file import  get_or_create, get_data, save_data

def create_new_doctype_json(doctype:str, data:list):

    timestamp = frappe.utils.now_datetime().strftime("%Y_%m_%d_%H%M%S")
    
    file_name = f"{timestamp}_create_{doctype.lower().replace(' ', '_')}_fields"
    
    file_path = get_or_create(file_name=f"{file_name}.json", doctype=doctype)
    
    get_exixting_data = get_data(file_path)
    
    get_exixting_data = data
       
    save_data(file_path, get_exixting_data)

