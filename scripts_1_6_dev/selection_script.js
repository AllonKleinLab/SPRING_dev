import * as d3 from 'd3';
import { all_outlines, zoomer, all_nodes, xScale, yScale, sprites } from './forceLayout_script';
import { count_clusters } from './colorBar';

let selection_mode = '';
let brush = {};
let brusher = () => {}

export const selection_setup = () => {
  selection_mode = 'drag_pan_zoom';
  let svg_width = parseInt(d3.select('svg').attr('width'), 10);

  let drag_pan_zoom_rect = d3
    .select('svg')
    .append('rect')
    .attr('class', 'selection_option')
    .attr('x', svg_width - 177)
    .attr('y', 0)
    .attr('fill-opacity', 0.5)
    .attr('width', 200)
    .attr('height', 24)
    .on('click', function() {
      selection_mode = 'drag_pan_zoom';
      switch_mode();
    });

  let positive_select_rect = d3
    .select('svg')
    .append('rect')
    .attr('class', 'selection_option')
    .attr('x', svg_width - 177)
    .attr('y', 24)
    .attr('fill-opacity', 0.15)
    .attr('width', 200)
    .attr('height', 24)
    .on('click', function() {
      selection_mode = 'positive_select';
      switch_mode();
    });

  let negative_select_rect = d3
    .select('svg')
    .append('rect')
    .attr('class', 'selection_option')
    .attr('x', svg_width - 177)
    .attr('y', 48)
    .attr('fill-opacity', 0.15)
    .attr('width', 200)
    .attr('height', 24)
    .on('click', function() {
      selection_mode = 'negative_select';
      switch_mode();
    });

  let deselect_rect = d3
    .select('svg')
    .append('rect')
    .attr('class', 'selection_option')
    .attr('x', svg_width - 177)
    .attr('y', 72)
    .attr('fill-opacity', 0.15)
    .attr('width', 200)
    .attr('height', 24)
    .on('click', function() {
      selection_mode = 'deselect';
      switch_mode();
    });

  let pos_select_count_rect = d3
    .select('svg')
    .append('rect')
    .attr('class', 'selection_option')
    .attr('x', svg_width)
    .attr('y', 103)
    .attr('fill-opacity', 0.25)
    .attr('width', 200)
    .attr('height', 24);

  let neg_select_count_rect = d3
    .select('svg')
    .append('rect')
    .attr('class', 'selection_option')
    .attr('x', svg_width)
    .attr('y', 127)
    .attr('fill-opacity', 0.25)
    .attr('width', 200)
    .attr('height', 24);

  let switch_div = d3
    .select('#force_layout')
    .append('div')
    .attr('id', 'selection_switch_div')
    .style('position', 'absolute')
    .style('top', '35px')
    .style('right', '0px')
    .style('width', '20px')
    .style('height', '30px')
    .on('click', switch_pos_neg)
    .append('img')
    .attr('src', 'stuff/switch_arrow.png')
    .style('height', '100%')
    .style('width', '8px')
    .style('margin-left', '8px');

  d3.select('svg')
    .append('text')
    .attr('pointer-events', 'none')
    .attr('class', 'selection_option')
    .attr('x', svg_width - 167)
    .attr('y', 16)
    .attr('font-family', 'sans-serif')
    .attr('font-size', '12px')
    .attr('fill', 'white')
    .text('Drag/pan/zoom');
  d3.select('svg')
    .append('text')
    .attr('pointer-events', 'none')
    .attr('class', 'selection_option')
    .attr('x', svg_width - 167)
    .attr('y', 40)
    .attr('font-family', 'sans-serif')
    .attr('font-size', '12px')
    .attr('fill', 'yellow')
    .text('Positive select (shift)');
  d3.select('svg')
    .append('text')
    .attr('pointer-events', 'none')
    .attr('class', 'selection_option')
    .attr('x', svg_width - 167)
    .attr('y', 64)
    .attr('font-family', 'sans-serif')
    .attr('font-size', '12px')
    .attr('fill', 'blue')
    .text('Negative select (Shift+Esc)');
  d3.select('svg')
    .append('text')
    .attr('pointer-events', 'none')
    .attr('class', 'selection_option')
    .attr('x', svg_width - 167)
    .attr('y', 88)
    .attr('font-family', 'sans-serif')
    .attr('font-size', '12px')
    .attr('fill', 'white')
    .text('Deselect (command)');
  let pos_select_count_text = d3
    .select('svg')
    .append('text')
    .attr('pointer-events', 'none')
    .attr('class', 'selection_option')
    .attr('x', svg_width)
    .attr('y', 119)
    .attr('font-family', 'sans-serif')
    .attr('font-size', '12px')
    .attr('fill', 'yellow')
    .text('0 cells selected');
  let neg_select_count_text = d3
    .select('svg')
    .append('text')
    .attr('pointer-events', 'none')
    .attr('class', 'selection_option')
    .attr('x', svg_width)
    .attr('y', 143)
    .attr('font-family', 'sans-serif')
    .attr('font-size', '12px')
    .attr('fill', 'blue')
    .text('0 cells selected');

  function switch_pos_neg() {
    let pos_cells = [];
    let neg_cells = [];
    for (let i = 0; i < all_outlines.length; i++) {
      if (all_outlines[i].selected) {
        pos_cells.push(i);
      }
      if (all_outlines[i].compared) {
        neg_cells.push(i);
      }
    }
    for (let i = 0; i < neg_cells.length; i++) {
      all_outlines[neg_cells[i]].tint = '0xffff00';
      all_outlines[neg_cells[i]].selected = true;
      all_outlines[neg_cells[i]].compared = false;
    }
    for (let i = 0; i < pos_cells.length; i++) {
      all_outlines[pos_cells[i]].tint = '0x0000ff';
      all_outlines[pos_cells[i]].compared = true;
      all_outlines[pos_cells[i]].selected = false;
    }
  }

  function switch_mode() {
    drag_pan_zoom_rect.transition(5).attr('fill-opacity', selection_mode === 'drag_pan_zoom' ? 0.5 : 0.15);
    positive_select_rect.transition(5).attr('fill-opacity', selection_mode === 'positive_select' ? 0.5 : 0.15);
    negative_select_rect.transition(5).attr('fill-opacity', selection_mode === 'negative_select' ? 0.5 : 0.15);
    deselect_rect.transition(5).attr('fill-opacity', selection_mode === 'deselect' ? 0.5 : 0.15);
    if (selection_mode !== 'drag_pan_zoom') {
      d3.select('#svg_graph')
        .call(zoomer)
        .on('mousedown.zoom', null)
        .on('touchstart.zoom', null)
        .on('touchmove.zoom', null)
        .on('touchend.zoom', null);

      brush.select('.background').style('cursor', 'crosshair');
      brush.call(brusher);
    }
    if (selection_mode === 'drag_pan_zoom') {
      brush
        .call(brusher)
        .on('mousedown.brush', null)
        .on('touchstart.brush', null)
        .on('touchmove.brush', null)
        .on('touchend.brush', null);
      brush.select('.background').style('cursor', 'auto');
      d3.select('#svg_graph').call(zoomer);
    }
  }

  function keydown() {
    let shiftKey = d3.event.shiftKey;
    let metaKey = d3.event.metaKey; // command key on a mac
    let keyCode = d3.event.keyCode;

    if (shiftKey && keyCode !== 27) {
      selection_mode = 'positive_select';
    }
    if (shiftKey && keyCode === 27) {
      selection_mode = 'negative_select';
    }
    if (metaKey) {
      selection_mode = 'deselect';
    }
    switch_mode();
  }

  function keyup() {
    let shiftKey = d3.event.shiftKey || d3.event.metaKey;
    let ctrlKey = d3.event.ctrlKey;
    let keyCode = 0;
    selection_mode = 'drag_pan_zoom';
    switch_mode();
  }

  d3.select('body')
    .on('keydown', keydown)
    .on('keyup', keyup);

  let base_radius = parseInt(d3.select('#settings_range_node_size').attr('value'), 10) / 100;
  let large_radius = base_radius * 3;

  // const xBrushExtent = d3.brushX().extent(xScale)
  // const yBrushExtent = d3.brushY().extent(yScale);

  let brusher = d3
    .brush()
    // .extent([xBrushExtent, yBrushExtent])
    .on('brush', function() {
      let extent = d3.selectAll('.brush .extent')[0][0].getBoundingClientRect();
      for (let i = 0; i < all_nodes.length; i++) {
        let d = all_nodes[i];
        let dim = document.getElementById('svg_graph').getBoundingClientRect();
        let x = d.x * sprites.scale.x + dim.left;
        let y = d.y * sprites.scale.y + dim.top;
        x = x + sprites.position.x;
        y = y + sprites.position.y;

        let inrect = extent.left <= x && x < extent.right && extent.top <= y && y < extent.bottom;
        let o = all_outlines[i];
        if (selection_mode === 'positive_select' || selection_mode === 'negative_select') {
          o.selected = (o.selected && !o.compared) || (selection_mode === 'positive_select' && inrect);
          o.compared = (o.compared && !o.selected) || (selection_mode === 'negative_select' && inrect);
        }
        if (selection_mode === 'deselect') {
          o.selected = o.selected && !inrect;
          o.compared = o.compared && !inrect;
        }
        if (o.selected) {
          o.alpha = all_nodes[i].alpha;
          o.tint = '0xffff00';
        }
        if (o.compared) {
          o.alpha = all_nodes[i].alpha;
          o.tint = '0x0000ff';
        }
        if (o.selected || o.compared) {
          // 				all_outlines[i].scale.set(large_radius);
          // 				all_nodes[i].scale.set(large_radius);
        } else {
          o.alpha = 0;
          // 				all_outlines[i].scale.set(base_radius);
          // 				all_nodes[i].scale.set(base_radius);
        }
      }
      update_selected_count();
      count_clusters();
    })
    .on('end', function() {
      d3.event.target.clear();
      d3.select(this).call(d3.event.target);
      let selected = [];
      for (let i in all_outlines) {
        if (all_outlines.selected) {
          selected.push(i);
        }
      }
      if (selected.length === 0) {
        rotation_hide();
      }
    });

  brush = d3
    .select('#svg_graph')
    .append('g')
    .datum(function() {
      return { selected: false };
    })
    .attr('class', 'brush');

  brush
    .call(brusher)
    .on('mousedown.brush', null)
    .on('touchstart.brush', null)
    .on('touchmove.brush', null)
    .on('touchend.brush', null);

  brush.select('.background').style('cursor', 'auto');

  // "(De)select All" button
  d3.select('#deselect')
    .select('button')
    .on('click', deselect_all);
  let pos_count_extended = false;
  let neg_count_extended = false;

  const update_selected_count = () => {
    let num_selected = 0;
    let num_compared = 0;
    for (let i = 0; i < all_nodes.length; i++) {
      if (all_outlines[i].selected) {
        num_selected += 1;
      }
      if (all_outlines[i].compared) {
        num_compared += 1;
      }
    }
    if (num_selected === 0 && pos_count_extended) {
      pos_count_extended = false;
      if (!neg_count_extended) {
        pos_select_count_rect.transition(500).attr('x', svg_width);
        pos_select_count_text
          .transition(500)
          .attr('x', svg_width)
          .each('end', extend_edge_toggle);
      } else {
        pos_select_count_rect.transition(500).attr('x', svg_width);
        pos_select_count_text.transition(500).attr('x', svg_width);
      }
    }
    if (num_selected !== 0) {
      if (!pos_count_extended) {
        pos_count_extended = true;
        if (!neg_count_extended) {
          retract_edge_toggle(function() {
            pos_select_count_rect.transition(500).attr('x', svg_width - 177);
            pos_select_count_text.transition(500).attr('x', svg_width - 167);
          });
        } else {
          pos_select_count_rect.transition(500).attr('x', svg_width - 177);
          pos_select_count_text.transition(500).attr('x', svg_width - 167);
        }
      }
      let pct = Math.floor((num_selected / all_nodes.length) * 100);
      pos_select_count_text.text(num_selected.toString() + ' cells selected   (' + pct.toString() + '%)');
    }
    if (num_compared === 0 && neg_count_extended) {
      neg_count_extended = false;
      if (!pos_count_extended) {
        neg_select_count_rect.transition(500).attr('x', svg_width);
        neg_select_count_text
          .transition(500)
          .attr('x', svg_width)
          .each('end', extend_edge_toggle);
      } else {
        neg_select_count_rect.transition(500).attr('x', svg_width);
        neg_select_count_text.transition(500).attr('x', svg_width);
      }
    }
    if (num_compared !== 0) {
      if (!neg_count_extended) {
        neg_count_extended = true;
        if (!pos_count_extended) {
          retract_edge_toggle(function() {
            neg_select_count_rect.transition(500).attr('x', svg_width - 177);
            neg_select_count_text.transition(500).attr('x', svg_width - 167);
          });
        } else {
          neg_select_count_rect.transition(500).attr('x', svg_width - 177);
          neg_select_count_text.transition(500).attr('x', svg_width - 167);
        }
      }
      let newPct = Math.floor((num_compared / all_nodes.length) * 100);
      neg_select_count_text.text(num_compared.toString() + ' cells selected   (' + newPct.toString() + '%)');
    }
  };

  function extend_edge_toggle() {
    d3.select('#edge_toggle_image')
      .transition(400)
      .attr('x', svg_width - 77);
    d3.select('#show_edges_rect')
      .transition(400)
      .attr('x', svg_width - 177);
    d3.select('#edge_text')
      .selectAll('tspan')
      .transition(400)
      .attr('x', svg_width - 167);
  }

  function retract_edge_toggle(callback) {
    d3.select('#edge_toggle_image')
      .transition(400)
      .attr('x', svg_width);
    d3.select('#show_edges_rect')
      .transition(400)
      .attr('x', svg_width);
    d3.select('#edge_text')
      .selectAll('tspan')
      .transition(400)
      .attr('x', svg_width)
      .each('end', callback);
  }
}

