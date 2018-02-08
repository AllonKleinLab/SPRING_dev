#!/usr/bin/env python
import cgi
import cgitb
import os

cwd = os.getcwd()
if cwd.endswith('cgi-bin'):
    os.chdir('../')


cgitb.enable()  # for troubleshooting
print "Content-Type: text/html"
print 


data = cgi.FieldStorage()
path = data.getvalue('path')
filename = data.getvalue('filename')
out = []
for f in os.listdir(path):
	if os.path.exists(path+'/'+f+'/'+filename):
		out.append(f)
print ','.join(sorted(out,key=lambda x: x.lower()))
