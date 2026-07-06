import frappe
from functools import wraps


def migration_capture():
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if not frappe.local.conf.get("migration_capture_enabled"):
                return
            
            if (
                frappe.flags.in_migrate
                or frappe.flags.in_install
                or frappe.flags.in_patch
                or frappe.flags.in_setup_wizard
            ):
                return

            return func(*args, **kwargs)

        return wrapper
    return decorator
