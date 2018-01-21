#!/bin/bash
echo $1 > logsub3
cgi-bin/download_expression.execute.py $1 > logsub4 2>&1 &
