#!/usr/bin/env python
import os
import sys
import scipy.sparse as ssp
import numpy as np
import h5py
import json
import time
from wolkit import *
import networkx as nx
from fa2 import ForceAtlas2
import pickle
import datetime

creation_time = datetime.datetime.now()

t00 = time.time()

def sparse_var(E, axis=0):
    mean_gene = E.mean(axis=axis).A.squeeze()
    tmp = E.copy()
    tmp.data **= 2
    return tmp.mean(axis=axis).A.squeeze() - mean_gene ** 2

def update_log_html(fname, logdat, overwrite=False):
	if overwrite:
		o = open(fname, 'w')
	else:
		o = open(fname, 'a')
	o.write(logdat + '<br>\n')
	o.close()

def update_log(fname, logdat, overwrite=False):
	if overwrite:
		o = open(fname, 'w')
	else:
		o = open(fname, 'a')
	o.write(logdat + '\n')
	o.close()

def send_confirmation_email(user_email, name, path):
    
    import smtplib
    from email.MIMEMultipart import MIMEMultipart
    from email.MIMEText import MIMEText
    
    fromaddr = "calebsw@gmail.com"
    toaddr = user_email
    msg = MIMEMultipart()
    msg['From'] = fromaddr
    msg['To'] = toaddr
    msg['Subject'] = 'Your expression matrix is ready'
    
    body = 'You can download the data from\nhttps://kleintools.hms.harvard.edu/tools/cgi-bin/' + path + '\n'
    msg.attach(MIMEText(body, 'plain'))
    
    server = smtplib.SMTP('smtp.gmail.com', 587)
    server.starttls()
    server.login(fromaddr, "susannah11")
    text = msg.as_string()
    server.sendmail(fromaddr, toaddr, text)
    server.quit()

#######################
# Load parameters
params_dict = pickle.load(open(sys.argv[1], 'rb'))

extra_filter = params_dict['extra_filter']
base_dir = params_dict['base_dir']
current_dir = params_dict['current_dir']
user_email = params_dict['user_email']
rand_suffix = params_dict['rand_suffix']

#outdir = current_dir + '/selected_downloads/tmp_download_' + rand_suffix + '/'
outdir = "downloads/tmp_" + rand_suffix + '/'
#os.makedirs(outdir)

logf = outdir + 'logdownloadselect.txt'
timef = outdir + 'logdownloadselecttime.txt'

#######################
# Load data

cell_filter = np.load(current_dir + '/cell_filter.npy')[extra_filter]
gene_list = np.loadtxt(base_dir + '/genes.txt', dtype=str, delimiter='\t')

t0 = time.time()
update_log_html(logf, 'Loading counts data...', True)
E = ssp.load_npz(base_dir + '/counts_norm.npz')
E = E[cell_filter,:]
if not ssp.isspmatrix_csc(E):
    E = E.tocsc()
t1 = time.time()
update_log(timef, 'Counts loaded from npz -- %.2f' %(t1-t0), True)

E = E.T



#################
# Save expression matrix as csv
o = open(outdir + 'expr.csv', 'w')
t0 = time.time()
for iG, g in enumerate(gene_list):
    if iG % 500 == 0:
        t1 = time.time()
        update_log(timef, 'Gene %i -- %.2f' %(iG + 1, t1-t0))
        t0 = time.time()
    counts = E[iG,:].A.squeeze()
    o.write(g + ',' + ','.join(map(str, counts)) + '\n')

o.close()
os.system('gzip "' + outdir + 'expr.csv"')

send_confirmation_email(user_email, 'test', outdir + 'expr.csv.gz')

