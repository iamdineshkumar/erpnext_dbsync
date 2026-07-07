function open_dm_dialog(fetch_method, action_method, action_type) {
    let all_data = [];
    const dialog_title = action_type === "approve" ? __("Approval Data") : __("Migration Data");
    const primary_label = action_type === "approve" ? __("Release") : __("Start Migration");
    const d = new frappe.ui.Dialog({
        title: dialog_title,
        size: "extra-large",
        fields: [
            { fieldname: "deploy_status_filter", fieldtype: "Select", label: "Deploy Status", options: "\nDraft\nPending\nComplete", default: "" },
            { fieldtype: "Column Break" },
            { fieldname: "type_filter", fieldtype: "Select", label: "Type", options: "\nField Migration\nData Migration", default: "" },
            { fieldtype: "Column Break" },
            { fieldtype: "Section Break" },
            {
                fieldname: "release_data",
                fieldtype: "Table",
                label: action_type === "approve" ? __("Approved Documents Awaiting Release") : __("Documents Ready for Migration"),
                cannot_add_rows: true,
                in_place_edit: false,
                data: [],
                fields: [
                    { fieldname: "_source", fieldtype: "Data", label: "File Name", in_list_view: 1, read_only: 1 },
                    { fieldname: "comment", fieldtype: "Small Text", label: "Comment", in_list_view: 1, read_only: 1 },
                    { fieldname: "deploy_status", fieldtype: "Data", label: "Deploy Status", in_list_view: 1, read_only: 1 },
                    { fieldname: "committed_by", fieldtype: "Data", label: "Committed By", in_list_view: 1, read_only: 1 },
                    { fieldname: "approved_by", fieldtype: "Data", label: "Approved By", read_only: 1 },
                    { fieldname: "type", fieldtype: "Data", label: "Type", read_only: 1 },
                    { fieldname: "doc_type", fieldtype: "Data", label: "DocType", read_only: 1 },
                    { fieldname: "deploy_on", fieldtype: "Datetime", label: "Deploy On", read_only: 1 },
                    { fieldname: "_importedAt", fieldtype: "Datetime", label: "Imported At", read_only: 1 },
                    { fieldname: "id", fieldtype: "Data", label: "Id", read_only: 1,  hidden: 1}
                ]
            }
        ],
        primary_action_label: primary_label,
        primary_action() {
            const selected_rows = d.fields_dict.release_data.grid.get_selected_children();
            if (!selected_rows.length) {
                frappe.msgprint(__("Please select at least one document."));
                return;
            }
            let args = {};
            if (action_type === "approve") {
                args.approve_data = selected_rows.map(row => ({
                    doc_id: row.id || row._source.replace(/^(Test|DataMigration)\//, ""),
                    fields: {
                        deploy_status: "Pending",
                        approved_by: frappe.session.user_fullname,
                        ready_to_deploy: true
                    }
                }));
            } else if (action_type === "release") {
                args.files = selected_rows.map(row => ({
                    id: row.id || row._source.replace(/^(Test|DataMigration)\//, ""),
                    type: row.type
                }));
            }
            console.log(args);
            frappe.call({
                method: action_method,
                args,
                callback(r) {
                    if (r.exc) return;
                    if (action_type === "release") {
                        frappe.show_alert({
                            message: __("Migration started..."),
                            indicator: "blue"
                        });
                        setTimeout(() => {
                            const files = r.message?.files || args.files;
                            frappe.confirm(
                                `
                                <b>The following files will be migrated:</b><br><br>
                                ${files.map(f => `• ${f.id} (${f.type})`).join("<br>")}
                                <br><br>
                                <b>Do you want to continue?</b>
                                `,
                                () => {
                                    let args ={};
                                    args.files = selected_rows.map(row => ({
                                        id: row.id || row._source.replace(/^(Test|DataMigration)\//, ""),
                                        type: row.type
                                    }));
                                    console.log(args)
                                    frappe.call({
                                        method: "erpnext_dbsync.api.execute_migration",
                                        args,
                                        callback(res) {
                                            if (!res.exc) {
                                                frappe.show_alert({
                                                    message: __("Migration completed successfully."),
                                                    indicator: "green"
                                                });
                                                d.hide();
                                            }
                                        }
                                    });
                                },
                                () => {
                                    frappe.show_alert({
                                        message: __("Migration cancelled."),
                                        indicator: "orange"
                                    });
                                }
                            );
                        }, 2000);
                    } else {
                        frappe.show_alert({
                            message: __("Request sent successfully."),
                            indicator: "green"
                        });
                        d.hide();
                    }
                }
            });
        }
    });
    d.show();

    function refresh_table() {
        let data = all_data;
        const status = d.get_value("deploy_status_filter");
        const type = d.get_value("type_filter");
        if (status) {
            data = data.filter(row => row.deploy_status === status);
        }
        if (type) {
            data = data.filter(row => row.type === type);
        }
        d.fields_dict.release_data.df.data = data;
        d.fields_dict.release_data.grid.refresh();
    }

    d.get_field("deploy_status_filter").$input.on("change", refresh_table);
    d.get_field("type_filter").$input.on("change", refresh_table);

    frappe.call({
        method: fetch_method,
        type: "GET",
        callback(r) {
            if (!r.message) return;
            all_data = r.message.map(row => ({
                _source: row._source,
                comment: row.comment,
                committed_by: row.committed_by,
                deploy_on: row.deploy_on,
                deploy_status: row.deploy_status,
                doc_type: row.doctype_name,
                type: row.type,
                _importedAt: row._importedAt,
                id: row.id
            }));
            refresh_table();
        }
    });
}

frappe.listview_settings["Data Migration"] = {
    onload(listview) {
        frappe.db.get_single_value("Data Migration Settings", "enable_migration_uploader")
            .then(enabled => {
                if (enabled) {
                    listview.page.add_inner_button(__("Mark Release"), () => {
                        open_dm_dialog("erpnext_dbsync.api.get_all_documents","erpnext_dbsync.api.approve_document","approve");
                    });
                }
            });

        frappe.db.get_single_value("Data Migration Settings", "enable_migration_downloader")
            .then(enabled => {
                if (enabled) {
                    listview.page.add_inner_button(__("Release Migration"), () => {
                        open_dm_dialog("erpnext_dbsync.api.get_deploy_documents","erpnext_dbsync.api.start_migration","release");
                    });
                }
            });
    }
};



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
        const data_show_migration = Boolean(doc.enable_doctype_data_migration);
        frm.toggle_display("doctype_data_migration_tab", data_show_migration);
        frm.fields_dict.data_migration_filters_samples.$wrapper.html(data_migration_filters_samples);
    });
};

