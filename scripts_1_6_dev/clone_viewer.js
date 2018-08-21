import * as d3 from 'd3';

import ForceLayout from './forceLayout_script';

import ColorBar, { average_color } from './colorBar';
import { SPRITE_IMG_WIDTH, rgbToHex } from './util';

class CloneViewer {
  static _instance;
  
  static get instance() {
    if (!this._instance) {
      throw new Error('You must first call CloneViewer.create()!');
    }
    return this._instance;
  }

  static create(forceLayout) {
    if (!this._instance) {
      this._instance = new CloneViewer(forceLayout);
    } else {
      throw new Error('CloneViewer.create() has already been called, get the existing instance with ForceLayout.instance!');
    }
  }

  constructor(forceLayout) {
    const { sprites, all_nodes, all_outlines, base_colors } = forceLayout;
    this.svg_graph = null;
    this.targetCircle = new PIXI.Graphics();
    this.clone_nodes = new Array();
    this.clone_edges = new Array();
    this.node_status = new Array();
    this.clone_sprites = new PIXI.Container();
    this.edge_container = new PIXI.Container();
    this.clone_edge_container = new PIXI.Container();
    this.all_nodes = all_nodes;
    this.all_outlines = all_outlines;
    this.base_colors = base_colors;
    this.sprites = sprites;
    this.clone_edge_container.position = sprites.position;
    this.clone_edge_container.scale = sprites.scale;

    this.clone_sprites.position = sprites.position;
    this.clone_sprites.scale = sprites.scale;

    this.targetCircle.alpha = 0;
    
    this.clone_sprites.addChild(this.targetCircle);

    this.show_clone_edges = false;
    this.show_source_nodes = false;

    forceLayout.app.stage.addChild(this.clone_edge_container);
    forceLayout.app.stage.addChild(this.clone_sprites);

    this.popup = d3
      .select('#force_layout')
      .append('div')
      .attr('id', 'clone_viewer_popup');

    this.popup
      .append('div')
      .style('padding', '5px')
      .style('height', '22px')
      .append('text')
      .text('Linkage browser')
      .attr('id', 'clone_title');

    this.clone_key = '';

    let cloneKeyMenu = this.popup
      .append('div')
      .append('select')
      .style('font-size', '13px')
      // .style('margin-left','50px')
      //.style("text-align", "center")
      .attr('id', 'clone_key_menu')
      .on('change', () => {
        this.clone_key = document.getElementById('clone_key_menu').value;
      });

    let cloneDispatch = d3.dispatch('load', 'statechange');
    cloneDispatch.on('load', (data) => {
      cloneKeyMenu.selectAll('option').remove();
      cloneKeyMenu
        .selectAll('option')
        .data(Object.keys(data))
        .enter()
        .append('option')
        .attr('value', (d) => {
          return d;
        })
        .text((d) => {
          return d;
        });
      cloneDispatch.on('statechange', (state) => {
        select.property('value', state.id);
      });
    });

    this.clone_map = {};
    const noCache = new Date().getTime();
    const name = window.location.search.split('/')[2];
    const filePath = window.location.search.slice(1, name.length) + '/clone_map.json';
    d3.json(filePath + '?_=' + noCache).then(data => {
      //console.log(error);
      for (let k in data) {
        this.clone_map[k] = {};
        for (let i in all_nodes) {
          this.clone_map[k][i] = [];
        }
        for (let i in data[k]) {
          this.clone_map[k][i] = data[k][i];
        }
      }
      d3.select('#clone_loading_screen').style('visibility', 'hidden');
      cloneDispatch.load(this.clone_map);
      this.clone_key = document.getElementById('clone_key_menu').value;
    }).catch(err => err);

    this.popup
      .append('div')
      .on('mousedown', function() {
        d3.event.stopPropagation();
      })
      .append('label')
      .text('Selector radius')
      .append('input')
      .attr('type', 'range')
      .attr('id', 'clone_selector_size_slider')
      .style('margin-left', '21px')
      .attr('value', '25')
      .on('input', this.draw_target_circle);

    this.popup
      .append('div')
      .on('mousedown', function() {
        d3.event.stopPropagation();
      })
      .append('label')
      .text('Highlight size')
      .append('input')
      .attr('type', 'range')
      .attr('value', '25')
      .attr('id', 'clone_node_size_slider')
      .style('margin-left', '31px')
      .on('input', this.update_highlight_size);

    this.popup
      .append('div')
      .on('mousedown', function() {
        d3.event.stopPropagation();
      })
      .append('label')
      .text('Darkness level')
      .append('input')
      .attr('type', 'range')
      .attr('value', '25')
      .attr('id', 'clone_darkness_slider')
      .style('margin-left', '23px')
      .on('input', darken_nodes);

    this.popup
      .append('div')
      .on('mousedown', function() {
        d3.event.stopPropagation();
      })
      .append('label')
      .text('Max group size')
      .append('input')
      .attr('type', 'text')
      .attr('value', '0')
      .attr('id', 'clone_size_input')
      .style('margin-left', '23px')
      .on('input', darken_nodes);

    let source_target_options = this.popup.append('div');
    source_target_options
      .append('button')
      .text('Source')
      .style('width', '60px')
      .on('click', set_source_from_selection);
    source_target_options
      .append('button')
      .text('Target')
      .style('width', '60px')
      .on('click', set_target_from_selection);
    source_target_options
      .append('button')
      .text('Reset all')
      .style('width', '87px')
      .on('click', this.reset_all_nodes);

    let node_color_options = this.popup.append('div');
    node_color_options
      .append('button')
      .text('Darken')
      .on('click', darken_nodes);

    node_color_options
      .append('button')
      .text('Burn')
      .on('click', this.burn);

    node_color_options
      .append('button')
      .text('Restore')
      .on('click', this.restore_colors);

    node_color_options
      .append('button')
      .text('Clear')
      .on('click', this.clear_clone_overlays);

    let show_things_options = this.popup.append('div');
    show_things_options
      .append('button')
      .style('width', '106px')
      .text('Show edges')
      .on('click', (d) => {
        if (show_clone_edges) {
          this.show_clone_edges = false;
          d3.select(d).text('Show edges');
        } else {
          this.show_clone_edges = true;
          d3.select(d).text('Hide edges');
        }
      });

    show_things_options
      .append('button')
      .style('width', '106px')
      .text('Show source')
      .on('click', (d) => {
        if (show_source_nodes) {
          this.show_source_nodes = false;
          d3.select(d).text('Show source');
        } else {
          this.show_source_nodes = true;
          d3.select(d).text('Hide source');
        }
      });

    let other_options = this.popup.append('div');

    other_options
      .append('button')
      .text('Extend from selection')
      .style('width', '156px')
      .on('click', this.extend_from_selection);

    other_options
      .append('button')
      .text('Close')
      .style('width', '56px')
      .on('click', this.close_clone_viewer);

    this.loading_screen = this.popup.append('div').attr('id', 'clone_loading_screen');

    this.show_waiting_wheel();
    this.loading_screen.append('p').text('Loading linkage data');

    d3.select('#clone_viewer_popup').call(
      d3.drag()
        .on('start', this.clone_viewer_popup_dragstarted)
        .on('drag', this.clone_viewer_popup_dragged)
        .on('end', this.clone_viewer_popup_dragended),
    );
  }

