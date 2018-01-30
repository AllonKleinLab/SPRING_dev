#!/usr/bin/env python

import os
import numpy as np
import scipy
import scipy.stats
from sklearn.decomposition import PCA,TruncatedSVD
from sklearn.neighbors import NearestNeighbors
from datetime import datetime
import json
import time

def runningquantile(x, y, p, nBins):
    ind = np.argsort(x)
    x = x[ind]
    y = y[ind]


    dx = (x[-1] - x[0]) / nBins
    xOut = np.linspace(x[0]+dx/2, x[-1]-dx/2, nBins)

    yOut = np.zeros(xOut.shape)

    for i in range(len(xOut)):
        ind = np.nonzero((x >= xOut[i]-dx/2) & (x < xOut[i]+dx/2))[0]
        if len(ind) > 0:
            yOut[i] = np.percentile(y[ind], p)
        else:
            if i > 0:
                yOut[i] = yOut[i-1]
            else:
                yOut[i] = np.nan

    return xOut, yOut
    
def tot_counts_norm_sparse(E, exclude_dominant_frac = 1, included = [], target_mean = 0):
    ncell = E.shape[0]
    if len(included) == 0:
        if exclude_dominant_frac == 1:
            tots_use = E.sum(axis=1)
        else:
            tots = E.sum(axis=1)
            wtmp = scipy.sparse.lil_matrix((ncell, ncell))
            wtmp.setdiag(1. / tots)
            included = np.asarray(~(((wtmp * E) > exclude_dominant_frac).sum(axis=0) > 0))[0,:]
            tots_use = E[:,included].sum(axis = 1)
            #print 'Excluded %i genes from normalization' %(np.sum(~included))
    else:
        tots_use = E[:,included].sum(axis = 1)

    if target_mean == 0:
        target_mean = np.mean(tots_use)

    w = scipy.sparse.lil_matrix((ncell, ncell))
    w.setdiag(float(target_mean) / tots_use)
    Enorm = w * E

    return Enorm, target_mean, included

def sparse_var(E, axis=0):
    mean_gene = E.mean(axis=axis).A.squeeze()
    tmp = E.copy()
    tmp.data **= 2
    return tmp.mean(axis=axis).A.squeeze() - mean_gene ** 2

def sparse_multiply(E, a):
    nrow = E.shape[0]
    w = scipy.sparse.lil_matrix((nrow, nrow))
    w.setdiag(a)
    return w * E

def sparse_zscore(E):
    mean_gene = E.mean(0)
    stdev_gene = np.sqrt(sparse_var(E))
    return sparse_multiply((E - mean_gene).T, 1/stdev_gene).T

def remove_corr_genes_sparse(E, gene_list, bad_gene_idx_list, test_gene_idx, min_corr = 0.1):
    exclude_ix = []
    for iSet in range(len(bad_gene_idx_list)):
        seed_ix = bad_gene_idx_list[iSet][E[:,bad_gene_idx_list[iSet]].sum(axis=0).A.squeeze() > 0]

        tmp = sparse_zscore(E[:,seed_ix])
        tmp = tmp.sum(1).A.squeeze()

        c = np.zeros(len(test_gene_idx))
        for iG in range(len(c)):
            c[iG],_ = scipy.stats.pearsonr(tmp, E[:,test_gene_idx[iG]].A.squeeze())

        exclude_ix.extend([test_gene_idx[i] for i in range(len(test_gene_idx)) if (c[i]) >= min_corr])
        #print len(exclude_ix)
    exclude_ix = np.array(exclude_ix)
    #print np.array(gene_list)[exclude_ix]
    return np.array([g for g in test_gene_idx if g not in exclude_ix], dtype=int)

