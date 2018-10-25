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

def simulate_doublets_from_counts(E, sim_doublet_ratio=1):
    '''
    Simulate doublets by summing the counts of random cell pairs.

    Inputs:
    E (numpy or scipy matrix of size (num_cells, num_genes)): counts matrix, ideally without total-counts normalization.
    sim_doublet_ratio (float): number of doublets to simulate, as a fraction of the number of cells in E.
                          A total of num_sim_doubs = int(sim_doublet_ratio * E[0]) doublets will be simulated.

    Returns:
    - Edoub (scipy sparse CSC matrix of size (num_cells+num_sim_doubs, num_genes)): counts matrix with the simulated doublet data appended to the original data matrix E.
    - doub_labels (array of size (num_cells+num_sim_doubs)): 0 if observed cell, 1 if simulated doublet
    - pair_ix (matrix of size(num_sim_doubs, 2)): each row gives the indices of the parent cells from E used to generate the simulated doublet
    '''

    if not scipy.sparse.issparse(E):
        E = scipy.sparse.csc_matrix(E)
    elif not scipy.sparse.isspmatrix_csc(E):
        E = E.tocsc()

    n_obs = E.shape[0]
    n_doub = int(n_obs * sim_doublet_ratio)

    pair_ix = np.random.randint(0, n_obs, size=(n_doub, 2))

    Edoub = E[pair_ix[:, 0],:] + E[pair_ix[:, 1],:]


    Edoub = scipy.sparse.vstack((E, Edoub))
    doub_labels = np.concatenate((np.zeros(n_obs), np.ones(n_doub)))

    return Edoub, doub_labels, pair_ix

#========================================================================================#

def simulate_doublets_from_pca(PCdat, total_counts=[], sim_doublet_ratio=1):
    '''
    Simulate doublets by averaging PCA coordinates of random cell pairs.
    Average is weighted by total counts of each parent cell, if provided.

    Returns:
    PCdoub (matrix of size (num_cells+num_sim_doubs, num_pcs)): PCA matrix with the simulated doublet PCA coordinates appended to the original data matrix PCdat.
    doub_labels (array of size (num_cells+num_sim_doubs)): 0 if observed cell, 1 if simulated doublet
    pair_ix (matrix of size(num_sim_doubs, 2)): each row gives the indices of the parent cells used to generate the simulated doublet
    '''

    n_obs = PCdat.shape[0]
    n_doub = int(n_obs * sim_doublet_ratio)

    if len(total_counts) == 0:
        total_counts = np.ones(n_obs)

    pair_ix = np.random.randint(0, n_obs, size=(n_doub, 2))

    pair_tots = np.hstack((total_counts[pair_ix[:, 0]][:,None], total_counts[pair_ix[:, 1]][:,None]))
    pair_tots = np.array(pair_tots, dtype=float)
    pair_fracs = pair_tots / np.sum(pair_tots, axis=1)[:,None]

    PCdoub = PCdat[pair_ix[:, 0],:] * pair_fracs[:, 0][:,None] + PCdat[pair_ix[:, 1],:] * pair_fracs[:, 1][:,None]

    PCdoub = np.vstack((PCdat, PCdoub))
    doub_labels = np.concatenate((np.zeros(n_obs), np.ones(n_doub)))

    return PCdoub, doub_labels, pair_ix

#========================================================================================#

def calculate_doublet_scores(embedding, doub_labels, k=50, use_approx_nn=True, exp_doub_rate = 1.0, get_doub_parents = False, parent_ix = None):
    t00 = time.time()
    n_obs = sum(doub_labels == 0)
    n_sim = sum(doub_labels == 1)

    # Adjust k (number of nearest neighbors) based on the ratio of simulated to observed cells
    k_adj = int(round(k * (1+n_sim/float(n_obs))))

    # Find k_adj nearest neighbors
    neighbors = get_knn_graph(embedding, k=k_adj, dist_metric='euclidean', approx=use_approx_nn)[1]
    
    # Calculate doublet score based on ratio of simulated cell neighbors vs. observed cell neighbors
    doub_neigh_mask = doub_labels[neighbors] == 1
    n_sim_neigh = np.sum(doub_neigh_mask, axis = 1)
    n_obs_neigh = doub_neigh_mask.shape[1] - n_sim_neigh

    rho = exp_doub_rate
    r = n_sim / float(n_obs)
    nd = n_sim_neigh
    ns = n_obs_neigh
    N = k_adj
    
    # Bayesian
    q=(nd+1)/float(N+2)
    doub_score = q*rho/r/(1-rho-q*(1-rho-rho/r))
    
    #doub_score = n_sim_neigh / (n_sim_neigh + n_obs_neigh * n_sim / float(n_obs) / exp_doub_rate)

    # get parents of doublet neighbors, if requested
    neighbors = neighbors - n_obs
    if get_doub_parents and parent_ix is not None:
        neighbor_parents = []
        for iCell in xrange(n_obs):
            this_doub_neigh = neighbors[iCell,:][neighbors[iCell,:] > -1]
            if len(this_doub_neigh) > 0:
                this_doub_neigh_parents = np.unique(parent_ix[this_doub_neigh,:].flatten())
                neighbor_parents.append(list(this_doub_neigh_parents))
            else:
                neighbor_parents.append([])
        return doub_score[doub_labels == 0], doub_score[doub_labels == 1], neighbor_parents

    # return doublet scores for observed cells and simulated cells
    return doub_score[doub_labels == 0], doub_score[doub_labels == 1]


