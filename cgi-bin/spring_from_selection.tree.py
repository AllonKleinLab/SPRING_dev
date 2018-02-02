#!/groups/kleintools/py27/bin/python

import cgi
import cgitb
cgitb.enable()  # for troubleshooting
print "Content-Type: text/html"
print

import os
import pickle
import numpy as np
import subprocess
import json
import numpy as np

cwd = os.getcwd()
if cwd.endswith('cgi-bin'):
    os.chdir('../')
#####################
# CGI
do_the_rest = True

data = cgi.FieldStorage()
base_dir = data.getvalue('base_dir')
current_dir_short = data.getvalue('current_dir').strip('/')
new_dir_short = data.getvalue('new_dir').strip('/')

# ERROR HANDLING HERE
selected_clusters = data.getvalue('selected_clusters')
compared_clusters = data.getvalue('compared_clusters')
current_dir = base_dir + current_dir_short
new_dir = base_dir + new_dir_short
this_url = 'https://kleintools.hms.harvard.edu/tools/springViewer_1_6_dev.html'

all_errors = []

if selected_clusters is None:
    all_errors.append('No clusters selected.<br>')
    do_the_rest = False
if compared_clusters is None:
    compared_clusters = ''

if os.path.exists(new_dir + "/run_info.json"):
    all_errors.append('A plot called "%s" already exists. Please enter a different <font color="red">name of plot</font>.<br>' %new_dir_short)
    do_the_rest = False

bad_chars = [" ", "/", "\\", ",", ":", "#", "\"", "\'"]
found_bad = []
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
    all_errors.append('Enter a valid <font color="red">email address</font>.<br>')
    do_the_rest = False

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
        
        cat_dat = json.load(open(base_dir + '/base/categorical_coloring_data.json'))
        clust_labels = np.array(cat_dat['Cluster Label']['label_list'])
        all_clusters =  np.array(selected_clusters.split(',')+compared_clusters.split(','))
        selected_clusters = np.array(selected_clusters.split(','))
        
        base_filter = np.nonzero(np.in1d(clust_labels, selected_clusters))[0]
        extra_filter = np.nonzero(np.in1d(clust_labels, all_clusters))[0]
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
        
        params_filename = new_dir + "/params.pickle"
        params_file = open(params_filename, 'wb')
        pickle.dump(params_dict, params_file, -1)
        params_file.close()

        print 'Everything looks good. Now running...<br>'
        print 'This could take a minute or two. Feel free to exit.<br>'
        print 'You\'ll receive an email when your dataset is ready.<br>'

        o = open(new_dir + '/lognewspring2.txt', 'w')
        o.write('Started processing<br>\n')
        o.close()

        subprocess.call(["cgi-bin/new_spring_submit.sh", new_dir])
        
    except:
        print 'Error starting processing!<br>'

