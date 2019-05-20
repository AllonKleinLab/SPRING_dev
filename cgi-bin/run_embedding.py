#!/usr/bin/env python
import cgi
import cgitb
import os
import json
import numpy as np
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


################
def rescale_coordinates(coords):
    coords = coords - np.min(coords, axis=0) - np.ptp(coords, axis=0) / 2.0
    coords = coords / np.ptp(coords, axis=0) * 30 * np.sqrt(coords.shape[0])
    coords[:,0] = coords[:,0] + 750
    coords[:,1] = coords[:,1] + 250
    return coords


########## 2-D EMBEDDING

def get_knn_graph(X, k=5, dist_metric='euclidean', approx=False, return_edges=True):
    '''
    Build k-nearest-neighbor graph
    Return edge list and nearest neighbor matrix
    '''
    if approx:
        try:
            from annoy import AnnoyIndex
        except:
            approx = False
            print('Could not find library "annoy" for approx. nearest neighbor search')
    if approx:
        if dist_metric == 'cosine':
            dist_metric = 'angular'
        npc = X.shape[1]
        ncell = X.shape[0]
        annoy_index = AnnoyIndex(npc, metric=dist_metric)

        for i in range(ncell):
            annoy_index.add_item(i, list(X[i,:]))
        annoy_index.build(10) # 10 trees

        knn = []
        for iCell in range(ncell):
            knn.append(annoy_index.get_nns_by_item(iCell, k + 1)[1:])
        knn = np.array(knn, dtype=int)

    else:
        from sklearn.neighbors import NearestNeighbors
        if dist_metric == 'cosine':
            nbrs = NearestNeighbors(n_neighbors=k, metric=dist_metric, algorithm='brute').fit(X)
        else:
            nbrs = NearestNeighbors(n_neighbors=k, metric=dist_metric).fit(X)
        knn = nbrs.kneighbors(return_distance=False)

    if return_edges:
        links = set([])
        for i in range(knn.shape[0]):
            for j in knn[i,:]:
                links.add(tuple(sorted((i,j))))


        return links, knn
    return knn

def get_tsne(X, angle=0.5, perplexity=30, verbose=False):
    from sklearn.manifold import TSNE
    return TSNE(angle=angle, perplexity=perplexity, verbose=verbose).fit_transform(X)

def get_force_layout(X, n_neighbors=5, approx_neighbors=False, n_iter=300, verbose=False):
    edges = get_knn_graph(X, k=n_neighbors, approx=approx_neighbors, return_edges=True)[0]
    return run_force_layout(edges, X.shape[0], n_iter=n_iter, verbose=verbose)

def run_force_layout(links, n_cells, n_iter=100, edgeWeightInfluence=1, barnesHutTheta=2, scalingRatio=1, gravity=0.05, jitterTolerance=1, verbose=False):
    from fa2 import ForceAtlas2
    import networkx as nx

    G = nx.Graph()
    G.add_nodes_from(range(n_cells))
    G.add_edges_from(list(links))

    forceatlas2 = ForceAtlas2(
                  # Behavior alternatives
                  outboundAttractionDistribution=False,  # Dissuade hubs
                  linLogMode=False,  # NOT IMPLEMENTED
                  adjustSizes=False,  # Prevent overlap (NOT IMPLEMENTED)
                  edgeWeightInfluence=edgeWeightInfluence,

                  # Performance
                  jitterTolerance=jitterTolerance,  # Tolerance
                  barnesHutOptimize=True,
                  barnesHutTheta=barnesHutTheta,
                  multiThreaded=False,  # NOT IMPLEMENTED

                  # Tuning
                  scalingRatio=scalingRatio,
                  strongGravityMode=False,
                  gravity=gravity,
                  # Log
                  verbose=verbose)

    positions = forceatlas2.forceatlas2_networkx_layout(G, pos=None, iterations=n_iter)
    positions = np.array([positions[i] for i in sorted(positions.keys())])
    return positions

def get_umap(X, n_neighbors=10, min_dist=0.1, metric='euclidean'):
    import umap
    # UMAP: https://github.com/lmcinnes/umap
    embedding = umap.UMAP(n_neighbors=n_neighbors, min_dist=min_dist, metric=metric).fit_transform(X)
    return embedding


  
#========================================================================================#

cwd = os.getcwd()
if cwd.endswith('cgi-bin'):
    os.chdir('../')

data = cgi.FieldStorage()
base_dir = data.getvalue('base_dir')
sub_dir = data.getvalue('sub_dir')
embed_method = data.getvalue('embed_method')
n_iter = int(data.getvalue('n_iter'))
k = int(data.getvalue('k'))
min_dist = float(data.getvalue('min_dist'))
perplex = float(data.getvalue('perplex'))
angle = float(data.getvalue('angle'))

if os.path.exists(sub_dir + '/intermediates.npz'):
    tmp = np.load(sub_dir + '/intermediates.npz')
    Epca = tmp['Epca']
    del tmp
else:
    print 'Error: could not find "intermediates.npz"'

if embed_method == 'fa2':
    edges = np.loadtxt(sub_dir + '/edges.csv', delimiter=';',comments="")
    coords = run_force_layout(edges, Epca.shape[0], n_iter=n_iter)
elif embed_method == 'umap':
    coords = get_umap(Epca, n_neighbors=k, min_dist=min_dist, metric='euclidean')
elif embed_method == 'tsne':
    coords = get_tsne(Epca, angle=angle, perplexity=perplex)


coords = rescale_coordinates(coords)
np.save('{}/coordinates_{}.npy'.format(sub_dir, embed_method), coords)
np.savetxt('{}/coordinates_{}.txt'.format(sub_dir, embed_method), coords, delimiter=',', fmt='%.5f')





