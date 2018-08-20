import * as d3 from 'd3';
import { sprites, all_nodes, app, all_outlines, svg_graph } from './forceLayout_script';

export const clone_nodes = {};
export const clone_edges = {};
export const node_status = {};

export let clone_sprites = new PIXI.Container();

export const clone_viewer_setup = () => {
  let clone_edge_container = new PIXI.Container();
  clone_edge_container.position = sprites.position;
  clone_edge_container.scale = sprites.scale;

  let clone_sprites = new PIXI.Container();

  clone_sprites.position = sprites.position;
  clone_sprites.scale = sprites.scale;

  let targetCircle = new PIXI.Graphics();
  targetCircle.alpha = 0;
  clone_sprites.addChild(targetCircle);

  let show_clone_edges = false;
  let show_source_nodes = false;

  app.stage.addChild(clone_edge_container);
  app.stage.addChild(clone_sprites);

  let popup = d3
    .select('#force_layout')
    .append('div')
    .attr('id', 'clone_viewer_popup');

  popup
    .append('div')
    .style('padding', '5px')
    .style('height', '22px')
    .append('text')
    .text('Linkage browser')
    .attr('id', 'clone_title');

  let clone_key = '';

  let cloneKeyMenu = popup
    .append('div')
    .append('select')
    .style('font-size', '13px')
    // .style('margin-left','50px')
    //.style("text-align", "center")
    .attr('id', 'clone_key_menu')
    .on('change', function() {
      clone_key = document.getElementById('clone_key_menu').value;
    });

  let cloneDispatch = d3.dispatch('load', 'statechange');
  cloneDispatch.on('load', function(data) {
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

  const clone_map = {};
  let noCache = new Date().getTime();
  let name = window.location.search.split('/')[2];
  d3.json(window.location.search.slice(1, name.length) + '/clone_map.json' + '?_=' + noCache).then(data => {
    //console.log(error);
    for (let k in data) {
      clone_map[k] = {};
      for (let i in all_nodes) {
        clone_map[k][i] = [];
      }
      for (let i in data[k]) {
        clone_map[k][i] = data[k][i];
      }
    }
    d3.select('#clone_loading_screen').style('visibility', 'hidden');
    cloneDispatch.load(clone_map);
    clone_key = document.getElementById('clone_key_menu').value;
  });

  popup
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
    .on('input', draw_target_circle);

  popup
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
    .on('input', update_highlight_size);

  popup
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

  popup
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

  let source_target_options = popup.append('div');
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
    .on('click', reset_all_nodes);

  let node_color_options = popup.append('div');
  node_color_options
    .append('button')
    .text('Darken')
    .on('click', darken_nodes);

  node_color_options
    .append('button')
    .text('Burn')
    .on('click', burn);

  node_color_options
    .append('button')
    .text('Restore')
    .on('click', restore_colors);

  node_color_options
    .append('button')
    .text('Clear')
    .on('click', clear_clone_overlays);

  let show_things_options = popup.append('div');
  show_things_options
    .append('button')
    .style('width', '106px')
    .text('Show edges')
    .on('click', function() {
      if (show_clone_edges) {
        show_clone_edges = false;
        d3.select(this).text('Show edges');
      } else {
        show_clone_edges = true;
        d3.select(this).text('Hide edges');
      }
    });

  show_things_options
    .append('button')
    .style('width', '106px')
    .text('Show source')
    .on('click', function() {
      if (show_source_nodes) {
        show_source_nodes = false;
        d3.select(this).text('Show source');
      } else {
        show_source_nodes = true;
        d3.select(this).text('Hide source');
      }
    });

  let other_options = popup.append('div');

  other_options
    .append('button')
    .text('Extend from selection')
    .style('width', '156px')
    .on('click', extend_from_selection);

  other_options
    .append('button')
    .text('Close')
    .style('width', '56px')
    .on('click', close_clone_viewer);

  let loading_screen = popup.append('div').attr('id', 'clone_loading_screen');

  show_waiting_wheel();
  loading_screen.append('p').text('Loading linkage data');

  function show_waiting_wheel() {
    loading_screen.append('div').attr('id', 'clone_wheel_mask');
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

  function clone_viewer_popup_dragstarted() {
    d3.event.sourceEvent.stopPropagation();
  }
  function clone_viewer_popup_dragged() {
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
  function clone_viewer_popup_dragended() {
    return;
  }

  d3.select('#clone_viewer_popup').call(
    d3.drag()
      .on('start', clone_viewer_popup_dragstarted)
      .on('drag', clone_viewer_popup_dragged)
      .on('end', clone_viewer_popup_dragended),
  );

  function reset_all_nodes() {
    for (let i = 0; i < all_outlines.length; i++) {
      node_status[i].source = false;
      node_status[i].target = false;
    }
  }

  function clear_clone_overlays() {
    for (let i in clone_nodes) {
      deactivate_nodes(i);
    }
    for (let i in clone_edges) {
      deactivate_edges(i);
    }
  }

  function close_clone_viewer() {
    svg_graph.on('mousemove', null);
    svg_graph.on('click', null);
    popup.style('visibility', 'hidden');
    reset_all_nodes();
    clear_clone_overlays();
    targetCircle.clear();
  }

  function update_highlight_size() {
    let my_scale = parseFloat(d3.select('#clone_node_size_slider')[0][0].value) / 10;
    for (let i in clone_nodes) {
      clone_nodes[i].scale.x = all_nodes[i].scale.x * my_scale;
      clone_nodes[i].scale.y = all_nodes[i].scale.x * my_scale;
    }
  }

  function burn() {
    for (let i = 0; i < all_nodes.length; i++) {
      if (clone_nodes[i] === undefined && all_nodes[i].tint === '0x000000') {
        base_colors[i] = { r: 0, g: 0, b: 0 };
      }
    }
    update_tints();
    app.stage.children[1].children.sort(function(a, b) {
      return average_color(base_colors[a.index]) - average_color(base_colors[b.index]);
    });

    clear_clone_overlays();
  }

  function restore_colors() {
    setNodeColors();
  }

  function extend_from_selection() {
    for (let i in clone_nodes) {
      if (!clone_nodes[i].active_stable) {
        deactivate_nodes(i);
      }
    }
    for (let i in clone_edges) {
      deactivate_edges(i);
    }

    let maxsize = parseFloat(d3.select('#clone_size_input')[0][0].value);
    if (maxsize > 0 === false) {
      maxsize = 100000000;
    }

    for (let i = 0; i < all_nodes.length; i++) {
      if (all_outlines[i].selected && clone_map[clone_key][i].length < maxsize && node_status[i].source) {
        if (!(i in clone_nodes)) {
          activate_edges(i, false);
          if (show_source_nodes) {
            activate_node(i, false);
          }
        }
      }
    }
  }
}

function get_clone_radius() {
  let r = parseInt(d3.select('#clone_selector_size_slider')[0][0].value, 10);
  return r ** 1.5 / 8;
}

function clone_mousemove() {
  let dim = document.getElementById('svg_graph').getBoundingClientRect();
  let x = d3.event.clientX - dim.left;
  let y = d3.event.clientY - dim.top;
  x = (x - sprites.position.x) / sprites.scale.x;
  y = (y - sprites.position.y) / sprites.scale.y;

  targetCircle.x = x;
  targetCircle.y = y;

  for (let i in clone_nodes) {
    if (!clone_nodes[i].active_stable) {
      deactivate_nodes(i);
    }
  }
  for (let i in clone_edges) {
    deactivate_edges(i);
  }
  let maxsize = parseFloat(d3.select('#clone_size_input')[0][0].value);
  if (maxsize > 0 === false) {
    maxsize = 100000000;
  }

  for (let i = 0; i < all_nodes.length; i++) {
    rad = Math.sqrt((all_nodes[i].x - x) ** 2 + (all_nodes[i].y - y) ** 2);
    if (rad <= get_clone_radius()) {
      if (node_status[i].source && clone_map[clone_key][i].length < maxsize) {
        if (!(i in clone_nodes)) {
          activate_edges(i, false);
          if (show_source_nodes) {
            activate_node(i, false);
          }
        }
      }
    }
  }

  targetCircle.alpha = 0.75;
  setTimeout(() => {
    dim_target_circle(0.75);
  }, 150);

  function dim_target_circle(newX) {
    if (newX > 0 && targetCircle.alpha === newX) {
      targetCircle.alpha = newX - 0.08;
      dimmer = setTimeout(function() {
        dim_target_circle(newX - 0.08);
      }, 20);
    }
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
    let rgb = base_colors[i];
    circ.tint = rgbToHex(rgb.r, rgb.g, rgb.b);
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
          let rgb = base_colors[clone_map[clone_key][i][j]];
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
    clone_edges[i] = edge_list;
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

function start_clone_viewer() {
  for (let i = 0; i < all_nodes.length; i++) {
    node_status[i] = { active: false, active_stable: false, source: false, target: false };
  }
  svg_graph.on('mousemove', clone_mousemove);
  svg_graph.on('click', clone_click);
  d3.select('#clone_viewer_popup').style('visibility', 'visible');

  d3.select('#settings_range_background_color')[0][0].value = 65;
  app.renderer.backgroundColor = rgbToHex(65, 65, 65);
  draw_target_circle();
  set_source_from_selection();
  set_target_from_selection();
  darken_nodes();
}

function draw_target_circle() {
  targetCircle.clear();
  targetCircle.lineStyle(7, 0xffffff); //(thickness, color)
  targetCircle.drawCircle(0, 0, get_clone_radius() + all_nodes[0].scale.x * SPRITE_IMG_WIDTH); //(x,y,radius)
  targetCircle.endFill();
  targetCircle.alpha = 0;
}

function set_source_from_selection() {
  let none_selected = true;
  for (let i = 0; i < all_outlines.length; i++) {
    if (all_outlines[i].selected) {
      none_selected = false;
      i = all_outlines.length;
    }
  }
  for (let i = 0; i < all_outlines.length; i++) {
    if (all_outlines[i].selected || none_selected) {
      node_status[i].source = true;
    }
  }
}

function set_target_from_selection() {
  let none_selected = true;
  for (let i = 0; i < all_outlines.length; i++) {
    if (all_outlines[i].selected) {
      none_selected = false;
      i = all_outlines.length;
    }
  }

  for (let i = 0; i < all_outlines.length; i++) {
    if (all_outlines[i].selected || none_selected) {
      node_status[i].target = true;
    }
  }
}

function darken_nodes() {
  let darkness = parseFloat(d3.select('#clone_darkness_slider')[0][0].value) / 100;
  for (let i = 0; i < all_nodes.length; i++) {
    let cc = base_colors[i];
    let r = Math.floor(cc.r * darkness);
    let b = Math.floor(cc.b * darkness);
    let g = Math.floor(cc.g * darkness);
    all_nodes[i].tint = rgbToHex(r, g, b);
  }
}
