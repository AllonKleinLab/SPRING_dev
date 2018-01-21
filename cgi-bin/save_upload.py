#!/usr/bin/env python
 
def check_dataset(data, upload_type):
	return True, ""




import cgi, os, pickle, zlib
import cgitb; cgitb.enable()

form = cgi.FieldStorage()

# Get filename here.
fileitem = form['filename']
name = form.getvalue('upload_hidden_dataset_name')
password  = form.getvalue('upload_hidden_password')
upload_type = form.getvalue("hidden_chooser")
dataset_log = pickle.load(open('dataset_log.p'))
fn = os.path.basename(fileitem.filename)

message = ''


# check if file was uploaded
if not fileitem.filename:
	message = 'ALERT:No file was selected'
	valid = False

# if username and password exists, return error
elif name in dataset_log and password != dataset_log[name]:
	message = 'ALERT:A dataset with this name already exists but the password is incorrect'
	valid = False

# otherwise, check if the file is in the right format
else:
	uploaded_data = fileitem.file.read()
	if fn.split('.')[-1] == 'gz': 
		uploaded_data =  zlib.decompress(uploaded_data, 16+zlib.MAX_WBITS)
	if fn.split('.')[-1] == 'zip':
		import zipfile
		from StringIO import StringIO
		fp = StringIO(uploaded_data)
		zfp = zipfile.ZipFile(fp, "r")
		uploaded_data = zfp.read(zfp.namelist()[0])	
	valid, message = check_dataset(uploaded_data,upload_type)



if valid:
	message = 'The file "' + fn + '" was uploaded successfully'

	dataset_log[name] = password
	pickle.dump(dataset_log,open('dataset_log.p','w'))

	dirname = './client_datasets/'+name+'/'

	if not os.path.exists(dirname): os.system('mkdir '+dirname)
	if upload_type == 'expression': 	fname = dirname + 'expression_matrix.txt'
	if upload_type == 'geneset': 		fname = dirname + 'gene_sets.txt'
	if upload_type == 'cell_label': 	fname = dirname + 'cell_labels.txt'
	if upload_type == 'custom_color':	fname = dirname + 'custom_color_tracks.txt'
	if upload_type == 'coordinates':	fname = './coordinates/' + name + '_coordinates.txt'

	open(fname, 'w').write(uploaded_data) 
	
	if upload_type == 'expression': 
		os.system('rm ' + dirname + 'expression_matrix.npy.gz')
		os.system('rm ' + dirname + 'gene_list.txt')
		os.system('rm ' + dirname + 'params.p')
		os.system('rm -r ' + dirname + 'gene_colors')
  
print "Content-Type: text/html\n"
print message