const open_sync_dialog = (frm) => {
    const d = new frappe.ui.Dialog({
        title: __("New Sync"),
        size: "Medium",
        fields: [
            {fieldname: "git",label: "Git",fieldtype: "Check",default: 1},
            { fieldtype: "Column Break" },
            {fieldname: "firebase",label: "Firebase",fieldtype: "Check",default: 0},
            { fieldtype: "Section Break" },
            {fieldname: "branch",label: "Branch",fieldtype: "Data",default: "Main"},
            {fieldname: "commit_msg",label: "Commit Message",fieldtype: "Small Text"}
        ],

        primary_action_label: __("Save"),
        primary_action(values) {
            frappe.call({
                method: "erpnext_dbsync.utils.sync.generate_files_and_sync",
                args: {
                    doc: {
                        doctype: "Sync",
                        doc: frm.doc.name,
                        git: values.git,
                        firebase: values.firebase,
                        branch: values.git ? values.branch : "",
                        commit_msg: values.git ? values.commit_msg : ""
                    }
                },
                callback(r) {
                    if (!r.exc) {
                        frm.set_value("custom_github_synced", 1);
                        frm.save("Update");
                        frappe.show_alert({
                            message: __("Sync Completed Successfully"),
                            indicator: "green"
                        });
                        d.hide();
                        frm.reload_doc();
                    }
                }
            });
        }
    });
    d.show();
    function toggle_fields() {
        const git = d.get_value("git");
        const firebase = d.get_value("firebase");
        d.get_field("branch").$wrapper.toggle(git === 1);
        d.get_field("commit_msg").$wrapper.toggle(git === 1);
    }
    d.get_field("git").df.onchange = () => {
        if (d.get_value("git")) {
            setTimeout(() => d.set_value("firebase", 0), 0);
        }
        toggle_fields();
    };
    d.get_field("firebase").df.onchange = () => {
        if (d.get_value("firebase")) {
            setTimeout(() => d.set_value("git", 0), 0);
        }
        toggle_fields();
    };
    toggle_fields();
};

frappe.ui.form.on("Data Migration", {
    refresh(frm) {
        setup_frm(frm);
        
        frappe.db.get_single_value("Data Migration Settings", "enable_new_doctype_migration")
            .then(enabled => frm.toggle_display("new_doctype_migration_section", enabled));
            
        frappe.db.get_single_value("Data Migration Settings", "enable_doctype_field_migration")
            .then(enabled => frm.toggle_display("field_migration_tab_section", enabled));
        
        if (!frm.doc.custom_github_synced && frm.doc.docstatus === 1) {
            frm.add_custom_button(__("Sync"), () => {
                open_sync_dialog(frm);
            });
        }

    }
});