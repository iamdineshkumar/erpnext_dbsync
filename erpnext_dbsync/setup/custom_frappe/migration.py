from frappe.modules.utils import *
from frappe.core.doctype.doctype.doctype import validate_fields_for_doctype


def custom_sync_customizations_for_doctype(data: dict, folder: str, filename: str = ""):
	doctype = data["doctype"]
	update_schema = False
	print("yes ===========================================")
	def sync(key, custom_doctype, doctype_fieldname):
		doctypes = list(set(map(lambda row: row.get(doctype_fieldname), data[key])))

		def sync_single_doctype(doc_type):
			def _insert(data):
				if data.get(doctype_fieldname) == doc_type:
					data["doctype"] = custom_doctype
					doc = frappe.get_doc(data)
					doc.db_insert()

			match custom_doctype:
				case "Custom Field":
					for d in data[key]:
						field = frappe.db.get_value(
							"Custom Field", {"dt": doc_type, "fieldname": d["fieldname"]}
						)
						if not field:
							d["owner"] = "Administrator"
							_insert(d)
						else:
							custom_field = frappe.get_doc("Custom Field", field)
							custom_field.flags.ignore_validate = True
							custom_field.update(d)
							custom_field.db_update()

				case "DocType Link":
					for d in data[key]:
						link = frappe.db.get_value(
							"DocType Link",
							{
								"parent": doc_type,
								"link_doctype": d.get("link_doctype"),
								"link_fieldname": d.get("link_fieldname"),
							},
						)
						if not link:
							d["owner"] = "Administrator"
							_insert(d)
						else:
							doc_link = frappe.get_doc("DocType Link", link)
							doc_link.flags.ignore_validate = True
							doc_link.update(d)
							doc_link.db_update()

				case "Property Setter":
					for d in data[key]:
						if d.get("doc_type") == doc_type:
							d["doctype"] = "Property Setter"
							doc = frappe.get_doc(d)
							doc.flags.validate_fields_for_doctype = False
							doc.insert()

				case "Custom DocPerm":
					frappe.db.delete("Custom DocPerm", {"parent": doc_type})

					for d in data[key]:
						_insert(d)

		for doc_type in doctypes:
			if doc_type == doctype or not os.path.exists(os.path.join(folder, scrub(doc_type) + ".json")):
				sync_single_doctype(doc_type)

	if not frappe.db.exists("DocType", doctype):
		print(_("DocType {0} does not exist.").format(doctype))
		print(_("Skipping fixture syncing for doctype {0} from file {1}").format(doctype, filename))
		return

	json_fields = {d["fieldname"] for d in data.get("custom_fields", [])}

	existing_fields = frappe.get_all(
		"Custom Field",
		filters={"dt": doctype},
		fields=["name", "fieldname"],
	)

	for field in existing_fields:
		if field.fieldname not in json_fields:
			frappe.delete_doc(
				"Custom Field",
				field.name,
				ignore_permissions=True,
				force=True,
			)

	if data.get("custom_fields"):
		sync("custom_fields", "Custom Field", "dt")

	update_schema = True

	if data.get("links"):
		sync("links", "DocType Link", "parent")

	if data.get("property_setters"):
		sync("property_setters", "Property Setter", "doc_type")

	print(f"Updating customizations for {doctype}")

	if data.get("custom_perms"):
		sync("custom_perms", "Custom DocPerm", "parent")

	validate_fields_for_doctype(doctype)

	if update_schema and not frappe.db.get_value("DocType", doctype, "issingle"):
		frappe.db.updatedb(doctype)