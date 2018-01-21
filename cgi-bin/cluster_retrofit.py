#!/usr/bin/env python
from scipy.sparse.linalg import eigs
from sklearn.metrics import silhouette_score
#========================================================================================#
def spec_clust(A, k):
    spec = sklearn.cluster.SpectralClustering(n_clusters=k, affinity = 'precomputed',assign_labels='discretize')
    return spec.fit_predict(A)

def load_coords(DIRECTORY):
	xcoords = {}
	ycoords = {}
	for l in open(DIRECTORY + '/coordinates.txt').read().split('\n')[:-1]:
		l = l.split(',')
		cell_number = int(l[0])
		xcoords[cell_number] = float(l[1])
		ycoords[cell_number] = float(l[2])
	xx,yy = [],[]
	for k in sorted(xcoords.keys()):
		xx += [xcoords[k]]
		yy += [ycoords[k]]
	xx = np.array(xx)
	yy = np.array(yy)
	return xx,-yy

def spectral_coords(A,k):
	X,Y = np.meshgrid(np.sum(A,axis=0),np.sum(A,axis=0))
	A = A / np.sqrt(X * Y)
	L = np.identity(A.shape[0]) - A
	w,v = eigs(L,k=k, which='SR')
	return w,v

def row_norm_normalize(X):
	total_counts = np.sqrt(np.sum(X**2,axis=1))
	tc_tiled = np.tile(total_counts[:,None],(1,X.shape[1]))
	return X / tc_tiled 

def frac_to_hex(frac):
	rgb = tuple(np.array(np.array(plt.cm.jet(frac)[:3])*255,dtype=int))
	return '#%02x%02x%02x' % rgb

#========================================================================================#

t = time.time()

project_directory = 'client_datasets/'+ sys.argv[1]
print 'start',project_directory 

clustering = {}
graph_path = project_directory + '/graph_data.json'
print graph_path
if os.path.exists(graph_path):
	print 'doing'
	graph = json.load(open(graph_path))
	node_numbers = [n['number'] for n in graph['nodes']]
	node_index = {nn:i for i,nn in enumerate(node_numbers)}
	A = np.zeros((len(node_numbers),len(node_numbers)))
	for l in graph['links']:
		i = node_index[l['source']]
		j = node_index[l['target']]
		A[i,j] = 1
		A[j,i] = 1
	print project_directory,'Spectral start'
	ww,vv = spectral_coords(A,A.shape[0]/2)
	ww = np.real(ww)
	spectral_gaps = list((np.roll(ww,-1)-ww))[:-1]
	maxk = np.argmax(spectral_gaps)*2 + 2
	maxk = np.max([maxk,20])
	spectral_gaps = spectral_gaps[:maxk]
	
	first_peak = 0
	has_risen = False
	falling = False
	while (not (has_risen and falling)) and first_peak < len(spectral_gaps):
		first_peak += 1
		has_risen = has_risen or (spectral_gaps[first_peak+1] - spectral_gaps[first_peak] > 0)
		falling = spectral_gaps[first_peak+1] - spectral_gaps[first_peak] < 0
	first_peak += 1
	if has_risen == False: first_peak = 1
	print 'FP',first_peak	
		
	
	X = row_norm_normalize(vv)
	for k in range(1,np.min([A.shape[0]/4,100])):
		print project_directory,'Cluster',k
		km = sklearn.cluster.KMeans(n_clusters=k)
		clus = km.fit_predict(X[:,:k])
		clustering['Cluster'+repr(k)] = [repr(x+1) for x in clus]

	clus_colored = {}
	for k,labels in clustering.items():
		label_colors = {l:frac_to_hex(float(i)/len(set(labels))) for i,l in enumerate(list(set(labels)))}
		clus_colored[k] = {'label_colors':label_colors, 'label_list':labels}
	data = {'Current_clustering':'Cluster'+repr(first_peak),
	        'clusters':clus_colored,
	        'spectral_info':{'gaps':spectral_gaps, 'argmax':first_peak}}
	json.dump(data,open('clustering_data/' + sys.argv[1] + '_clustering_data.json','w'),indent=4)

print 'TOTAL TIME',time.time() - t
#	xx,yy = load_coords('.')
#	plt.scatter(xx,yy,c=clus,edgecolor='')
#	plt.show()
	
