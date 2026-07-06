from .bench_cmd import cmd_bench_restart
from .db  import migrate
import frappe
from frappe import _

def after_install():
    pass
    # try:
    #     migrate()
    # except Exception as e:
    #     frappe.db.rollback()
    #     raise frappe.InstallationError(
    #         _("Installation failed during migrate: {0}").format(str(e))
    #     )

