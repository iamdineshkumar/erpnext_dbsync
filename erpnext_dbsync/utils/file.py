from pathlib import Path
from ..modified_files import root_path
import json, os
import frappe


def _get_base_folder(folder_path=None) -> Path:
    base = Path(folder_path) if folder_path else Path(root_path.__file__).parent
    base.mkdir(parents=True, exist_ok=True)
    return base


# check if file exists
def is_exists(folder_path=None, file_name=None):
    if not file_name:
        return False

    base = _get_base_folder(folder_path)
    return (base / file_name).exists()


# get or create file
def get_or_create(folder_path=None, file_name=None, doctype=None) -> str:
    """
    Create the file if it doesn't exist, with default JSON:
    {"DocType": doctype}
    """
    if not file_name:
        frappe.throw("file_name is required")
    
    base = _get_base_folder(folder_path)
    file_path = base / file_name

    if not file_path.exists():
        default_data = {
            "DocType": doctype,
            "added_fields": [],
            "modified_fields": [],
            "removed_fields": []
        }
        
        file_path.write_text(json.dumps(default_data, indent=4), encoding="utf-8")

    return str(file_path)


# read json
def get_data(file_path, default=None):
    default = default if default is not None else {}

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read().strip()

            if not content:
                return default

            return json.loads(content)

    except json.JSONDecodeError:
        frappe.throw(f"Invalid JSON in file: {file_path}")

    except FileNotFoundError:
        return default


# save json
def save_data(file_path, data):
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(frappe.as_json(data, indent=4))
    except Exception as e:
        frappe.throw(f"Error saving data to {file_path}: {e}")


from datetime import datetime
def get_json_files():
    folder_path = Path(root_path.__file__).parent

    def extract_dt(file: Path):
        parts = file.stem.split("_", 4)
        dt_str = "_".join(parts[:4])   
        return datetime.strptime(dt_str, "%Y_%m_%d_%H%M%S")

    json_files = sorted(
        (f for f in folder_path.iterdir() if f.is_file() and f.suffix == ".json"),
        key=extract_dt
    )
    
    return [f.name for f in json_files]

def file_field_exists(fields, field_name):
    if not fields:
        return False
    
    return any(field.get("fieldname") == field_name for field in fields)
