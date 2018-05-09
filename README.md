### Installing Python libraries

To run SPRING Viewer locally, make sure Python 2.7 is installed (and that it's your active version). You will also need the following Python libraries:  

`scikit-learn`  
`numpy`  
`scipy`  
`h5py`  
`networkx`  
`fa2`  
`python-louvain`

We recommend Anaconda to manage your Python libraries. You can download it here (be sure to get the Python 2.7 version):   https://conda.io/miniconda.html. Libraries can then be installed using the command `conda`. To do so, open Terminal (Mac) or Anaconda Prompt (Windows) and enter:  

`conda install scikit-learn numpy scipy h5py`

The remaining libraries can be installed using `pip`. Note that if you're a Windows user, you'll first need to install Microsoft Visual C++ compiler for Python (available from http://aka.ms/vcpython27). Enter the following into Terminal or Anaconda Prompt:  

`pip install networkx fa2 python-louvain`


### Setting up a SPRING data directory
See the example notebooks:  
[Hematopoietic progenitor FACS subpopulations](./data_prep/spring_example_HPCs.ipynb)  
[Mature blood cells (10X Genomics 4k PBMCs)](./data_prep/spring_example_pbmc4k.ipynb)  

A SPRING data set consist of a main directory and any number of subdirectories, with each subdirectory corresponding to one SPRING plot (i.e. subplot) that draws on a data matrix stored in the main directory. The main directory should have the following files, as well as one subdirectory for each SPRING plot. 

`counts_norm.npz`  
`counts_norm_sparse_cells.hdf5`  
`counts_norm_sparse_genes.hdf5`  
`genes.txt`  

Each subdirectory should contain:  

`categorical_coloring_data.json`  
`cell_filter.npy`  
`cell_filter.txt`  
`color_data_gene_sets.csv`  
`color_stats.json`  
`coordinates.txt`  
`edges.csv`  
`graph_data.json`  
`run_info.json`  

Place the main directory somehwere inside folder that contains this README and the other SPRING file. We recommend that you create a special `datasets` directory. For example, if you have a main data set called `human_bone_marrow` and another called `frog_embryo`, you could place them in `./datasets/human_bone_marrow/` and `./datasets/frog_embryo/`. 


### Running SPRING Viewer

1. Open Terminal (Mac) or Anaconda Prompt (Windows) and change directories (`cd`) to the directory containing this README file (`SPRING_dev/`). 
2. Start a local server by entering the following: `python -m CGIHTTPServer 8000`
3. Open web browser (preferably Chrome; best to use incognito mode to ensure no cached data is used).
4. View data set by navigating to corresponding URL: http://localhost:8000/springViewer_1_6_dev.html?path_to/main/subplot. In the example above, if you wanted to view a SPRING plot called `HSC` in the main directory `human_bone_marrow`, then you would navigate to http://localhost:8000/springViewer_1_6_dev.html?datasets/human_bone_marrow/HSC

