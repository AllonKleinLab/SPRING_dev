#!/usr/bin/env python
import helper_functions
import cgi, cgitb, pickle, os, json
cgitb.enable()  # for troubleshooting
data = cgi.FieldStorage()


cwd = os.getcwd()
if cwd.endswith('cgi-bin'):
    os.chdir('../')


filepath = data.getvalue('path')
content = data.getvalue('content')
if os.path.exists(filepath):
	old_data = json.load(open(filepath))
	new_data = json.loads(content)
	for d in new_data:
		already_exists = False
		for dd in old_data:
			if check_same(d,dd): already_exists = True
		if not already_exists:
			old_data.append(d)
	content = json.dumps(old_data)

open(filepath,'w').write(content)

print "Content-Type: text/html\n"
print 'sucess'