  show_waiting_wheel() {
    this.loading_screen.append('div').attr('id', 'clone_wheel_mask');
    let opts = {
      className: 'spinner', // The CSS class to assign to the spinner
      color: '#000', // #rgb or #rrggbb or array of colors
      corners: 1, // Corner roundness (0..1)
      direction: 1, // 1: clockwise, -1: counterclockwise
      fps: 20, // Frames per second when using setTimeout() as a fallback for CSS
      hwaccel: true, // Whether to use hardware acceleration
      left: '50%', // Left position relative to parent
      length: 35, // The length of each line
      lines: 17, // The number of lines to draw
      opacity: 0.2, // Opacity of the lines
      position: 'relative', // Element positioning
      radius: 50, // The radius of the inner circle
      rotate: 8, // The rotation offset
      scale: 0.22, // Scales overall size of the spinner
      shadow: false, // Whether to render a shadow
      speed: 0.9, // Rounds per second
      top: '50%', // Top position relative to parent
      trail: 60, // Afterglow percentage
      width: 15, // The line thickness
      zIndex: 2e9, // The z-index (defaults to 2000000000)
    };
    let target = document.getElementById('clone_wheel_mask');
    let spinner = new Spinner(opts).spin(target);
    $(target).data('spinner', spinner);
  }

