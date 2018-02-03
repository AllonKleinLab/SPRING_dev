#!/bin/bash
echo $1 > logsub
cgi-bin/spring_from_selection_execute.online.py $1/params.pickle > logsub2 2>&1 &
