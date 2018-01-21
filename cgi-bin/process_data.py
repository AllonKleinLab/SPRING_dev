#!/usr/bin/env python
import matplotlib.pyplot as plt
import json,numpy as np, sys, os
from helper_functions import *
#========================================================================================#
def get_distance_matrix(M):
	D = np.zeros((M.shape[0],M.shape[0]))
	for i in range(M.shape[0]):
		Mtiled = np.tile(M[i,:][None,:],(M.shape[0],1))
		D[i,:] = np.sqrt(np.sum((Mtiled - M)**2, axis=1))
	return D

def filter_cells(E, min_reads):
	total_counts = np.sum(E,axis=1)
	cell_filter = total_counts >= min_reads
	if np.sum(cell_filter) == 0:
		return None, total_counts, cell_filter
	else: return E[cell_filter,:],total_counts, cell_filter
	
def row_normalize(E):
        total_counts = np.sum(E,axis=1)
        tc_tiled = np.tile(total_counts[:,None],(1,E.shape[1]))
        thresh = np.max([0.02, 1./E.shape[1]*10])
        included = np.all(E < tc_tiled * 0.02, axis=0)  
        tc_include = np.sum(E[:,included],axis=1)
        tc_tiled = np.tile(tc_include[:,None],(1,E.shape[1])) + np.max(E) / 10000
        return E / tc_tiled * np.mean(total_counts)

def Zscore(E):
	means = np.tile(np.mean(E,axis=0)[None,:],(E.shape[0],1))
	stds = np.tile(np.std(E,axis=0)[None,:],(E.shape[0],1))
	return (E - means) / (stds + .0001)


def filter_genes(E, Ecutoff, Vcutoff):
	mean_filter = np.mean(E,axis=0)> Ecutoff
	var_filter = np.var(E,axis=0) / (np.mean(E,axis=0)+.0001) > Vcutoff
	gene_filter = np.nonzero(np.all([mean_filter,var_filter],axis=0))[0]
	return E[:,gene_filter], gene_filter
	
def get_knn_edges(dmat, k):
	edge_dict = {}
	for i in range(dmat.shape[0]):
		for j in np.nonzero(dmat[i,:] <= sorted(dmat[i,:])[k])[0]:
			if i != j:
				ii,jj = tuple(sorted([i,j]))
				edge_dict[(ii,jj)] = dmat[i,j]
	return edge_dict.keys()



def write_graph(n_nodes, edges,path):
	nodes = [{'name':i,'number':i} for i in range(n_nodes)]
	edges = [{'source':i, 'target':j, 'distance':0} for i,j in edges]
	out = {'nodes':nodes,'links':edges}
	open(path+'/graph_data.json','w').write(json.dumps(out,indent=4, separators=(',', ': ')))
	
def get_PCA(A,numpc):
	from sklearn.decomposition import PCA
	pca = PCA(n_components=numpc)
	return pca.fit_transform(A)

def load_gene_sets(gene_sets_path):
	gene_sets = {}
	text = open(gene_sets_path).read()
	text = text.replace('\r','\n')
	text = text.strip('\n')
	while '\n\n' in text: 
		text = text.replace('\n\n','\n')
	text.strip('\n')
	for l in text.split('\n'):
		l = [x.strip() for x in l.split(',') if x != '']
		if l == []: continue
	 	name = l[0]
	 	genes = l[1:]
	 	if name != '':
	 		gene_sets[name] = genes
	return gene_sets

	
def load_E(path):
	gene_list = []
	expression_matrix = []
	text = open(path).read()
	text = text.replace('\r','\n')
	text = text.strip('\n')
	while '\n\n' in text: text = text.replace('\n\n','\n')
	for l in text.split('\n'):
		l=l.strip('\n').split(',')
		l = [x.strip() for x in l if x != '']
		gene_list += [l[0]]
		expression_matrix += [[float(x) for x in l[1:]]]
	return gene_list, np.array(expression_matrix)
		
