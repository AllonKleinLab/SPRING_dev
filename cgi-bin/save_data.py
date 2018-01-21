#!/usr/bin/env python
import helper_functions
import cgi, cgitb, pickle, os
cgitb.enable()  # for troubleshooting
data = cgi.FieldStorage()

filepath = data.getvalue('path')
content = data.getvalue('content')
#open('REPORT.txt','w').write(filepath.replace('_clustmp','WOW'))
open(filepath,'w').write(content)
if 'clustering_data' in filepath: 
	os.system('cp '+filepath+' '+filepath.replace('_clustmp',''))
	os.system('rm -f '+filepath)

print "Content-Type: text/html\n"
print 'sucess'
