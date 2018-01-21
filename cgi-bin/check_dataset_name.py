#!/usr/bin/env python

import os,cgi, cgitb, pickle
cgitb.enable()  # for troubleshooting
data = cgi.FieldStorage()

log = pickle.load(open('dataset_log.p'))
status = 'Valid'
if data.getvalue('name') in log and data.getvalue('key') != log[data.getvalue('name')]: status = 'Invalid'

#this is the actual output
print "Content-Type: text/html\n"
print status