  clone_viewer_popup_dragstarted() {
    d3.event.sourceEvent.stopPropagation();
  }

  clone_viewer_popup_dragged() {
    let cx = parseFloat(
      d3
        .select('#clone_viewer_popup')
        .style('left')
        .split('px')[0],
    );
    let cy = parseFloat(
      d3
        .select('#clone_viewer_popup')
        .style('top')
        .split('px')[0],
    );
    d3.select('#clone_viewer_popup').style('left', (cx + d3.event.dx).toString() + 'px');
    d3.select('#clone_viewer_popup').style('top', (cy + d3.event.dy).toString() + 'px');
  }
  
  clone_viewer_popup_dragended() {
    return;
  }

  reset_all_nodes() {
    for (let i = 0; i < this.all_outlines.length; i++) {
      this.node_status[i].source = false;
      this.node_status[i].target = false;
    }
  }

  clear_clone_overlays() {
    for (let i in this.clone_nodes) {
      deactivate_nodes(i);
    }
    for (let i in this.clone_edges) {
      deactivate_edges(i);
    }
  }

  close_clone_viewer() {
    this.svg_graph.on('mousemove', null);
    this.svg_graph.on('click', null);
    this.popup.style('visibility', 'hidden');
    this.reset_all_nodes();
    this.clear_clone_overlays();
    this.targetCircle.clear();
  }

  update_highlight_size() {
    let my_scale = parseFloat(d3.select('#clone_node_size_slider')[0][0].value) / 10;
    for (let i in this.clone_nodes) {
      this.clone_nodes[i].scale.x = this.all_nodes[i].scale.x * my_scale;
      this.clone_nodes[i].scale.y = this.all_nodes[i].scale.x * my_scale;
    }
  }

  burn() {
    for (let i = 0; i < this.all_nodes.length; i++) {
      if (this.clone_nodes[i] === undefined && this.all_nodes[i].tint === '0x000000') {
        this.base_colors[i] = { r: 0, g: 0, b: 0 };
      }
    }
    ColorBar.instance.update_tints();
    ForceLayout.instance.app.stage.children[1].children.sort(function(a, b) {
      return average_color(this.base_colors[a.index]) - average_color(this.base_colors[b.index]);
    });

    this.clear_clone_overlays();
  }

  restore_colors() {
    ColorBar.instance.setNodeColors();
  }

  extend_from_selection() {
    for (let i in this.clone_nodes) {
      if (!this.clone_nodes[i].active_stable) {
        deactivate_nodes(i);
      }
    }
    for (let i in this.clone_edges) {
      deactivate_edges(i);
    }

    let maxsize = parseFloat(d3.select('#clone_size_input')[0][0].value);
    if (maxsize > 0 === false) {
      maxsize = 100000000;
    }

    for (let i = 0; i < this.all_nodes.length; i++) {
      if (this.all_outlines[i].selected && this.clone_map[this.clone_key][i].length < maxsize && this.node_status[i].source) {
        if (!(i in this.clone_nodes)) {
          activate_edges(i, false);
          if (this.show_source_nodes) {
            activate_node(i, false);
          }
        }
      }
    }
  }

  draw_target_circle() {
    console.log(this.all_nodes);
    this.targetCircle.clear();
    this.targetCircle.lineStyle(7, 0xffffff); //(thickness, color)
    this.targetCircle.drawCircle(0, 0, this.get_clone_radius() + this.all_nodes[0].scale.x * SPRITE_IMG_WIDTH); //(x,y,radius)
    this.targetCircle.endFill();
    this.targetCircle.alpha = 0;
  }

