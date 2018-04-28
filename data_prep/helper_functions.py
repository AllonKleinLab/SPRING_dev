import os
import numpy as np
import scipy
import scipy.stats
import sklearn.cluster
from sklearn.decomposition import PCA,TruncatedSVD
from sklearn.neighbors import NearestNeighbors
from scipy.sparse import csc_matrix
import scipy.io
import pickle
from scipy.spatial.distance import pdist
from datetime import datetime
import json
import matplotlib.pyplot as plt
import time

######### LOADING DATA
def text_to_expr(fname,delim='\t',start_row=0,start_column=0,update=0,data_type='int'):
    '''
     Load a text counts matrix from a text file.
     Can be gzipped (automatically detected).
     data_type should be "int" or "float"
    '''
    if fname.endswith('.gz'):
        tmpsuffix = str(np.random.randint(1e9))
        os.system('gunzip -c "' + fname + '" > tmp' + tmpsuffix)
        f = open('tmp' + tmpsuffix)
    else:
        f = open(fname)

    expr = []
    ct = 0
    for l in f:
        if ct>start_row-1:
            l = l.strip('\n').split(delim)
            if data_type == 'int':
                expr += [[int(x) for x in l[start_column:]]]
            elif data_type == 'float':
                expr += [[float(x) for x in l[start_column:]]]
            else:
                print 'Unrecognized data type. Must be "int" or "float".'
                return

        ct += 1
        if update > 0:
            if ct % update == 0:
                print ct

    f.close()

    if fname.endswith('.gz'):
        os.system('rm tmp' + tmpsuffix)

    return expr

def read_npy_gzip(fname):
    '''
    Load .npy.gz counts matrix.
    '''
    tmpsuffix = str(np.random.randint(1e9))
    os.system('gunzip -c "' + fname + '" > tmp' + tmpsuffix)
    np_mat = np.load('tmp' + tmpsuffix)
    os.system('rm tmp' + tmpsuffix)
    return np_mat

def load_genes(fname):
    f = open(fname)
    return [l.strip('\n') for l in f]

def load_counts(prefix, save_as_npy = True):
    if os.path.isfile(prefix + '.counts.npy.gz'):
        print 'loading from npy file'
        dat = read_npy_gzip(prefix + '.counts.npy.gz')
    else:
        print 'loading from tsv file'
        dat = np.array(text_to_expr(prefix + '.counts.tsv.gz','\t',1,1))
        if save_as_npy:
            np.save(prefix + '.counts.npy', dat)
            os.system('gzip "' + prefix + '.counts.npy"')
    return dat


def load_mtx(fname):
    dat = scipy.io.mmread(fname)
    return dat.toarray()

def load_mtx_sparse(fname):
    dat = scipy.io.mmread(fname)
    return dat.tocsc()

def load_pickle(fname):
    '''
    Load .pickle(.gz) data
    '''
    if fname.endswith('.gz'):
        tmpsuffix = str(np.random.randint(1e9))
        os.system('gunzip -c "' + fname + '" > tmp' + tmpsuffix)
        dat = pickle.load(open('tmp' + tmpsuffix, 'rb'))
        os.system('rm tmp' + tmpsuffix)
    else:
        dat = pickle.load(open(fname, 'rb'))
    return dat

########## GENE FILTERING
def filter_dict(d, filt):
    for k,v in d.items():
        if k != 'meta':
            if len(v.shape) == 1:
                d[k] = v[filt]
            else:
                d[k] = v[filt,:]
    return d

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

def get_vscores(E, min_mean=0, nBins=50, fit_percentile=0.1, error_wt=1):
    mu_gene = np.mean(E, axis=0)
    gene_ix = np.nonzero(mu_gene > min_mean)[0]
    mu_gene = mu_gene[gene_ix]
    FF_gene = np.var(E[:,gene_ix], axis=0) / mu_gene

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


###### Clustering stuff

def get_hierch_order(hm, dist_metric='euclidean', linkage_method='ward'):
    from scipy.spatial.distance import pdist
    from fastcluster import linkage


    np.random.seed(0)
    D = pdist(hm, dist_metric)
    Z = linkage(D, linkage_method)
    n = len(Z) + 1
    cache = dict()
    for k in range(len(Z)):
        c1, c2 = int(Z[k][0]), int(Z[k][1])
        c1 = [c1] if c1 < n else cache.pop(c1)
        c2 = [c2] if c2 < n else cache.pop(c2)
        cache[n+k] = c1 + c2
    o = np.array(cache[2*len(Z)])

    return o

def spec_clust(A, k):
    spec = sklearn.cluster.SpectralClustering(n_clusters=k, random_state = 0, affinity = 'precomputed', assign_labels = 'discretize')
    return spec.fit_predict(A)

####################    SPRING filtering, etc.

def tot_counts_norm(E, exclude_dominant_frac = 1):
    E = np.array(E, dtype=float)
    if exclude_dominant_frac == 1:
        tots_use = np.sum(E, axis = 1)
    else:
        tots = np.sum(E, axis = 1)
        included = np.all((E / tots[:,None]) < exclude_dominant_frac, axis = 0)
        tots_use = np.sum(E[:,included], axis = 1)
        print 'Excluded %i genes from normalization' %(np.sum(~included))

    w = np.mean(tots_use)/tots_use
    Enorm = E * w[:,None]

    return Enorm

def gene_stats(E):
    m = np.mean(E,axis=0)
    ix = m > 0
    m = m[ix]

    ff = np.var(E[:,ix],axis=0) / m
    gene_ix = np.nonzero(ix)[0]

    return m, ff, gene_ix

def get_PCA(E, base_ix=[], numpc=50, method='sparse', normalize=True):
    if len(base_ix) == 0:
        base_ix = np.arange(E.shape[0])

    if method == 'sparse':
        if normalize:
            zstd = np.std(E[base_ix,:],axis=0)
            Z = csc_matrix(E / zstd)
        else:
            Z = E

        pca = TruncatedSVD(n_components=numpc)
        pca.fit(Z[base_ix,:])
        return pca.transform(Z)

    else:
        if normalize:
            zmean = np.mean(E[base_ix,:],axis=0)
            zstd = np.std(E[base_ix,:],axis=0)
            Z = (E - zmean) / zstd
        else:
            Z = E
        pca = PCA(n_components=numpc)
        pca.fit(Z[base_ix,:])
        return pca.transform(Z)



def get_knn_graph(X, k=5, dist_metric='euclidean'):
    if dist_metric == 'cosine':
        nbrs = NearestNeighbors(n_neighbors=k, metric=dist_metric, algorithm='brute').fit(X)
    else:
        nbrs = NearestNeighbors(n_neighbors=k, metric=dist_metric).fit(X)
    knn = nbrs.kneighbors(return_distance=False)
    links = set([])

    A = np.zeros((X.shape[0], X.shape[0]))
    for i in range(knn.shape[0]):
        for j in knn[i,:]:
            links.add(tuple(sorted((i,j))))
            A[i,j] = 1
            A[j,i] = 1
    return links, A, knn

#========================================================================================#
# Sparse stuff
def text_file_gen(fname, delim):
    with open(fname, 'r') as f:
        for line in f:
            yield line.strip('\n').split(delim)

