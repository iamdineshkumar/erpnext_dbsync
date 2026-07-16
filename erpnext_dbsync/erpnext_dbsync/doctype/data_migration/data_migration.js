    const data_migration_filters_samples = `
    <div style="margin: 10px 0 15px 0; display: flex; gap: 8px; flex-wrap: wrap;">
        <button class="btn btn-primary btn-sm" id="open_filter_builder_btn">
            <strong>Add Filter</strong>
        </button>
        <button class="btn btn-secondary btn-sm" id="undo_filter">
            <strong>Undo Filter</strong>
        </button>
        <button class="btn btn-danger btn-sm" id="clear_filter">
            <strong>Clear Filter</strong>
        </button>
    </div>
    <hr>
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

    let filterHistory = [];

    $(document).on('click', '#open_filter_builder_btn', function() {
        if (cur_frm && cur_frm.doc.doctype_data_migration) {
            filterHistory.push(cur_frm.doc.doctype_data_migration);
        }
        openFilterDialog(cur_frm);
    });

    $(document).on('click', '#clear_filter', function() {
        if (cur_frm) {
            if (cur_frm.doc.doctype_data_migration) {
                filterHistory.push(cur_frm.doc.doctype_data_migration);
            }
            cur_frm.set_value("doctype_data_migration", "");
            frappe.show_alert({
                message: __('Filter cleared successfully'),
                indicator: 'green'
            });
        }
    });

    $(document).on('click', '#undo_filter', function() {
        if (cur_frm) {
            if (filterHistory.length === 0) {
                frappe.show_alert({
                    message: __('Nothing to undo'),
                    indicator: 'orange'
                });
                return;
            }
            
            const lastValue = filterHistory.pop();
            cur_frm.set_value("doctype_data_migration", lastValue);
            
            frappe.show_alert({
                message: __('Filter restored to previous state'),
                indicator: 'green'
            });
        }
    });

    function openFilterDialog(frm) {
        const dialog = new frappe.ui.Dialog({
            title: "Set Data Migration Filter",
            size: "extra-large",
            fields: [{ fieldtype: 'HTML', fieldname: 'content' }]
        });

        dialog.show();
        const host = dialog.fields_dict.content.$wrapper[0];

        ch.mount(host, {
            data() {
                return {
                    targetDoctype: "Item",
                    doctypeOptions: [],
                    loadingDoctypes: true,
                    fieldMeta: [],
                    filterRows: [{ 
                        fieldname: "name", 
                        operator: "equals", 
                        value: "", 
                        valueOptions: [], 
                        loadingValues: false, 
                        fromDate: '', 
                        toDate: '',
                        showFromPicker: false,
                        showToPicker: false,
                        showPicker: false,
                        searchText: ''
                    }],
                    loadingFields: false,
                    previewData: [],
                    previewColumns: [],
                    totalRecords: 0,
                    previewLoading: false,
                    showPreview: false,
                    selectedItems: [],
                    page: 1,
                    itemsPerPage: 20,
                    search: '',
                    sortBy: [],
                    timeSpanOptions: [
                        'today', 'yesterday', 'tomorrow',
                        'this week', 'last week', 'next week',
                        'this month', 'last month', 'next month',
                        'this quarter', 'last quarter', 'next quarter',
                        'this year', 'last year', 'next year',
                        'this fiscal year', 'last fiscal year', 'next fiscal year',
                        'last 7 days', 'last 30 days', 'last 90 days',
                        'next 7 days', 'next 30 days', 'next 90 days'
                    ],
                    isOptions: ['set', 'not set'],
                    operatorMap: {
                        'equals': '=', 'not equals': '!=',
                        'greater than': '>', 'less than': '<',
                        'greater than or equal': '>=', 'less than or equal': '<=',
                        'like': 'like', 'not like': 'not like',
                        'in': 'in', 'not in': 'not in',
                        'is': 'is', 'between': 'between',
                        'timespan': 'timespan', 'previous': 'previous', 'next': 'next'
                    },
                    noValueOperators: ['timespan', 'previous', 'next'],
                    textInputOperators: ['like', 'not like', 'in', 'not in'],
                    excludedFieldTypes: ['Tab', 'Tab Break','Section Break', 'Column Break', 'Button', 'Image', 'HTML', 'Read Only','Table','Table MultiSelect','Custom Table','MultiSelect','Password','Code','Color','Time'],
                    valueCache: {}
                };
            },
            computed: {
                totalPages() {
                    return Math.ceil(this.totalRecords / this.itemsPerPage) || 1;
                },
                filteredFieldMeta() {
                    return this.fieldMeta.filter(f => 
                        !this.excludedFieldTypes.includes(f.fieldtype) && 
                        f.fieldname !== 'doctype'
                    );
                }
            },
            async mounted() {
                this.loadingDoctypes = true;
                try {
                    const res = await frappe.call({
                        method: "frappe.client.get_list",
                        args: {
                            doctype: "DocType",
                            fields: ["name"],
                            filters: [],
                            order_by: "name asc",
                            limit_page_length: 0
                        }
                    });
                    if (res && res.message) {
                        this.doctypeOptions = res.message.map(r => r.name);
                    }
                } catch (e) {
                    console.error("Failed to load doctypes:", e);
                } finally {
                    this.loadingDoctypes = false;
                }
                await this.loadFields();
            },
            methods: {
                async loadFields() {
                    if (!this.targetDoctype) return;
                    this.loadingFields = true;
                    this.showPreview = false;
                    this.previewData = [];
                    this.selectedItems = [];
                    this.page = 1;
                    this.search = '';
                    this.valueCache = {};

                    try {
                        await frappe.model.with_doctype(this.targetDoctype);
                        const meta = frappe.get_meta(this.targetDoctype);
                        
                        this.fieldMeta = (meta.fields || [])
                            .filter(f => f.fieldname && f.label)
                            .filter(f => !this.excludedFieldTypes.includes(f.fieldtype))
                            .map(f => ({
                                fieldname: f.fieldname,
                                label: f.label || f.fieldname,
                                fieldtype: f.fieldtype || 'Data',
                                options: f.options || ''
                            }));

                        const nameFieldIndex = this.fieldMeta.findIndex(f => f.fieldname === 'name');
                        if (nameFieldIndex === -1) {
                            this.fieldMeta.unshift({
                                fieldname: 'name',
                                label: 'ID',
                                fieldtype: 'Data',
                                options: ''
                            });
                        } else {
                            this.fieldMeta[nameFieldIndex].label = 'ID';
                        }

                        if (this.fieldMeta.length === 0) {
                            this.fieldMeta.push({
                                fieldname: 'name',
                                label: 'ID',
                                fieldtype: 'Data',
                                options: ''
                            });
                        }

                        this.previewColumns = [
                            { key: 'name', title: 'ID' },
                            ...this.fieldMeta
                                .filter(f => f.fieldname !== 'name' && 
                                    ['Data','Link','Select','Int','Float','Currency','Date','Datetime','Check','Text','Small Text'].includes(f.fieldtype))
                                .slice(0, 7)
                                .map(f => ({ key: f.fieldname, title: f.label }))
                        ];

                        this.filterRows = [{ 
                            fieldname: "name", 
                            operator: "equals", 
                            value: "", 
                            valueOptions: [], 
                            loadingValues: true, 
                            fromDate: '', 
                            toDate: '',
                            showFromPicker: false,
                            showToPicker: false,
                            showPicker: false,
                            searchText: ''
                        }];
                        
                        await this.loadValueSuggestions(this.filterRows[0], '');
                        this.$forceUpdate();
                    } catch (e) {
                        console.error("Failed to load fields:", e);
                        if (this.fieldMeta.length === 0) {
                            this.fieldMeta.push({
                                fieldname: 'name',
                                label: 'ID',
                                fieldtype: 'Data',
                                options: ''
                            });
                        }
                    } finally {
                        this.loadingFields = false;
                    }
                },

                async loadValueSuggestions(row, searchText = '') {
                    if (!row || !row.fieldname) return;
                    
                    row.valueOptions = [];
                    row.loadingValues = true;
                    
                    if (this.noValueOperators.includes(row.operator) || 
                        this.textInputOperators.includes(row.operator)) {
                        row.valueOptions = [];
                        row.loadingValues = false;
                        return;
                    }
                    
                    if (row.operator === 'is') {
                        row.valueOptions = this.isOptions;
                        row.loadingValues = false;
                        return;
                    }
                    
                    const field = this.fieldMeta.find(f => f.fieldname === row.fieldname);
                    if (field && this.excludedFieldTypes.includes(field.fieldtype)) {
                        row.valueOptions = [];
                        row.loadingValues = false;
                        return;
                    }
                    
                    if (row.fieldname === 'name') {
                        const cacheKey = `name_${this.targetDoctype}_${searchText || 'all'}`;
                        if (this.valueCache[cacheKey]) {
                            row.valueOptions = this.valueCache[cacheKey];
                            row.loadingValues = false;
                            this.$forceUpdate();
                            return;
                        }
                        
                        try {
                            const filters = searchText ? { name: ['like', `%${searchText}%`] } : {};
                            const res = await frappe.db.get_list(this.targetDoctype, {
                                fields: ['name'],
                                filters: filters,
                                limit_page_length: 500,
                                order_by: 'modified desc'
                            });
                            row.valueOptions = res.map(r => r.name);
                            this.valueCache[cacheKey] = row.valueOptions;
                        } catch (e) {
                            console.error("Failed to load ID values:", e);
                            row.valueOptions = [];
                        } finally {
                            row.loadingValues = false;
                            this.$forceUpdate();
                        }
                        return;
                    }
                    
                    if (!field) {
                        row.valueOptions = [];
                        row.loadingValues = false;
                        return;
                    }

                    row.valueOptions = [];
                    
                    if (field.fieldtype === 'Link' && field.options) {
                        const cacheKey = `link_${field.options}_${searchText || 'all'}`;
                        if (this.valueCache[cacheKey]) {
                            row.valueOptions = this.valueCache[cacheKey];
                            row.loadingValues = false;
                            this.$forceUpdate();
                            return;
                        }
                        
                        try {
                            const filters = searchText ? { name: ['like', `%${searchText}%`] } : {};
                            const res = await frappe.db.get_list(field.options, {
                                fields: ['name'],
                                filters: filters,
                                limit_page_length: 500,
                                order_by: 'modified desc'
                            });
                            row.valueOptions = res.map(r => r.name);
                            this.valueCache[cacheKey] = row.valueOptions;
                        } catch (e) {
                            console.error("Failed to load link values:", e);
                        } finally {
                            row.loadingValues = false;
                            this.$forceUpdate();
                        }
                    }
                    else if (field.fieldtype === 'Select' && field.options) {
                        row.valueOptions = field.options.split('\n').filter(Boolean);
                        row.loadingValues = false;
                        this.$forceUpdate();
                    }
                    else if (field.fieldtype === 'Check') {
                        row.valueOptions = ['0', '1'];
                        row.loadingValues = false;
                        this.$forceUpdate();
                    }
                    else if (['Date', 'Datetime'].includes(field.fieldtype)) {
                        row.valueOptions = [];
                        row.loadingValues = false;
                        this.$forceUpdate();
                    }
                    else {
                        const cacheKey = `field_${row.fieldname}_${this.targetDoctype}_${searchText || 'all'}`;
                        if (this.valueCache[cacheKey]) {
                            row.valueOptions = this.valueCache[cacheKey];
                            row.loadingValues = false;
                            this.$forceUpdate();
                            return;
                        }
                        
                        try {
                            const filters = searchText ? { [row.fieldname]: ['like', `%${searchText}%`] } : {};
                            const res = await frappe.db.get_list(this.targetDoctype, {
                                fields: [row.fieldname],
                                filters: filters,
                                limit_page_length: 500,
                                order_by: 'modified desc',
                                distinct: true
                            });
                            row.valueOptions = [...new Set(res.map(r => r[row.fieldname]).filter(v => v != null && v !== ''))].map(v => String(v));
                            this.valueCache[cacheKey] = row.valueOptions;
                        } catch (e) {
                            console.error("Failed to load field values:", e);
                            row.valueOptions = [];
                        } finally {
                            row.loadingValues = false;
                            this.$forceUpdate();
                        }
                    }
                },

                searchLinkValues(row, searchText) {
                    if (!row || !row.fieldname) return;
                    
                    const field = this.fieldMeta.find(f => f.fieldname === row.fieldname);
                    if (field && this.excludedFieldTypes.includes(field.fieldtype)) {
                        return;
                    }
                    
                    if (this.noValueOperators.includes(row.operator) || 
                        this.textInputOperators.includes(row.operator) ||
                        row.operator === 'is') {
                        return;
                    }
                    
                    row.searchText = searchText;
                    this.loadValueSuggestions(row, searchText);
                },

                getFieldOperators(fieldname) {
                    const field = this.fieldMeta.find(f => f.fieldname === fieldname);
                    if (field && this.excludedFieldTypes.includes(field.fieldtype)) {
                        return ['equals', 'not equals'];
                    }
                    
                    if (fieldname === 'name') {
                        return ['equals', 'not equals', 'is', 'like', 'not like', 'in', 'not in'];
                    }
                    
                    if (!field) return ['equals', 'not equals'];
                    
                    const baseOperators = ['equals', 'not equals', 'is'];
                    
                    let typeOperators = [];
                    switch (field.fieldtype) {
                        case 'Link': 
                        case 'Dynamic Link': 
                            typeOperators = ['in', 'not in', 'like'];
                            break;
                        case 'Select': 
                            typeOperators = ['in', 'not in'];
                            break;
                        case 'Date': 
                        case 'Datetime': 
                            typeOperators = ['greater than', 'less than', 'greater than or equal', 'less than or equal', 'between', 'timespan', 'previous', 'next'];
                            break;
                        case 'Int': 
                        case 'Float': 
                        case 'Currency': 
                        case 'Percent': 
                            typeOperators = ['greater than', 'less than', 'greater than or equal', 'less than or equal'];
                            break;
                        case 'Check': 
                            typeOperators = [];
                            break;
                        default: 
                            typeOperators = ['like', 'not like', 'in', 'not in'];
                    }
                    
                    return [...baseOperators, ...typeOperators];
                },

                getFieldType(fn) { 
                    if (fn === 'name') return 'Data';
                    const f = this.fieldMeta.find(f => f.fieldname === fn); 
                    return f?.fieldtype || 'Data'; 
                },
                isSelectField(fn) { return this.getFieldType(fn) === 'Select'; },
                isLinkField(fn) { return ['Link', 'Dynamic Link'].includes(this.getFieldType(fn)); },
                isDateField(fn) { 
                    if (fn === 'name') return false;
                    const f = this.fieldMeta.find(f => f.fieldname === fn);
                    if (f && this.excludedFieldTypes.includes(f.fieldtype)) return false;
                    return ['Date', 'Datetime'].includes(this.getFieldType(fn)); 
                },
                isTimeSpanOp(op) { return op && ['timespan', 'previous', 'next'].includes(op); },
                isBetweenOp(op) { return op === 'between'; },
                isTextInputOp(op) { return this.textInputOperators.includes(op); },
                isIsOp(op) { return op === 'is'; },
                isSelected(name) { return this.selectedItems.includes(name); },
                toggleItem(name) {
                    const idx = this.selectedItems.indexOf(name);
                    idx > -1 ? this.selectedItems.splice(idx, 1) : this.selectedItems.push(name);
                },
                isAllPageSelected() {
                    return this.previewData.length > 0 && this.previewData.every(item => this.selectedItems.includes(item.name));
                },
                toggleAllOnPage() {
                    if (this.isAllPageSelected()) {
                        const pageNames = this.previewData.map(item => item.name);
                        this.selectedItems = this.selectedItems.filter(name => !pageNames.includes(name));
                    } else {
                        this.previewData.forEach(item => {
                            if (!this.selectedItems.includes(item.name)) this.selectedItems.push(item.name);
                        });
                    }
                },
                formatValue(value) {
                    if (value === null || value === undefined) return '';
                    if (typeof value === 'object') return JSON.stringify(value);
                    return String(value);
                },
                sortByColumn(key) {
                    if (this.sortBy.length && this.sortBy[0].key === key) {
                        this.sortBy[0].order = this.sortBy[0].order === 'asc' ? 'desc' : 'asc';
                    } else {
                        this.sortBy = [{ key, order: 'asc' }];
                    }
                    this.loadPreviewData();
                },
                goToPage(page) {
                    if (page < 1 || page > this.totalPages) return;
                    this.page = page;
                    this.loadPreviewData();
                },
                prevPage() { if (this.page > 1) this.goToPage(this.page - 1); },
                nextPage() { if (this.page < this.totalPages) this.goToPage(this.page + 1); },
                onDoctypeChange() { 
                    this.filterRows = [{ 
                        fieldname: "name", 
                        operator: "equals", 
                        value: "", 
                        valueOptions: [], 
                        loadingValues: true, 
                        fromDate: '', 
                        toDate: '',
                        showFromPicker: false,
                        showToPicker: false,
                        showPicker: false,
                        searchText: ''
                    }]; 
                    this.fieldMeta = []; 
                    this.valueCache = {};
                    this.previewData = [];
                    this.totalRecords = 0;
                    this.showPreview = false;
                    this.selectedItems = [];
                    this.loadFields(); 
                },
                onFieldChange(row) {
                    if (!row) return;
                    const operators = this.getFieldOperators(row.fieldname);
                    row.operator = operators[0] || 'equals';
                    row.value = '';
                    row.valueOptions = [];
                    row.fromDate = '';
                    row.toDate = '';
                    row.showFromPicker = false;
                    row.showToPicker = false;
                    row.showPicker = false;
                    row.searchText = '';
                    this.loadValueSuggestions(row, '');
                    this.autoPreview();
                },
                onFilterValueChange() { 
                    this.autoPreview(); 
                },
                addFilter() {
                    const newRow = { 
                        fieldname: "name", 
                        operator: "equals", 
                        value: "", 
                        valueOptions: [], 
                        loadingValues: false, 
                        fromDate: '', 
                        toDate: '',
                        showFromPicker: false,
                        showToPicker: false,
                        showPicker: false,
                        searchText: ''
                    };
                    this.filterRows.push(newRow);
                    this.loadValueSuggestions(newRow, '');
                },
                removeFilter(i) { if (this.filterRows.length > 1) { this.filterRows.splice(i, 1); this.autoPreview(); } },
                
                formatDateToStr(date) {
                    if (!date) return '';
                    
                    if (typeof date === 'string') {
                        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                            return date;
                        }
                        if (date.includes('T')) {
                            const d = new Date(date);
                            if (!isNaN(d)) {
                                const year = d.getFullYear();
                                const month = String(d.getMonth() + 1).padStart(2, '0');
                                const day = String(d.getDate()).padStart(2, '0');
                                return `${year}-${month}-${day}`;
                            }
                        }
                        if (date.includes(' ') && !date.includes('T')) {
                            return date.split(' ')[0];
                        }
                        const parsed = new Date(date);
                        if (!isNaN(parsed)) {
                            const year = parsed.getFullYear();
                            const month = String(parsed.getMonth() + 1).padStart(2, '0');
                            const day = String(parsed.getDate()).padStart(2, '0');
                            return `${year}-${month}-${day}`;
                        }
                        return date;
                    }
                    
                    if (date instanceof Date && !isNaN(date)) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        return `${year}-${month}-${day}`;
                    }
                    
                    return '';
                },

                formatLikeValue(value) {
                    if (!value) return value;
                    if (value.includes('%')) return value;
                    return `%${value}%`;
                },

                buildFilters() {
                    const filters = [];
                    
                    for (const row of this.filterRows) {
                        if (!row || !row.fieldname) continue;
                        
                        const field = this.fieldMeta.find(f => f.fieldname === row.fieldname);
                        if (field && this.excludedFieldTypes.includes(field.fieldtype)) continue;
                        
                        if (!field && row.fieldname !== 'name') continue;
                        
                        const isDatetime = field?.fieldtype === 'Datetime';
                        const isDate = field?.fieldtype === 'Date';
                        const isCheckbox = field?.fieldtype === 'Check';
                        const op = this.operatorMap[row.operator] || row.operator;
                        
                        if (op === 'between' && row.fromDate && row.toDate) {
                            const fromDate = this.formatDateToStr(row.fromDate);
                            const toDate = this.formatDateToStr(row.toDate);
                            filters.push([row.fieldname, op, [fromDate, toDate]]);
                            continue;
                        }
                        
                        if (this.isTimeSpanOp(row.operator) && row.value) {
                            filters.push([row.fieldname, op, row.value]);
                            continue;
                        }
                        
                        if (row.operator === 'is') {
                            if (row.value === 'set') {
                                filters.push([row.fieldname, op, 'set']);
                            } else if (row.value === 'not set') {
                                filters.push([row.fieldname, op, 'not set']);
                            }
                            continue;
                        }
                        
                        if (row.value || row.value === 0 || row.value === false) {
                            let value = row.value;
                            
                            if (isCheckbox) {
                                value = parseInt(value) || 0;
                            }
                            
                            if ((row.operator === 'like' || row.operator === 'not like') && value && typeof value === 'string') {
                                value = this.formatLikeValue(value);
                            }
                            
                            if ((isDate || isDatetime) && value) {
                                if (typeof value === 'string') {
                                    if (value.includes('T') || value.includes(' ')) {
                                        value = this.formatDateToStr(value);
                                    } else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                                        // ...
                                    }
                                } else if (value instanceof Date) {
                                    value = this.formatDateToStr(value);
                                }
                            }
                            
                            if (op === 'in' && typeof value === 'string') {
                                value = value.split(',').map(v => v.trim());
                            }
                            
                            filters.push([row.fieldname, op, value]);
                        }
                    }
                    
                    return filters;
                },
                
                buildFiltersForJSON() {
                    const filters = [];
                    
                    for (const row of this.filterRows) {
                        if (!row || !row.fieldname) continue;
                        
                        const field = this.fieldMeta.find(f => f.fieldname === row.fieldname);
                        if (field && this.excludedFieldTypes.includes(field.fieldtype)) continue;
                        
                        if (!field && row.fieldname !== 'name') continue;
                        
                        const isDatetime = field?.fieldtype === 'Datetime';
                        const isDate = field?.fieldtype === 'Date';
                        const isCheckbox = field?.fieldtype === 'Check';
                        const op = this.operatorMap[row.operator] || row.operator;
                        
                        if (op === 'between' && row.fromDate && row.toDate) {
                            let fromDate = this.formatDateToStr(row.fromDate);
                            let toDate = this.formatDateToStr(row.toDate);
                            
                            if (isDatetime) {
                                fromDate = `${fromDate} 00:00:00`;
                                toDate = `${toDate} 23:59:59`;
                            }
                            
                            filters.push([row.fieldname, op, [fromDate, toDate]]);
                            continue;
                        }
                        
                        if (this.isTimeSpanOp(row.operator) && row.value) {
                            filters.push([row.fieldname, op, row.value]);
                            continue;
                        }
                        
                        if (row.operator === 'is') {
                            if (row.value === 'set') {
                                filters.push([row.fieldname, op, 'set']);
                            } else if (row.value === 'not set') {
                                filters.push([row.fieldname, op, 'not set']);
                            }
                            continue;
                        }
                        
                        if (row.value || row.value === 0 || row.value === false) {
                            let value = row.value;
                            
                            if (isCheckbox) {
                                value = parseInt(value) || 0;
                            }
                            
                            if ((row.operator === 'like' || row.operator === 'not like') && value && typeof value === 'string') {
                                value = this.formatLikeValue(value);
                            }
                            
                            if ((isDate || isDatetime) && value) {
                                if (typeof value === 'string') {
                                    if (value.includes('T') || value.includes(' ')) {
                                        value = this.formatDateToStr(value);
                                    } else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                                        // ...
                                    }
                                } else if (value instanceof Date) {
                                    value = this.formatDateToStr(value);
                                }
                                
                                if (isDatetime) {
                                    value = `${value} 00:00:00`;
                                }
                            }
                            
                            if (op === 'in' && typeof value === 'string') {
                                value = value.split(',').map(v => v.trim());
                            }
                            
                            filters.push([row.fieldname, op, value]);
                        }
                    }
                    
                    return filters;
                },
                
                autoPreview() {
                    if (!this.targetDoctype) return;
                    
                    const filters = this.buildFilters();
                    if (!filters.length) { 
                        this.showPreview = false; 
                        this.previewData = [];
                        this.totalRecords = 0;
                        return; 
                    }
                    this.page = 1; 
                    this.selectedItems = []; 
                    this.showPreview = true;
                    this.loadPreviewData();
                },
                
                async loadPreviewData() {
                    if (!this.targetDoctype) return;
                    const filters = this.buildFilters();
                    if (!filters.length) {
                        this.previewData = [];
                        this.totalRecords = 0;
                        return;
                    }
                    this.previewLoading = true;
                    try {
                        const fields = this.previewColumns.map(c => c.key);
                        const start = (this.page - 1) * this.itemsPerPage;
                        let allFilters = [...filters];
                        
                        if (this.search) {
                            allFilters.push(['name', 'like', `%${this.search}%`]);
                        }
                        
                        const sortStr = this.sortBy.length ? `${this.sortBy[0].key} ${this.sortBy[0].order}` : 'modified desc';
                        
                        const [data, count] = await Promise.all([
                            frappe.db.get_list(this.targetDoctype, { 
                                filters: allFilters, 
                                fields, 
                                limit_start: start, 
                                limit_page_length: this.itemsPerPage, 
                                order_by: sortStr 
                            }),
                            frappe.db.count(this.targetDoctype, { filters: allFilters })
                        ]);
                        
                        this.previewData = data || []; 
                        this.totalRecords = count || 0;
                    } catch (e) { 
                        console.error("Error loading preview:", e); 
                        this.previewData = []; 
                        this.totalRecords = 0; 
                    } finally { 
                        this.previewLoading = false; 
                    }
                },
                
                onSearch() { 
                    this.page = 1; 
                    this.loadPreviewData(); 
                },
                
                save() {
                    if (!this.targetDoctype) return frappe.msgprint("Select a DocType");
                    let newFilters = this.buildFiltersForJSON();
                    if (!newFilters.length) return frappe.msgprint("Add at least one filter");
                    if (this.selectedItems.length > 0) newFilters.push(["name", "in", [...this.selectedItems]]);
                    newFilters = this.mergeFilters(newFilters);
                    let existingConfig = [];
                    try {
                        const currentValue = frm.doc.doctype_data_migration;
                        if (currentValue && currentValue.trim() !== '' && currentValue !== '[]') {
                            existingConfig = JSON.parse(currentValue);
                            if (!Array.isArray(existingConfig)) existingConfig = [];
                        }
                    } catch (e) {
                        existingConfig = [];
                    }
                    
                    const existingIndex = existingConfig.findIndex(item => item.dt === this.targetDoctype);
                    
                    if (existingIndex > -1) {
                        let existingFilters = existingConfig[existingIndex].filters || [];
                        existingFilters = [...existingFilters, ...newFilters];
                        existingFilters = this.mergeFilters(existingFilters);
                        existingConfig[existingIndex].filters = existingFilters;
                        frappe.show_alert({ 
                            message: `${this.targetDoctype}: ${existingFilters.length} filters (Total: ${existingConfig.length} doctypes)`, 
                            indicator: "green" 
                        });
                    } else {
                        existingConfig.push({ dt: this.targetDoctype, filters: newFilters });
                        frappe.show_alert({ 
                            message: `Added ${this.targetDoctype} (Total: ${existingConfig.length} doctypes)`, 
                            indicator: "green" 
                        });
                    } 
                    frm.set_value("doctype_data_migration", JSON.stringify(existingConfig, null, 4));
                    dialog.hide();
                },
                
                mergeFilters(filters) {
                    const nameInValues = [];
                    const otherFilters = [];
                    const seenFilters = new Set();
                    
                    filters.forEach(filter => {
                        if (filter[0] === 'name' && filter[1] === 'in') {
                            if (Array.isArray(filter[2])) {
                                nameInValues.push(...filter[2]);
                            }
                        } else {
                            const filterKey = `${filter[0]}||${filter[1]}||${JSON.stringify(filter[2])}`;
                            if (!seenFilters.has(filterKey)) {
                                seenFilters.add(filterKey);
                                otherFilters.push(filter);
                            }
                        }
                    });
                    if (nameInValues.length > 0) {
                        const uniqueNames = [...new Set(nameInValues)];
                        otherFilters.push(["name", "in", uniqueNames]);
                    }
                    
                    return otherFilters;
                },
                
                clearAllFilters() {
                    if (this.filterRows.length <= 1 && !this.selectedItems.length && !this.showPreview) {
                        frappe.show_alert({
                            message: 'No filters to clear',
                            indicator: 'orange'
                        }, 5);
                        return;
                    }
                    
                    this.filterRows = [{ 
                        fieldname: "name", 
                        operator: "equals", 
                        value: "", 
                        valueOptions: [], 
                        loadingValues: false,
                        fromDate: '',
                        toDate: '',
                        showFromPicker: false,
                        showToPicker: false,
                        showPicker: false,
                        searchText: ''
                    }];
                    
                    this.selectedItems = [];
                    this.showPreview = false;
                    this.previewData = [];
                    this.totalRecords = 0;
                    this.search = '';
                    this.page = 1;
                    
                    this.loadValueSuggestions(this.filterRows[0], '');
                    this.$forceUpdate();
                    
                    frappe.show_alert({
                        message: 'Filters cleared successfully',
                        indicator: 'green'
                    }, 5); 
                },
            },
            watch: {
                targetDoctype(newVal, oldVal) {
                    if (newVal !== oldVal) {
                        this.filterRows = [{ 
                            fieldname: "name", 
                            operator: "equals", 
                            value: "", 
                            valueOptions: [], 
                            loadingValues: true, 
                            fromDate: '', 
                            toDate: '',
                            showFromPicker: false,
                            showToPicker: false,
                            showPicker: false,
                            searchText: ''
                        }]; 
                        this.fieldMeta = []; 
                        this.valueCache = {};
                        this.previewData = [];
                        this.totalRecords = 0;
                        this.showPreview = false;
                        this.selectedItems = [];
                        this.loadFields();
                    }
                }
            },
            template: `
        <div class="pa-4">
            <div class="text-caption font-weight-bold mb-1">DOCUMENT TYPE</div>
            <div v-if="loadingDoctypes" class="text-center py-2"><v-progress-circular indeterminate size="16" width="2"></v-progress-circular></div>
            <v-autocomplete v-else v-model="targetDoctype" :items="doctypeOptions" placeholder="Search and select DocType..." density="compact" variant="outlined" hide-details @update:model-value="onDoctypeChange"></v-autocomplete>
            <v-divider class="my-3"></v-divider>
            <div class="text-caption font-weight-bold mb-1">FILTERS</div>
            <div v-if="loadingFields" class="text-center py-2"><v-progress-circular indeterminate size="16" width="2"></v-progress-circular></div>
            <div v-else>
                <div v-for="(f,i) in filterRows" :key="i" class="d-flex align-center mb-1" style="gap:4px;flex-wrap:wrap">
                    <v-autocomplete v-model="f.fieldname" :items="filteredFieldMeta" item-title="label" item-value="fieldname" placeholder="Field" density="compact" variant="outlined" hide-details style="width:170px;min-width:170px" @update:model-value="onFieldChange(f)"></v-autocomplete>
                    <v-select v-model="f.operator" :items="getFieldOperators(f.fieldname)" placeholder="Op" density="compact" variant="outlined" hide-details style="width:140px;min-width:140px" @update:model-value="onFilterValueChange"></v-select>
                    
                    <div v-if="isDateField(f.fieldname) && isBetweenOp(f.operator)" style="display:flex;gap:4px;flex:1;min-width:320px;align-items:center;">
                        <v-menu
                            v-model="f.showFromPicker"
                            :close-on-content-click="false"
                            transition="scale-transition"
                            offset-y
                            min-width="auto"
                            style="flex:1;">
                            <template v-slot:activator="{ props }">
                                <v-text-field
                                    v-model="f.fromDate"
                                    placeholder="From date"
                                    density="compact"
                                    variant="outlined"
                                    hide-details
                                    readonly
                                    style="flex:1;min-width:150px;"
                                    v-bind="props"
                                    @click="f.showFromPicker = true">
                                    <template v-slot:prepend-inner>
                                        <v-icon size="small" color="primary" @click.stop="f.showFromPicker = !f.showFromPicker">mdi-calendar-start</v-icon>
                                    </template>
                                </v-text-field>
                            </template>
                            <v-date-picker
                                v-model="f.fromDate"
                                @update:model-value="f.showFromPicker = false; onFilterValueChange();">
                            </v-date-picker>
                        </v-menu>
                        
                        <span style="color:var(--text-muted);font-weight:500;padding:0 4px;">to</span>
                        
                        <v-menu
                            v-model="f.showToPicker"
                            :close-on-content-click="false"
                            transition="scale-transition"
                            offset-y
                            min-width="auto"
                            style="flex:1;">
                            <template v-slot:activator="{ props }">
                                <v-text-field
                                    v-model="f.toDate"
                                    placeholder="To date"
                                    density="compact"
                                    variant="outlined"
                                    hide-details
                                    readonly
                                    style="flex:1;min-width:150px;"
                                    v-bind="props"
                                    @click="f.showToPicker = true">
                                    <template v-slot:prepend-inner>
                                        <v-icon size="small" color="primary" @click.stop="f.showToPicker = !f.showToPicker">mdi-calendar-end</v-icon>
                                    </template>
                                </v-text-field>
                            </template>
                            <v-date-picker
                                v-model="f.toDate"
                                @update:model-value="f.showToPicker = false; onFilterValueChange();">
                            </v-date-picker>
                        </v-menu>
                    </div>
                    
                    <div v-if="isDateField(f.fieldname) && !isBetweenOp(f.operator) && !isTimeSpanOp(f.operator)" style="flex:1;min-width:160px;">
                        <v-menu
                            v-model="f.showPicker"
                            :close-on-content-click="false"
                            transition="scale-transition"
                            offset-y
                            min-width="auto">
                            <template v-slot:activator="{ props }">
                                <v-text-field
                                    v-model="f.value"
                                    placeholder="Select date..."
                                    density="compact"
                                    variant="outlined"
                                    hide-details
                                    readonly
                                    style="width:100%"
                                    v-bind="props"
                                    @click="f.showPicker = true">
                                    <template v-slot:prepend-inner>
                                        <v-icon size="small" color="primary" @click.stop="f.showPicker = !f.showPicker">mdi-calendar</v-icon>
                                    </template>
                                </v-text-field>
                            </template>
                            <v-date-picker
                                v-model="f.value"
                                @update:model-value="f.showPicker = false; onFilterValueChange();">
                            </v-date-picker>
                        </v-menu>
                    </div>
                    
                    <v-select 
                        v-if="isDateField(f.fieldname) && isTimeSpanOp(f.operator)"
                        v-model="f.value" 
                        :items="timeSpanOptions" 
                        placeholder="Select period..." 
                        density="compact" 
                        variant="outlined" 
                        hide-details 
                        style="flex:1;min-width:160px"
                        @update:model-value="onFilterValueChange">
                    </v-select>
                    
                    <v-select 
                        v-if="isIsOp(f.operator)"
                        v-model="f.value"
                        :items="isOptions"
                        placeholder="Select set or not set..."
                        density="compact"
                        variant="outlined"
                        hide-details
                        style="flex:1;min-width:160px"
                        @update:model-value="onFilterValueChange">
                    </v-select>
                    
                    <v-text-field 
                        v-if="!isDateField(f.fieldname) && isTextInputOp(f.operator)"
                        v-model="f.value"
                        :placeholder="f.operator === 'in' || f.operator === 'not in' ? 'Enter comma-separated values...' : 'Enter value...'"
                        density="compact"
                        variant="outlined"
                        hide-details
                        style="flex:1;min-width:160px"
                        @update:model-value="onFilterValueChange">
                    </v-text-field>
                    
                    <v-autocomplete 
                        v-if="!isDateField(f.fieldname) && !isTextInputOp(f.operator) && !isIsOp(f.operator) && !noValueOperators.includes(f.operator)"
                        v-model="f.value" 
                        :items="f.valueOptions" 
                        :loading="f.loadingValues"
                        placeholder="Search..."
                        density="compact" 
                        variant="outlined" 
                        hide-details 
                        style="flex:1;min-width:160px"
                        @update:model-value="onFilterValueChange"
                        @update:search="(search) => searchLinkValues(f, search)">
                        <template v-slot:no-data>
                            <v-list-item>
                                <v-list-item-title>{{ f.loadingValues ? 'Loading...' : 'No results found' }}</v-list-item-title>
                            </v-list-item>
                        </template>
                    </v-autocomplete>

                    <v-btn icon size="x-small" variant="text" @click="removeFilter(i)" :disabled="filterRows.length === 1">
                        <v-icon size="14">mdi-close</v-icon>
                    </v-btn>
                </div>
                <div class="d-flex align-center mt-2" style="gap:8px">
                    <v-btn size="x-small" variant="text" @click="addFilter" class="mt-1">
                        + Add Filters
                    </v-btn>
                    <v-btn size="x-small" variant="text" color="error" @click="clearAllFilters" class="mt-1">
                        Clear Filters
                    </v-btn>
                </div>
            </div>
            
            <v-expand-transition>
                <div v-if="showPreview" class="mt-3">
                    <v-divider class="mb-3"></v-divider>
                    <div class="d-flex align-center justify-space-between mb-2">
                        <span class="text-body-2 font-weight-medium">{{ targetDoctype }} ({{ totalRecords.toLocaleString() }} records)</span>
                        <div class="d-flex align-center" style="gap:8px">
                            <v-chip v-if="selectedItems.length" size="small" variant="tonal">{{ selectedItems.length }} selected</v-chip>
                            <v-progress-circular v-if="previewLoading" indeterminate size="16" width="2"></v-progress-circular>
                        </div>
                    </div>
                    <div class="d-flex align-center mb-2" style="gap:8px;flex-wrap:wrap">
                        <v-text-field v-model="search" @update:model-value="onSearch" prepend-inner-icon="mdi-magnify" placeholder="Search in results..." density="compact" variant="outlined" hide-details clearable style="flex:1;min-width:150px"></v-text-field>
                        <v-btn v-if="selectedItems.length" size="small" variant="text" @click="selectedItems = []">Clear Selection</v-btn>
                    </div>
                    
                    <v-table density="compact" class="border rounded">
                        <thead>
                            <tr>
                                <th style="width:48px;text-align:center">
                                    <v-checkbox :model-value="isAllPageSelected()" @update:model-value="toggleAllOnPage()" density="compact" hide-details class="ma-0 pa-0 d-inline-flex"></v-checkbox>
                                </th>
                                <th v-for="col in previewColumns" :key="col.key" @click="sortByColumn(col.key)" style="cursor:pointer;white-space:nowrap;">
                                    {{ col.title }}
                                    <v-icon v-if="sortBy.length && sortBy[0].key === col.key" size="14">{{ sortBy[0].order === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="previewLoading">
                                <td :colspan="previewColumns.length + 1" class="text-center py-4">
                                    <v-progress-circular indeterminate size="24" width="3"></v-progress-circular>
                                    <span class="ml-2">Loading data...</span>
                                </td>
                            </tr>
                            <tr v-else-if="previewData.length === 0">
                                <td :colspan="previewColumns.length + 1" class="text-center py-4 text-muted">
                                    No records found matching your filters
                                </td>
                            </tr>
                            <tr v-for="item in previewData" :key="item.name" v-else>
                                <td style="text-align:center">
                                    <v-checkbox :model-value="isSelected(item.name)" @update:model-value="toggleItem(item.name)" density="compact" hide-details class="ma-0 pa-0 d-inline-flex"></v-checkbox>
                                </td>
                                <td v-for="col in previewColumns" :key="col.key">{{ formatValue(item[col.key]) }}</td>
                            </tr>
                        </tbody>
                    </v-table>
                    
                    <div class="d-flex align-center justify-center mt-3" style="gap:4px">
                        <v-btn icon size="small" variant="text" :disabled="page <= 1" @click="prevPage">
                            <v-icon>mdi-chevron-left</v-icon>
                        </v-btn>
                        <v-btn 
                            v-for="p in totalPages" 
                            :key="p" 
                            size="x-small" 
                            :variant="p === page ? 'tonal' : 'text'" 
                            :color="p === page ? 'primary' : ''" 
                            @click="goToPage(p)" 
                            class="px-2" 
                            style="min-width:32px" 
                            v-show="p === 1 || p === totalPages || Math.abs(p - page) <= 2">
                            {{ p }}
                        </v-btn>
                        <v-btn icon size="small" variant="text" :disabled="page >= totalPages" @click="nextPage">
                            <v-icon>mdi-chevron-right</v-icon>
                        </v-btn>
                    </div>
                </div>
            </v-expand-transition>
            
            <v-divider class="my-3"></v-divider>
            <div class="d-flex justify-end">
                <v-btn size="small" variant="tonal" color="primary" @click="save">
                    Save Filter
                </v-btn>
            </div>
        </div>`
            });
        }


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
                            frm.set_value("is_sync_github", 1);
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
                        if (!frm.doc.is_sync_github && frm.doc.docstatus === 1) {
                            frm.add_custom_button(__("Sync"), () => {
                                sync_(frm);
                            });
                        }
                    }
                });
        }
    });