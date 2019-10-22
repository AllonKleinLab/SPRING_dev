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

if (!window.cacheData) {
  window.cacheData = new Map();
}

window.addEventListener('message', event => {
  if (!event.isTrusted && event.origin === window.location.origin) {
    return;
  }
  try {
    if (typeof event.data === 'string') {
      const parsedData = JSON.parse(event.data);
      switch (parsedData.type) {
        case 'init': {
          if (parsedData.payload.indices) {
            window.cacheData.set('indices', parsedData.payload.indices);
          }

          if (parsedData.payload.categories) {
            window.cacheData.set('categories', parsedData.payload.categories);
          }
        }
        case 'selected-cells-update': {
          if (parsedData.payload.coordinates) {
            window.cacheData.set('selected-cells', parsedData.payload.coordinates);
          }
        }
        default: {
          break;
        }
      }
    }
  } catch (err) {
    console.log(`Unable to parse received message.\n\
    Data: ${event.data}
    Error: ${err}`);
  }
});

requirejs.config({
  waitSeconds: 200,
});

requirejs(['dist/main']);
