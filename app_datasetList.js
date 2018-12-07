requirejs.config({
  baseUrl: 'vendor',
  paths: {
    dist: '../dist',
    d3: 'd3.v5.min',
    html2canvas: 'html2canvas.min',
    spinner: 'spin.min',
    sweetalert: 'sweetalert.min',
  },
});

requirejs(['dist/main_datasetList']);