def text_to_sparse(fname,delim='\t',start_row=0,start_column=0,update=0,data_type=float, get_gene_names=False, get_barcodes=False):
    t0 = time.time()
    output = [[]]
    if fname.endswith('.gz'):
        #print 'Unzipping ' + str(datetime.now())
        tmpsuffix = str(np.random.randint(1e9))
        os.system('gunzip -c "' + fname + '" > tmp' + tmpsuffix)
        new_fname = 'tmp' + tmpsuffix
    else:
        new_fname = fname

    X_data = []
    X_row = []
    X_col = []

    file_data = text_file_gen(new_fname, delim)
    if get_barcodes:
        barcode_list = []
    #print 'Reading data from file ' + str(datetime.now())
    for row_ix, dat in enumerate(file_data):
        if row_ix == 0 and get_gene_names:
            gene_list = dat[start_column:]
            output.append(gene_list)
        elif row_ix >= start_row:
            if get_barcodes:
                barcode_list.append(dat[0])
            rowdat = np.array(map(data_type, dat[start_column:]))
            col_ix = np.nonzero(rowdat)[0]
            X_col.extend(col_ix)
            X_row.extend([row_ix - start_row] * len(col_ix))
            X_data.extend(rowdat[col_ix])
    ngenes = len(rowdat)
    if get_barcodes:
        output.append(np.array(barcode_list))
    #print 'Transforming to sparse matrix ' + str(datetime.now())
    E = scipy.sparse.coo_matrix((X_data, (X_row, X_col)), dtype=data_type)
    if E.shape[1] < ngenes:
        nadd = ngenes - E.shape[1]
        E = scipy.sparse.hstack([E, scipy.sparse.coo_matrix((E.shape[0],nadd))])
    #print 'Done ' + str(datetime.now())
    output[0] = E.tocsc()
    if not get_gene_names and not get_barcodes:
        output = output[0]

    if fname.endswith('.gz'):
        os.system('rm ' + new_fname)
    print 'Loading took %.3f seconds' %(time.time() - t0)

    return output

def tot_counts_norm_sparse(E, exclude_dominant_frac = 1, included = [], target_mean = 0):
    E = E.tocsc()
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
            print 'Excluded %i genes from normalization' %(np.sum(~included))
    else:
        tots_use = E[:,included].sum(axis = 1)

    if target_mean == 0:
        target_mean = np.mean(tots_use)

    w = scipy.sparse.lil_matrix((ncell, ncell))
    w.setdiag(float(target_mean) / tots_use)
    Enorm = w * E

    return Enorm.tocsc(), target_mean, included

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
        print len(exclude_ix)
    exclude_ix = np.array(exclude_ix)
    print np.array(gene_list)[exclude_ix]
    return np.array([g for g in test_gene_idx if g not in exclude_ix], dtype=int)

def get_knn_graph2(X, k=5, dist_metric='euclidean',approx=False):
    t00 = time.time()
    if approx:
        try:
            from annoy import AnnoyIndex
        except:
            approx = False
            print 'Could not find library "annoy" for approx. nearest neighbor search.'
            print 'Using sklearn instead.'
    if approx:
        print 'Using approximate nearest neighbor search.'
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
        #print 'kNN built in %.5f sec' %(t1)
    else:
        t0 = time.time()
        if dist_metric == 'cosine':
            nbrs = NearestNeighbors(n_neighbors=k, metric=dist_metric, algorithm='brute').fit(X)
        else:
            nbrs = NearestNeighbors(n_neighbors=k, metric=dist_metric).fit(X)
        knn = nbrs.kneighbors(return_distance=False)
        t1 = time.time() - t0
        #print 'kNN built in %.5f sec' %(t1)

    links = set([])
    for i in range(knn.shape[0]):
        for j in knn[i,:]:
            links.add(tuple(sorted((i,j))))

    t11 = time.time() - t00
    print 'kNN built in %.5f sec' %(t11)
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


def save_hdf5_genes(E, gene_list, filename):
    '''SPRING standard: filename = main_spring_dir + "counts_norm_sparse_genes.hdf5"'''
    
    import h5py
    
    E = E.tocsc()
    
    hf = h5py.File(filename, 'w')
    counts_group = hf.create_group('counts')
    cix_group = hf.create_group('cell_ix')

    hf.attrs['ncells'] = E.shape[0]
    hf.attrs['ngenes'] = E.shape[1]

    for iG, g in enumerate(gene_list):
        counts = E[:,iG].A.squeeze()
        cell_ix = np.nonzero(counts)[0]
        counts = counts[cell_ix]
        counts_group.create_dataset(g, data = counts)
        cix_group.create_dataset(g, data = cell_ix)

    hf.close()
    
def save_hdf5_cells(E, filename):
    '''SPRING standard: filename = main_spring_dir + "counts_norm_sparse_cells.hdf5" '''
    import h5py
    
    E = E.tocsr()
    
    hf = h5py.File(filename, 'w')
    counts_group = hf.create_group('counts')
    gix_group = hf.create_group('gene_ix')

    hf.attrs['ncells'] = E.shape[0]
    hf.attrs['ngenes'] = E.shape[1]

    for iC in range(E.shape[0]):
        counts = E[iC,:].A.squeeze()
        gene_ix = np.nonzero(counts)[0]
        counts = counts[gene_ix]
        counts_group.create_dataset(str(iC), data = counts)
        gix_group.create_dataset(str(iC), data = gene_ix)

    hf.close()
    
def save_sparse_npz(E, filename, compressed = False):
    ''' SPRING standard: filename = main_spring_dir + "/counts_norm.npz"'''
    E = E.tocsc()
    scipy.sparse.save_npz(filename, E, compressed = compressed)


