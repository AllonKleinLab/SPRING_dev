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
import pickle
import datetime

try: 
    from fa2_anim import ForceAtlas2
    animation_mode = True
except: 
    from fa2 import ForceAtlas2
    animation_mode = False

cwd = os.getcwd()
if cwd.endswith('cgi-bin'):
    os.chdir('../')

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

def send_confirmation_email(email, name, info_dict, start_dataset, new_url):

    import smtplib
    from email.MIMEMultipart import MIMEMultipart
    from email.MIMEText import MIMEText

    fromaddr = "singlecellSPRING@gmail.com"
    toaddr = email
    msg = MIMEMultipart()
    msg['From'] = fromaddr
    msg['To'] = toaddr
    msg['Subject'] = 'SPRING is finished processing '+name

    body = 'SPRING finished processing your dataset '+name+' using the following parameters:\n\n'
    body += 'Starting dataset ' + start_dataset + '\n'
    body += 'Min expressing cells (gene filtering): ' + str(info_dict['Min_Cells']) + '\n'
    body += 'Min number of UMIs (gene filtering): ' + str(info_dict['Min_Counts']) + '\n'
    body += 'Gene variability percentile (gene filtering): ' + str(info_dict['Gene_Var_Pctl']) + '\n'
    body += 'Number of principal components: ' + str(info_dict['Num_PCs']) + '\n'
    body += 'Number of nearest neighbors: ' + str(info_dict['Num_Neighbors']) + '\n'
    body += 'Number of force layout iterations: ' + str(info_dict['Num_Force_Iter']) + '\n\n'
    body += 'Used %i cells and %i genes to build the SPRING plot.\n\n' %(info_dict['Nodes'], info_dict['Filtered_Genes'])
    body += 'You can view the results at\n' + new_url + '\n'
    msg.attach(MIMEText(body, 'plain'))

    server = smtplib.SMTP('smtp.gmail.com', 587)
    server.starttls()
    server.login(fromaddr, "Sequencing1")
    text = msg.as_string()
    server.sendmail(fromaddr, toaddr, text)
    server.quit()


##########################

#jitterTolerance=1.0,  # Tolerance
#barnesHutOptimize=True,
#barnesHutTheta=2,
#multiThreaded=False,  # NOT IMPLEMENTED
#
## Tuning
#scalingRatio=2.0,
#strongGravityMode=False,
#gravity=0.1,

#######################
# Load parameters
params_dict = pickle.load(open(sys.argv[1], 'rb'))

extra_filter = params_dict['extra_filter']
base_ix = params_dict['base_ix']
base_dir = params_dict['base_dir']
current_dir = params_dict['current_dir']
new_dir = params_dict['new_dir']
current_dir_short = params_dict['current_dir_short']
new_dir_short = params_dict['new_dir_short']
min_vscore_pctl = params_dict['min_vscore_pctl']
min_cells = params_dict['min_cells']
min_counts = params_dict['min_counts']
k_neigh = params_dict['k_neigh']
num_pc = params_dict['num_pc']
num_fa2_iter = params_dict['num_fa2_iter']
user_email = params_dict['user_email']
this_url = params_dict['this_url']
description = params_dict['description']
animate = params_dict['animate']

if 'custom_genes' in params_dict and 'include_exclude' in params_dict:
	custom_genes = params_dict['custom_genes']
	include_exclude = params_dict['include_exclude']
else:
	custom_genes = set([])
	include_exclude = 'Exclude'

logf = new_dir + '/lognewspring2.txt'
timef = new_dir + '/lognewspringtime.txt'

update_log_html(logf, include_exclude+repr(len(custom_genes)))

#######################
# Load data

cell_filter = np.load(current_dir + '/cell_filter.npy')[extra_filter]
np.save(new_dir + '/cell_filter.npy', cell_filter)
np.savetxt(new_dir + '/cell_filter.txt', cell_filter, fmt='%i')
gene_list = np.loadtxt(base_dir + '/genes.txt', dtype=str, delimiter='\t', comments="")
custom_genes = set([g for g in custom_genes if g in gene_list])

t0 = time.time()
update_log_html(logf, 'Loading counts data...')
E = ssp.load_npz(base_dir + '/counts_norm.npz')
E = E[cell_filter,:]
if not ssp.isspmatrix_csc(E):
    E = E.tocsc()
