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


form = cgi.FieldStorage()

# Get filename here.
proj_dir = form.getvalue('base_dir').strip('\n')
sub_dir = form.getvalue('sub_dir').strip('\n')

if not os.path.exists(proj_dir+'/archive'):
	os.system('mkdir '+proj_dir+'/archive')

from shutil import move
move(proj_dir + '/' + sub_dir, proj_dir + '/archive/' + sub_dir)




