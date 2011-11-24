#!/bin/sh
sql=`dirname $0`
cat $sql/reset_database.sql $sql/create_tables.sql $sql/fill_database.sql | mysql -p counterpointy