def get_knn_graph2(X, k=5, dist_metric='euclidean',approx=False):
    t00 = time.time()
    if approx:
        try:
            from annoy import AnnoyIndex
        except:
            approx = False
            #print 'Could not find library "annoy" for approx. nearest neighbor search.'
            #print 'Using sklearn instead.'
    if approx:
        #print 'Using approximate nearest neighbor search.'
        # Approximate KNN using Annoy
        if dist_metric == 'cosine':
            dist_metric = 'angular'
        npc = X.shape[1]
        ncell = X.shape[0]
        annoy_index = AnnoyIndex(npc, metric=dist_metric)
        t0 = time.time()
        for i in xrange(ncell):
            annoy_index.add_item(i, list(X[i,:]))
        annoy_index.build(10) # 10 trees
        t1 = time.time() - t0
        #print 'Annoy: index built in %.5f sec' %t1

        t0 = time.time()
        knn = []
        for iCell in xrange(ncell):
            knn.append(annoy_index.get_nns_by_item(iCell, k + 1)[1:])
        knn = np.array(knn, dtype=int)
        t1 = time.time() - t0
        #print 'Annoy: kNN built in %.5f sec' %(t1)
    else:
        t0 = time.time()
        if dist_metric == 'cosine':
            nbrs = NearestNeighbors(n_neighbors=k, metric=dist_metric, algorithm='brute').fit(X)
        else:
            nbrs = NearestNeighbors(n_neighbors=k, metric=dist_metric).fit(X)
        knn = nbrs.kneighbors(return_distance=False)
        #knn = knn[:,1:]
        t1 = time.time() - t0
        #print 'kNN built in %.5f sec' %(t1)

    links = set([])
    for i in range(knn.shape[0]):
        for j in knn[i,:]:
            links.add(tuple(sorted((i,j))))

    t11 = time.time() - t00
    #print 'Entire graph function: %.5f sec' %(t11)
    return list(links), knn



def get_PCA_sparseInput(E, base_ix=[], numpc=50, method='sparse', normalize=True):
    # Takes sparse counts matrix as input.
    # If method == 'sparse', gene-level normalization maintains sparsity
    #     (no centering) and TruncatedSVD is used instead of normal PCA.

    if len(base_ix) == 0:
        base_ix = np.arange(E.shape[0])

    if method == 'sparse':
        if normalize:
            zstd = np.sqrt(sparse_var(E[base_ix,:]))
            Z = sparse_multiply(E.T, 1 / zstd).T
        else:
            Z = E

        pca = TruncatedSVD(n_components=numpc)
        pca.fit(Z[base_ix,:])
        return pca.transform(Z)

    else:
        if normalize:
            zmean = E[base_ix,:].mean(0)
            zstd = np.sqrt(sparse_var(E[base_ix,:]))
            Z = sparse_multiply((E - zmean).T, 1/zstd).T
        else:
            Z = E
        pca = PCA(n_components=numpc)
        pca.fit(Z[base_ix,:])
        return pca.transform(Z)

def get_vscores_sparse(E, min_mean=0, nBins=50, fit_percentile=0.1, error_wt=1):
    ncell = E.shape[0]

    mu_gene = E.mean(axis=0).A.squeeze()
    gene_ix = np.nonzero(mu_gene > min_mean)[0]
    mu_gene = mu_gene[gene_ix]

    tmp = E[:,gene_ix]
    tmp.data **= 2
    var_gene = tmp.mean(axis=0).A.squeeze() - mu_gene ** 2
    del tmp
    FF_gene = var_gene / mu_gene

    data_x = np.log(mu_gene)
    data_y = np.log(FF_gene / mu_gene)

    x, y = runningquantile(data_x, data_y, fit_percentile, nBins)
    x = x[~np.isnan(y)]
    y = y[~np.isnan(y)]

    gLog = lambda input: np.log(input[1] * np.exp(-input[0]) + input[2])
    h,b = np.histogram(np.log(FF_gene[mu_gene>0]), bins=200)
    b = b[:-1] + np.diff(b)/2
    max_ix = np.argmax(h)
    c = np.max((np.exp(b[max_ix]), 1))
    errFun = lambda b2: np.sum(abs(gLog([x,c,b2])-y) ** error_wt)
    b0 = 0.1
    b = scipy.optimize.fmin(func = errFun, x0=[b0], disp=False)
    a = c / (1+b) - 1


    v_scores = FF_gene / ((1+a)*(1+b) + b * mu_gene);
    CV_eff = np.sqrt((1+a)*(1+b) - 1);
    CV_input = np.sqrt(b);

    return v_scores, CV_eff, CV_input, gene_ix, mu_gene, FF_gene, a, b



def filter_genes(E, min_counts, min_cells, min_vscore_pctl):
    Vscores, CV_eff, CV_input, gene_ix, mu_gene, FF_gene, a, b = get_vscores_sparse(E)
    ix2 = Vscores>0
    Vscores = Vscores[ix2]
    gene_ix = gene_ix[ix2]
    mu_gene = mu_gene[ix2]
    FF_gene = FF_gene[ix2]

    min_log_vscore = np.percentile(np.log(Vscores), min_vscore_pctl)
    ix = (((E[:,gene_ix] >= min_counts).sum(0).A.squeeze() >= min_cells) & (np.log(Vscores) >= min_log_vscore))
    gene_filter = gene_ix[ix]
    return gene_filter