def run_all_spring_sparse(E, gene_list, sample_name, save_dir = './', base_ix = [], normalize = True,
                   exclude_dominant_frac = 1.0, min_counts = 3, min_cells = 5, min_vscore_pctl = 75,
                   show_vscore_plot = False, exclude_gene_names = [],
                   num_pc = 50, pca_method = 'sparse', pca_norm = True,
                   k_neigh = 4, cell_groupings = {}, run_force = False, output_spring = True,
                   precomputed_pca = [], gene_filter = [], custom_colors = {},
                   exclude_corr_genes = [], exclude_gene_corr = 0.2, dist_metric = 'euclidean', use_approxnn=False,
                   run_woublet = False, dd_k=50, dd_frac=5, dd_approx=True):

    E = E.tocsc()

    if len(base_ix) == 0:
        base_ix = np.arange(E.shape[0])

    # total counts normalize

    tot_counts_final = np.sum(E, axis=1).A[:,0]
    if normalize:
        print 'Normalizing'
        E = tot_counts_norm_sparse(E, exclude_dominant_frac = exclude_dominant_frac)[0]

    if len(precomputed_pca) == 0:
        if len(gene_filter) == 0:
            # Get gene stats (above Poisson noise, i.e. V-scores)
            print 'Filtering genes'
            Vscores, CV_eff, CV_input, gene_ix, mu_gene, FF_gene, a, b = get_vscores_sparse(E[base_ix, :])

            ix2 = Vscores>0
            Vscores = Vscores[ix2]
            gene_ix = gene_ix[ix2]
            mu_gene = mu_gene[ix2]
            FF_gene = FF_gene[ix2]

            # Filter genes: minimum V-score percentile and at least min_counts in at least min_cells
            min_log_vscore = np.percentile(np.log(Vscores), min_vscore_pctl)

            ix = (((E[:,gene_ix] >= min_counts).sum(0).A.squeeze() >= min_cells) & (np.log(Vscores) >= min_log_vscore))
            gene_filter = gene_ix[ix]
            print 'Using %i genes' %(len(gene_filter))

            if len(exclude_corr_genes) > 0:
                seed_ix_list = []
                for l in exclude_corr_genes:
                    seed_ix_list.append(np.array([i for i in range(len(gene_list)) if gene_list[i] in l], dtype=int))
                gene_filter = remove_corr_genes_sparse(E, gene_list, seed_ix_list, gene_filter, min_corr = exclude_gene_corr)
                print 'Now using %i genes' %(len(gene_filter))

            # Remove user-excluded genes from consideration
            if len(exclude_gene_names) > 0:
                keep_ix = np.array([ii for ii,gix in enumerate(gene_filter) if gene_list[gix] not in exclude_gene_names])
                print 'Excluded %i genes' %(len(gene_filter)-len(keep_ix))
                gene_filter = gene_filter[keep_ix]

            if show_vscore_plot:
                x_min = 0.5*np.min(mu_gene)
                x_max = 2*np.max(mu_gene)
                xTh = x_min * np.exp(np.log(x_max/x_min)*np.linspace(0,1,100))
                yTh = (1 + a)*(1+b) + b * xTh
                plt.figure(figsize=(8, 6))
                plt.scatter(np.log(mu_gene), np.log(FF_gene), c = [.8,.8,.8]);
                plt.scatter(np.log(mu_gene)[ix], np.log(FF_gene)[ix], c = [0,0,0]);
                plt.plot(np.log(xTh),np.log(yTh));
                plt.title(sample_name)
                plt.xlabel('log(mean)');
                plt.ylabel('log(FF)');
        else:
            print 'Using user-supplied gene filter'


        # RUN PCA
        # if method == 'sparse': normalizes by stdev
        # if method == anything else: z-score normalizes
        print 'Running PCA'
        Epca = get_PCA_sparseInput(E[:,gene_filter], base_ix, numpc=num_pc, method=pca_method, normalize = pca_norm)
    else:
        print 'Using user-supplied PCA coordinates'
        Epca = precomputed_pca

    print 'Building kNN graph'

    links, knn_graph = get_knn_graph2(Epca, k=k_neigh, dist_metric = dist_metric, approx=use_approxnn)

    if run_woublet:
        import doublet_detector as woublet
        print 'Running woublet'
        doub_score, doub_score_full, doub_labels = woublet.detect_doublets([], counts=tot_counts_final, doub_frac=dd_frac, k=dd_k, use_approxnn=dd_approx, precomputed_pca=Epca)

    if output_spring:
        # Calculate Euclidean distances in the PC space (will be used to build knn graph)
        #print 'Getting distance matrix'
        #D = get_distance_matrix(Epca)
        #D = scipy.spatial.distance.squareform(pdist(Epca, dist_metric))

        # Build KNN graph and output SPRING format files
        save_path = save_dir + sample_name

        print 'Saving SPRING files to %s' %save_path
        custom_colors['Total Counts'] = tot_counts_final

        if run_woublet:
            custom_colors['Woublet Score'] = doub_score

        if len(cell_groupings) > 0:
            save_spring_dir_sparse(E.toarray(), [], 0, gene_list, save_path,
                            custom_colors = custom_colors, edges=list(links),
                            cell_groupings = cell_groupings)
        else:
            save_spring_dir_sparse(E.toarray(), [], 0, gene_list, save_path,
                            custom_colors = custom_colors, edges=list(links))


    if run_force:
        import force
        print 'Running FORCE'
        # Create random starting positions.
        starting_positions = np.random.random((Epca.shape[0], 2)) * 500
        force_graph = force.Force(starting_positions, links,
                                 bounds=10**5,  gravity = 0.01)
        tick = 0
        max_tick = 100
        while tick < max_tick:
            force_graph.fast_tick()
            if tick % 10 == 0:
                print '%i / %i' %(tick, max_tick)

            tick += 1
        coords = force_graph.current_positions

        print 'Done!'
        if len(precomputed_pca) == 0:
            return  E, Epca, knn_graph, gene_filter, coords
        else:
            return E, Epca, knn_graph, coords

    print 'Done!'
    if len(precomputed_pca) == 0:
        return E, Epca, knn_graph, gene_filter
    else:
        return E, Epca, knn_graph


def run_all_spring_sparse_hdf5(E, gene_list, sample_name, save_dir = './', base_ix = [], normalize = True,
                   exclude_dominant_frac = 1.0, min_counts = 3, min_cells = 5, min_vscore_pctl = 75,
                   show_vscore_plot = False, exclude_gene_names = [],
                   num_pc = 50, pca_method = 'sparse', pca_norm = True,
                   k_neigh = 4, cell_groupings = {}, run_force = False, output_spring = True,
                   precomputed_pca = [], gene_filter = [], custom_colors = {},
                   exclude_corr_genes = [], exclude_gene_corr = 0.2, dist_metric = 'euclidean', use_approxnn=False,
                   run_woublet = False, dd_k=50, dd_frac=5, dd_approx=True, tot_counts_final = []):
    E = E.tocsc()
    if len(base_ix) == 0:
        base_ix = np.arange(E.shape[0])

    # total counts normalize
    if len(tot_counts_final) == 0:
        tot_counts_final = np.sum(E, axis=1).A[:,0]

    if normalize:
        print 'Normalizing'
        E = tot_counts_norm_sparse(E, exclude_dominant_frac = exclude_dominant_frac)[0]

    if len(precomputed_pca) == 0:
        if len(gene_filter) == 0:
            # Get gene stats (above Poisson noise, i.e. V-scores)
            print 'Filtering genes'
            Vscores, CV_eff, CV_input, gene_ix, mu_gene, FF_gene, a, b = get_vscores_sparse(E[base_ix, :])

            ix2 = Vscores>0
            Vscores = Vscores[ix2]
            gene_ix = gene_ix[ix2]
            mu_gene = mu_gene[ix2]
            FF_gene = FF_gene[ix2]

            # Filter genes: minimum V-score percentile and at least min_counts in at least min_cells
            min_log_vscore = np.percentile(np.log(Vscores), min_vscore_pctl)

            ix = (((E[:,gene_ix] >= min_counts).sum(0).A.squeeze() >= min_cells) & (np.log(Vscores) >= min_log_vscore))
            gene_filter = gene_ix[ix]
            print 'Using %i genes' %(len(gene_filter))

            if len(exclude_corr_genes) > 0:
                seed_ix_list = []
                for l in exclude_corr_genes:
                    seed_ix_list.append(np.array([i for i in range(len(gene_list)) if gene_list[i] in l], dtype=int))
                gene_filter = remove_corr_genes_sparse(E, gene_list, seed_ix_list, gene_filter, min_corr = exclude_gene_corr)
                print 'Now using %i genes' %(len(gene_filter))

            # Remove user-excluded genes from consideration
            if len(exclude_gene_names) > 0:
                keep_ix = np.array([ii for ii,gix in enumerate(gene_filter) if gene_list[gix] not in exclude_gene_names])
                print 'Excluded %i genes' %(len(gene_filter)-len(keep_ix))
                gene_filter = gene_filter[keep_ix]

            if show_vscore_plot:
                x_min = 0.5*np.min(mu_gene)
                x_max = 2*np.max(mu_gene)
                xTh = x_min * np.exp(np.log(x_max/x_min)*np.linspace(0,1,100))
                yTh = (1 + a)*(1+b) + b * xTh
                plt.figure(figsize=(8, 6))
                plt.scatter(np.log(mu_gene), np.log(FF_gene), c = [.8,.8,.8]);
                plt.scatter(np.log(mu_gene)[ix], np.log(FF_gene)[ix], c = [0,0,0]);
                plt.plot(np.log(xTh),np.log(yTh));
                plt.title(sample_name)
                plt.xlabel('log(mean)');
                plt.ylabel('log(FF)');
        else:
            print 'Using user-supplied gene filter'


        # RUN PCA
        # if method == 'sparse': normalizes by stdev
        # if method == anything else: z-score normalizes
        print 'Running PCA'
        Epca = get_PCA_sparseInput(E[:,gene_filter], base_ix, numpc=num_pc, method=pca_method, normalize = pca_norm)
    else:
        print 'Using user-supplied PCA coordinates'
        Epca = precomputed_pca

    print 'Building kNN graph'

    links, knn_graph = get_knn_graph2(Epca, k=k_neigh, dist_metric = dist_metric, approx=use_approxnn)

    if run_woublet:
        import doublet_detector as woublet
        print 'Running woublet'
        doub_score, doub_score_full, doub_labels = woublet.detect_doublets([], counts=tot_counts_final, doub_frac=dd_frac, k=dd_k, use_approxnn=dd_approx, precomputed_pca=Epca)

    if output_spring:
        # Calculate Euclidean distances in the PC space (will be used to build knn graph)
        #print 'Getting distance matrix'
        #D = get_distance_matrix(Epca)
        #D = scipy.spatial.distance.squareform(pdist(Epca, dist_metric))

        # Build KNN graph and output SPRING format files
        save_path = save_dir + sample_name

        print 'Saving SPRING files to %s' %save_path
        custom_colors['Total Counts'] = tot_counts_final

        if run_woublet:
            custom_colors['Woublet Score'] = doub_score

        if len(cell_groupings) > 0:
            save_spring_dir_sparse_hdf5(E, [], 0, gene_list, save_path,
                            custom_colors = custom_colors, edges=list(links),
                            cell_groupings = cell_groupings)
        else:
            save_spring_dir_sparse_hdf5(E, [], 0, gene_list, save_path,
                            custom_colors = custom_colors, edges=list(links))


    if run_force:
        import force
        print 'Running FORCE'
        # Create random starting positions.
        starting_positions = np.random.random((Epca.shape[0], 2)) * 500
        force_graph = force.Force(starting_positions, links,
                                 bounds=10**5,  gravity = 0.01)
        tick = 0
        max_tick = 100
        while tick < max_tick:
            force_graph.fast_tick()
            if tick % 10 == 0:
                print '%i / %i' %(tick, max_tick)

            tick += 1
        coords = force_graph.current_positions

        print 'Done!'
        if len(precomputed_pca) == 0:
            return  E, Epca, knn_graph, gene_filter, coords
        else:
            return E, Epca, knn_graph, coords

    print 'Done!'
    if len(precomputed_pca) == 0:
        return E, Epca, knn_graph, gene_filter
    else:
        return E, Epca, knn_graph