t1 = time.time()
update_log(timef, 'Counts loaded from npz -- %.2f' %(t1-t0), True)


################
# Calculate color stats
update_log_html(logf, 'Calculating stats...')
t0 = time.time()
means = E.mean(0).A.squeeze()
stdevs = np.sqrt(sparse_var(E, 0))
maxes = E.max(0).A.squeeze()
color_stats = {}

pctls = np.zeros(E.shape[1])
color_stats = {}
for iG in range(E.shape[1]):
    pctls[iG] = np.percentile(E[:,iG].A, 99.6)
    color_stats[gene_list[iG]] = (means[iG], stdevs[iG], 0, maxes[iG], pctls[iG])
t1 = time.time()
update_log(timef, 'Stats computed -- %.2f' %(t1-t0))


################
# Save color stats, custom colors
t0 = time.time()
update_log_html(logf, 'Saving stats...')
custom_colors = {}
f = open(current_dir + '/color_data_gene_sets.csv', 'r')
for l in f:
    cols = l.strip('\n').split(',')
    custom_colors[cols[0]] = map(float, np.array(cols[1:])[extra_filter])
for k,v in custom_colors.items():
    color_stats[k] = (0,1,np.min(v),np.max(v)+.01,np.percentile(v,99))
with open(new_dir+'/color_stats.json','w') as f:
    f.write(json.dumps(color_stats,indent=4, sort_keys=True).decode('utf-8'))
with open(new_dir+'/color_data_gene_sets.csv','w') as f:
    for k,v in custom_colors.items():
        f.write(k + ',' + ','.join(map(str, v)) + '\n')
t1 = time.time()
update_log(timef, 'Saved color stats -- %.2f' %(t1-t0))
###############
# Save cell groupings
t0 = time.time()
update_log_html(logf, 'Saving cell labels...')
cell_groupings = json.load(open(current_dir + '/categorical_coloring_data.json'))
new_cell_groupings = {}
if len(cell_groupings) > 0:
    for k in cell_groupings:
        new_cell_groupings[k] = {}
        new_cell_groupings[k]['label_list'] = [cell_groupings[k]['label_list'][i] for i in extra_filter]
        uniq_groups = np.unique(np.array(new_cell_groupings[k]['label_list']))

        new_cell_groupings[k]['label_colors'] = {}
        for kk in uniq_groups:
            new_cell_groupings[k]['label_colors'][kk] = cell_groupings[k]['label_colors'][kk]

with open(new_dir+'/categorical_coloring_data.json','w') as f:
    f.write(json.dumps(new_cell_groupings,indent=4, sort_keys=True).decode('utf-8'))
t1 = time.time()
update_log(timef, 'Saved cell labels -- %.2f' %(t1-t0))

################
# Gene filtering
t0 = time.time()
update_log_html(logf, 'Filtering genes...')
gene_filter = filter_genes(E[base_ix,:], min_counts, min_cells, min_vscore_pctl)
if include_exclude == 'Exclude':
	gene_filter = np.array([i for i in gene_filter if not gene_list[i] in custom_genes])
else:
	gene_filter = np.array([i for i in gene_filter if gene_list[i] in custom_genes])

t1 = time.time()
update_log(timef, 'Using %i genes -- %.2f' %(len(gene_filter), t1-t0))

################
# PCA
t0 = time.time()
update_log_html(logf, 'Running PCA...')
Epca = get_PCA_sparseInput(E[:,gene_filter], numpc=num_pc, method='', base_ix=base_ix)
t1 = time.time()
update_log(timef, 'PCA done -- %.2f' %(t1-t0))

################
# Get KNN graph
t0 = time.time()
update_log_html(logf, 'Building kNN graph...')
links, knn_graph = get_knn_graph2(Epca, k=k_neigh, dist_metric = 'euclidean', approx=False)
links = list(links)
t1 = time.time()
update_log(timef, 'KNN built -- %.2f' %(t1-t0))

################
# Save graph data
t0 = time.time()
update_log_html(logf, 'Saving graph...')
nodes = [{'name':int(i),'number':int(i)} for i in range(E.shape[0])]
edges = [{'source':int(i), 'target':int(j), 'distance':0} for i,j in links]
out = {'nodes':nodes,'links':edges}
open(new_dir+'/graph_data.json','w').write(json.dumps(out,indent=4, separators=(',', ': ')))
edgef = open(new_dir+'/edges.csv', 'w')
for ee in links:
    edgef.write('%i;%i\n' %(ee[0], ee[1]) )
