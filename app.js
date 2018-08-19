requirejs.config({
  baseUrl: 'vendor',
  shim: {
    'PIXI': { exports: 'PIXI'},
  },
  paths: {
    dist: '../dist',
    'd3': 'd3.v5.min',
  }
});

requirejs(['dist/main']);