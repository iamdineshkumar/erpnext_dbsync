// const open_sync_dialog = (frm) => {
//     frappe.db.get_single_value("Data Migration Settings", "branch")
//     .then(branch => {
//         console.log(branch)
//         const d = new frappe.ui.Dialog({
//             title: __("New Sync"),
//             size: "Medium",
//             fields: [
//                 {fieldname: "git",label: "Git",fieldtype: "Check",default: 1, read_only: 1},
//                 { fieldtype: "Section Break" },
//                 {fieldname: "branch",label: "Branch",fieldtype: "Data",default: branch},
//                 {fieldname: "commit_msg",label: "Commit Message",fieldtype: "Small Text"}
//             ],
    
//             primary_action_label: __("Save"),
//             primary_action(values) {
//                 d.disable_primary_action();
//                 frappe.dom.freeze(__("Syncing to Git... Please wait..."));
//                 frappe.call({
//                     method: "erpnext_dbsync.utils.sync.generate_files_and_sync",
//                     args: {
//                         doc: {
//                             doc: frm.doc.name,
//                             doctype_doc:frm.doctype,
//                             is_git: values.git,
//                             branch: values.branch,
//                             commit_msg: values.commit_msg
//                         }
//                     },
//                     callback(r) {
//                         if (!r.exc) {
//                             frm.set_value("custom_github_synced", 1);
//                             frm.save("Update").then(() => {
//                                 frappe.show_alert({
//                                     message: __("Sync Completed Successfully"),
//                                     indicator: "green"
//                                 });
//                                 d.hide();
//                                 frm.reload_doc();
//                             });
//                         }
//                     },
//                     error() {
//                         frappe.msgprint(__("An error occurred while syncing."));
//                     },
//                     always() {
//                         frappe.dom.unfreeze();
//                         d.enable_primary_action();
//                     }
//                 });
//             }
//         });
//         d.show();
//     });
// };

// frappe.ui.form.on("New Doctype Migration", {
//     refresh(frm) {
        
//         frappe.db.get_single_value("Data Migration Settings", "enable_new_doctype_migration")
//             .then(enabled => frm.toggle_display("new_doctype_migration_section", enabled));
        
//         frappe.db.get_single_value("Data Migration Settings", "enable_migration_uploader")
//             .then(enabled => {
//                 if (enabled) {
//                     if (!frm.doc.custom_github_synced && frm.doc.docstatus === 1) {
//                         frm.add_custom_button(__("Sync"), () => {
//                             sync_(frm);
//                         });
//                     }
//                 }
//             });

//     }
// });