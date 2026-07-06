### ERPNext Database Migration & DBSync Support

This document outlines the process and support provided for ERPNext database migration and DBSync operations in a production environment. It aims to ensure a smooth transition with minimal downtime while maintaining data integrity.

- Migrating ERPNext databases between environments (e.g., Development → Production, Staging → Production)

- Synchronizing database changes between instances


### 🔧 Required Environment Variables

site_config.json

```
{
  "migration_capture_enabled": 1,
}
```

### 🚀 Installation

You can install this app using the bench CLI:

```
bench get-app https://gitea.in1.justcloudify.net/elbrit/erpnext_dbsync.git

bench --site yoursite install-app erpnext_dbsync

bench --site yoursite migrate

bench restart

```


### License

mit
