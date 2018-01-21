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

#####################
# CGI
do_the_rest = True

data = cgi.FieldStorage()
base_dir = data.getvalue('base_dir')[8:]
current_dir = data.getvalue('current_dir')[8:]
extra_filter = data.getvalue('selected_cells')

if do_the_rest:
    try:
        rand_suffix = ''.join(str(time.time()).split('.'))

        extra_filter = np.sort(np.array(map(int,extra_filter.split(','))))

        params_dict = {}
        params_dict['extra_filter'] = extra_filter
        params_dict['base_dir'] = base_dir
        params_dict['current_dir'] = current_dir
        params_dict['user_email'] = 'swolock@gmail.com'
        params_dict['rand_suffix'] = rand_suffix

        out_dir = 'downloads/'
        params_filename = "downloads/tmp_" + rand_suffix + "/download_params.pickle"
        os.makedirs("downloads/tmp_" + rand_suffix)
        params_file = open(params_filename, 'wb')
        pickle.dump(params_dict, params_file, -1)
        params_file.close()

        print 'Everything looks good. Now running...<br>'
        print 'This could take a minute or two. Feel free to exit.<br>'
        print 'You\'ll receive an email when your dataset is ready.<br>'

        subprocess.call(["cgi-bin/download_expression.submit.sh", params_filename])
    except:
        print 'Error starting processing!<br>'
