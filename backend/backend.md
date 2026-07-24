## Commands

**Build distribution:**

```bash
ant zip         # requires -Dversion=X.Y.Z
ant changeme    # copy .changeme template files into place
```

**Tests:**

```bash
cd application/tests
../../vendor/bin/phpunit                                      # all tests
../../vendor/bin/phpunit suite/Models/UserTest.php            # single file
../../vendor/bin/phpunit --filter testMethodName              # single test
ant test                                                      # via ant
```

Tests require a MySQL `omeka_test` database. Copy `application/tests/config.ini.changeme` → `config.ini` and fill in credentials.

**Translations:**

```bash
ant update-pot   # update .pot translation template
ant build-mo     # compile .mo files
```

**CI:** `.github/workflows/ci.yml` runs PHPUnit against PHP 7.1–8.5 matrix.

## Architecture

Omeka Classic is a PHP digital collections platform built on **Zend Framework 1.x** with MySQL.

### Request lifecycle

`index.php` → `bootstrap.php` (defines constants, sets up autoloader) → `Omeka_Application` (extends `Zend_Application`) → standard ZF1 MVC dispatch → controller → phtml view.

### Key directories

- `application/controllers/` — action controllers (Items, Collections, Files, Users, etc.)
- `application/models/` — domain models; records extend `Omeka_Record_AbstractRecord`; tables extend `Omeka_Db_Table`
- `application/views/scripts/` — phtml templates split into `admin/` and `public/` subdirectories
- `application/libraries/Omeka/` — framework-level code (plugin broker, ACL, auth, storage, jobs, etc.)
- `application/libraries/globals.php` — ~1500-line helper function library; `get_option()`, `fire_plugin_hook()`, `get_records()`, etc. used throughout views/controllers
- `application/migrations/` — sequential DB migration scripts
- `application/schema/` — canonical DB schema
- `plugins/` — bundled plugins as git submodules (ExhibitBuilder, SimplePages, Coins)
- `themes/` — public themes as git submodules

### Plugin system

Plugins extend `Omeka_Plugin_AbstractPlugin`, declare hooks/filters in `$_hooks`/`$_filters` arrays, and are brokered via `Omeka_Plugin_Broker`. Hook calls: `fire_plugin_hook('hook_name', ['args'])`. Filter calls: `apply_filters('filter_name', $value, ['args'])`.

### Metadata model

Flexible metadata uses `ElementSet` → `Element` → `ElementText` tables. Items/Collections/Files each have element texts attached. Dublin Core is the default element set.

### Storage

`Omeka_Storage` abstraction; adapters for filesystem (`Omeka_Storage_Adapter_Filesystem`) and S3 (`Omeka_Storage_Adapter_ZendS3`). Configured via `config.ini`.

### Background jobs

`Omeka_Job_Dispatcher_Default` dispatches jobs synchronously or via background process (`Omeka_Job_Process_Dispatcher`). Job classes live in `application/models/Job/`.

### Configuration files

- `db.ini` (from `db.ini.changeme`) — database credentials
- `application/config/config.ini` (from `config.ini.changeme`) — site settings (storage, mail, image derivatives, etc.)
- `.htaccess` (from `.htaccess.changeme`) — Apache rewrite rules

### Environment

`APPLICATION_ENV` env var controls environment (`production`, `development`, `testing`). Set `OMEKA_REPORT_DEPRECATED=1` to surface deprecation notices.