  get_clone_radius() {
    let r = parseInt(d3.select('#clone_selector_size_slider').value, 10);
    return r ** 1.5 / 8;
  }

  clone_mousemove() {
    let dim = document.getElementById('svg_graph').getBoundingClientRect();
    let x = d3.event.clientX - dim.left;
    let y = d3.event.clientY - dim.top;
    x = (x - this.sprites.position.x) / this.sprites.scale.x;
    y = (y - this.sprites.position.y) / this.sprites.scale.y;

    this.targetCircle.x = x;
    this.targetCircle.y = y;

    for (let i in this.clone_nodes) {
      if (!this.clone_nodes[i].active_stable) {
        deactivate_nodes(i);
      }
    }
    for (let i in this.clone_edges) {
      deactivate_edges(i);
    }
    let maxsize = parseFloat(d3.select('#clone_size_input')[0][0].value);
    if (maxsize > 0 === false) {
      maxsize = 100000000;
    }

    for (let i = 0; i < this.all_nodes.length; i++) {
      const rad = Math.sqrt((this.all_nodes[i].x - x) ** 2 + (this.all_nodes[i].y - y) ** 2);
      if (rad <= this.get_clone_radius()) {
        if (this.node_status[i].source && this.clone_map[this.clone_key][i].length < maxsize) {
          if (!(i in this.clone_nodes)) {
            activate_edges(i, false);
            if (this.show_source_nodes) {
              activate_node(i, false);
            }
          }
        }
      }
    }

    this.targetCircle.alpha = 0.75;
    setTimeout(() => {
      dim_target_circle(0.75);
    }, 150);

    function dim_target_circle(newX) {
      if (newX > 0 && this.targetCircle.alpha === newX) {
        this.targetCircle.alpha = newX - 0.08;
        let dimmer = setTimeout(function() {
          dim_target_circle(newX - 0.08);
        }, 20);
      }
    }
  }

  start_clone_viewer() {
    console.log(this.all_nodes);
    this.svg_graph = d3.select('svg_graph');
    for (let i = 0; i < this.all_nodes.length; i++) {
      node_status[i] = { active: false, active_stable: false, source: false, target: false };
    }
    this.svg_graph.on('mousemove', this.clone_mousemove);
    this.svg_graph.on('click', clone_click);
    d3.select('#clone_viewer_popup').style('visibility', 'visible');
  
    d3.select('#settings_range_background_color').value = 65;
    ForceLayout.instance.app.renderer.backgroundColor = parseInt(rgbToHex(65, 65, 65), 16);
    this.draw_target_circle();
    set_source_from_selection();
    set_target_from_selection();
    darken_nodes();
  }
}

function clone_click() {
  /*
	let dim = document.getElementById('svg_graph').getBoundingClientRect();
	let x = d3.event.clientX - dim.left;
	let y = d3.event.clientY - dim.top;
	x = (x - sprites.position.x) / sprites.scale.x;
	y = (y - sprites.position.y) / sprites.scale.y;
	for (let i=0; i<all_nodes.length; i++) {
		if (! all_outlines[i].selected) {
			rad = Math.sqrt((all_nodes[i].x-x)**2 + (all_nodes[i].y-y)**2);
			if (rad < get_clone_radius()) { 
				if (node_status[i].source) {
					if (show_source_nodes) {
						activate_node(i,true); 
					}
					activate_edges(i,true);
				}
			}
		}
	}
	*/
}

