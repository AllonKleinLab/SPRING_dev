#!/bin/bash

# python 2:
#python -m CGIHTTPServer 8000

# python 3:
python -m http.server --bind localhost --cgi 8000