def run_all_spring_1_6(E, gene_list, sample_name, save_dir = './', base_ix = [], normalize = True,
                   exclude_dominant_frac = 1.0, min_counts = 3, min_cells = 5, min_vscore_pctl = 75,
                   show_vscore_plot = False, exclude_gene_names = [],
                   num_pc = 50, pca_method = '', pca_norm = True,
                   k_neigh = 4, cell_groupings = {}, num_force_iter = 100, output_spring = True,
                   precomputed_pca = [], gene_filter = [], custom_colors = {},
                   exclude_corr_genes_list = [], exclude_corr_genes_minCorr = 0.2, dist_metric = 'euclidean', use_approxnn=False,
                   run_doub_detector = False, dd_k=50, dd_frac=5, dd_approx=True, tot_counts_final = []):
    E = E.tocsc()
    if len(base_ix) == 0:
        base_ix = np.arange(E.shape[0])

    # total counts normalize
    if len(tot_counts_final) == 0:
        tot_counts_final = np.sum(E, axis=1).A[:,0]

    if normalize:
        print 'Normalizing'
        E = tot_counts_norm_sparse(E, exclude_dominant_frac = exclude_dominant_frac)[0]

    if len(precomputed_pca) == 0:
        if len(gene_filter) == 0:
            # Get gene stats (above Poisson noise, i.e. V-scores)
            print 'Filtering genes'
            Vscores, CV_eff, CV_input, gene_ix, mu_gene, FF_gene, a, b = get_vscores_sparse(E[base_ix, :])

            ix2 = Vscores>0
            Vscores = Vscores[ix2]
            gene_ix = gene_ix[ix2]
            mu_gene = mu_gene[ix2]
            FF_gene = FF_gene[ix2]

            # Filter genes: minimum V-score percentile and at least min_counts in at least min_cells
            min_log_vscore = np.percentile(np.log(Vscores), min_vscore_pctl)

            ix = (((E[:,gene_ix] >= min_counts).sum(0).A.squeeze() >= min_cells) & (np.log(Vscores) >= min_log_vscore))
            gene_filter = gene_ix[ix]
            print 'Using %i genes' %(len(gene_filter))

            if len(exclude_corr_genes_list) > 0:
                seed_ix_list = []
                for l in exclude_corr_genes_list:
                    seed_ix_list.append(np.array([i for i in range(len(gene_list)) if gene_list[i] in l], dtype=int))
                gene_filter = remove_corr_genes_sparse(E, gene_list, seed_ix_list, gene_filter, min_corr = exclude_corr_genes_minCorr)
                print 'Now using %i genes' %(len(gene_filter))

            # Remove user-excluded genes from consideration
            if len(exclude_gene_names) > 0:
                keep_ix = np.array([ii for ii,gix in enumerate(gene_filter) if gene_list[gix] not in exclude_gene_names])
                print 'Excluded %i genes' %(len(gene_filter)-len(keep_ix))
                gene_filter = gene_filter[keep_ix]

            if show_vscore_plot:
                x_min = 0.5*np.min(mu_gene)
                x_max = 2*np.max(mu_gene)
                xTh = x_min * np.exp(np.log(x_max/x_min)*np.linspace(0,1,100))
                yTh = (1 + a)*(1+b) + b * xTh
                plt.figure(figsize=(8, 6))
                plt.scatter(np.log(mu_gene), np.log(FF_gene), c = [.8,.8,.8]);
                plt.scatter(np.log(mu_gene)[ix], np.log(FF_gene)[ix], c = [0,0,0]);
                plt.plot(np.log(xTh),np.log(yTh));
                plt.title(sample_name)
                plt.xlabel('log(mean)');
                plt.ylabel('log(FF)');
        else:
            print 'Using user-supplied gene filter'


        # RUN PCA
        # if method == 'sparse': normalizes by stdev
        # if method == anything else: z-score normalizes
        print 'Running PCA'
        Epca = get_PCA_sparseInput(E[:,gene_filter], base_ix, numpc=num_pc, method=pca_method, normalize = pca_norm)
    else:
        print 'Using user-supplied PCA coordinates'
        Epca = precomputed_pca

    print 'Building kNN graph'

    links, knn_graph = get_knn_graph2(Epca, k=k_neigh, dist_metric = dist_metric, approx=use_approxnn)

    if run_doub_detector:
        import doublet_detector as woublet
        print 'Running woublet'
        doub_score, doub_score_full, doub_labels = woublet.detect_doublets([], counts=tot_counts_final, doub_frac=dd_frac, k=dd_k, use_approxnn=dd_approx, precomputed_pca=Epca)

    if output_spring:
        # Calculate Euclidean distances in the PC space (will be used to build knn graph)
        #print 'Getting distance matrix'
        #D = get_distance_matrix(Epca)
        #D = scipy.spatial.distance.squareform(pdist(Epca, dist_metric))

        # Build KNN graph and output SPRING format files
        save_path = save_dir + sample_name

        if not os.path.exists(save_path):
            os.makedirs(save_path)

        edgef = open(save_path+'/edges.csv', 'w')
        for ee in links:
            edgef.write('%i;%i\n' %(ee[0], ee[1]) )
        edgef.close()

        print 'Saving SPRING files to %s' %save_path
        custom_colors['Total Counts'] = tot_counts_final

        if run_doub_detector:
            custom_colors['Doublet Score'] = doub_score

        if len(cell_groupings) > 0:
            save_spring_dir_sparse_hdf5(E, [], 0, gene_list, save_path,
                            custom_colors = custom_colors, edges=list(links),
                            cell_groupings = cell_groupings)
        else:
            save_spring_dir_sparse_hdf5(E, [], 0, gene_list, save_path,
                            custom_colors = custom_colors, edges=list(links))


    if num_force_iter > 0:
        try:
            from fa2 import ForceAtlas2
            import networkx as nx

            print 'Running ForceAtlas2'

            G = nx.Graph()
            G.add_nodes_from(range(Epca.shape[0]))
            G.add_edges_from(list(links))

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

            positions = forceatlas2.forceatlas2_networkx_layout(G, pos=None, iterations=num_force_iter)
            positions = np.array([positions[i] for i in sorted(positions.keys())])
            positions = positions / 5.0
            positions = positions - np.min(positions, axis = 0) - np.ptp(positions, axis = 0) / 2.0
            positions[:,0] = positions[:,0]  + 750
            positions[:,1] = positions[:,1]  + 250

            if output_spring:
                np.savetxt(save_path + '/coordinates.txt',
                           np.hstack((np.arange(positions.shape[0])[:,None], positions)), fmt='%i,%.5f,%.5f')

                info_dict = {}
                info_dict['Date'] = '%s' %datetime.now()
                info_dict['Nodes'] = Epca.shape[0]
                info_dict['Filtered_Genes'] = len(gene_filter)
                info_dict['Gene_Var_Pctl'] = min_vscore_pctl
                info_dict['Min_Cells'] = min_cells
                info_dict['Min_Counts'] = min_counts
                info_dict['Num_Neighbors'] = k_neigh
                info_dict['Num_PCs'] = num_pc
                info_dict['Num_Force_Iter'] = num_force_iter
                with open(save_path+'/run_info.json','w') as f:
                    f.write(json.dumps(info_dict,indent=4, sort_keys=True).decode('utf-8'))

            if len(precomputed_pca) == 0:
                return  E, Epca, knn_graph, gene_filter, positions
            else:
                return E, Epca, knn_graph, positions
        except:
            print 'Failed running ForceAtlas2!'

    print 'Done!'

    if len(precomputed_pca) == 0:
        return E, Epca, knn_graph, gene_filter
    else:
        return E, Epca, knn_graph

