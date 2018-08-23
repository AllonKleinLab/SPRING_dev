requirejs.config({
  baseUrl: 'vendor',
  shim: {
    'PIXI': { exports: 'PIXI'},
  },
  paths: {
    dist: '../dist',
    'd3': 'd3.v5.min',
    'html2canvas': 'html2canvas.min',
    'spinner': 'spin.min',
    'sweetalert': 'sweetalert.min',
  },
});

requirejs(['dist/main']);
