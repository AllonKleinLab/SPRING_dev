import * as d3 from 'd3';
import * as html2canvas from 'html2canvas';

import { colorBar, forceLayout, sub_directory } from './main';
import { collapse_settings } from './settings_script';

export default class Cluster {
  /** @type Cluster */
  static _instance;

  static get instance() {
    if (!this._instance) {
      throw new Error('You must first call Cluster.create()!');
    }
    return this._instance;
  }

  static async create() {
    if (!this._instance) {
      this._instance = new Cluster();
      await this._instance.loadData();
      return this._instance;
    } else {
      throw new Error('Cluster.create() has already been called, get the existing instance with Cluster.instance!');
    }
  }

  constructor() {
    this.spectrum_dropdown = false;
    this.explain_dropdown = false;

    this.clustering_data = {};
    this.current_clus_name = '';
    this.last_clus_name = '';
    d3.select('#cluster_dropdown_button').on('click', this.showClusterDropdown);
    this.name = sub_directory;

    this.svg_width = parseInt(d3.select('svg').attr('width'), 10);
    d3.select('#create_cluster_box').call(
      d3
        .drag()
        .on('start', this.cluster_box_dragstarted)
        .on('drag', this.cluster_box_dragged)
        .on('end', this.cluster_box_dragended),
    );

    d3.select('#cluster_view_button').on('click', () => {
      this.current_clus_name = 'Cluster' + document.getElementById('enter_cluster_number').value;
      let N = parseInt(document.getElementById('enter_cluster_number').value, 10);
      let Nmax = Object.keys(this.clustering_data.clusters).length;
      if (N > Nmax || N < 1) {
        sweetAlert({
          animation: 'slide-from-top',
          title: 'The number of clusters must be between 1 and ' + Nmax.toString(),
        });
      } else {
        this.view_current_clusters();
      }
    });

    d3.select('#cluster_apply_button').on('click', () => {
      this.current_clus_name = 'Cluster' + document.getElementById('enter_cluster_number').value;
      let N = parseInt(document.getElementById('enter_cluster_number').value, 10);
      let Nmax = Object.keys(this.clustering_data.clusters).length;
      if (N > Nmax || N < 1) {
        alert('The number of clusters must be between 1 and ' + Nmax.toString());
      } else {
        this.view_current_clusters();
        if (d3.select('#update_cluster_labels_box').style('visibility') === 'visible') {
          this.show_update_cluster_labels_box();
        }
        this.last_clus_name = this.current_clus_name;
      }
      this.save_cluster_data();
    });

    d3.select('#cluster_close_button').on('click', () => {
      this.current_clus_name = this.last_clus_name;
      colorBar.categorical_coloring_data['Current clustering'] = this.clustering_data.clusters[this.current_clus_name];
      if (document.getElementById('labels_button').checked) {
        this.view_current_clusters();
      }
      if (d3.select('#update_cluster_labels_box').style('visibility') === 'visible') {
        this.show_update_cluster_labels_box();
      }
      this.hide_create_cluster_box();
      colorBar.categorical_coloring_data['Current clustering'] = this.clustering_data.clusters[this.current_clus_name];
    });

    d3.select('#enter_cluster_number').on('mousedown', () => {
      d3.event.stopPropagation();
    });

    d3.select('#cluster_help_choose_button').on('click', () => {
      this.toggle_spectrum();
    });

    d3.select('#cluster_explanation_button').on('click', () => {
      this.toggle_explain();
    });

    d3.select('#update_cluster_labels_box').call(
      d3
        .drag()
        .on('start', () => this.update_cluster_labels_box_dragstarted())
        .on('drag', () => this.update_cluster_labels_box_dragged())
        .on('end', () => this.update_cluster_labels_box_dragended()),
    );
  }
  // <-- Cluster Constructor End -->

  async loadData() {
    try {
      this.clustering_data = await d3.json('data/clustering_data/' + name + '_clustering_data.json');
      this.current_clus_name = this.clustering_data.Current_clustering;
      this.last_clus_name = this.current_clus_name;
    } catch (e) {
      console.log(e);
    }
  }