#############

def gene_plot_sparse(x, y, E, gene_list, gene_name, col_range=(0,100), order_points=False, x_buffer=0, y_buffer=0,
        fig_size=(5,5), point_size=15, colormap='Reds', bg_color=[1,1,1], ax='', smooth_operator = []):
    '''
    Plot gene expression values on a scatter plot.

    Input
        x (1-D numpy float array, length=n_cells): x coordinates for scatter plot
        y (1-D numpy float array, length=n_cells): y coordinates for scatter plot
        E (2-D numpy float matrix, shape=(n_cells, n_genes)): gene expression counts matrix
        gene_list (list of strings, length=n_cells): full list of gene names
        gene_name (string): name of gene to visualize
        col_range (float tuple, length=2): (color_floor, color_ceiling) percentiles
        order_points (boolean): if True, plot points with higher color values on top of points with lower values
        x_buffer (float): white space to add to x limits
        y_buffer (float): white space to add to y limits
        fig_size (float tuple, length=2): size of figure
        point_size (float): size of scatter plot points
        colormap: color scheme for coloring the scatter plot
        bg_color (RGB/HEX/color name): background color

    Output
        fig: figure handle
        ax: axis handle
        pl: scatter plot handle
    '''
    # get gene index and color data
    gene_ix = gene_list.index(gene_name)
    colordat = E[:,gene_ix].toarray()[:,0]

    if len(smooth_operator) > 0:
        colordat = np.dot(smooth_operator, colordat)

    # get min and max color values
    cmin = np.percentile(colordat, col_range[0])
    cmax = np.percentile(colordat, col_range[1])
    if cmax == 0:
        cmax = max(colordat)

    # order points by intensity, if desired
    if order_points:
        plot_ord = np.argsort(colordat)
    else:
        plot_ord = np.arange(len(colordat))

    # make the plot
    return_all = False
    if ax == '':
        return_all = True
        fig, ax = plt.subplots(1, 1, figsize = fig_size)

    pl = ax.scatter(x[plot_ord], y[plot_ord], c=colordat[plot_ord], s=point_size, edgecolor='none',
                    cmap=colormap, vmin=cmin, vmax=cmax)

    ax.set_xticks([])
    ax.set_yticks([])
    ax.set_xlim((min(x) - x_buffer, max(x) + x_buffer))
    ax.set_ylim((min(y) - y_buffer, max(y) + y_buffer))
    ax.patch.set_color(bg_color)

    if return_all:
        return fig, ax, pl
    else:
        return pl

#========================================================================================#
def get_distance_matrix(M):
    '''
    ##############################################
    Input
        M = Data matrix. Rows are datapoints (e.g. cell) and columns are features (e.g. genes)

    Output (D)
        D = All Pairwise euclidian distances between points in M
    ##############################################
    '''
    D = np.zeros((M.shape[0],M.shape[0]))
    for i in range(M.shape[0]):
        Mtiled = np.tile(M[i,:][None,:],(M.shape[0],1))
        D[i,:] = np.sqrt(np.sum((Mtiled - M)**2, axis=1))
    return D

#========================================================================================#
def filter_cells(E, min_reads):
    '''
    ##############################################
    Filter out cells with total UMI count < min_reads

    Input
        E         = Expression matrix. Rows correspond to cells and columns to genes
        min_reads = Minimum number of reads required for a cell to survive filtering

    Output  (Efiltered, cell_filter)
        Efiltered   = Filtered expression matrix
        cell_filter = Boolean mask that reports filtering. True means that the cell is
                      kept; False means the cells is removed
    ##############################################
    '''
    total_counts = np.sum(E,axis=1)
    cell_filter = total_counts >= min_reads
    if np.sum(cell_filter) == 0:
        return None, cell_filter
    else: return E[cell_filter,:],cell_filter


def get_knn_edges(dmat, k, map_to_base_only, base_ix):
    '''
    ##############################################
    Calculate knn-graph edges from a distance matrix.

    Input
        dmat = Square distance matrix. (dmat)_ij = the distance between i and k
        k    = Number of edges to assign each node (i.e. k in the knn-graph)

    Output (edge_list)
        edge_list = A list of unique undirected edges in the knn graph. Each edge comes in
                    the form of a tuple (i,j) representing an edge between i and j.
    ##############################################
    '''
    edge_dict = {}
    for i in range(dmat.shape[0]):
        if map_to_base_only:
            if i in base_ix:
                sorted_nodes = base_ix[np.argsort(dmat[i,base_ix])[1:k+1]]
            else:
                sorted_nodes = base_ix[np.argsort(dmat[i,base_ix])[:k]]
        else:
            sorted_nodes = np.argsort(dmat[i,:])[1:k+1]
        for j in sorted_nodes:
            ii,jj = tuple(sorted([i,j]))
            edge_dict[(ii,jj)] = dmat[i,j]

    return edge_dict.keys()


