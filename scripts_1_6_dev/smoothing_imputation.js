import * as d3 from 'd3';
import { forceLayout, colorBar, cloneViewer, graph_directory, sub_directory } from './main';

export const imputation_setup =  () => {
  let popup = d3
    .select('#force_layout')
    .append('div')
    .attr('id', 'imputation_popup');

  let button_bar = popup
    .append('div')
    .attr('id', 'imputation_button_bar')
    .on('mousedown', function() {
      d3.event.stopPropagation();
    });

  button_bar
    .append('label')
    .text('N = ')
    .append('input')
    .attr('id', 'imputation_N_input')
    .property('value', 10);
  button_bar
    .append('label')
    .text('\u03B2 = ')
    .append('input')
    .attr('id', 'imputation_beta_input')
    .property('value', 0.1);
  button_bar
    .append('button')
    .text('Restore')
    .on('click', restore_colors);
  button_bar
    .append('button')
    .text('Smooth')
    .on('click', perform_smoothing);
  button_bar
    .append('button')
    .text('Close')
    .on('click', hide_imputation_popup);

  let text_box = popup
    .append('div')
    .attr('id', 'imputation_description')
    .append('text')
    .text('Smooth gene expression on the graph. Increase N or decrease 	\u03B2 to enhance the degree of smoothing.');

  d3.select('#imputation_popup').call(
    d3.drag()
      .on('start', imputation_popup_dragstarted)
      .on('drag', imputation_popup_dragged)
      .on('end', imputation_popup_dragended),
  );

  function imputation_popup_dragstarted() {
    d3.event.sourceEvent.stopPropagation();
  }
  function imputation_popup_dragged() {
    let cx = parseFloat(
      d3
        .select('#imputation_popup')
        .style('left')
        .split('px')[0],
    );
    let cy = parseFloat(
      d3
        .select('#imputation_popup')
        .style('top')
        .split('px')[0],
    );
    d3.select('#imputation_popup').style('left', (cx + d3.event.dx).toString() + 'px');
    d3.select('#imputation_popup').style('top', (cy + d3.event.dy).toString() + 'px');
  }
  function imputation_popup_dragended() {
    return;
  }

  function show_waiting_wheel() {
    popup.append('div').attr('id', 'wheel_mask');
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
    let target = document.getElementById('wheel_mask');
    let spinner = new Spinner(opts).spin(target);
    $(target).data('spinner', spinner);
  }

  function restore_colors() {
    colorBar.setNodeColors();
  }

  function hide_waiting_wheel() {
    $('.spinner').remove();
    $('#wheel_mask').remove();
  }

  function perform_smoothing() {
    if (true) {
      let t0 = new Date();
      //update_slider();
      let beta = $('#imputation_beta_input').val();
      let N = $('#imputation_N_input').val();

      let all_r = '';
      let all_g = '';
      let all_b = '';
      let sel = '';
      let sel_nodes = [];
      for (let i = 0; i < forceLayout.all_outlines.length; i++) {
        let col = {};
        if (forceLayout.all_nodes[i].tint === '0x000000' && cloneViewer.clone_nodes[i] === undefined) {
          col = { r: 0, b: 0, g: 0 };
        } else {
          col = forceLayout.base_colors[i];
        }
        if (forceLayout.all_outlines[i].selected) {
          sel = sel + ',' + i.toString();
          sel_nodes.push(i);
        }
        all_r = all_r + ',' + col.r.toString();
        all_g = all_g + ',' + col.g.toString();
        all_b = all_b + ',' + col.b.toString();
      }
      all_r = all_r.slice(1, all_r.length);
      all_g = all_g.slice(1, all_g.length);
      all_b = all_b.slice(1, all_b.length);
      sel = '#' + sel.slice(1, sel.length);

      show_waiting_wheel();
      console.log(sel);
      $.ajax({
        data: {
          base_dir: graph_directory,
          beta: beta,
          n_rounds: N,
          raw_b: all_b,
          raw_g: all_g,
          raw_r: all_r,
          selected: sel,
          sub_dir: graph_directory + '/' + sub_directory,
        },
        //data: {base_dir:graph_directory, sub_dir:graph_directory+'/'+sub_directory, beta:beta, n_rounds:N, raw_g:green_string},
        success: function(data) {
          let t1 = new Date();
          console.log('Smoothed the data: ', t1.getTime() - t0.getTime());
          let datasplit = data.split('|');
          let new_min = parseFloat(datasplit[0]) - 0.02;
          let new_max = parseFloat(datasplit[1]);

          let current_min = 0;
          let current_max = 0;
          
          if (document.getElementById('channels_button').checked) {
            current_min = 0;
            current_max = parseFloat(d3.max(forceLayout.green_array));
          } else {
            current_max = parseFloat(d3.max(forceLayout.base_colors.map(forceLayout.max_color)));
            current_min = parseFloat(d3.min(forceLayout.base_colors.map(forceLayout.min_color)));
          }

          function nrm(x) {
            return ((parseFloat(x) - new_min + current_min) / (new_max - new_min + 0.01)) * (current_max - current_min);
          }

          let spl = datasplit[2].split(';');
          let reds = spl[0].split(',').map(nrm);
          let greens = spl[1].split(',').map(nrm);
          let blues = spl[2].split(',').map(nrm);

          if (document.getElementById('channels_button').checked) {
            forceLayout.green_array = greens;
            greens = greens.map(x => forceLayout.normalize_one_val(x));
          }

          if (sel_nodes.length === 0) {
            for (let i = 0; i < forceLayout.all_nodes.length; i++) {
              forceLayout.base_colors[i] = { r: Math.floor(reds[i]), g: Math.floor(greens[i]), b: Math.floor(blues[i]) };
            }
          } else {
            for (let i = 0; i < sel_nodes.length; i++) {
              forceLayout.base_colors[sel_nodes[i]] = { r: Math.floor(reds[i]), g: Math.floor(greens[i]), b: Math.floor(blues[i]) };
            }
          }

          colorBar.updateColorMax();
          hide_waiting_wheel();

          forceLayout.app.stage.children[1].children.sort(function(a, b) {
            return colorBar.average_color(forceLayout.base_colors[a.index]) - colorBar.average_color(forceLayout.base_colors[b.index]);
          });
        },
        type: 'POST',
        url: 'cgi-bin/smooth_gene.py',
      });
    }
  }
}

export const show_imputation_popup = () => {
  let mywidth = parseInt(
    d3
      .select('#imputation_popup')
      .style('width')
      .split('px')[0],
    10,
  );
  let svg_width = parseInt(
    d3
      .select('svg')
      .style('width')
      .split('px')[0],
    10,
  );
  d3.select('#imputation_popup')
    .style('left', (svg_width / 2 - mywidth / 2).toString() + 'px')
    .style('top', '80px')
    .style('visibility', 'visible');
}

export const hide_imputation_popup = () => {
  d3.select('#imputation_popup').style('visibility', 'hidden');
}