  cluster_box_dragstarted() {
    d3.event.sourceEvent.stopPropagation();
  }

  cluster_box_dragged() {
    let cx = parseFloat(
      d3
        .select('#create_cluster_box')
        .style('left')
        .split('px')[0],
    );
    let cy = parseFloat(
      d3
        .select('#create_cluster_box')
        .style('top')
        .split('px')[0],
    );
    d3.select('#create_cluster_box').style('left', (cx + d3.event.dx).toString() + 'px');
    d3.select('#create_cluster_box').style('top', (cy + d3.event.dy).toString() + 'px');
  }

  cluster_box_dragended() {
    return;
  }

  update_cluster_labels_box_dragstarted() {
    d3.event.sourceEvent.stopPropagation();
  }

  update_cluster_labels_box_dragged() {
    let cx = parseFloat(
      d3
        .select('#update_cluster_labels_box')
        .style('left')
        .split('px')[0],
    );
    let cy = parseFloat(
      d3
        .select('#update_cluster_labels_box')
        .style('top')
        .split('px')[0],
    );
    d3.select('#update_cluster_labels_box').style('left', (cx + d3.event.dx).toString() + 'px');
    d3.select('#update_cluster_labels_box').style('top', (cy + d3.event.dy).toString() + 'px');
  }

  update_cluster_labels_box_dragended() {
    return;
  }

  hide_create_cluster_box = () => {
    d3.select('#create_cluster_box').style('visibility', 'hidden');
  };

