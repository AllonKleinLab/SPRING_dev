#!/usr/bin/env python

import numpy as np, json

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
	included = np.all(E < tc_tiled * 0.02, axis=0)	
	tc_include = np.sum(E[:,included],axis=1)
	tc_tiled = np.tile(tc_include[:,None],(1,E.shape[1]))
	return E / (tc_tiled * np.mean(total_counts) + .00001)

def Zscore(E):
	means = np.tile(np.mean(E,axis=0)[None,:],(E.shape[0],1))
	stds = np.tile(np.std(E,axis=0)[None,:],(E.shape[0],1))
	return (E - means) / (stds + .0001)


def filter_genes(E, Ecutoff, Vcutoff):
	mean_filter = np.mean(E,axis=0)> Ecutoff
	var_filter = np.std(E,axis=0) / (np.mean(E,axis=0)+.0001) > Vcutoff
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