def write_csv(d, path, add_on_path=None):
	out = []
	for k,vals in d.items():
		out += [','.join([k]+[repr(round(x,1)) for x in vals]).replace(',0.',',.')]
	out = sorted(out,key=lambda x: x.split(',')[0])
	add_on = ''
	if add_on_path != None:
		add_on = '\n' + open(add_on_path).read()
	open(path,'w').write('\n'.join(out)+add_on)
	
def average_profile(data, all_genes, gene_set):
	all_genes = [g.upper() for g in all_genes]
	index_list = [all_genes.index(g.upper()) for g in gene_set if g.upper() in all_genes]
	if len(index_list) == 0: 
		return np.zeros(data.shape[1])
	else:
		index_list = np.array(index_list, dtype=int)
		return np.mean(data[:,index_list], axis=1)

def simplify(x):
	if x == 0: return 0
	else:
                sign = np.sign(x)
		order = -int(np.log(x*sign)/np.log(10))
		return round(x * 10**(order),3) * 10**(-order)

def write_color_tracks(ctracks, fname):
	out = []
	for name,score in ctracks.items():
		line = ','.join([name]+[repr(simplify(x)) for x in score])
		line.replace('.0','.')
		out += [line]
	out = sorted(out,key=lambda x: x.split(',')[0])
	open(fname,'w').write('\n'.join(out))

def frac_to_hex(frac):
	rgb = tuple(np.array(np.array(plt.cm.jet(frac)[:3])*255,dtype=int))
	return '#%02x%02x%02x' % rgb
	
def colors_written(project_directory):
	written = False
	if os.path.exists(project_directory+'gene_colors'):
		if len(os.listdir(project_directory+'gene_colors')) >= 50:
			if os.path.exists(project_directory+'color_stats.json'):
				written = True
	return written

def row_normalize(E):
	total_counts = np.sum(E,axis=1)
	tc_tiled = np.tile(total_counts[:,None],(1,E.shape[1]))
	return E / (tc_tiled + 0.00000001) * np.mean(total_counts)

def send_confirmation_email(email, name, params, filtering_nums):

	import smtplib
	from email.MIMEMultipart import MIMEMultipart
	from email.MIMEText import MIMEText
 
	fromaddr = "calebsw@gmail.com"
	toaddr = email
	msg = MIMEMultipart()
	msg['From'] = fromaddr
	msg['To'] = toaddr
	msg['Subject'] = 'SPRING is finished processing '+name
 
	body = 'SPRING finished processing your dataset '+name+' using the following parameters\n\n'
	for k,v in params.items(): body += k+' = '+repr(v)+'\n'
	body += '\nFiltered from '+repr(filtering_nums[0])+' cells to '+repr(filtering_nums[1])
	body += '\nFiltered from '+repr(filtering_nums[2])+' genes to '+repr(filtering_nums[3])+'\n'
	body += '\nYou can view the results at\nhttps://kleintools.hms.harvard.edu/tools/springViewer.html?cgi-bin/client_datasets/'+name
	msg.attach(MIMEText(body, 'plain'))
 
	server = smtplib.SMTP('smtp.gmail.com', 587)
	server.starttls()
	server.login(fromaddr, "susannah11")
	text = msg.as_string()
	server.sendmail(fromaddr, toaddr, text)
	server.quit()

#========================================================================================#

import cgi, cgitb, pickle, time, sys, os
cgitb.enable()  # for troubleshooting
form = cgi.FieldStorage()

project_directory ='client_datasets/' + form.getvalue("dataset_name") + '/'
min_exp = float(form.getvalue("min_exp"))
min_reads = float(form.getvalue("min_reads"))
min_cv = float(form.getvalue("min_cv"))
k = int(form.getvalue('num_k'))
p = int(form.getvalue('num_pc'))
email = form.getvalue('email')

if email == '':
	print "Content-Type: text/html\n"
	print 'Please enter email address'
	sys.exit(2)

