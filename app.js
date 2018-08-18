requirejs.config({
  baseUrl: 'vendor',
  paths: {
      dist: '../dist',
  }
});


requirejs(['dist/main']);