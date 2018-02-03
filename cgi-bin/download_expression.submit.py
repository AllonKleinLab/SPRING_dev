#!/usr/bin/env python
import cgi
import cgitb
cgitb.enable()  # for troubleshooting
print "Content-Type: text/html"
print

import os
import pickle
import numpy as np
import subprocess
import time

cwd = os.getcwd()
if cwd.endswith('cgi-bin'):
    os.chdir('../')
#####################
# CGI
do_the_rest = True

data = cgi.FieldStorage()
base_dir = data.getvalue('base_dir')
current_dir = data.getvalue('current_dir')
extra_filter = data.getvalue('selected_cells')
user_email = data.getvalue('email')
selection_name = data.getvalue('selection_name')
my_url_origin = data.getvalue('my_origin')

all_errors = []

if selection_name is None:
	all_errors.append('Enter a <font color="red">cell subset name</font><br>')
	do_the_rest = False

if extra_filter is None:
	all_errors.append('No cells selected.<br>')
	do_the_rest = False

bad_chars = [" ", "/", "\\", ",", ":", "#", "\"", "\'"]
found_bad = []
if not selection_name is None:
	for b in bad_chars:
		if b in selection_name:
			do_the_rest = False
			if b == " ":
				found_bad.append('space')
			else:
				found_bad.append(b)
if len(found_bad) > 0:
	all_errors.append('Enter a <font color="red">cell subset name</font> without the following characters: <font face="courier">%s</font><br>' %('   '.join(found_bad)))

try:
	user_email = data.getvalue('email')
	if "@" not in user_email:
		all_errors.append('Enter a valid <font color="red">email address</font>.<br>')
		do_the_rest = False
except:
	user_email = ''

if not do_the_rest:
	#os.rmdir(new_dir)
	print 'Invalid input!<br>'
	for err in all_errors:
		print '>  %s' %err
else:
    try:

        rand_suffix = ''.join(str(time.time()).split('.'))
        extra_filter = np.sort(np.array(map(int,extra_filter.split(','))))


        params_dict = {}
        params_dict['extra_filter'] = extra_filter
        params_dict['base_dir'] = base_dir
        params_dict['current_dir'] = current_dir
        params_dict['user_email'] = user_email
        params_dict['rand_suffix'] = rand_suffix
        params_dict['selection_name'] = selection_name
        params_dict['my_url_origin'] = my_url_origin

        out_dir = 'downloads/'
        params_filename = "downloads/" + selection_name + "." + rand_suffix + "/download_params.pickle"
        os.makedirs("downloads/" + selection_name + "." + rand_suffix)
        params_file = open(params_filename, 'wb')
        pickle.dump(params_dict, params_file, -1)
        params_file.close()

        print 'Preparing data...<br>'
        print 'This may take several minutes.<br>'
        print 'You will be notified of completion by email.<br>'
        print '<br>Feel free to close this window.<br>'

        subprocess.call(["cgi-bin/download_expression.submit.sh", params_filename])
    except:
        print 'Error starting processing!<br>'
