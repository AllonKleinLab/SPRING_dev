import * as d3 from 'd3';

import { forceLayout, selectionScript } from './main';

export const rotation_update = () => {
  let selected = [];
  let stash_i = forceLayout.stashed_coordinates.length;
  forceLayout.stashed_coordinates.push({});
  for (let i in forceLayout.all_nodes) {
    if (forceLayout.all_outlines[i].selected) {
      selected.push(i);
    }
    forceLayout.stashed_coordinates[stash_i][i] = [forceLayout.all_nodes[i].x, forceLayout.all_nodes[i].y];
  }
  if (selected.length === 0) {
    selectionScript.deselect_all();
    selected = d3.range(0, forceLayout.all_nodes.length);
  }
  let real_scale = 1;

  const vis = d3.select('#vis');
  vis.attr(
    'transform',
    'translate(' + [forceLayout.sprites.x, forceLayout.sprites.y] + ')' + ' scale(' + forceLayout.sprites.scale.x + ')',
  );
  vis.append('circle').attr('id', 'rotation_outer_circ');
  vis.append('circle').attr('id', 'rotation_inner_circ');
  vis.append('circle').attr('id', 'rotation_pivot');

  rotation_show();
  d3.select('#rotation_pivot').style('opacity', 1);

  let all_xs = [];
  let all_ys = [];
  for (let i in forceLayout.all_nodes) {
    if (forceLayout.all_outlines[i].selected) {
      all_xs.push(forceLayout.all_nodes[i].x);
      all_ys.push(forceLayout.all_nodes[i].y);
    }
  }
  let cx = d3.sum(all_xs) / all_xs.length;
  let cy = d3.sum(all_ys) / all_ys.length;
  let dels = [];
  for (let i = 0; i < all_xs.length; i++) {
    dels.push(Math.sqrt(Math.pow(all_xs[i] - cx, 2) + Math.pow(all_ys[i] - cy, 2)));
  }
  let rotator_radius = d3.median(dels) * 1.5;

  const zoomScale = d3.zoomTransform(vis.node()).k;

  d3.select('#rotation_pivot')
    .attr('r', d3.min([13 / zoomScale, (rotator_radius + 30) / 3]))
    .style('stroke-width', d3.min([3 / zoomScale, 10]))
    .style('cx', cx)
    .style('cy', cy);
  d3.select('#rotation_outer_circ')
    .attr('r', rotator_radius + 30 + 12 / zoomScale)
    .style('cx', cx)
    .style('cy', cy)
    .style('stroke-width', 18 / zoomScale);
  d3.select('#rotation_inner_circ')
    .attr('r', rotator_radius + 30)
    .style('cx', cx)
    .style('cy', cy)
    .style('stroke-width', 6 / zoomScale);

  d3.select('#rotation_outer_circ')
    .on('mouseover', () => {
      d3.select('#rotation_outer_circ').style('opacity', 0.5);
    })
    .on('mouseout', () => {
      d3.select('#rotation_outer_circ').style('opacity', 0);
    });

  d3.select('#rotation_pivot').call(
    d3
      .drag()
      .on('start', pivot_dragstarted)
      .on('drag', pivot_dragged)
      .on('end', pivot_dragended),
  );

  d3.select('#rotation_outer_circ').call(
    d3
      .drag()
      .on('start', handle_dragstarted)
      .on('drag', handle_dragged)
      .on('end', handle_dragended),
  );

  function pivot_dragstarted() {
    d3.event.sourceEvent.stopPropagation();
  }

  function pivot_dragged() {
    let cxFromD3 = parseFloat(
      d3
        .select('#rotation_pivot')
        .style('cx')
        .split('px')[0],
    );
    let cyFromD3 = parseFloat(
      d3
        .select('#rotation_pivot')
        .style('cy')
        .split('px')[0],
    );
    d3.select('#rotation_pivot').style('cx', cxFromD3 + d3.event.dx);
    d3.select('#rotation_pivot').style('cy', cyFromD3 + d3.event.dy);
    d3.select('#rotation_inner_circ').style('cx', cxFromD3 + d3.event.dx);
    d3.select('#rotation_inner_circ').style('cy', cyFromD3 + d3.event.dy);
    d3.select('#rotation_outer_circ').style('cx', cxFromD3 + d3.event.dx);
    d3.select('#rotation_outer_circ').style('cy', cyFromD3 + d3.event.dy);
  }

  function pivot_dragended() {
    return;
  }

  function handle_dragstarted() {
    d3.event.sourceEvent.stopPropagation();
    d3.select('#rotation_outer_circ').style('opacity', 0.5);
    real_scale = 1;
  }

  function handle_dragged() {
    let cxFromD3 = parseFloat(
      d3
        .select('#rotation_pivot')
        .style('cx')
        .split('px')[0],
    );
    let cyFromD3 = parseFloat(
      d3
        .select('#rotation_pivot')
        .style('cy')
        .split('px')[0],
    );

    let r1 = Math.atan((d3.event.y - cyFromD3) / (d3.event.x - cxFromD3));
    let r2 = Math.atan((d3.event.y + d3.event.dy - cyFromD3) / (d3.event.x + d3.event.dx - cxFromD3));
    let rot = r1 - r2;
    if (r1 - r2 > 1.4) {
      rot += 3.141592653;
    }

    let d1 = Math.sqrt((d3.event.y - cyFromD3) ** 2 + (d3.event.x - cxFromD3) ** 2);
    let d2 = Math.sqrt((d3.event.y + d3.event.dy - cyFromD3) ** 2 + (d3.event.x + d3.event.dx - cxFromD3) ** 2);
    real_scale = (real_scale * d2) / d1;
    let scale = 0;
    if (Math.abs(real_scale - 1) > 0.5) {
      scale = d2 / d1;
    } else {
      scale = 1;
    }

    if (Math.abs(rot) < 1) {
      for (let i in forceLayout.all_outlines) {
        if (forceLayout.all_outlines[i].selected) {
          let d = forceLayout.all_nodes[i];
          let dx = d.x - cxFromD3;
          let dy = d.y - cyFromD3;
          let brad = Math.sqrt(dx * dx + dy * dy);
          let ddx = Math.cos(rot) * dx + Math.sin(rot) * dy;
          let ddy = -Math.sin(rot) * dx + Math.cos(rot) * dy;
          let arad = Math.sqrt(ddx * ddx + ddy * ddy);
          forceLayout.move_node(i, cxFromD3 + ddx * scale, cyFromD3 + ddy * scale);
        }
      }
      forceLayout.adjust_edges();
    }
  }

  function handle_dragended() {
    d3.select('#rotation_outer_circ').style('opacity', 0);
  }
};

export const rotation_show = () => {
  d3.select('#rotation_outer_circ').style('visibility', 'visible');
  d3.select('#rotation_inner_circ').style('visibility', 'visible');
  d3.select('#rotation_pivot').style('visibility', 'visible');
};

export const rotation_hide = () => {
  d3.select('#rotation_outer_circ').style('visibility', 'hidden');
  d3.select('#rotation_inner_circ').style('visibility', 'hidden');
  d3.select('#rotation_pivot').style('visibility', 'hidden');
};
