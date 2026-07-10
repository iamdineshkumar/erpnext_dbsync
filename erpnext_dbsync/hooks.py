app_name = "erpnext_dbsync"
app_title = "Erpnext Dbsync"
app_publisher = "Increatech Business Solution Pvt Ltd"
app_description = "ERPNext database sync provider"
app_email = "info@increatech.com"
app_license = "mit"


after_install = "erpnext_dbsync.setup.install.after_install"



doc_events = {
    "DocType": {
        "after_insert": "erpnext_dbsync.utils.doctype_sync.capture_new_doctype",
        "on_update": "erpnext_dbsync.utils.doctype_sync.capture_doctype_fields",
    },
    
    # "Custom Field": {
    #     "after_insert": "erpnext_dbsync.utils.doctype_sync.capture_new_custom_field",
    #     # "on_update":"erpnext_dbsync.utils.doctype_sync.capture_update_custom_field",
    #     "after_delete": "erpnext_dbsync.utils.doctype_sync.capture_delete_custom_field",  
    # },

    #  "Property Setter":{
    #     "before_insert": "erpnext_dbsync.utils.doctype_sync.create_property_setter_field",
         
    #  }
}

MIGRATELOG_DOCTYPE_NAME = "Migrate Logs"

override_whitelisted_methods = {
    "frappe.desk.reportview.delete_items":
        "erpnext_dbsync.setup.custom_frappe.doctype.delete_items",
    
    "db.sync": "erpnext_dbsync.api.trigger_patch_sync"
}

SYSTEM_FIELDS = {
    "owner", "creation", "modified", "modified_by", "docstatus",
    "__unsaved", "_assign", "_comments", "_liked_by", "_user_tags",
    "_last_update", "name", "parent", "parenttype", "parentfield"
}


# # Core Overrides
# from frappe import handler
# from .setup.custom_frappe import api as custom_api

# def override_core_methods():
#     handler.run_doc_method = custom_api.run_doc_method

# override_core_methods()


# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "erpnext_dbsync",
# 		"logo": "/assets/erpnext_dbsync/logo.png",
# 		"title": "Erpnext Dbsync",
# 		"route": "/erpnext_dbsync",
# 		"has_permission": "erpnext_dbsync.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/erpnext_dbsync/css/erpnext_dbsync.css"
# app_include_js = "/assets/erpnext_dbsync/js/erpnext_dbsync.js"

# include js, css files in header of web template
# web_include_css = "/assets/erpnext_dbsync/css/erpnext_dbsync.css"
# web_include_js = "/assets/erpnext_dbsync/js/erpnext_dbsync.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "erpnext_dbsync/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

app_include_js =[ "/assets/erpnext_dbsync/js/data_migration.js",
                 "/assets/erpnext_dbsync/js/new_doctype_migration.js",
                 ]

def custom_patch():
    from frappe.modules import utils
    from erpnext_dbsync.setup.custom_frappe.migration import custom_sync_customizations_for_doctype
    
    utils.sync_customizations_for_doctype = custom_sync_customizations_for_doctype
    
custom_patch()

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "erpnext_dbsync/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "erpnext_dbsync.utils.jinja_methods",
# 	"filters": "erpnext_dbsync.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "erpnext_dbsync.install.before_install"
# after_install = "erpnext_dbsync.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "erpnext_dbsync.uninstall.before_uninstall"
# after_uninstall = "erpnext_dbsync.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "erpnext_dbsync.utils.before_app_install"
# after_app_install = "erpnext_dbsync.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "erpnext_dbsync.utils.before_app_uninstall"
# after_app_uninstall = "erpnext_dbsync.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "erpnext_dbsync.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"erpnext_dbsync.tasks.all"
# 	],
# 	"daily": [
# 		"erpnext_dbsync.tasks.daily"
# 	],
# 	"hourly": [
# 		"erpnext_dbsync.tasks.hourly"
# 	],
# 	"weekly": [
# 		"erpnext_dbsync.tasks.weekly"
# 	],
# 	"monthly": [
# 		"erpnext_dbsync.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "erpnext_dbsync.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
	
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "erpnext_dbsync.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["erpnext_dbsync.utils.before_request"]
# after_request = ["erpnext_dbsync.utils.after_request"]

# Job Events
# ----------
# before_job = ["erpnext_dbsync.utils.before_job"]
# after_job = ["erpnext_dbsync.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"erpnext_dbsync.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# Translation
# ------------
# List of apps whose translatable strings should be excluded from this app's translations.
# ignore_translatable_strings_from = []



# fixtures = [
#         {
#             "dt": "Role Profile",
#         }
#     ]