def save_spring_dir(E,D,k,gene_list,project_directory, custom_colors={},cell_groupings={}, use_genes=[], map_to_base_only=False, base_ix=[], edges=[]):
    '''
    ##############################################
    Builds a SPRING project directory and transforms data into SPRING-readable formats

    Input (Required)
        E                  = (numpy array) matrix of gene expression. Rows correspond to
                             celles and columns correspond to genes.
        D                  = (numpy array) distance matrix for construction of knn graph.
                             Any distance matrix can be used as long as higher values
                             correspond to greater distances.
        k                  = Number of edges assigned to each node in knn graph
        gene_list          = An ordered list of gene names with length length E.shape[1]
        project_directory  = Path to a directory where SPRING readable files will be
                             written. The directory does not have to exist before running
                             this function.

    Input (Optional)
        cell_groupings     = Dictionary with one key-value pair for each cell grouping.
                             The key is the name of the grouping (e.g. "SampleID") and
                             the value is a list of labels (e.g. ["sample1","sample2"...])
                             If there are N cells total (i.e. E.shape[0] == N), then the
                             list of labels should have N entries.
        custom_colors      = Dictionary with one key-value pair for each custom color.
                             The key is the name of the color track and the value is a
                             list of scalar values (i.e. color intensities). If there are
                             N cells total (i.e. E.shape[0] == N), then the list of labels
                             should have N entries.
    ##############################################
    '''
    os.system('mkdir '+project_directory)
    if not project_directory[-1] == '/': project_directory += '/'

    # Build graph
    # print 'Building graph'
    if len(edges) == 0:
        edges = get_knn_edges(D,k,map_to_base_only,base_ix)

    # save genesets
    #print 'Saving gene sets'
    custom_colors['Uniform'] = np.zeros(E.shape[0])
    write_color_tracks(custom_colors, project_directory+'color_data_gene_sets.csv')
    all = []

    # save gene colortracks
    #print 'Savng coloring tracks'
    os.system('mkdir '+project_directory+'gene_colors')
    II = len(gene_list) / 50 + 1
    for j in range(50):
        fname = project_directory+'/gene_colors/color_data_all_genes-'+repr(j)+'.csv'
        if len(use_genes) > 0: all_gene_colors = {g : E[:,i+II*j] for i,g in enumerate(gene_list[II*j:II*(j+1)]) if g in use_genes}
        else: all_gene_colors = {g : E[:,i+II*j] for i,g in enumerate(gene_list[II*j:II*(j+1)]) if np.mean(E[:,i+II*j])>0.05}
        write_color_tracks(all_gene_colors, fname)
        all += all_gene_colors.keys()

    # Create and save a dictionary of color profiles to be used by the visualizer
    #print 'Color stats'
    color_stats = {}
    for i in range(E.shape[1]):
        mean = np.mean(E[:,i])
        std = np.std(E[:,i])
        max = np.max(E[:,i])
        centile = np.percentile(E[:,i],99.6)
        color_stats[gene_list[i]] = (mean,std,0,max,centile)
    for k,v in custom_colors.items():
        color_stats[k] = (0,1,np.min(v),np.max(v)+.01,np.percentile(v,99))
    json.dump(color_stats,open(project_directory+'/color_stats.json','w'),indent=4, sort_keys=True)


    # save cell labels
    #print 'Saving categorical color data'
    categorical_coloring_data = {}
    for k,labels in cell_groupings.items():
        label_colors = {l:frac_to_hex(float(i)/len(set(labels))) for i,l in enumerate(list(set(labels)))}
        categorical_coloring_data[k] = {'label_colors':label_colors, 'label_list':labels}
    json.dump(categorical_coloring_data,open(project_directory+'/categorical_coloring_data.json','w'),indent=4)


    #print 'Writing graph'
    nodes = [{'name':int(i),'number':(i)} for i in range(E.shape[0])]
    edges = [{'source':int(i), 'target':int(j), 'distance':0} for i,j in edges]
    out = {'nodes':nodes,'links':edges}
    open(project_directory+'graph_data.json','w').write(json.dumps(out,indent=4, separators=(',', ': ')))


def save_spring_dir_sparse(E,D,k,gene_list,project_directory, custom_colors={},cell_groupings={}, use_genes=[], map_to_base_only=False, base_ix=[], edges=[], min_mean = 0, min_num_cells = 0, min_counts = 0):
    '''
    ##############################################
    Builds a SPRING project directory and transforms data into SPRING-readable formats

    Input (Required)
        E                  = (numpy array) matrix of gene expression. Rows correspond to
                             celles and columns correspond to genes.
        D                  = (numpy array) distance matrix for construction of knn graph.
                             Any distance matrix can be used as long as higher values
                             correspond to greater distances.
        k                  = Number of edges assigned to each node in knn graph
        gene_list          = An ordered list of gene names with length length E.shape[1]
        project_directory  = Path to a directory where SPRING readable files will be
                             written. The directory does not have to exist before running
                             this function.

    Input (Optional)
        cell_groupings     = Dictionary with one key-value pair for each cell grouping.
                             The key is the name of the grouping (e.g. "SampleID") and
                             the value is a list of labels (e.g. ["sample1","sample2"...])
                             If there are N cells total (i.e. E.shape[0] == N), then the
                             list of labels should have N entries.
        custom_colors      = Dictionary with one key-value pair for each custom color.
                             The key is the name of the color track and the value is a
                             list of scalar values (i.e. color intensities). If there are
                             N cells total (i.e. E.shape[0] == N), then the list of labels
                             should have N entries.
    ##############################################
    '''
    os.system('mkdir '+project_directory)
    if not project_directory[-1] == '/': project_directory += '/'

    # Build graph
    # print 'Building graph'
    if len(edges) == 0:
        print 'Building graph'
        edges = get_knn_edges(D,k,map_to_base_only,base_ix)

    # save genesets
    #print 'Saving gene sets'
    custom_colors['Uniform'] = np.zeros(E.shape[0])
    write_color_tracks(custom_colors, project_directory+'color_data_gene_sets.csv')
    all = []

    # save gene colortracks
    #print 'Savng coloring tracks'
    #min_mean = 0, min_num_cells = 0, min_counts = 0
    save_gene_ix = np.nonzero((np.sum(E, axis = 0) > 0) & (np.mean(E, axis = 0) >= min_mean) & (np.sum(E >= min_counts, axis = 0) >= min_num_cells))[0]
    o1 = open(project_directory + 'E_sparse_counts.csv', 'w')
    o2 = open(project_directory + 'E_sparse_index.csv', 'w')
    for iG in save_gene_ix:
        g = gene_list[iG]
        cell_ix = np.nonzero(E[:,iG])[0]
        o1.write(g + ',' + ','.join(map(str, E[cell_ix, iG])) + '\n')
        o2.write(g + ',' + ','.join(map(str, cell_ix)) + '\n')
    o1.close()
    o2.close()

    # Create and save a dictionary of color profiles to be used by the visualizer
    #print 'Color stats'
    color_stats = {}
    for i in range(E.shape[1]):
        if i in save_gene_ix:
            mean = np.mean(E[:,i])
            std = np.std(E[:,i])
            max = np.max(E[:,i])
            centile = np.percentile(E[:,i],99.6)
            color_stats[gene_list[i]] = (mean,std,0,max,centile)
    for k,v in custom_colors.items():
        color_stats[k] = (0,1,np.min(v),np.max(v)+.01,np.percentile(v,99))
    json.dump(color_stats,open(project_directory+'/color_stats.json','w'),indent=4, sort_keys=True)


    # save cell labels
    #print 'Saving categorical color data'
    categorical_coloring_data = {}
    for k,labels in cell_groupings.items():
        label_colors = {l:frac_to_hex(float(i)/len(set(labels))) for i,l in enumerate(list(set(labels)))}
        categorical_coloring_data[k] = {'label_colors':label_colors, 'label_list':labels}
    json.dump(categorical_coloring_data,open(project_directory+'/categorical_coloring_data.json','w'),indent=4)


    #print 'Writing graph'
    nodes = [{'name':int(i),'number':int(i)} for i in range(E.shape[0])]
    edges = [{'source':int(i), 'target':int(j), 'distance':0} for i,j in edges]
    out = {'nodes':nodes,'links':edges}
    open(project_directory+'graph_data.json','w').write(json.dumps(out,indent=4, separators=(',', ': ')))

