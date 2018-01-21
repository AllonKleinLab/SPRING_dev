#!/usr/bin/env python

import cgi, os, pickle
import cgitb; cgitb.enable()

form = cgi.FieldStorage()

# Get filename here.
name = form.getvalue('name')

response = []
for fname,tag in [('client_datasets/'+name+'/expression_matrix.txt','expression'),
                                  ('client_datasets/'+name+'/expression_matrix.npy.gz','expression'),
				  ('client_datasets/'+name+'/gene_sets.txt','geneset'),
				  ('client_datasets/'+name+'/cell_labels.txt','cell_label'),
				  ('client_datasets/'+name+'/custom_color_tracks.txt','custom_color'),
				  ('coordinates/'+name+'_coordinates.txt','coordinates')]:
	if os.path.exists(fname): response += [tag]

print "Content-Type: text/html\n"
print ','.join(response)


