function open_dm_dialog(fetch_method, action_method, action_type) {
    let all_data = [];
    const dialog_title = action_type === "approve" ? __("Migration Manager") : __("Execute Migration");
    const primary_label = action_type === "approve" ? __("Submit for Migration") : __("Execute");
    const d = new frappe.ui.Dialog({
        title: dialog_title,
        size: "extra-large",
        fields: [
            { fieldname: "deploy_status_filter", fieldtype: "Select", label: "Deploy Status", options: "\nDraft\nPending\nComplete", default: action_type === "approve" ? "Draft" : "Pending", read_only: action_type !== "approve",change: refresh_table},
            { fieldtype: "Column Break" },
            { fieldname: "type_filter", fieldtype: "Select", label: "Type", options: "\nField Migration\nData Migration", default: "",change: refresh_table},
            { fieldtype: "Column Break" },
            { fieldtype: "Section Break" },
            {
                fieldname: "migration_data",
                fieldtype: "Table",
                label: action_type === "approve" ? __("Migration Documents") : __("Pending Migration Documents"),
                cannot_add_rows: true,
                cannot_delete_rows: true,
                in_place_edit: false,
                data: [],
                fields: [
                    { fieldname: "_source", fieldtype: "Data", label: "File Name", in_list_view: 1, read_only: 1 },
                    { fieldname: "comment", fieldtype: "Small Text", label: "Comment", in_list_view: 1, read_only: 1 },
                    { fieldname: "deploy_status", fieldtype: "Data", label: "Deploy Status", in_list_view: 1, read_only: 1 },
                    { fieldname: "type", fieldtype: "Data", label: "Type", in_list_view: 1, read_only: 1 },
                    { fieldname: "committed_by", fieldtype: "Data", label: "Committed By", read_only: 1 },
                    { fieldname: "approved_by", fieldtype: "Data", label: "Approved By", read_only: 1 },
                    { fieldname: "doc_type", fieldtype: "Data", label: "DocType", read_only: 1 },
                    { fieldname: "deploy_on", fieldtype: "Datetime", label: "Deploy On", read_only: 1 },
                    { fieldname: "_importedAt", fieldtype: "Datetime", label: "Imported At", read_only: 1 },
                    { fieldname: "id", fieldtype: "Data", label: "Id", read_only: 1,  hidden: 1}
                ]
            }
        ],
        primary_action_label: primary_label,
        primary_action() {
            d.get_primary_btn().prop("disabled", true);
            const selected_rows = d.fields_dict.migration_data.grid.get_selected_children();
            if (!selected_rows.length) {
                d.get_primary_btn().prop("disabled", false);
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
                freeze: true,
                freeze_message: __("Please wait..."),
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
                                        freeze: true,
                                        freeze_message: __("Migrating documents. Please wait..."),
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
                                    d.get_primary_btn().prop("disabled", false);
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

    let grid = d.fields_dict['migration_data'].grid;
    grid.wrapper.find('.grid-add-row').hide();
    grid.wrapper.find('.grid-add-multiple-rows').hide();
    grid.wrapper.find('.grid-upload').hide();
    grid.wrapper.find('.grid-remove-rows').hide();
    grid.wrapper.find('.grid-delete-row').hide();
    
    if (action_type === "release") {
        d.get_field("deploy_status_filter").$wrapper.hide();
        d.get_field("type_filter").$wrapper.hide();
    }

    function toggle_primary_button() {
        if (action_type == "release") return;
        const btn = d.get_primary_btn();
        const status = d.get_value("deploy_status_filter");
        if (status === "Pending" || status === "Complete") {
            btn.hide();
            return;
        }
        const selected_rows = d.fields_dict.migration_data.grid.get_selected_children();
        if (!selected_rows.length) {
            btn.show();
            return;
        }
        const hide = selected_rows.some(row =>
            ["pending", "complete"].includes((row.deploy_status || "").trim().toLowerCase())
        );
        if (hide) {
            btn.hide();
        } else {
            btn.show();
        }
    }

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
        d.fields_dict.migration_data.df.data = data;
        d.fields_dict.migration_data.grid.refresh();
        setTimeout(() => {
            toggle_primary_button();
        }, 100);
    }

    d.fields_dict.migration_data.grid.wrapper.on( "click", ".grid-row-check", function () {
            setTimeout(toggle_primary_button, 50);
        }
    );

    d.fields_dict.migration_data.grid.wrapper.on( "click", ".grid-heading-row .grid-row-check", function () {
            setTimeout(toggle_primary_button, 50);
        }
    );

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
                    listview.page.add_inner_button(__("Migration Manager"), () => {
                        open_dm_dialog("erpnext_dbsync.api.get_all_documents","erpnext_dbsync.api.approve_document","approve");
                    });
                }
            });

        frappe.db.get_single_value("Data Migration Settings", "enable_migration_downloader")
            .then(enabled => {
                if (enabled) {
                    listview.page.add_inner_button(__("Execute Migration"), () => {
                        open_dm_dialog("erpnext_dbsync.api.get_deploy_documents","erpnext_dbsync.api.start_migration","release");
                    });
                    listview.page.btn_primary.hide();
                }
            });
    }
};