  show_create_cluster_box = () => {
    let mywidth = parseInt(
      d3
        .select('#create_cluster_box')
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
    d3.select('#create_cluster_box')
      .style('visibility', 'visible')
      .style('left', (svg_width / 2 - mywidth / 2).toString() + 'px')
      .style('top', '146px');
    document.getElementById('enter_cluster_number').value = this.current_clus_name.split('Cluster')[1];
  };

  showClusterDropdown() {
    if (d3.select('#cluster_dropdown').style('height') === 'auto') {
      forceLayout.closeDropdown();
      collapse_settings();
      setTimeout(() => {
        document.getElementById('cluster_dropdown').classList.toggle('show');
      }, 10);
    }
  }

  view_current_clusters() {
    colorBar.categorical_coloring_data['Current clustering'] = this.clustering_data.clusters[this.current_clus_name];
    if (d3.selectAll('#cluster_option')[0].length === 0) {
      d3.select('#labels_menu')
        .append('option')
        .attr('value', 'Current clustering')
        .attr('id', 'cluster_option')
        .text('Current_clustering');
    }
    d3.select('#labels_menu').property('value', 'Current clustering');

    document.getElementById('channels_button').checked = false;
    document.getElementById('gradient_button').checked = false;
    document.getElementById('labels_button').checked = true;
    let cat_color_map = this.clustering_data.clusters[this.current_clus_name].label_colors;
    let cat_label_list = this.clustering_data.clusters[this.current_clus_name].label_list;
    d3.select('#label_column')
      .selectAll('div')
      .remove();
    d3.select('#count_column')
      .selectAll('div')
      .remove();
    d3.select('#legend_mask')
      .transition()
      .attr('x', this.svg_width - 170)
      .each(() => {
        colorBar.make_legend(cat_color_map, cat_label_list);
        this.color_nodes(cat_color_map, cat_label_list);
      });
  }

  color_nodes(cat_color_map, cat_label_list) {
    d3.select('.node')
      .selectAll('circle')
      .style('fill', d => {
        return cat_color_map[cat_label_list[d.number]];
      });
  }

  make_new_clustering() {
    this.show_create_cluster_box();
  }

  toggle_spectrum() {
    if (this.explain_dropdown === true) {
      this.hide_explain();
      setTimeout(this.show_spectrum, 400);
    } else {
      if (this.spectrum_dropdown === true) {
        this.hide_spectrum();
      } else {
        this.show_spectrum();
      }
    }
  }

  show_spectrum() {
    console.log('showspec');
    // Set the dimensions of the canvas / graph
    const margin = { top: 30, right: 20, bottom: 55, left: 75 };
    const width = 648 - margin.left - margin.right;
    const height = 280 - margin.top - margin.bottom;

    // Set the ranges
    let x = d3.scaleLinear().range([0, width]);
    let y = d3.scaleLinear().range([height, 0]);

    // Define the axes
    let xAxis = d3.axisBottom(x).ticks(10);

    let yAxis = d3.axisLeft(y).ticks(5);

    // Define the line
    let valueline = d3
      .line()
      .x(d => {
        return x(d[0]);
      })
      .y(d => {
        return y(d[1]);
      });

    let argmax_line = d3
      .line()
      .x(d => {
        return x(d[0]);
      })
      .y(d => {
        return y(d[1]);
      });

    // Adds the svg canvas
    let svg = d3
      .select('#cluster_plot_window')
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .style('background-color', 'rgba(255,255,255,.82)')
      .style('margin-left', '30px')
      .style('margin-right', '30px')
      .style('margin-top', '10px')
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    // Get the data
    this.gap_data = [];
    this.clustering_data.spectral_info.gaps.forEach((val, i) => {
      let dd = Object();
      dd.y = val;
      dd.x = i + 1;
      this.gap_data.push(dd);
    });

    // Scale the range of the data
    let maxval = d3.max(this.gap_data, d => {
      return d.y;
    });
    x.domain(
      d3.extent(this.gap_data, d => {
        return d.x;
      }),
    );
    y.domain([0, maxval]);

    let argmax = this.clustering_data.spectral_info.argmax;
    svg
      .append('line')
      .attr('x1', x(argmax))
      .attr('y1', y(0))
      .attr('x2', x(argmax))
      .attr('y2', y(maxval))
      .attr('stroke', 'rgba(100,100,100,1)')
      .style('stroke-dasharray', 5)
      .style('stroke-width', '2px');

    // Add the valueline path.
    svg
      .append('path')
      .attr('class', 'line')
      .attr('d', valueline(this.gap_data));

    svg
      .append('path')
      .attr('class', 'dotted-line')
      .attr('d', valueline(this.gap_data));

    // Add the X Axis
    svg
      .append('g')
      .attr('class', 'x axis')
      .attr('transform', 'translate(0,' + height + ')')
      .call(xAxis);

    // Add the Y Axis
    svg
      .append('g')
      .attr('class', 'y axis')
      .call(yAxis);

    svg
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left + 8)
      .attr('x', 0 - height / 2)
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .text('Spectral gap');

    svg
      .append('text')
      .attr('transform', 'translate(' + width / 2 + ' ,' + (height + margin.top + 12) + ')')
      .style('text-anchor', 'middle')
      .text('Number of clusters');

    svg.selectAll('text').style('font', '14px sans-serif');

    let mywidth =
      parseInt(
        d3
          .select('#create_cluster_box')
          .style('width')
          .split('px')[0],
        10,
      ) - 54;
    d3.select('#cluster_text_window')
      .style('margin-left', '30px')
      .style('margin-top', '10px')
      .style('width', mywidth.toString() + 'px');

    let clusnum = this.clustering_data.spectral_info.argmax.toString();
    svg
      .append('text')
      .attr('transform', 'translate(' + (width - 105) + ' , 5)')
      .style('text-anchor', 'middle')
      .text('Suggested cluster number = ' + clusnum);

    d3.select('#cluster_text_window')
      .append('text')
      .style('font', '14px sans-serif')
      .style('color', 'white')
      .text(
        'The recommended number of clusters is ' +
          clusnum +
          ', because this is the first' +
          ' peak in the spectral gap. Spectral gap measures the difference in ' +
          'how much structure is captured by the current cluster number versus one ' +
          'additional cluster. So when the gap is large, that means not much is gained ' +
          'by further increasing the cluster number. This is similar to "elbow" methods ' +
          'for other other clustering approaches. For for information, click "Explanation' +
          ' of method" above.',
      );

    d3.select('#create_cluster_box')
      .transition()
      .duration(400)
      .style('height', '470px');

    this.spectrum_dropdown = true;
  }

