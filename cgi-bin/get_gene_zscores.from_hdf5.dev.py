#!/usr/bin/env python
import cgi
import cgitb
import os
import scipy.sparse as ssp
import numpy as np
import h5py
import json
import time


cwd = os.getcwd()
if cwd.endswith('cgi-bin'):
    os.chdir('../')

def update_log(fname, logdat, overwrite=False):
	if overwrite:
		o = open(fname, 'w')
	else:
		o = open(fname, 'a')
	o.write(logdat + '\n')
	o.close()

def strfloat(x):
    return "%.3f" %x

cgitb.enable()  # for troubleshooting
data = cgi.FieldStorage()
base_dir = data.getvalue('base_dir')
sub_dir = data.getvalue('sub_dir')
sel_filter = data.getvalue('selected_cells')
comp_filter = data.getvalue('compared_cells')

#logf = sub_dir + '/tmplogenrich'
logf = 'tmplogenrich'
update_log(logf, 'Enrichment log:', True)

gene_list = np.loadtxt(base_dir + '/genes.txt', dtype=str, delimiter='\t', comments="")

if str(sel_filter) != "None":
    sel_filter = np.sort(np.array(map(int,sel_filter.split(','))))
else:
    sel_filter = []
    sel_scores = np.zeros(len(gene_list), dtype=float)

if str(comp_filter) != "None":
    comp_filter = np.sort(np.array(map(int,comp_filter.split(','))))
else:
    comp_filter = []
    comp_scores = np.zeros(len(gene_list), dtype=float)

update_log(logf, '%i selected cells; %i compared cells' %(len(sel_filter), len(comp_filter)), False)

t0 = time.time()
color_stats = json.load(open(sub_dir + '/color_stats.json', 'r'))
t1 = time.time()
update_log(logf, 'got color stats -- %.3f' %(t1-t0))

hf = h5py.File(base_dir + '/counts_norm_sparse_cells.hdf5', 'r')
hf_counts = hf.get('counts')
hf_gix = hf.get('gene_ix')

if len(sel_filter) > 0:
    t0 = time.time()
    cell_filter = np.array(np.load(sub_dir + '/cell_filter.npy')[sel_filter], dtype=str)
    totals = np.zeros(len(gene_list), dtype=float)
    t1 = time.time()
    update_log(logf, 'got cell filter -- %.3f' %(t1-t0))

    t0 = time.time()
    for cellid in cell_filter:
        gix = np.array(hf_gix[cellid])
        counts = np.array(hf_counts[cellid])
        totals[gix] = totals[gix] + counts

    all_means = totals / float(len(cell_filter))
    t1 = time.time()
    update_log(logf, 'got means -- %.3f' %(t1-t0))

    t0 = time.time()
    sel_scores = []
    for iG, g in enumerate(gene_list):
        m = color_stats[g][0]
        s = color_stats[g][1]
        sel_scores.append((all_means[iG] - m) / (s+0.02))
    sel_scores = np.array(sel_scores)
    t1 = time.time()
    update_log(logf, 'got selected scores -- %.3f' %(t1-t0))

if len(comp_filter) > 0:
    t0 = time.time()
    cell_filter = np.array(np.load(sub_dir + '/cell_filter.npy')[comp_filter], dtype=str)
    totals = np.zeros(len(gene_list), dtype=float)

    for cellid in cell_filter:
        gix = np.array(hf_gix[cellid])
        counts = np.array(hf_counts[cellid])
        totals[gix] = totals[gix] + counts

    all_means = totals / float(len(cell_filter))
    t1 = time.time()
    update_log(logf, 'got means -- %.3f' %(t1-t0))

    t0 = time.time()
    comp_scores = []
    for iG, g in enumerate(gene_list):
        m = color_stats[g][0]
        s = color_stats[g][1]
        comp_scores.append((all_means[iG] - m) / (s+0.02))

    comp_scores = np.array(comp_scores)
    t1 = time.time()
    update_log(logf, 'got compared scores -- %.3f' %(t1-t0))

scores = sel_scores - comp_scores

t0 = time.time()
o = np.argsort(-scores)[:1000]
t1 = time.time()
update_log(logf, 'sorted scores -- %.3f' %(t1-t0))
t0 = time.time()
gene_list = gene_list[o]
scores = scores[o]
t1 = time.time()
update_log(logf, 'filtered lists -- %.3f' %(t1-t0))

hf.close()

print "Content-Type: text/plain"
print
print '\n'.join(gene_list) + '\t' + '\n'.join(map(strfloat,scores))
