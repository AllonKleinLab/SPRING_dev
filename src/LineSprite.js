export class LineSprite extends PIXI.Sprite {
  static textureCache = {};
  static maxWidth = 100;
  static maxColors = 100;
  static colors = 0;
  static canvas = null;
  static baseTexture = null;

  constructor(thickness, color, x1, y1, x2, y2) {
    super(LineSprite.getTexture(thickness, color));
    this._thickness = thickness;
    this._color = color;
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.updatePosition();
    this.anchor = new PIXI.ObservablePoint(() => { return; }, undefined, 0.5);
  }
  // <-- LineSprite Constructor End -->

  static initCanvas() {
    LineSprite.canvas = document.createElement('canvas');
    LineSprite.canvas.width = LineSprite.maxWidth + 2;
    LineSprite.canvas.height = LineSprite.maxColors;
    LineSprite.baseTexture = new PIXI.BaseTexture(LineSprite.canvas);
  }

  static getTexture(thickness, color) {
    let key = thickness + '-' + color;
    if (!LineSprite.textureCache[key]) {
      if (!LineSprite.canvas) {
        LineSprite.initCanvas();
      }
      let canvas = LineSprite.canvas;
      let context = canvas.getContext('2d');
      context.fillStyle = PIXI.utils.hex2string(color);
      context.fillRect(1, LineSprite.colors, thickness, 1);
      let texture = new PIXI.Texture(LineSprite.baseTexture, PIXI.SCALE_MODES.LINEAR);
      texture.frame = new PIXI.Rectangle(0, LineSprite.colors, thickness + 2, 1);
      LineSprite.textureCache[key] = texture;
      LineSprite.colors++;
    }

    return LineSprite.textureCache[key];
  }

  updatePosition() {
    this.position.x = this.x1;
    this.position.y = this.y1;
    this.height = Math.sqrt((this.x2 - this.x1) * (this.x2 - this.x1) + (this.y2 - this.y1) * (this.y2 - this.y1));
    var dir = Math.atan2(this.y1 - this.y2, this.x1 - this.x2);
    this.rotation = Math.PI * 0.5 + dir;
  }
}

Object.defineProperties(LineSprite.prototype, {
  thickness: {
      get: function() {
          return this._thickness;
      },
      set: function(value) {
          this._thickness = value;
          this.texture = LineSprite.getTexture(this._thickness, this._color);
      },
  },
  color: {
      get: function() {
          return this._color;
      },
      set: function(value) {
          this._color = value;
          this.texture = LineSprite.getTexture(this._thickness, this._color);
      },
  },
});
