#!/usr/bin/env python
from doublet_helper import *
import cgi
import cgitb
import os
import json
cgitb.enable()  # for troubleshooting
print "Content-Type: text/plain\n"

#========================================================================================#

def update_log(fname, logdat, overwrite=False):
    if overwrite:
        o = open(fname, 'w')
    else:
        o = open(fname, 'a')
    o.write(logdat + '\n')
    o.close()

def get_louvain_clusters(nodes, edges):
    import networkx as nx
    import community
    
    G = nx.Graph()
    G.add_nodes_from(nodes)
    G.add_edges_from(edges)
    
    return np.array(community.best_partition(G).values())

def load_edges(fname):
    edges = set([])
    with open(fname) as f:
        for l in f:
            edges.add(tuple(sorted(map(int,l.strip('\n').split(';')))))
    return edges

def build_categ_colors(categorical_coloring_data, cell_groupings):
    for k,labels in cell_groupings.items():
        label_colors = {l:frac_to_hex(float(i)/len(set(labels))) for i,l in enumerate(list(set(labels)))}
        categorical_coloring_data[k] = {'label_colors':label_colors, 'label_list':labels}
    return categorical_coloring_data

def save_cell_groupings(filename, categorical_coloring_data):
    with open(filename,'w') as f:
        f.write(json.dumps(categorical_coloring_data,indent=4, sort_keys=True).decode('utf-8'))
#========================================================================================#



cwd = os.getcwd()
if cwd.endswith('cgi-bin'):
    os.chdir('../')
t00 = time.time()




data = cgi.FieldStorage()
base_dir = data.getvalue('base_dir')
sub_dir = data.getvalue('sub_dir')

cell_filter = np.load(sub_dir + '/cell_filter.npy')
nodes = range(len(cell_filter))
edges = load_edges(sub_dir + '/edges.csv')

clusts = get_louvain_clusters(nodes, edges)

np.save(sub_dir + '/louvain_clusters.npy', clusts)


old_cell_groupings = json.load(open(sub_dir + '/categorical_coloring_data.json'))
new_cell_groupings = build_categ_colors(old_cell_groupings, {'Louvain cluster': map(str,clusts)})
save_cell_groupings(sub_dir + '/categorical_coloring_data.json', new_cell_groupings)





