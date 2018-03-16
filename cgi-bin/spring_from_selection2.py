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

import spring_from_selection_execute

cwd = os.getcwd()
if cwd.endswith('cgi-bin'):
	os.chdir('../')

#####################
# CGI
do_the_rest = True

data = cgi.FieldStorage()
base_dir = data.getvalue('base_dir')
current_dir_short = data.getvalue('current_dir').strip('/')
new_dir_short = data.getvalue('new_dir')

# ERROR HANDLING HERE
base_filter = data.getvalue('selected_cells')
current_dir = base_dir + '/' + current_dir_short
this_url = data.getvalue('this_url')

all_errors = []

if new_dir_short is None:
	all_errors.append('Enter a <font color="red">name of plot</font><br>')
	do_the_rest = False
else:
	new_dir_short = new_dir_short.strip('/')
	new_dir = base_dir + '/' + new_dir_short


if base_filter is None:
	all_errors.append('No cells selected.<br>')
	do_the_rest = False

if not new_dir_short is None:
	if os.path.exists(new_dir + "/run_info.json"):
		all_errors.append('A plot called "%s" already exists. Please enter a different <font color="red">name of plot</font>.<br>' %new_dir_short)
		do_the_rest = False

bad_chars = [" ", "/", "\\", ",", ":", "#", "\"", "\'"]
found_bad = []
if not new_dir_short is None:
	for b in bad_chars:
		if b in new_dir_short:
			do_the_rest = False
			if b == " ":
				found_bad.append('space')
			else:
				found_bad.append(b)
if len(found_bad) > 0:
	all_errors.append('Enter a <font color="red">name of plot</font> without the following characters: <font face="courier">%s</font><br>' %('   '.join(found_bad)))

# ERROR HANDLING
try:
	user_email = data.getvalue('email')
	if "@" not in user_email:
		all_errors.append('Enter a valid <font color="red">email address</font>.<br>')
		do_the_rest = False
except:
	user_email = ''

try:
	min_cells = int(data.getvalue('minCells'))
except:
	all_errors.append('Enter a number for <font color="red">min expressing cells</font>.<br>')
	do_the_rest = False

try:
	min_counts = float(data.getvalue('minCounts'))
except:
	all_errors.append('Enter a number for <font color="red">min number of UMIs</font>.<br>')
	do_the_rest = False

try:
	min_vscore_pctl = float(data.getvalue('varPctl'))
	if min_vscore_pctl > 100 or min_vscore_pctl < 0:
		all_errors.append('Enter a value 0-100 for <font color="red">gene variability</font>.<br>')
		do_the_rest = False
except:
	all_errors.append('Enter a value 0-100 for <font color="red">gene variability</font>.<br>')
	do_the_rest = False

try:
	num_pc = int(data.getvalue('numPC'))
	if num_pc < 1:
		all_errors.append('Enter an integer >0 for <font color="red">number of principal components</font>.<br>')
		do_the_rest = False
except:
	all_errors.append('Enter an integer >0 for <font color="red">number of principal components</font>.<br>')
	do_the_rest = False

try:
	k_neigh = int(data.getvalue('kneigh'))
	if k_neigh < 1:
		all_errors.append('Enter an integer >0 for <font color="red">number of nearest neighbors</font>.<br>')
		do_the_rest = False
except:
	all_errors.append('Enter an integer >0 for <font color="red">number of nearest neighbors</font>.<br>')
	do_the_rest = False

try:
	num_fa2_iter = int(data.getvalue('nIter'))
	if num_fa2_iter < 1:
		all_errors.append('Enter an integer >0 for <font color="red">number of force layout iterations</font>.<br>')
		do_the_rest = False
except:
	all_errors.append('Enter an integer >0 for <font color="red">number of force layout iterations</font>.<br>')
	do_the_rest = False

try:
	description = data.getvalue('description')
except:
	description = ''

try:
	animate = data.getvalue('animate')
except:
	animate = 'No'

try:
	project_filter = data.getvalue('compared_cells')
	project_filter = np.sort(np.array(map(int,project_filter.split(','))))
except:
	project_filter = np.array([])
	

try:
	include_exclude = data.getvalue('include_exclude')
	custom_genes = data.getvalue('custom_genes').replace('\r','\n').split('\n')
except:
	include_exclude = 'Exclude'
	custom_genes = []


if not do_the_rest:
	#os.rmdir(new_dir)
	print 'Invalid input!<br>'
	for err in all_errors:
		print '>  %s' %err

else:

	try:
		if os.path.exists(new_dir):
			import shutil
			shutil.rmtree(new_dir)
		os.makedirs(new_dir)

		base_filter = np.sort(np.array(map(int,base_filter.split(','))))
		extra_filter = np.array(np.sort(np.hstack((base_filter,project_filter))),dtype=int)
		base_ix = np.nonzero([(i in base_filter) for i in extra_filter])[0]

		params_dict = {}
		params_dict['extra_filter'] = extra_filter
		params_dict['base_ix'] = base_ix
		params_dict['base_dir'] = base_dir
		params_dict['current_dir'] = current_dir
		params_dict['new_dir'] = new_dir
		params_dict['current_dir_short'] = current_dir_short
		params_dict['new_dir_short'] = new_dir_short
		params_dict['min_vscore_pctl'] = min_vscore_pctl
		params_dict['min_cells'] = min_cells
		params_dict['min_counts'] = min_counts
		params_dict['k_neigh'] = k_neigh
		params_dict['num_pc'] = num_pc
		params_dict['num_fa2_iter'] = num_fa2_iter
		params_dict['this_url'] = this_url
		params_dict['description'] = description
		params_dict['user_email'] = user_email
		params_dict['animate'] = animate
		params_dict['include_exclude'] = include_exclude
		params_dict['custom_genes'] = custom_genes

		params_filename = new_dir + "/params.pickle"
		params_file = open(params_filename, 'wb')
		pickle.dump(params_dict, params_file, -1)
		params_file.close()

		#print 'Everything looks good. Now running...<br>'
		#print 'This could take several minutes.<br>'
		#if user_email != '': print 'You will be notified of completion by email.<br>'

		o = open(new_dir + '/lognewspring2.txt', 'w')
		o.write('Processing...<br>\n')
		o.close()

		output_message = spring_from_selection_execute.execute_spring(params_filename)
		print output_message

	except:
		print 'Error starting processing!<br>'