  hide_spectrum() {
    d3.select('#create_cluster_box')
      .transition()
      .duration(400)
      .style('height', '52px')
      .each(() => {
        d3.select('#cluster_plot_window')
          .select('svg')
          .remove();
        d3.select('#cluster_text_window')
          .select('text')
          .remove();
      });
    this.spectrum_dropdown = false;
  }

  toggle_explain() {
    if (this.spectrum_dropdown === true) {
      this.hide_spectrum();
      setTimeout(this.show_explain, 400);
    } else {
      if (this.explain_dropdown === true) {
        this.hide_explain();
      } else {
        this.show_explain();
      }
    }
  }

  show_explain() {
    d3.select('#create_cluster_box')
      .transition()
      .duration(400)
      .style('height', '260px');

    let mywidth =
      parseInt(
        d3
          .select('#create_cluster_box')
          .style('width')
          .split('px')[0],
        10,
      ) - 54;
    d3.select('#cluster_text_window')
      .style('margin-left', '30px')
      .style('margin-top', '15px')
      .style('width', mywidth.toString() + 'px');

    d3.select('#cluster_text_window')
      .append('text')
      .style('font', '14px sans-serif')
      .style('color', 'white')
      .text(
        'Cells have been clustered using spectral clustering on the SPRING ' +
          'k-nearest-neighbor graph. Spectral clustering a technique where each cell ' +
          'is mapped to new "spectral" coordinates (based on its "position" in the graph' +
          ' and then a conventional clustering method (in our case, k-means) is applied' +
          ' in these new coordinates. For information, see the links below. There are' +
          ' are several letiants of spectral remapping distinguished by the method of' +
          ' normalization applied to the graph Laplacian. Here, we are using the "random-walk"' +
          ' normalization.',
      );

    d3.select('#cluster_text_window')
      .append('div')
      .attr('class', 'explain_link')
      .style('margin-top', '15px')
      .append('a')
      .attr('target', '_blank')
      .style('color', 'white')
      .attr('href', 'https://en.wikipedia.org/wiki/Spectral_clustering')
      .append('text')
      .text('Wikipedia article on spectral clustering')
      .style('font', '14px sans-serif');

    d3.select('#cluster_text_window')
      .append('div')
      .attr('class', 'explain_link')
      .style('margin-top', '8px')
      .append('a')
      .attr('target', '_blank')
      .style('color', 'white')
      .attr('href', 'http://www.cs.cmu.edu/~aarti/Class/10701/readings/Luxburg06_TR.pdf')
      .append('text')
      .text('A tutorial on spectral clustering (Luxburg, 2006)')
      .style('font', '14px sans-serif');
    this.explain_dropdown = true;
  }

  hide_explain() {
    d3.select('#create_cluster_box')
      .transition()
      .duration(400)
      .style('height', '52px')
      .each(() => {
        d3.selectAll('.explain_link').remove();
        d3.select('#cluster_text_window')
          .select('text')
          .remove();
      });
    this.explain_dropdown = false;
  }