#========================================================================================#

def woublet(E=None, exp_doub_rate = 0.1, sim_doublet_ratio=3, k=50, use_approx_nn=False, get_doub_parents = False, precomputed_pca=None, total_counts=None, total_counts_normalize=True, norm_exclude_abundant_gene_frac=1, min_counts=3, min_cells=5, vscore_percentile=85, gene_filter=None, num_pc=50, sparse_pca=False):
    
    # Check that input is valid
    if E is None and precomputed_pca is None:
        print 'Please supply a counts matrix (E) or PCA coordinates (precomputed_pca)'
        return
    
    # Convert counts matrix to sparse format if necessary
    if not E is None:
        if not scipy.sparse.issparse(E):
            E = scipy.sparse.csc_matrix(E)
        elif not scipy.sparse.isspmatrix_csc(E):
            E = E.tocsc()

    # Get total counts per cell
    if total_counts is None:
        if E is None:
            total_counts = np.ones(precomputed_pca.shape[0])
        else:
            total_counts = E.sum(1).A.squeeze()

    # Run PCA if not provided
    if precomputed_pca is None:
        PCdat = preprocess_and_pca(E, total_counts_normalize=total_counts_normalize, norm_exclude_abundant_gene_frac=norm_exclude_abundant_gene_frac, min_counts=min_counts, min_cells=min_cells, vscore_percentile=vscore_percentile, gene_filter=gene_filter, num_pc=num_pc, sparse_pca=sparse_pca)
    else:
        PCdat = precomputed_pca

    # Simulate doublets
    #print 'Simulating doublets'
    PCdat, doub_labels, parent_ix = simulate_doublets_from_pca(PCdat, total_counts=total_counts, sim_doublet_ratio=sim_doublet_ratio)

    # Calculate doublet scores using k-nearest-neighbor classifier
    #print 'Running KNN classifier'
    return calculate_doublet_scores(PCdat, doub_labels, k=k, use_approx_nn=use_approx_nn, exp_doub_rate = exp_doub_rate, get_doub_parents = get_doub_parents, parent_ix = parent_ix)

#========================================================================================#



cwd = os.getcwd()
if cwd.endswith('cgi-bin'):
    os.chdir('../')
t00 = time.time()




data = cgi.FieldStorage()
base_dir = data.getvalue('base_dir')
sub_dir = data.getvalue('sub_dir')
k = int(data.getvalue('k'))
r = float(data.getvalue('r'))
f = float(data.getvalue('f'))


if os.path.exists(sub_dir + '/intermediates.npz'):
    tmp = np.load(sub_dir + '/intermediates.npz')
    Epca = tmp['Epca']
    if 'total_counts' in tmp:
        total_counts = tmp['total_counts']
    else:
        total_counts = None
    del tmp
else:
    print 'Error: could not find "intermediates.npz"'

doublet_scores, doublet_scores_sim, doub_neigh_parents = woublet(precomputed_pca = Epca, total_counts = total_counts, exp_doub_rate = f, sim_doublet_ratio = r, k = k, use_approx_nn = True, get_doub_parents = True)
np.save(sub_dir + '/doublet_scores.npy', doublet_scores)
np.save(sub_dir + '/doublet_scores_sim.npy', doublet_scores_sim)

with open(sub_dir + '/doublet_results.tsv', 'w') as o:
    o.write('Score\tObserved_or_Simulated\n')
    for s in doublet_scores:
        o.write('{:.5f}\tObserved\n'.format(s))
    for s in doublet_scores_sim:
        o.write('{:.5f}\tSimulated\n'.format(s))


d = {}
for i, neigh in enumerate(doub_neigh_parents):
    if len(neigh)>0:
        d[i] = neigh
if os.path.exists(sub_dir + '/clone_map.json'):
    clone_map = json.load(open(sub_dir + '/clone_map.json'))
else:
    clone_map = {}
clone_map['Doublet parents'] = d
# clone_map['Random'] = {i:[0] for i in xrange(Epca.shape[0])}
json.dump(clone_map,open(sub_dir+'/clone_map.json','w'))
# with open(sub_dir+'/clone_map.json','w') as f:
    # f.write(json.dumps(clone_map,indent=4, sort_keys=True).decode('utf-8'))

# with open(sub_dir + '/clone_map.txt', 'w') as o:
#     for cell in doub_neigh_parents:
#         o.write(','.join(map(str, cell)) + '\n')

color_stats = json.load(open(sub_dir + '/color_stats.json'))
overwrite = False
color_stats['Doublet score'] = (np.mean(doublet_scores),np.std(doublet_scores),np.min(doublet_scores),np.max(doublet_scores),np.percentile(doublet_scores,99))
save_color_stats(sub_dir + '/color_stats.json', color_stats)


with open(sub_dir + '/color_data_gene_sets.csv') as f:
    outLines = []
    foundDoub = False
    for l in f:
        if l.startswith('Doublet score'):
            foundDoub = True
            outLines.append('Doublet score,' + ','.join(['%.3f' %x for x in doublet_scores]))
        else:
            outLines.append(l.strip('\n'))
    if not foundDoub:
        outLines.append('Doublet score,' + ','.join(['%.3f' %x for x in doublet_scores]))

with open(sub_dir + '/color_data_gene_sets.csv', 'w') as o:
    o.write("\n".join(outLines))






