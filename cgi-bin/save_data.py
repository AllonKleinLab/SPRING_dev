#!/usr/bin/env python
import helper_functions
import cgi, cgitb, pickle, os
cgitb.enable()  # for troubleshooting
data = cgi.FieldStorage()


cwd = os.getcwd()
if cwd.endswith('cgi-bin'):
    os.chdir('../')


filepath = data.getvalue('path')
content = data.getvalue('content')

if filepath.endswith('coordinates.txt'):
	if os.path.exists(filepath):
		import datetime
		dt = datetime.datetime.now().isoformat().replace(':','-').split('.')[0]
		backup = filepath.replace('coordinates.txt','coordinates_'+dt+'.txt')
		open(backup,'w').write(open(filepath).read())

open(filepath,'w').write(content)
if 'clustering_data' in filepath: 
	os.system('cp '+filepath+' '+filepath.replace('_clustmp',''))
	os.system('rm -f '+filepath)

print "Content-Type: text/html\n"
print 'sucess'
