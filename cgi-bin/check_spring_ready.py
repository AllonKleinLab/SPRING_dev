#!/usr/bin/env python

import cgi, cgitb, os
cgitb.enable()  # for troubleshooting
data = cgi.FieldStorage()

status = "Invalid"
name = data.getvalue('name')
if os.path.exists('./client_datasets/'+name+'/graph_data.json'): status = "Valid"


#this is the actual output
print "Content-Type: text/html\n"
print status