#################
## Calculate color stats
#update_log_html(logf, 'Calculating stats...')
#t0 = time.time()
#means = E.mean(0).A.squeeze()
#stdevs = np.sqrt(sparse_var(E, 0))
#maxes = E.max(0).A.squeeze()
#color_stats = {}
#
#pctls = np.zeros(E.shape[1])
#color_stats = {}
#for iG in range(E.shape[1]):
#    pctls[iG] = np.percentile(E[:,iG].A, 99.6)
#    color_stats[gene_list[iG]] = (means[iG], stdevs[iG], 0, maxes[iG], pctls[iG])
#t1 = time.time()
#update_log(timef, 'Stats computed -- %.2f' %(t1-t0))
#
#
#################
## Save color stats, custom colors
#t0 = time.time()
#update_log_html(logf, 'Saving stats...')
#custom_colors = {}
#f = open(current_dir + '/color_data_gene_sets.csv', 'r')
#for l in f:
#    cols = l.strip('\n').split(',')
#    custom_colors[cols[0]] = map(float, np.array(cols[1:])[extra_filter])
#for k,v in custom_colors.items():
#    color_stats[k] = (0,1,np.min(v),np.max(v)+.01,np.percentile(v,99))
#with open(new_dir+'/color_stats.json','w') as f:
#    f.write(json.dumps(color_stats,indent=4, sort_keys=True).decode('utf-8'))
#with open(new_dir+'/color_data_gene_sets.csv','w') as f:
#    for k,v in custom_colors.items():
#        f.write(k + ',' + ','.join(map(str, v)) + '\n')
#t1 = time.time()
#update_log(timef, 'Saved color stats -- %.2f' %(t1-t0))
################
## Save cell groupings
#t0 = time.time()
#update_log_html(logf, 'Saving cell labels...')
#cell_groupings = json.load(open(current_dir + '/categorical_coloring_data.json'))
#new_cell_groupings = {}
#if len(cell_groupings) > 0:
#    for k in cell_groupings:
#        new_cell_groupings[k] = {}
#        new_cell_groupings[k]['label_list'] = [cell_groupings[k]['label_list'][i] for i in extra_filter]
#        uniq_groups = np.unique(np.array(new_cell_groupings[k]['label_list']))
#
#        new_cell_groupings[k]['label_colors'] = {}
#        for kk in uniq_groups:
#            new_cell_groupings[k]['label_colors'][kk] = cell_groupings[k]['label_colors'][kk]
#
#with open(new_dir+'/categorical_coloring_data.json','w') as f:
#    f.write(json.dumps(new_cell_groupings,indent=4, sort_keys=True).decode('utf-8'))
#t1 = time.time()
#update_log(timef, 'Saved cell labels -- %.2f' %(t1-t0))
#
#################
## Gene filtering
#t0 = time.time()
#update_log_html(logf, 'Filtering genes...')
#gene_filter = filter_genes(E, min_counts, min_cells, min_vscore_pctl)
#t1 = time.time()
#update_log(timef, 'Using %i genes -- %.2f' %(len(gene_filter), t1-t0))
#
#################
## PCA
#t0 = time.time()
#update_log_html(logf, 'Running PCA...')
#Epca = get_PCA_sparseInput(E[:,gene_filter], numpc=num_pc, method='')
#t1 = time.time()
#update_log(timef, 'PCA done -- %.2f' %(t1-t0))
#
#################
## Get KNN graph
#t0 = time.time()
#update_log_html(logf, 'Building kNN graph...')
#links, knn_graph = get_knn_graph2(Epca, k=k_neigh, dist_metric = 'euclidean', approx=True)
#links = list(links)
#t1 = time.time()
#update_log(timef, 'KNN built -- %.2f' %(t1-t0))
#
#################
## Save graph data
#t0 = time.time()
#update_log_html(logf, 'Saving graph...')
#nodes = [{'name':int(i),'number':int(i)} for i in range(E.shape[0])]
#edges = [{'source':int(i), 'target':int(j), 'distance':0} for i,j in links]
#out = {'nodes':nodes,'links':edges}
#open(new_dir+'/graph_data.json','w').write(json.dumps(out,indent=4, separators=(',', ': ')))
#edgef = open(new_dir+'/edges.csv', 'w')
#for ee in links:
#    edgef.write('%i;%i\n' %(ee[0], ee[1]) )
#edgef.close()
#t1 = time.time()
#update_log(timef, 'Graph data saved -- %.2f' %(t1-t0))
## update_log_html(logf, str(knn_graph.shape))
#
#################
## Run FA2
#t0 = time.time()
#update_log_html(logf, 'Getting force layout...')
#G = nx.Graph()
#G.add_nodes_from(range(E.shape[0]))
#G.add_edges_from(links)
#
#forceatlas2 = ForceAtlas2(
#                          # Behavior alternatives
#                          outboundAttractionDistribution=False,  # Dissuade hubs
#                          linLogMode=False,  # NOT IMPLEMENTED
#                          adjustSizes=False,  # Prevent overlap (NOT IMPLEMENTED)
#                          edgeWeightInfluence=1.0,
#
#                          # Performance
#                          jitterTolerance=1.0,  # Tolerance
#                          barnesHutOptimize=True,
#                          barnesHutTheta=2,
#                          multiThreaded=False,  # NOT IMPLEMENTED
#
#                          # Tuning
#                          scalingRatio=1.0,
#                          strongGravityMode=False,
#                          gravity=0.05,
#
#                          # Log
#                          verbose=False)
#
#positions = forceatlas2.forceatlas2_networkx_layout(G, pos=None, iterations=num_fa2_iter)
#positions = np.array([positions[i] for i in sorted(positions.keys())])
#positions = positions / 5.0
#positions = positions - np.min(positions, axis = 0) - np.ptp(positions, axis = 0) / 2.0
#positions[:,0] = positions[:,0]  + 750
#positions[:,1] = positions[:,1]  + 250
#
#t1 = time.time()
#update_log(timef, 'Ran ForceAtlas2 -- %.2f' %(t1-t0))
#
#################
## Save coordinates
#
#base_name = base_dir.strip('/').split('/')[-1]
#new_name = new_dir.strip('/').split('/')[-1]
#coords_dir = 'coordinates/'
#np.savetxt(coords_dir + base_name + '_coordinates.' + new_name + '.txt', np.hstack((np.arange(E.shape[0])[:,None], positions)), fmt='%i,%.5f,%.5f')
#
#
#################
## Save run info
#import datetime
#info_dict = {}
#info_dict['Email'] = user_email
#info_dict['Date'] = '%s' %creation_time
#info_dict['Nodes'] = Epca.shape[0]
#info_dict['Filtered_Genes'] = len(gene_filter)
#info_dict['Gene_Var_Pctl'] = min_vscore_pctl
#info_dict['Min_Cells'] = min_cells
#info_dict['Min_Counts'] = min_counts
#info_dict['Num_Neighbors'] = k_neigh
#info_dict['Num_PCs'] = num_pc
#info_dict['Num_Force_Iter'] = num_fa2_iter
#start_dataset = base_name + '/' + current_dir_short
#
#with open(new_dir+'/run_info.json','w') as f:
#    f.write(json.dumps(info_dict,indent=4, sort_keys=True).decode('utf-8'))
#
#################
## Send email
#t11 = time.time()
#update_log_html(logf, 'Run complete! Done in %i seconds.<br>' %(t11-t00) + '<a target="_blank" href="http://kleintools.hms.harvard.edu/tools/springViewer_1_6_dev.html?cgi-bin/%s"> Click here to view.</a>' %(new_dir.strip('/')))
#send_confirmation_email(user_email, base_name + '/' + new_name, info_dict, start_dataset)
#################
#