# save params
new_params = {'min_exp':min_exp, 'min_reads':min_reads, 'min_cv':min_cv, 'k':k, 'p':p}
if os.path.exists(project_directory+'params.p'): old_params = pickle.load(open(project_directory+'params.p'))
else: old_params = {k:None for k in new_params}

#========================================================================================#
# load expression matrix
txt_E_path = project_directory+'/expression_matrix.txt'
npy_E_path = project_directory+'/expression_matrix.npy'
gene_list_path =  project_directory+'/gene_list.txt'

try:
	if os.path.exists(npy_E_path+'.gz') and os.path.exists(gene_list_path):
		os.system('gzip -d '+npy_E_path+'.gz')
		E = np.array(np.load(npy_E_path), dtype=float)
		os.system('gzip '+npy_E_path)
		gene_list = open(gene_list_path).read().split('\n')	
	elif os.path.exists(txt_E_path):
		gene_list, E = load_E(txt_E_path)
		np.save(npy_E_path,E)
		open(gene_list_path,'w').write('\n'.join(gene_list))
		os.system('rm '+ txt_E_path)
		os.system('gzip '+npy_E_path)
	E = np.transpose(E)
except:
	print "Content-Type: text/html\n"
	print 'Error: Expression matrix formatted incorrectly'
	sys.exit(2)

# load gene_sets if it exists
try:
	gene_sets_path = project_directory+'/gene_sets.txt'
	if os.path.exists(gene_sets_path): gene_sets = load_gene_sets(gene_sets_path)
	else: gene_sets = {}
except:
	print "Content-Type: text/html\n"
	print "Error: Gene sets file is formatted incorrectly"
	sys.exit(2)

# load cell_labels if it exists
try:
	cell_label_path = project_directory+'/cell_labels.txt'
	if os.path.exists(cell_label_path): cell_labels = load_gene_sets(cell_label_path)
	else: cell_labels = {}
except:
        print "Content-Type: text/html\n"
        print "Error: Cell groupings file is formatted incorrectly"
        sys.exit(2)

for kk,v in cell_labels.items():
	if len(v) != E.shape[0]:
		print "Content-Type: text/html\n"
		print 'Error: Cell grouping "'+kk+'" has a different number of entries than the number of cells (rows) in the expression matrix'
		sys.exit(2)

# load custom_colors if it exists
try:
	custom_color_path = project_directory+'/custom_color_tracks.txt'
	if os.path.exists(custom_color_path): custom_color_tracks = load_gene_sets(custom_color_path)
	else: custom_color_tracks = {}
except:
        print "Content-Type: text/html\n"
        print "Error: Custom colors file is formatted incorrectly"
        sys.exit(2)

for kk,v in custom_color_tracks.items():
	if len(v) != E.shape[0]:
		print "Content-Type: text/html\n"
		print 'Error: Custom color track "'+kk+'" has a different number of entries than the number of cells (rows) in the expression matrix'
		sys.exit(2)
#========================================================================================#

# Perform cell filtering

E_cellfilter,total_counts,cell_filter = filter_cells(E, min_reads)

if np.sum(cell_filter) == 0: 
	print "Content-Type: text/html\n"
	print 'Error: All cells have < '+repr(min_reads) + ' counts'
	sys.exit(2)

if np.sum(cell_filter) < k:
        print "Content-Type: text/html\n"
        print 'Error: Number of nearest neighbors (k) exceeds the number of cells'
	sys.exit(2)

cell_indeces = np.nonzero(cell_filter)[0]
E_cellfilter = row_normalize(E_cellfilter)
EZ_cellfilter = Zscore(E_cellfilter)


# Gene filter
E_filter,gene_filter = filter_genes(E_cellfilter, min_exp, min_cv)
if np.sum(gene_filter) == 0: 
	print "Content-Type: text/html\n"
	print 'Error: All genes have mean expression < '+repr(min_exp) + ' or CV < '+repr(min_cv)
	sys.exit(2)

# Z scoring
EZ_filter = EZ_cellfilter[:,gene_filter]

