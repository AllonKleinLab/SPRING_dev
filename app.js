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

window.addEventListener('message', event => {
  if (event.origin === window.location.origin) {
    return;
  }
  try {
    const parsedData = JSON.parse(event.data);
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
  } catch (err) {
    console.log(`Unable to parse received message.\n\
    Data: ${event.data}
    Error: ${err}`);
  }
});

requirejs(['dist/main']);
