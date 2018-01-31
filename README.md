### A. Installing Python libraries

Prior to running SPRING viewer locally, you'll need to make sure Python 2.7 and the following Python libraries are installed:  
`scikit-learn`  
`numpy`  
`scipy`  
`h5py`  
`networkx`  
`fa2`  

We recommend using Anaconda to manage your Python libraries. You can download it here (be sure to get the Python 2.7 version):  
https://conda.io/miniconda.html

Several of the required libraries can be installed using conda. To do so, open Terminal (Mac) or Anaconda Prompt (Windows) and enter the following:  
`conda install scikit-learn numpy scipy h5py`

The remaining libraries can be installed using pip. Note that if you're a Windows user, you'll first need to install Microsoft Visual C++ 9.0 (available from http://aka.ms/vcpython27). Enter the following into Terminal or Anaconda Prompt:  
`pip install networkx fa2`


### B. Setting up a SPRING data directory

A SPRING data set consist of a main directory and any number of subdirectories, with each subdirectory corresponding to one SPRING plot (i.e. subplot). The main directory contains raw data shared by all subplots. Specifically, in addition to a folder for each subplot, the main directory should have the following files:  
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

Place the main directory (and all subdirectories) somewhere within the same folder as this README file. For example, if you have a main data set called "human_bone_marrow" and another called "frog_embryo", you could place them in `./datasets/human_bone_marrow/` and `./datasets/frog_embryo/`. 


### C. Running SPRING viewer

1. Open Terminal (Mac) or Anaconda Prompt (Windows) and change directories (cd) to the directory containing this README file (SPRING_dev). 
2. Start a local server by entering the following: `python -m CGIHTTPServer 8000`
3. Open web browser (preferably Chrome, possibly in incognito mode to ensure no cached data is used).
4. View data set by navigating to corresponding URL: http://localhost:8000/springViewer_1_6_dev.html?path_to/main/subplot. In the example above, if you wanted to view a subplot of human_bone_marrow called "HSC", then you would navigate to http://localhost:8000/springViewer_1_6_dev.html?datasets/human_bone_marrow/HSC

