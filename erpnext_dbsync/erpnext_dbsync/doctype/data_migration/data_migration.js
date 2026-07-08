const data_migration_filters_samples = `
<div style="
    padding:15px;
    border:1px solid var(--border-color);
    border-radius:8px;
    background:var(--card-bg);
    font-family: inherit;
">
    <h4>Data Migration: Field-Wise Filter Guide</h4>
    <p>Use these patterns inside your <b>hooks.py fixtures</b> to filter down rows based on specific document field values.</p>

    <hr style="border-top: 1px solid var(--border-color); margin: 15px 0;">

    <h5>Complete Integration Structure</h5>
        <p><small style="color: var(--text-muted);">How to map target DocTypes ("dt") alongside field filters in hooks.py:</small></p>
        <pre style="background: var(--code-bg); padding: 8px; border-radius: 4px;">
    [
        {
            "dt": "Project Task",
            "filters": [
                ["status", "in", ["Delayed", "In Progress"]],
                ["priority", "=", "High"]
            ]
        },
        {
            "dt": "Task",
            "filters": [
                ["priority", "=", "High"]
            ]
        }
    ]
    <h5>1. Filter by Status (String Field)</h5>
    <p><small style="color: var(--text-muted);">Matches exact text values like workflow states or statuses.</small></p>
    <pre style="background: var(--code-bg); padding: 8px; border-radius: 4px;">
filters = [
    ["status", "=", "Open"]
]
    </pre>

    <h5>2. Filter by Date / Range (Date & Time Fields)</h5>
    <p><small style="color: var(--text-muted);">Useful for exporting records created after a specific timeline.</small></p>
    <pre style="background: var(--code-bg); padding: 8px; border-radius: 4px;">
filters = [
    ["creation", ">=", "2026-01-01 00:00:00"]
]
    </pre>

    <h5>3. Filter by Link Field (User / Owner / Document Link)</h5>
    <p><small style="color: var(--text-muted);">Filters data linked to another master record or a specific system user.</small></p>
    <pre style="background: var(--code-bg); padding: 8px; border-radius: 4px;">
filters = [
    ["owner", "=", "admin@example.com"]
]
    </pre>

    <h5>4. Filter by Checkbox (Boolean Field)</h5>
    <p><small style="color: var(--text-muted);">Use 1 for Checked (True) and 0 for Unchecked (False).</small></p>
    <pre style="background: var(--code-bg); padding: 8px; border-radius: 4px;">
filters = [
    ["is_standard", "=", 1]
]
    </pre>

    <h5>5. Advanced Multiple Field Conditions (AND Logic)</h5>
    <p><small style="color: var(--text-muted);">Combines multiple fields. Looks for Submitted (docstatus 1) records exceeding a specific value.</small></p>
    <pre style="background: var(--code-bg); padding: 8px; border-radius: 4px;">
filters = [
    ["docstatus", "=", 1],
    ["grand_total", ">", 5000],
    ["company", "=", "My Company LTD"]
]
    </pre>


    </pre>

    <hr style="border-top: 1px solid var(--border-color); margin: 15px 0;">

    <b>Key Principles:</b>
    <ul style="padding-left: 20px; margin-top: 5px;">
        <li>Format syntax follows: <code>["field_name", "operator", "value"].</li>
        <li>Standard system tracking fields (e.g., <code>creation</code>, <code>modified</code>, <code>owner</code>, <code>docstatus</code>) are universally valid.</li>
        <li>Adding multiple list blocks together implicitly executes an <b>AND</b> evaluation.</li>
    </ul>
</div>
`;


const setup_frm = async (frm) => {
    frappe.db.get_doc("Data Migration Settings").then((doc) => {
        frm.toggle_display("doctype_data_migration_tab", !!doc.enable_doctype_data_migration);
        frm.toggle_display("field_migration_tab_section", !!doc.enable_doctype_field_migration);
        frm.fields_dict.data_migration_filters_samples.$wrapper.html(data_migration_filters_samples);
    });
};

const sync_ = (frm) => {
    frappe.confirm(__("Are you sure you want to sync this Data Migration to <b>Firebase</b>?"),() => {
            frappe.call({
                method: "erpnext_dbsync.utils.sync.generate_files_and_sync",
                freeze: true,
                freeze_message: __("Syncing to Firebase... Please wait."),
                args: {
                    doc: {
                        doctype: frm.doctype,
                        doc: frm.doc.name,
                        branch: "",
                        commit_msg: ""
                    }
                },
                callback(r) {
                    if (!r.exc) {
                        frm.set_value("custom_github_synced", 1);
                        frm.save("Update");
                        frappe.show_alert({
                            message: __("Firebase Sync Completed Successfully"),
                            indicator: "green"
                        });
                        frm.reload_doc();
                    }
                },
                error() {
                    frappe.msgprint(__("An error occurred while syncing."));
                }
            });
        }
    );
};

frappe.ui.form.on("Data Migration", {
    refresh(frm) {
        setup_frm(frm);

        frappe.db.get_single_value("Data Migration Settings", "enable_migration_uploader")
            .then(enabled => {
                if (enabled) {
                    if (!frm.doc.custom_github_synced && frm.doc.docstatus === 1) {
                        frm.add_custom_button(__("Sync"), () => {
                            sync_(frm);
                        });
                    }
                }
            });
    }
});