def save_spring_dir_sparse_hdf5(E,D,k,gene_list,project_directory, custom_colors={},cell_groupings={}, use_genes=[], map_to_base_only=False, base_ix=[], edges=[], min_mean = 0, min_num_cells = 0, min_counts = 0):

    if not os.path.exists(project_directory):
        os.makedirs(project_directory)

    if not project_directory[-1] == '/': project_directory += '/'

    # Build graph
    # print 'Building graph'
    if len(edges) == 0:
        print 'Building graph'
        edges = get_knn_edges(D,k,map_to_base_only,base_ix)

    # save genesets
    #print 'Saving gene sets'
    custom_colors['Uniform'] = np.zeros(E.shape[0])
    write_color_tracks(custom_colors, project_directory+'color_data_gene_sets.csv')

    # Create and save a dictionary of color profiles to be used by the visualizer
    #print 'Color stats'
    color_stats = {}
    means = E.mean(0).A.squeeze()
    stdevs = np.sqrt(sparse_var(E, 0))
    maxes = E.max(0).A.squeeze()
    pctls = np.zeros(E.shape[1], dtype=float)
    for iG in range(E.shape[1]):
        pctls[iG] = np.percentile(E[:,iG].A, 99.6)
        color_stats[gene_list[iG]] = (means[iG], stdevs[iG], 0, maxes[iG], pctls[iG])
    for k,v in custom_colors.items():
        color_stats[k] = (0,1,np.min(v),np.max(v)+.01,np.percentile(v,99))
    json.dump(color_stats,open(project_directory+'/color_stats.json','w'),indent=4, sort_keys=True)


    # save cell labels
    #print 'Saving categorical color data'
    categorical_coloring_data = {}
    for k,labels in cell_groupings.items():
        label_colors = {l:frac_to_hex(float(i)/len(set(labels))) for i,l in enumerate(list(set(labels)))}
        categorical_coloring_data[k] = {'label_colors':label_colors, 'label_list':labels}
    json.dump(categorical_coloring_data,open(project_directory+'/categorical_coloring_data.json','w'),indent=4, sort_keys=True)


    #print 'Writing graph'
    nodes = [{'name':int(i),'number':int(i)} for i in range(E.shape[0])]
    edges = [{'source':int(i), 'target':int(j), 'distance':0} for i,j in edges]
    out = {'nodes':nodes,'links':edges}
    open(project_directory+'graph_data.json','w').write(json.dumps(out,indent=4, separators=(',', ': ')))

#
def save_cell_groupings_only(project_directory, cell_groupings, label_colors=None):
    categorical_coloring_data = {}
    for k,labels in cell_groupings.items():
        if label_colors==None: label_colors = {l:frac_to_hex(float(i)/len(set(labels))) for i,l in enumerate(list(set(labels)))}
        categorical_coloring_data[k] = {'label_colors':label_colors, 'label_list':labels}
    json.dump(categorical_coloring_data,open(project_directory+'/categorical_coloring_data.json','w'),indent=4, sort_keys = True)

#========================================================================================#
def row_sum_normalize(A):
    print A.shape
    d = np.sum(A,axis=1)
    A = A / np.tile(d[:,None],(1,A.shape[1]))
    return A

#========================================================================================#
def write_graph(n_nodes, edges,path):
    nodes = [{'name':int(i),'number':int(i)} for i in range(n_nodes)]
    edges = [{'source':int(i), 'target':int(j), 'distance':0} for i,j in edges]
    out = {'nodes':nodes,'links':edges}
    open(path+'/graph_data.json','w').write(json.dumps(out,indent=4, separators=(',', ': ')))

#========================================================================================#
def write_color_tracks(ctracks, fname):
    out = []
    for name,score in ctracks.items():
        line = name + ',' + ','.join(['%.3f' %x for x in score])
        out += [line]
    out = sorted(out,key=lambda x: x.split(',')[0])
    open(fname,'w').write('\n'.join(out))

#========================================================================================#
def frac_to_hex(frac):
    rgb = tuple(np.array(np.array(plt.cm.jet(frac)[:3])*255,dtype=int))
    return '#%02x%02x%02x' % rgb




#========================================================================================#

def remove_corr_genes(E, gene_list, bad_gene_idx_list, test_gene_idx, min_corr = 0.1):

    exclude_ix = []
    for iSet in range(len(bad_gene_idx_list)):
        seed_ix = bad_gene_idx_list[iSet][np.sum(E[:,bad_gene_idx_list[iSet]],axis=0) > 0]

        tmp = scipy.stats.zscore(E[:,seed_ix],axis=0)
        tmp = np.sum(tmp,axis=1)

        c = np.zeros(len(test_gene_idx))

        for iG in range(len(c)):
            c[iG],_ = scipy.stats.pearsonr(tmp, E[:,test_gene_idx[iG]])

        exclude_ix.extend([test_gene_idx[i] for i in range(len(test_gene_idx)) if (c[i]) >= min_corr])
        print len(exclude_ix)
    exclude_ix = np.array(exclude_ix)
    print np.array(gene_list)[exclude_ix]
    return np.array([g for g in test_gene_idx if g not in exclude_ix], dtype=int)




########
def get_force(links, n):
    # Create random starting positions.
    starting_positions = np.random.random((n, 2)) * 500
    force_graph = force.Force(starting_positions, links,
                             bounds=10**5,  gravity = 0.01)
    tick = 0
    max_tick = 100
    while tick < max_tick:
        force_graph.fast_tick()
        if tick % 10 == 0:
            print '%i / %i' %(tick, max_tick)

        tick += 1
    return force_graph.current_positions