  show_update_cluster_labels_box() {
    if (d3.select('#update_cluster_labels_box').style('visibility') === 'hidden') {
      d3.select('#download_legend_button').on('click', this.download_legend_image);
      d3.select('#apply_legend_button').on('click', this.apply_legend);
      d3.select('#close_cluster_label_button').on('click', this.hide_update_cluster_labels_box);

      let mywidth = parseInt(
        d3
          .select('#update_cluster_labels_box')
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
      d3.select('#update_cluster_labels_box')
        .style('visibility', 'visible')
        .style('left', (svg_width / 2 - mywidth / 2).toString() + 'px')
        .style('top', '220px');
    }

    d3.select('#update_cluster_labels_box')
      .selectAll('g')
      .remove();
    d3.select('#update_cluster_labels_box')
      .selectAll('g')
      .data(Object.keys(this.clustering_data.clusters[this.current_clus_name].label_colors))
      .enter()
      .append('g')
      .append('div')
      .attr('class', 'cluster_label_row');

    d3.selectAll('.cluster_label_row').each(function(d) {
      d3.select(this)
        .append('div')
        .attr('class', 'cluster_swatch')
        .style('background-color', this.clustering_data.clusters[this.current_clus_name].label_colors[d]);
      d3.select(this)
        .append('div')
        .style('margin-left', '35px')
        .style('margin-top', '8px')
        .attr('pointer-events', 'none')
        .append('form')
        .attr('onSubmit', 'return false')
        .append('input')
        .attr('class', 'cluster_name_input')
        .attr('type', 'text')
        .attr('value', d)
        .on('mousedown', () => {
          d3.event.stopPropagation();
        });
    });
  }

  hide_update_cluster_labels_box() {
    d3.select('#update_cluster_labels_box').style('visibility', 'hidden');
  }

  apply_legend() {
    this.new_clus = Object();
    this.new_colors = Object();
    this.new_labels = [];
    this.new_names = [];
    this.mapping = Object();
    this.new_name_set = new Set();

    d3.selectAll('.cluster_label_row').each(d => {
      let newname = d3
        .select(d)
        .selectAll('.cluster_name_input')
        .node().value;
      this.new_names.push(newname);
      this.new_name_set.add(newname);
      this.mapping[d] = newname;
      this.new_colors[newname] = this.clustering_data.clusters[this.current_clus_name].label_colors[d];
    });

    if (this.new_name_set.size < this.new_names.length) {
      sweetAlert({ title: 'Cluster names must be distinct', animation: 'slide-from-top' });
    } else {
      this.clustering_data.clusters[this.current_clus_name].label_list.forEach(d => {
        this.new_labels.push(this.mapping[d]);
      });

      this.new_clus.label_list = this.new_labels;
      this.new_clus.label_colors = this.new_colors;
      this.clustering_data.clusters[this.current_clus_name] = this.new_clus;

      if (document.getElementById('labels_button').checked) {
        if (document.getElementById('labels_menu').value === 'Current clustering') {
          d3.select('#label_column')
            .selectAll('div')
            .remove();
          d3.select('#count_column')
            .selectAll('div')
            .remove();
          colorBar.make_legend(this.new_colors, this.new_labels);
        }
      }
      this.show_update_cluster_labels_box();
      this.save_cluster_data();
    }
  }

  save_cluster_data() {
    this.clustering_data.Current_clustering = this.current_clus_name;
    const path = 'clustering_data/' + this.name + '_clustering_data_clustmp.json';
    $.ajax({
      data: { path: path, content: JSON.stringify(this.clustering_data, null, '    ') },
      type: 'POST',
      url: 'cgi-bin/save_data.py',
    });
  }

  download_legend_image() {
    const original_visibility = d3.select('#update_cluster_labels_box').style('visibility');
    this.show_update_cluster_labels_box();
    d3.select('#cluster_label_button_bar').style('visibility', 'hidden');
    d3.select('#cluster_label_button_bar').style('height', '5px');
    d3.select('#update_cluster_labels_box').style('background-color', 'white');
    d3.selectAll('.cluster_name_input').style('color', 'black');

    html2canvas(document.getElementById('update_cluster_labels_box')).then(canvas => {
      const a = document.createElement('a');
      // toDataURL defaults to png, so we need to request a jpeg, then convert for file download.
      a.href = canvas.toDataURL('image/png');
      a.download = 'SPRING_legend.png';
      a.click();
    });

    d3.select('#cluster_label_button_bar').style('visibility', 'inherit');
    d3.select('#cluster_label_button_bar').style('height', '31.1px');
    d3.select('#update_cluster_labels_box').style('background-color', 'rgba(80, 80, 80, 0.5)');
    d3.selectAll('.cluster_name_input').style('color', 'white');
    if (original_visibility === 'hidden') {
      this.hide_update_cluster_labels_box();
    }
  }

  download_clustering() {
    let text = '';
    let label_list = this.clustering_data.clusters[this.current_clus_name].label_list;
    d3.select('.node')
      .selectAll('circle')
      .sort((a, b) => {
        return a.number - b.number;
      })
      .each(d => {
        text = text + d.name.toString() + ',' + label_list[d.number] + '\n';
      });
    colorBar.downloadFile(text, 'clustering.txt');
  }
}
