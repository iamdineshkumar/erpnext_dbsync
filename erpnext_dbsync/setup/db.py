from erpnext_dbsync.utils.file import (
    get_data,
    get_or_create,
    get_json_files,
)

from erpnext_dbsync.utils.dt import create_or_update

import frappe
from erpnext_dbsync.utils.logger import create_migrate_logger
from erpnext_dbsync.hooks import MIGRATELOG_DOCTYPE_NAME


def migrate():
    json_files = get_json_files()

    for file_name in json_files:
        try:
            if (
                frappe.db.table_exists(MIGRATELOG_DOCTYPE_NAME)
                and frappe.db.exists(
                    MIGRATELOG_DOCTYPE_NAME,
                    {"file_name": file_name, "is_migrated": 1},
                )
            ):
                continue

            file_path = get_or_create(file_name=file_name)
            data = get_data(file_path)

            if not data:
                continue
            
            create_or_update(data)
            create_migrate_logger(file_name)
            
        except Exception:
            frappe.log_error(
                frappe.get_traceback(),
                f"DBSync Migration Failed: {file_name}",
            )

            raise
