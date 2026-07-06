// Copyright (c) 2026, Increatech Business Solution Pvt Ltd and contributors
// For license information, please see license.txt


frappe.ui.form.on("Data Migration Settings", {
	refresh(frm) {
		const html = `
		<div class="">
			<h4>Migration Type Guide</h4>
			<p>Select the appropriate migration type based on your requirement.</p>

			<table class="table table-bordered">
				<thead>
					<tr>
						<th>Migration Type</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><b>New Doctype Migration</b></td>
						<td>
							Creates a new DocType in the target server if it does not already exist.
							This migration includes the DocType definition along with all configured fields.
							It is intended for introducing entirely new DocTypes into the target environment.
						</td>
					</tr>

					<tr>
						<td><b>Doctype Field Migration</b></td>
						<td>
							Migrates only the field definitions of an existing DocType.
							It updates or adds fields in the target DocType without recreating the DocType
							or modifying existing records. Use this when the DocType already exists and
							only its schema needs to be synchronized.
						</td>
					</tr>

					<tr>
						<td><b>Doctype Data Migration</b></td>
						<td>
							Migrates document data from the source server to the target server for an
							existing DocType. This migration transfers records only and does not create
							or modify the DocType structure or its field definitions.
						</td>
					</tr>
				</tbody>
			</table>

			<p><b>Recommendation:</b></p>
			<ul>
				<li><b>New Doctype Migration</b> → Use when the DocType does not exist on the target server.</li>
				<li><b>Doctype Field Migration</b> → Use when the DocType exists but its fields need to be updated.</li>
				<li><b>Doctype Data Migration</b> → Use when only document data needs to be transferred.</li>
			</ul>
		</div>
		`;

		frm.fields_dict.explanation.$wrapper.html(html);
        frappe.boot.enable_new_doctype_migration = frm.doc.enable_new_doctype_migration;
        frappe.boot.enable_doctype_data_migration = frm.doc.enable_doctype_data_migration;
        frappe.boot.enable_doctype_field_migration = frm.doc.enable_doctype_field_migration;
	}
});