export const deselect_all = () => {
  any_selected = false;
  for (let i = 0; i < all_nodes.length; i++) {
    if (all_outlines[i].selected) {
      any_selected = true;
    }
    if (all_outlines[i].compared) {
      any_selected = true;
    }
  }
  if (any_selected) {
    rotation_hide();
    for (let i = 0; i < all_nodes.length; i++) {
      all_outlines[i].alpha = 0;
      all_outlines[i].selected = false;
      all_outlines[i].compared = false;

      // 				all_nodes[i].scale.set(base_radius);
      // 				all_outlines[i].scale.set(base_radius);
    }
  }
  if (!any_selected) {
    for (let i = 0; i < all_nodes.length; i++) {
      all_outlines[i].alpha = all_nodes[i].alpha;
      all_outlines[i].tint = '0xffff00';
      all_outlines[i].selected = true;
      // 				all_outlines[i].scale.set(large_radius);
      // 				all_nodes[i].scale.set(large_radius);
    }
  }
  count_clusters();
  update_selected_count();
}

export const loadSelectedCells = (project_directory) => {
  // load selected cells if it exists
  selection_filename = project_directory + '/selected_cells.txt';
  new_selection = [];
  d3.text(selection_filename).then(text => {
    text.split('\n').forEach(function(entry, index, array) {
      if (entry !== '') {
        new_selection.push(parseInt(entry, 10));
      }
    });
    d3.selectAll('.node circle').classed('selected', function(d) {
      if (new_selection.includes(d.name)) {
        d.selected = true;
        return true;
      }
    });
  });
}

export const extend_selection = () => {
  for (let i = 0; i < all_nodes.length; i++) {
    if (all_outlines[i].selected) {
      for (j in neighbors[i]) {
        let jj = neighbors[i][j];
        all_outlines[jj].alpha = all_nodes[i].alpha;
        all_outlines[jj].tint = '0xffff00';
        all_outlines[jj].selected = true;
      }
    }
  }
}
