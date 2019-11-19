#!/usr/bin/env python

import scipy.sparse as ssp
import numpy as np
import cgi
import time
import os

cwd = os.getcwd()
if cwd.endswith('cgi-bin'):
    os.chdir('../')

t00 = time.time()

print('BOP {}'.format(ssp))


def update_log(fname, logdat, overwrite=False):
    if overwrite:
        o = open(fname, 'w')
    else:
        o = open(fname, 'a')
    o.write(logdat + '\n')
    o.close()


def strfloat(x):
    if x == 0:
        return '0'
    else:
        return '%.1f' % x


def sparse_multiply(E, a):
    import scipy.sparse as ssp
    nrow = E.shape[0]
    w = ssp.lil_matrix((nrow, nrow))
    w.setdiag(a)
    return w * E


logf = 'tmplog2'

t0 = time.time()
t1 = time.time()
update_log(logf, 'import cgi -- %.3f' % (t1 - t0), True)

t0 = time.time()
t1 = time.time()
update_log(logf, 'import numpy -- %.3f' % (t1 - t0))

t0 = time.time()
t1 = time.time()
update_log(logf, 'import scipy sparse -- %.3f' % (t1 - t0))


print('Content-Type: text/plain\n')


t0 = time.time()
data = cgi.FieldStorage()
base_dir = data.getvalue('base_dir')
sub_dir = data.getvalue('sub_dir')
reds = np.array(list(map(float, data.getvalue('raw_r').split(','))))[:, None]
greens = np.array(list(map(float, data.getvalue('raw_g').split(','))))[:, None]
blues = np.array(list(map(float, data.getvalue('raw_b').split(','))))[:, None]
E = np.hstack((reds, greens, blues))
# E = np.array(map(float, data.getvalue('raw_g').split(',')))[:,None]

sel = data.getvalue('selected')[1:]
print(sel)
if len(sel) == 0:
    sel = np.arange(E.shape[0])
else:
    sel = np.array(map(int, sel.split(',')), dtype=int)
    E = E[sel, :]


beta = float(data.getvalue('beta'))
n_rounds = int(data.getvalue('n_rounds'))
t1 = time.time()
update_log(logf, 'got cgi data -- %.3f' % (t1 - t0))

# SMOOTH

t0 = time.time()
try:
    A = ssp.load_npz(sub_dir + '/A.npz')
except Exception:
    cell_filter = np.load(sub_dir + '/' + 'cell_filter.npy')
    edges = np.loadtxt(sub_dir + '/edges.csv', delimiter=';', comments='')
    A = ssp.lil_matrix((len(cell_filter), len(cell_filter)))
    for iEdge in range(edges.shape[0]):
        ii = edges[iEdge, 0]
        jj = edges[iEdge, 1]
        A[ii, jj] = 1
        A[jj, ii] = 1
    A = A.tocsc()
    ssp.save_npz(sub_dir + '/A.npz', A)

t1 = time.time()
update_log(logf, 'loaded adjacency matrix -- %.3f' % (t1 - t0))

###########
t0 = time.time()
A = A[:, sel].tocsr()[sel, :].tocsc()
A = sparse_multiply(A, 1 / A.sum(1).A.squeeze())
for iRound in range(n_rounds):
    E = (beta * E + ((1 - beta) * A) * E)


t1 = time.time()
update_log(logf, 'smoothed data -- %.3f' % (t1 - t0))

###########
# E = np.floor(E)
# E = np.array(E, dtype=int)

t0 = time.time()

print(repr(np.min(E)) + '|' + repr(np.max(E)) + '|' + ';'.join([','.join(
    map(str, E[:, 0])), ','.join(map(str, E[:, 1])), ','.join(map(str, E[:, 2]))]))
t1 = time.time()
update_log(logf, 'returned data -- %.3f' % (t1 - t0))

t11 = time.time()
update_log(logf, str(t11 - t00))
