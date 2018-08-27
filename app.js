requirejs.config({
  baseUrl: 'vendor',
  shim: {
    PIXI: { exports: 'PIXI' },
  },
  paths: {
    dist: '../dist',
    d3: 'd3.v5.min',
    html2canvas: 'html2canvas.min',
    spinner: 'spin.min',
    sweetalert: 'sweetalert.min',
  },
});

window.cacheData = new Map();

window.addEventListener('message', e => {
  const parsedData = JSON.parse(e.data);
  switch (parsedData.type) {
    case 'init': {
      if (parsedData.payload.coordinates) {
        window.cacheData.set('coordinates', parsedData.payload.coordinates);
      }
    }
    default: {
      break;
    }
  }
});

requirejs(['dist/main']);