edgef.close()
t1 = time.time()
update_log(timef, 'Graph data saved -- %.2f' %(t1-t0))
# update_log_html(logf, str(knn_graph.shape))

################
# Run FA2
t0 = time.time()
update_log_html(logf, 'Getting force layout...')
G = nx.Graph()
G.add_nodes_from(range(E.shape[0]))
G.add_edges_from(links)

forceatlas2 = ForceAtlas2(
                          # Behavior alternatives
                          outboundAttractionDistribution=False,  # Dissuade hubs
                          linLogMode=False,  # NOT IMPLEMENTED
                          adjustSizes=False,  # Prevent overlap (NOT IMPLEMENTED)
                          edgeWeightInfluence=1.0,

                          # Performance
                          jitterTolerance=1.0,  # Tolerance
                          barnesHutOptimize=True,
                          barnesHutTheta=2,
                          multiThreaded=False,  # NOT IMPLEMENTED

                          # Tuning
                          scalingRatio=1.0,
                          strongGravityMode=False,
                          gravity=0.05,

                          # Log
                          verbose=False)

if animation_mode and animate=='Yes': 
    f = open(new_dir+'/animation.txt','w')
    f = open(new_dir+'/animation.txt','a')
    positions = forceatlas2.forceatlas2_networkx_layout(G, pos=None, iterations=num_fa2_iter, writefile=f)
else: 
    positions = forceatlas2.forceatlas2_networkx_layout(G, pos=None, iterations=num_fa2_iter)


positions = np.array([positions[i] for i in sorted(positions.keys())])
positions = positions / 5.0
positions = positions - np.min(positions, axis = 0) - np.ptp(positions, axis = 0) / 2.0
positions[:,0] = positions[:,0]  + 750
positions[:,1] = positions[:,1]  + 250

t1 = time.time()
update_log(timef, 'Ran ForceAtlas2 -- %.2f' %(t1-t0))

################
# Save coordinates

base_name = base_dir.strip('/').split('/')[-1]
new_name = new_dir.strip('/').split('/')[-1]
np.savetxt(new_dir + '/' +  'coordinates.txt', np.hstack((np.arange(E.shape[0])[:,None], positions)), fmt='%i,%.5f,%.5f')

################
# Save new clone data if it exists in base dir
if os.path.exists(current_dir + '/clone_map.json'):
    clone_map = json.load(open(current_dir + '/clone_map.json'))
    extra_filter_map = {i:j for j,i in enumerate(extra_filter)}
    new_clone_map = {}
    for i,clone in clone_map.items():
        i = int(i)
        new_clone = [extra_filter_map[j] for j in clone if j in extra_filter_map]
        if i in extra_filter_map and len(new_clone) > 0:
            new_clone_map[extra_filter_map[i]] = new_clone
    json.dump(new_clone_map,open(new_dir+'/clone_map.json','w'))
    
    
    
    


################
# Save run info
import datetime
info_dict = {}
info_dict['Email'] = user_email
info_dict['Date'] = '%s' %creation_time
info_dict['Nodes'] = Epca.shape[0]
info_dict['Filtered_Genes'] = len(gene_filter)
info_dict['Gene_Var_Pctl'] = min_vscore_pctl
info_dict['Min_Cells'] = min_cells
info_dict['Min_Counts'] = min_counts
info_dict['Num_Neighbors'] = k_neigh
info_dict['Num_PCs'] = num_pc
info_dict['Num_Force_Iter'] = num_fa2_iter
info_dict['Description'] = description
start_dataset = base_name + '/' + current_dir_short

with open(new_dir+'/run_info.json','w') as f:
    f.write(json.dumps(info_dict,indent=4, sort_keys=True).decode('utf-8'))


################
t11 = time.time()
url_pref = this_url.split('?')[0]
update_log_html(logf, 'Run complete! Done in %i seconds.<br>' %(t11-t00) + '<a target="_blank" href="%s?%s"> Click here to view.</a>' %(url_pref,new_dir.strip('/')))
if user_email != '':
    new_url_full = url_pref + '?' + new_dir.strip('/')
    send_confirmation_email(user_email, base_name + '/' + new_name, info_dict, start_dataset, new_url_full)
################