# Build graph
# write graph to file
if old_params != new_params:

	p = np.min([E_filter.shape[1],p])
	D = get_distance_matrix(get_PCA(EZ_filter,p))
	edges = get_knn_edges(D, k)

        nodes = [{'name':cell_indeces[i],'number':i} for i in range(E_filter.shape[0])]
        edges = [{'source':i, 'target':j, 'distance':0} for i,j in edges]
        out = {'nodes':nodes,'links':edges}
        open(project_directory+'graph_data.json','w').write(json.dumps(out,indent=4, separators=(',', ': ')))
        pickle.dump(new_params,open(project_directory+'params.p','w'))


# save genesets
geneset_colors = {k:average_profile(EZ_cellfilter, gene_list, gs) for k,gs in gene_sets.items()}
geneset_colors['Total counts'] = total_counts
geneset_colors['Uniform'] = np.zeros(E_cellfilter.shape[0])
for k,v in custom_color_tracks.items():
	geneset_colors[k] = np.array([float(x) for x in v])
write_color_tracks(geneset_colors, project_directory+'color_data_gene_sets.csv')


# save gene colortracks
if not colors_written(project_directory):
	os.system('mkdir '+project_directory+'gene_colors')

        cutoff = sorted(np.mean(E_cellfilter,axis=0))[::-1][np.min([E_cellfilter.shape[1],10000])-1]
        topthenthousand = set([g for i,g in enumerate(gene_list) if np.mean(E_cellfilter[:,i]) >= cutoff])
	
	II = len(gene_list) / 50 + 1
	for j in range(50):	
		fname = project_directory+'/gene_colors/color_data_all_genes-'+repr(j)+'.csv'
		if not os.path.exists(fname):
			all_gene_colors = {g :E_cellfilter[:,i+II*j] for i,g in enumerate(gene_list[II*j:II*(j+1)]) if g in topthenthousand}
			write_color_tracks(all_gene_colors, fname)


# Create and save a dictionary of color profiles to be used by the visualizer
color_stats = {}
for i in range(E.shape[1]):
	mean = np.mean(E_cellfilter[:,i])
	std = np.std(E_cellfilter[:,i])
	max = np.max(E_cellfilter[:,i])
	centile = np.percentile(E[:,i],99.6)
	color_stats[gene_list[i]] = (mean,std,0,max,centile)
for k,v in geneset_colors.items():
        color_stats[k] = (0,1,np.min(v),np.max(v)+.01,np.percentile(v,99))	
json.dump(color_stats,open(project_directory+'/color_stats.json','w'),indent=4)


# save cell labels
if cell_labels == {}: cell_labels = {'Default':['All cells' for i in range(E.shape[0])]}
categorical_coloring_data = {}


for k,labels in cell_labels.items():
	label_colors = {l:frac_to_hex(float(i)/len(set(labels))) for i,l in enumerate(list(set(labels)))}
	label_list = [labels[i] for i in cell_indeces]
	categorical_coloring_data[k] = {'label_colors':label_colors, 'label_list':label_list}
json.dump(categorical_coloring_data,open(project_directory+'/categorical_coloring_data.json','w'),indent=4, sort_keys=True)

if email:
	params = {'Minimum read counts':min_reads,
                  'Minimum mean expression':min_exp,
                  'Minimum coefficient of variation':min_cv,
                  'Number of PCA dimensions':p,
                  'Number of nearest neighbors':int(form.getvalue('num_k'))}
	filtering_nums = (E.shape[0],E_filter.shape[0],E.shape[1],E_filter.shape[1])
	send_confirmation_email(email, form.getvalue("dataset_name"), params, filtering_nums)

# Report on outcomes
print "Content-Type: text/html\n"
print '<b> Success! </b><br>'
print 'Filtered from '+repr(E.shape[0]) +' cells to '+repr(E_filter.shape[0]) + '<br>'
print 'Filtered from '+repr(E.shape[1]) +' genes to '+repr(E_filter.shape[1])
