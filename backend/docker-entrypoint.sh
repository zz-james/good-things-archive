#!/bin/sh
set -e

# Write db.ini from environment variables
cat > /var/www/html/db.ini <<EOF
[database]
host     = "${DB_HOST:-db}"
username = "${DB_USER:-omeka}"
password = "${DB_PASSWORD:-omeka}"
dbname   = "${DB_NAME:-omeka}"
prefix   = "${DB_PREFIX:-omeka_}"
charset  = "utf8"
EOF

# Write test config if test env vars are provided
if [ -n "${TEST_DB_HOST}" ]; then
    cp /var/www/html/application/tests/config.ini.changeme \
       /var/www/html/application/tests/config.ini
    sed -i "s|db.host = \"\"|db.host = \"${TEST_DB_HOST}\"|" application/tests/config.ini
    sed -i "s|db.username = \"\"|db.username = \"${TEST_DB_USER:-omeka}\"|" application/tests/config.ini
    sed -i "s|db.password = \"\"|db.password = \"${TEST_DB_PASSWORD:-omeka}\"|" application/tests/config.ini
    sed -i "s|db.dbname = \"\"|db.dbname = \"${TEST_DB_NAME:-omeka_test}\"|" application/tests/config.ini
    sed -i "s|paths.imagemagick = \"\"|paths.imagemagick = \"/usr/bin/\"|" application/tests/config.ini
fi

exec "$@"
