import * as d3 from 'd3';
import * as Spinner from 'spinner';

import { colorBar } from './main';

export const diffex_setup = () => {
  let scatter_zoom = 0.2;
  let scatter_size = 4;
  let scatter_jitter = 0;

  let scatter_data = null;
  let scatter_x = null;
  let scatter_y = null;
  let scatter_xAxis = null;
  let scatter_yAxis = null;
  let gene_list = null;

  d3.select('#diffex_panel').attr('class', 'bottom_tab');
  d3.select('#diffex_header')
    .append('div')
    .attr('id', 'diffex_closeopen')
    .append('button')
    .text('Open')
    .on('click', () => {
      if (d3.select('#diffex_panel').style('height') === '50px') {
        open_diffex();
      } else {
        close_diffex();
      }
    });

  d3.select('#diffex_header')
    .append('div')
    .attr('id', 'diffex_title')
    .append('text')
    .text('Differential expression');

  d3.select('#diffex_header')
    .append('div')
    .attr('id', 'diffex_refresh_button')
    .append('button')
    .text('Refresh cluster selection')
    .on('click', refresh_selected_clusters);

  make_diffex_spinner('diffex_infobox');

  d3.select('#diffex_size_slider').on('input', () => {
    scatter_size = this.value / 15;
    quick_scatter_update();
  });

  d3.select('#diffex_jitter_slider').on('input', () => {
    scatter_jitter = parseFloat(this.value) / 50;
    quick_scatter_update();
  });

  d3.select('#diffex_zoom_slider').on('input', () => {
    scatter_zoom = 5 / (parseFloat(this.value) + 5);
    quick_scatter_update();
  });

  //open_diffex();

  function open_diffex() {
    gene_list = Object.keys(colorBar.all_gene_color_array);
    d3.selectAll('#diffex_panel').style('z-index', '4');
    setTimeout(() => {
      d3.select('#diffex_refresh_button').style('visibility', 'visible');
      d3.select('#diffex_panel')
        .selectAll('svg')
        .style('visibility', 'visible');
      d3.selectAll('.diffex_legend').style('visibility', 'visible');
      d3.select('#diffex_settings_box').style('visibility', 'visible');
    }, 200);
    setTimeout(() => {
      if (
        d3
          .select('#diffex_panel')
          .select('svg')
          .node() == null
      ) {
        refresh_selected_clusters();
      }
    }, 500);
    d3.select('#diffex_closeopen')
      .select('button')
      .text('Close');
    d3.select('#diffex_panel')
      .transition()
      .duration(500)
      .style('height', '380px')
      .style('width', '900px')
      .style('bottom', '5px');
  }

  function close_diffex() {
    d3.select('#diffex_closeopen')
      .select('button')
      .text('Open');
    d3.select('#diffex_refresh_button').style('visibility', 'hidden');
    d3.select('#diffex_panel')
      .selectAll('svg')
      .style('visibility', 'hidden');
    d3.selectAll('.diffex_legend').style('visibility', 'hidden');
    d3.select('#diffex_settings_box').style('visibility', 'hidden');
    d3.select('#diffex_infobox').style('visibility', 'hidden');
    d3.select('#diffex_panel')
      .transition()
      .duration(500)
      .style('height', '50px')
      .style('width', '280px')
      .style('bottom', '106px');

    setTimeout(() => {
      d3.selectAll('#diffex_panel').style('z-index', '1');
    }, 500);
  }

  function refresh_selected_clusters() {
    d3.select('#diffex_infobox').style('visibility', 'visible');
    d3.select('#diffex_infobox')
      .select('text')
      .remove();
    d3.select('#diffex_panel')
      .selectAll('svg')
      .remove();
    d3.selectAll('.diffex_legend')
      .selectAll('div')
      .remove();

    let n_sel = d3.selectAll('.selected')[0].length;
    let n_com = d3.selectAll('.compared')[0].length;
    if (n_sel === 0 && n_com === 0) {
      d3.select('#diffex_infobox')
        .append('text')
        .text('No clusters selected');
    } else {
      setTimeout(() => {
        d3.select('.diffex_spinner').style('visibility', 'visible');
      }, 1);
      setTimeout(() => {
        make_diffex_legend();
        scatter_setup();
        d3.select('.diffex_spinner').style('visibility', 'hidden');
        d3.select('#diffex_infobox').style('visibility', 'hidden');
      }, 100);
    }
  }

  function scatter_setup() {
    let blue_selection = [];
    let yellow_selection = [];
    d3.selectAll('.selected').each(d => {
      yellow_selection.push(d.number);
    });
    d3.selectAll('.compared').each(d => {
      blue_selection.push(d.number);
    });

    let xx = [];
    let yy = [];
    gene_list.forEach(d => {
      xx.push(masked_average(colorBar.all_gene_color_array[d], blue_selection));
      yy.push(masked_average(colorBar.all_gene_color_array[d], yellow_selection));
    });

    scatter_data = [];
    xx.forEach(function(d, i) {
      if ((xx[i] === 0 && yy[i] !== 0) || (xx[i] !== 0 && yy[i] === 0) || xx[i] / yy[i] > 1.5 || yy[i] / xx[i] > 1.5) {
        scatter_data.push([
          xx[i],
          yy[i],
          ((Math.random() - 0.3) * d3.max(xx)) / 100,
          ((Math.random() - 0.3) * d3.max(yy)) / 100,
          gene_list[i],
        ]);
      }
    });

    const margin = { top: 15, right: 545, bottom: 130, left: 95 };
    const width = document.getElementById('diffex_panel').offsetWidth - margin.left - margin.right;
    const height = document.getElementById('diffex_panel').offsetHeight - margin.top - margin.bottom;

    scatter_x = d3
      .scaleLinear()
      .domain([
        0,
        d3.max(scatter_data, d => {
          return d[0] * scatter_zoom;
        }) + 0.02,
      ])
      .range([0, width]);

    scatter_y = d3
      .scaleLinear()
      .domain([
        0,
        d3.max(scatter_data, d => {
          return d[0] * scatter_zoom;
        }) + 0.02,
      ])
      .range([height, 0]);

    let chart = d3
      .select('#diffex_panel')
      .append('svg:svg')
      .attr('width', width + 108)
      .attr('height', height + margin.top + margin.bottom)
      .attr('class', 'chart');

    let main = chart
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
      .attr('width', width)
      .attr('height', height)
      .attr('class', 'main');

    // draw the x axis
    scatter_xAxis = d3.axisBottom(scatter_x);

    main
      .append('g')
      .attr('transform', 'translate(0,' + height + ')')
      .attr('class', 'scatter_axis')
      .attr('id', 'diffex_scatter_x_axis')
      .call(scatter_xAxis)
      .append('text')
      .attr('class', 'axis_label')
      .style('fill', 'blue')
      .attr('y', margin.bottom)
      .attr('x', width / 2)
      .style('font-size', '18px')
      .attr('dy', '-4.8em')
      .style('text-anchor', 'middle')
      .text('Negative selection (blue)');

    // draw the y axis
    scatter_yAxis = d3.axisLeft(scatter_y);

    main
      .append('g')
      .attr('transform', 'translate(0,0)')
      .attr('class', 'scatter_axis')
      .attr('id', 'diffex_scatter_y_axis')
      .call(scatter_yAxis)
      .append('text')
      .attr('class', 'axis_label')
      .style('fill', '#999900')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left)
      .attr('x', -height / 2)
      .style('font-size', '18px')
      .attr('dy', '2.6em')
      .style('text-anchor', 'middle')
      .text('Positive selection (yellow)');

    let g = main.append('svg:g');

    let mask_points =
      scatter_x(0).toString() +
      ',' +
      scatter_y(0).toString() +
      ' ' +
      scatter_x(100).toString() +
      ',' +
      scatter_y(150).toString() +
      ' ' +
      scatter_x(150).toString() +
      ',' +
      scatter_y(100).toString() +
      ' ' +
      scatter_x(0).toString() +
      ',' +
      scatter_y(0).toString();

    g.append('svg:polygon')
      .attr('id', 'diffex_scatter_mask')
      .style('fill', '#bdbdbd')
      .attr('points', mask_points);

    g.selectAll('.diffex-scatter-dots')
      .data(scatter_data)
      .enter()
      .append('svg:circle')
      .attr('class', 'diffex-scatter-dots')
      .attr('cx', (d, i) => {
        return scatter_x(d[0] + d[2] * scatter_jitter);
      })
      .attr('cy', d => {
        return scatter_y(d[1] + d[2] * scatter_jitter);
      })
      .attr('r', scatter_size);

    d3.selectAll('.diffex-scatter-dots')
      .on('mouseenter', d => {
        let selectedG = d[4];
        d3.select('#tooltip_gene_name')
          .select('text')
          .text(selectedG);
        d3.select('#tooltip').style('background-color', 'green');
        let ww = d3
          .select('#tooltip_gene_name')
          .node()
          .getBoundingClientRect().width;
        d3.select('#tooltip').style('width', (65 + ww).toString() + 'px');
        d3.select('#tooltip').style('visibility', 'visible');

        let rect = d3
          .select('body')
          .node()
          .getBoundingClientRect();
        d3.select('#tooltip')
          .style('bottom', rect.height - 5 - event.pageY + 'px')
          .style('right', rect.width - event.pageX + 20 + 'px');
        d3.select(this).attr('r', scatter_size * 3);
      })
      .on('mouseleave', () => {
        d3.select('#tooltip').style('visibility', 'hidden');
        d3.select(this).attr('r', scatter_size);
      })
      .on('click', d => {
        d3.select('#green_menu').node().value = d[4];
        colorBar.update_slider();
      });
  }

  function masked_average(vals, indexes) {
    if (indexes.length === 0) {
      return d3.sum(vals) / vals.length;
    } else {
      let out = 0;
      indexes.forEach(d => {
        out = out + vals[d];
      });
      return out / indexes.length;
    }
  }

  function quick_scatter_update() {
    scatter_x.domain([
      0,
      d3.max(scatter_data, d => {
        return d[0] * scatter_zoom;
      }) + 0.02,
    ]);
    scatter_y.domain([
      0,
      d3.max(scatter_data, d => {
        return d[0] * scatter_zoom;
      }) + 0.02,
    ]);
    d3.select('#diffex_scatter_x_axis').call(scatter_xAxis);
    d3.select('#diffex_scatter_y_axis').call(scatter_yAxis);

    d3.selectAll('.diffex-scatter-dots')
      .data(scatter_data)
      .enter()
      .append('svg:circle');
    d3.selectAll('.diffex-scatter-dots')
      .attr('cx', (d, i) => {
        return scatter_x(d[0] + d[2] * scatter_jitter);
      })
      .attr('cy', d => {
        return scatter_y(d[1] + d[3] * scatter_jitter);
      })
      .attr('r', scatter_size);
  }

  function make_diffex_legend() {
    let yellow_list = [];
    let blue_list = [];
    d3.selectAll('.selected').each(d => {
      yellow_list.push(d);
    });
    d3.selectAll('.compared').each(d => {
      blue_list.push(d);
    });

    if (yellow_list.length > 0) {
      d3.select('#diffex_legend_upper')
        .selectAll('.diffex_legend_row')
        .data(yellow_list)
        .enter()
        .append('div')
        .style('display', 'inline-block')
        .attr('class', 'diffex_legend_row')
        .style('height', '22px')
        .style('margin-top', '0px')
        .style('overflow', 'scroll')
        .style('background-color', 'yellow');
    } else {
      d3.select('#diffex_legend_upper')
        .append('div')
        .style('margin-top', '18px')
        .append('p')
        .text('All clusters');
    }

    if (blue_list.length > 0) {
      d3.select('#diffex_legend_lower')
        .selectAll('.diffex_legend_row')
        .data(blue_list)
        .enter()
        .append('div')
        .style('display', 'inline-block')
        .attr('class', 'diffex_legend_row')
        .style('height', '22px')
        .style('margin-top', '0px')
        .style('overflow', 'scroll')
        .style('background-color', '#9999ff');
    } else {
      d3.select('#diffex_legend_lower')
        .append('div')
        .style('margin-top', '18px')
        .append('p')
        .text('All clusters');
    }

    d3.selectAll('.diffex_legend_row')
      .append('div')
      .attr('class', 'diffex_text_label_div')
      .append('p')
      .text(d => {
        return d.name;
      })
      .style('float', 'left')
      .style('white-space', 'nowrap')
      .style('margin-top', '-6px')
      .style('margin-left', '3px');
  }
};

function make_diffex_spinner(element) {
  let opts = {
    className: 'diffex_spinner', // The CSS class to assign to the spinner
    color: 'gray', // #rgb or #rrggbb or array of colors
    corners: 1, // Corner roundness (0..1)
    direction: 1, // 1: clockwise, -1: counterclockwise
    fps: 20, // Frames per second when using setTimeout() as a fallback for CSS
    hwaccel: true, // Whether to use hardware acceleration
    left: '50%', // Left position relative to parent
    length: 50, // The length of each line
    lines: 17, // The number of lines to draw
    opacity: 0.15, // Opacity of the lines
    position: 'absolute', // Element positioning
    radius: 60, // The radius of the inner circle
    rotate: 8, // The rotation offset
    scale: 0.22, // Scales overall size of the spinner
    shadow: true, // Whether to render a shadow
    speed: 0.9, // Rounds per second
    top: '30%', // Top position relative to parent
    trail: 60, // Afterglow percentage
    width: 20, // The line thickness
    zIndex: 3000, // The z-index (defaults to 2000000000)
  };
  let target = document.getElementById(element);
  let spinner = new Spinner(opts).spin(target);
  $(target).data('spinner', spinner);
  d3.select('.diffex_spinner').style('visibility', 'hidden');
}
