#!/bin/sh
sql=`dirname $0`
cat $sql/reset_database.sql $sql/create_tables.sql | mysql -p counterpointy