########
def run_all_spring(E, gene_list, sample_name, save_dir = './', base_ix = [], normalize = True,
                   exclude_dominant_frac = 1.0, min_counts = 3, min_cells = 5, min_vscore_pctl = 75,
                   show_vscore_plot = False, exclude_gene_names = [],
                   num_pc = 50, pca_method = 'sparse', pca_norm = True,
                   k_neigh = 4, cell_groupings = {}, run_force = False, output_spring = True,
                   precomputed_pca = [], gene_filter = [], custom_colors = {},
                   exclude_corr_genes = [], exclude_gene_corr = 0.2, dist_metric = 'euclidean'):
    if len(base_ix) == 0:
        base_ix = np.arange(E.shape[0])


    # total counts normalize

    tot_counts_final = np.sum(E, axis=1)
    if normalize:
        print 'Normalizing'
        E = tot_counts_norm(E, exclude_dominant_frac = exclude_dominant_frac)

    if len(precomputed_pca) == 0:
        if len(gene_filter) == 0:
            # Get gene stats (above Poisson noise, i.e. V-scores)
            print 'Filtering genes'
            Vscores, CV_eff, CV_input, gene_ix, mu_gene, FF_gene, a, b = get_vscores(E[base_ix, :])

            ix2 = Vscores>0
            Vscores = Vscores[ix2]
            gene_ix = gene_ix[ix2]
            mu_gene = mu_gene[ix2]
            FF_gene = FF_gene[ix2]

            # # Remove user-excluded genes from consideration
            # if len(exclude_gene_names) > 0:
            #     keep_ix = np.array([ii for ii,gix in enumerate(gene_ix) if gene_list[gix] not in exclude_gene_names])
            #     print 'Excluded', len(gene_ix)-len(keep_ix), 'genes'
            #     gene_ix = gene_ix[keep_ix]
            #     Vscores = Vscores[keep_ix]
            #     mu_gene = mu_gene[keep_ix]
            #     FF_gene = FF_gene[keep_ix]

            # Filter genes: minimum V-score percentile and at least min_counts in at least min_cells
            min_log_vscore = np.percentile(np.log(Vscores), min_vscore_pctl)

            ix = ((np.sum(E[:,gene_ix] >= min_counts,axis=0) >= min_cells) & (np.log(Vscores) >= min_log_vscore))
            gene_filter = gene_ix[ix]
            print 'Using %i genes' %len(gene_filter)


            if len(exclude_corr_genes) > 0:
                seed_ix_list = []
                for l in exclude_corr_genes:
                    seed_ix_list.append(np.array([i for i in range(len(gene_list)) if gene_list[i] in l], dtype=int))
                gene_filter = remove_corr_genes(E, gene_list, seed_ix_list, gene_filter, min_corr = exclude_gene_corr)
                print 'Now using %i genes' %len(gene_filter)

            # Remove user-excluded genes from consideration
            if len(exclude_gene_names) > 0:
                keep_ix = np.array([ii for ii,gix in enumerate(gene_filter) if gene_list[gix] not in exclude_gene_names])
                print 'Excluded %i genes' %(len(gene_filter)-len(keep_ix))
                gene_filter = gene_filter[keep_ix]

            if show_vscore_plot:
                x_min = 0.5*np.min(mu_gene)
                x_max = 2*np.max(mu_gene)
                xTh = x_min * np.exp(np.log(x_max/x_min)*np.linspace(0,1,100))
                yTh = (1 + a)*(1+b) + b * xTh
                plt.figure(figsize=(8, 6))
                plt.scatter(np.log(mu_gene), np.log(FF_gene), c = [.8,.8,.8]);
                plt.scatter(np.log(mu_gene)[ix], np.log(FF_gene)[ix], c = [0,0,0]);
                plt.plot(np.log(xTh),np.log(yTh));
                plt.title(sample_name)
                plt.xlabel('log(mean)');
                plt.ylabel('log(FF)');
        else:
            print 'Using user-supplied gene filter'


        # RUN PCA
        # if method == 'sparse': normalizes by stdev
        # if method == anything else: z-score normalizes
        print 'Running PCA'
        Epca = get_PCA(E[:,gene_filter], base_ix, numpc=num_pc, method=pca_method, normalize = pca_norm)
    else:
        print 'Using user-supplied PCA coordinates'
        Epca = precomputed_pca

    if output_spring:
        # Calculate Euclidean distances in the PC space (will be used to build knn graph)
        print 'Getting distance matrix'
        #D = get_distance_matrix(Epca)
        D = scipy.spatial.distance.squareform(pdist(Epca, dist_metric))

        # Build KNN graph and output SPRING format files
        save_path = save_dir + sample_name

        print 'Saving SPRING files to %s' %save_path
        custom_colors['Total Counts'] = tot_counts_final

        if len(cell_groupings) > 0:
            save_spring_dir_sparse(E, D, k_neigh, gene_list, save_path,
                            custom_colors = custom_colors,
                            cell_groupings = cell_groupings)
        else:
            save_spring_dir_sparse(E, D, k_neigh, gene_list, save_path,
                            custom_colors = custom_colors)

    links, A, _ = get_knn_graph(Epca, k=k_neigh, dist_metric = dist_metric)
    if run_force:
        import force
        print 'Running FORCE'
        # Create random starting positions.
        starting_positions = np.random.random((Epca.shape[0], 2)) * 500
        force_graph = force.Force(starting_positions, links,
                                 bounds=10**5,  gravity = 0.01)
        tick = 0
        max_tick = 100
        while tick < max_tick:
            force_graph.fast_tick()
            if tick % 10 == 0:
                print '%i / %i' %(tick, max_tick)

            tick += 1
        coords = force_graph.current_positions

        print 'Done!'
        if len(precomputed_pca) == 0:
            return  E, Epca, A, gene_filter, coords
        else:
            return E, Epca, A, coords

    print 'Done!'
    if len(precomputed_pca) == 0:
        return E, Epca, A, gene_filter
    else:
        return E, Epca, A


#========================================================================================#

def gene_plot(x, y, E, gene_list, gene_name, col_range=(0,100), order_points=False, x_buffer=0, y_buffer=0,
        fig_size=(5,5), point_size=15, colormap='Reds', bg_color=[1,1,1], ax='', smooth_operator = []):
    '''
    Plot gene expression values on a scatter plot.

    Input
        x (1-D numpy float array, length=n_cells): x coordinates for scatter plot
        y (1-D numpy float array, length=n_cells): y coordinates for scatter plot
        E (2-D numpy float matrix, shape=(n_cells, n_genes)): gene expression counts matrix
        gene_list (list of strings, length=n_cells): full list of gene names
        gene_name (string): name of gene to visualize
        col_range (float tuple, length=2): (color_floor, color_ceiling) percentiles
        order_points (boolean): if True, plot points with higher color values on top of points with lower values
        x_buffer (float): white space to add to x limits
        y_buffer (float): white space to add to y limits
        fig_size (float tuple, length=2): size of figure
        point_size (float): size of scatter plot points
        colormap: color scheme for coloring the scatter plot
        bg_color (RGB/HEX/color name): background color

    Output
        fig: figure handle
        ax: axis handle
        pl: scatter plot handle
    '''
    # get gene index and color data
    gene_ix = gene_list.index(gene_name)
    colordat = E[:,gene_ix]

    if len(smooth_operator) > 0:
        colordat = np.dot(smooth_operator, colordat)

    # get min and max color values
    cmin = np.percentile(colordat, col_range[0])
    cmax = np.percentile(colordat, col_range[1])
    if cmax == 0:
        cmax = max(colordat)

    # order points by intensity, if desired
    if order_points:
        plot_ord = np.argsort(colordat)
    else:
        plot_ord = np.arange(len(colordat))

    # make the plot
    return_all = False
    if ax == '':
        return_all = True
        fig, ax = plt.subplots(1, 1, figsize = fig_size)

    pl = ax.scatter(x[plot_ord], y[plot_ord], c=colordat[plot_ord], s=point_size, edgecolor='none',
                    cmap=colormap, vmin=cmin, vmax=cmax)

    ax.set_xticks([])
    ax.set_yticks([])
    ax.set_xlim((min(x) - x_buffer, max(x) + x_buffer))
    ax.set_ylim((min(y) - y_buffer, max(y) + y_buffer))
    ax.patch.set_color(bg_color)

    if return_all:
        return fig, ax, pl
    else:
        return pl


def plot_groups(x, y, groups, lim_buffer = 50, saving = False, fig_dir = './', fig_name = 'fig', res = 300, close_after = False, title_size = 12, point_size = 3, ncol = 5):

    n_col = int(ncol)
    ngroup = len(np.unique(groups))
    nrow = int(np.ceil(ngroup / float(ncol)))
    fig = plt.figure(figsize = (14, 3 * nrow))
    for ii, c in enumerate(np.unique(groups)):
        ax = plt.subplot(nrow, ncol, ii+1)
        ix = groups == c

        ax.scatter(x[~ix], y[~ix], s = point_size, c = [.8,.8,.8], edgecolors = '')
        ax.scatter(x[ix], y[ix], s = point_size, c = [0,0,0], edgecolors = '')
        ax.set_xticks([])
        ax.set_yticks([])
        ax.set_xlim([min(x) - lim_buffer, max(x) + lim_buffer])
        ax.set_ylim([min(y) - lim_buffer, max(y) + lim_buffer])

        ax.set_title(str(c), fontsize = title_size)

    fig.tight_layout()

    if saving:
        os.system('mkdir -p "' + fig_dir + '"')
        plt.savefig(fig_dir + '/' + fig_name + '.png', dpi=res)

    if close_after:
        plt.close()