export const activate_node = (i, stable) => {
  if (!(i in clone_nodes)) {
    let circ = PIXI.Sprite.fromImage('stuff/disc.png');
    circ.anchor.set(0.5);
    let my_scale = parseFloat(d3.select('#clone_node_size_slider')[0][0].value) / 10;
    circ.scale.set(all_nodes[i].scale.x * my_scale);
    circ.x = all_nodes[i].x;
    circ.y = all_nodes[i].y;
    let rgb = this.base_colors[i];
    circ.tint = parseInt(rgbToHex(rgb.r, rgb.g, rgb.b), 16);
    node_status[i].active = true;
    node_status[i].active_stable = stable;
    sprites.removeChild(circ);
    clone_sprites.addChild(circ);
    clone_nodes[i] = circ;
  }
  clone_nodes[i].active_stable = clone_nodes[i].active_stable || stable;
  clone_nodes[i].x = all_nodes[i].x;
  clone_nodes[i].y = all_nodes[i].y;
}

function activate_edges(i, stable) {
  if (!(i in clone_edges)) {
    let edge_list = [];
    for (let j = 0; j < clone_map[clone_key][i].length; j++) {
      //console.log([i,clone_map[i][j]]);
      if (node_status[clone_map[clone_key][i][j]].target) {
        activate_node(clone_map[clone_key][i][j], stable);
        if (show_clone_edges) {
          let source = i;
          let target = clone_map[clone_key][i][j];
          let x1 = all_nodes[source].x;
          let y1 = all_nodes[source].y;
          let x2 = all_nodes[target].x;
          let y2 = all_nodes[target].y;
          let rgb = this.base_colors[clone_map[clone_key][i][j]];
          let color = rgbToHex(rgb.r, rgb.g, rgb.b);
          let line = new PIXI.Graphics();
          line.lineStyle(5, color, 1);
          line.moveTo(x1, y1);
          line.lineTo(x2, y2);
          clone_edge_container.addChild(line);
          edge_list.push(line);
        }
      }
    }
    this.clone_edges[i] = edge_list;
  } else if (stable) {
    for (let j = 0; j < clone_map[clone_key][i].length; j++) {
      if (node_status[clone_map[clone_key][i][j]].target) {
        activate_node(clone_map[clone_key][i][j], stable);
      }
    }
  }
}

function deactivate_nodes(i) {
  if (i in clone_nodes) {
    clone_sprites.removeChild(clone_nodes[i]);
    delete clone_nodes[i];
    node_status[i].active = false;
    node_status[i].active_stable = false;
  }
}

function deactivate_edges(i) {
  if (i in clone_edges) {
    for (let j = 0; j < clone_edges[i].length; j++) {
      clone_edge_container.removeChild(clone_edges[i][j]);
    }
    delete clone_edges[i];
  }
}

function set_source_from_selection() {
  let none_selected = true;
  for (let i = 0; i < ForceLayout.instance.all_outlines.length; i++) {
    if (ForceLayout.instance.all_outlines[i].selected) {
      none_selected = false;
      i = ForceLayout.instance.all_outlines.length;
    }
  }
  for (let i = 0; i < ForceLayout.instance.all_outlines.length; i++) {
    if (ForceLayout.instance.all_outlines[i].selected || none_selected) {
      ForceLayout.instance.node_status[i].source = true;
    }
  }
}

function set_target_from_selection() {
  let none_selected = true;
  for (let i = 0; i < ForceLayout.instance.all_outlines.length; i++) {
    if (ForceLayout.instance.all_outlines[i].selected) {
      none_selected = false;
      i = ForceLayout.instance.all_outlines.length;
    }
  }

  for (let i = 0; i < ForceLayout.instance.all_outlines.length; i++) {
    if (ForceLayout.instance.all_outlines[i].selected || none_selected) {
      node_status[i].target = true;
    }
  }
}

function darken_nodes() {
  let darkness = parseFloat(d3.select('#clone_darkness_slider')[0][0].value) / 100;
  for (let i = 0; i < ForceLayout.instance.all_nodes.length; i++) {
    let cc = ForceLayout.instance.base_colors[i];
    let r = Math.floor(cc.r * darkness);
    let b = Math.floor(cc.b * darkness);
    let g = Math.floor(cc.g * darkness);
    ForceLayout.instance.all_nodes[i].tint = rgbToHex(r, g, b);
  }
}

export default CloneViewer;