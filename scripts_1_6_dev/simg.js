export class Simg {
  svg = null;
  previousSimg = null;

  constructor(svg) {
    this.svg = svg;
  }

  getBase64Image = (img) => {
    // From: http://stackoverflow.com/questions/934012/get-image-data-in-javascript
    var canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;

    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    var dataURL = canvas.toDataURL("image/png");

    return dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
  };

  // Return SVG text.
  toString = (svg) => {
    if (!svg){
      throw new Error('.toString: No SVG found.');
    }

    [
      ['version', 1.1],
      ['xmlns', "http://www.w3.org/2000/svg"],
    ].forEach(function(item){
      svg.setAttribute(item[0], item[1]);
    });
    return svg.parentNode.innerHTML;
  }

  // Return canvas with this SVG drawn inside.
  toCanvas = (cb) => {
    this.toSvgImage((img) => {
      var canvas = document.createElement('canvas');
      var context = canvas.getContext("2d");

      canvas.width = img.width;
      canvas.height = img.height;

      context.drawImage(img, 0, 0);
      cb(canvas);
    });
  }

  toSvgImage = (cb) => {
    var str = this.toString(this.svg);
    var img = document.createElement('img');

    if (cb){
      img.onload = function(){
        cb(img);
      };
    }

    // Make the new img's source an SVG image.
    img.setAttribute('src', 'data:image/svg+xml;base64,'+ btoa(unescape(encodeURIComponent(str))));
  }

  // Returns callback to new img from SVG.
  // Call with no arguments to return svg image element.
  // Call with callback to return png image element.
  toImg = (cb) => {
    this.toCanvas(function(canvas){
      var canvasData = canvas.toDataURL("image/png");
      var img = document.createElement('img');

      img.onload = function(){
        cb(img);
      };

      // Make pngImg's source the canvas data.
      img.setAttribute('src', canvasData);
    });
  }

  // Replace SVG with PNG img.
  replace = (cb) => {
    var self = this;
    this.toImg(function(img){
      var parentNode = self.svg.parentNode;
      parentNode.replaceChild(img, self.svg);
      if (cb){
        cb();
      }
    });
  }

  // Converts canvas to binary blob.
  toBinaryBlob =(cb) => {
    this.toCanvas(function(canvas){
      var dataUrl = canvas.toDataURL().replace(/^data:image\/(png|jpg);base64,/, "");
      var byteString = atob(escape(dataUrl));
      // write the bytes of the string to an ArrayBuffer
      var ab = new ArrayBuffer(byteString.length);
      var ia = new Uint8Array(ab);
      for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      var dataView = new DataView(ab);
      var blob = new Blob([dataView], {type: "image/png"});
      cb(blob);
    });
  }

  // Trigger download of image.
  download = (filename) => {
    if (!filename){
      filename = 'chart';
    }
    this.toImg(function(img){
      var a = document.createElement("a");
      a.download = filename + ".png";
      a.href = img.getAttribute('src');
      a.click();
    });
  }
}
