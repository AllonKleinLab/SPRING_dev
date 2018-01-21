#!/usr/bin/env python

import numpy
import cgi, cgitb, pickle, os, pickle
cgitb.enable()  # for troubleshooting
data = cgi.FieldStorage()

log = pickle.load(open('dataset_log.p'))
name = data.getvalue('name')
key = data.getvalue('key')


if not (name in log and os.path.exists('client_datasets/'+name)): 
	response = 'Invalid:The dataset "'+name+'" does not exist. Click "Upload new dataset" to create a dataset with this name'
if name in log and log[name] != key: 
	response = 'Invalid:Incorrect password for the dataset "'+name+'"'
if name in log and log[name] == key and os.path.exists('client_datasets/'+name):
	if not (os.path.exists('client_datasets/'+name+'/expression_matrix.txt') or os.path.exists('client_datasets/'+name+'/expression_matrix.npy.gz')):
		response = 'Invalid:The dataset "'+name+'" exists but no expression data has been uploaded'
	else: 
		params = {'p': 50, 'k': 5, 'min_reads': 1000.0, 'min_exp': 0.05, 'min_cv': 2.0}
		if os.path.exists('client_datasets/'+name+'/params.p'):
			params = pickle.load(open('client_datasets/'+name+'/params.p'))		
		response = 'Success'
		for k in ['p','k','min_reads','min_exp','min_cv']:
			response += ':'+repr(params[k])
#this is the actual output
print "Content-Type: text/html\n"
print response
