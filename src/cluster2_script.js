import * as d3 from 'd3';
import { colorBar, forceLayout, project_directory, graph_directory } from './main';

export default class Cluster2 {
  /** @type Cluster2 */
  static _instance;

  static get instance() {
    if (!this._instance) {
      throw new Error('You must first call Cluster2.create()!');
    }
    return this._instance;
  }

  static create() {
    if (!this._instance) {
      this._instance = new Cluster2();
      return this._instance;
    } else {
      throw new Error('Cluster2.create() has already been called, get the existing instance with Cluster2.instance!');
    }
  }

  constructor() {
    this.popup = d3
      .select('#force_layout')
      .append('div')
      .attr('id', 'cluster_popup')
      .style('visibility', 'hidden');

    this.button_bar = this.popup
      .append('div')
      .attr('id', 'cluster_button_bar')
      .on('mousedown', () => {
        d3.event.stopPropagation();
      });

    this.button_bar
      .append('label')
      .html('<i>resolution</i> = ')
      .append('input')
      .attr('id','resolution_input')
      .property('value',1.0);
  
    this.button_bar
      .append('button')
      .text('Run')
      .on('click', () => {
        this.run_clustering(this);
      });

    this.button_bar
      .append('button')
      .text('Close')
      .on('click',this.hide_popup);

    this.text_box = this.popup
      .append('div')
      .attr('id','cluster_description')
      .append('text')
      .text('Run Louvain clustering.');

    this.notify_popup = d3
      .select('#force_layout')
      .append('div')
      .attr('id', 'cluster_notification')
      .style('visibility', 'hidden');

    this.notify_popup
      .append('div')
      .attr('id', 'cluster_notify_text')
      .append('text')
      .text('Louvain clustering finished! See categorical colors menu.');

    this.notify_popup
      .append('button')
      .text('Close')
      .on('mousedown', () => this.hide_notification());

    d3.select('#cluster_popup').call(
      d3
        .drag()
        .on('start', () => this.popup_dragstarted())
        .on('drag', () => this.popup_dragged())
        .on('end', () => this.popup_dragended()),
    );

  }

  popup_dragstarted() {
    d3.event.sourceEvent.stopPropagation();
  }

  popup_dragged() {
    let cx = parseFloat(
      d3
        .select('#cluster_popup')
        .style('left')
        .split('px')[0],
    );
    let cy = parseFloat(
      d3
        .select('#cluster_popup')
        .style('top')
        .split('px')[0],
    );
    d3.select('#cluster_popup').style('left', (cx + d3.event.dx).toString() + 'px');
    d3.select('#cluster_popup').style('top', (cy + d3.event.dy).toString() + 'px');
  }

  popup_dragended() {
    return;
  }

  run_clustering(this) {
    if (forceLayout.mutable) {
      let t0 = new Date();
      let louvain_resolution = $('#resolution_input').val();
      
      d3.select('#cluster_notification')
        .select('text')
        .text('Now clustering...');

      this.show_notification();
      this.hide_popup();

      $.ajax({
        data: { base_dir: graph_directory, sub_dir: project_directory, resolution: louvain_resolution},
        success: data => {
          let t1 = new Date();
          console.log('Ran clustering: ', t1.getTime() - t0.getTime());
          
          d3.select('#cluster_notification')
            .select('text')
            .text('Clustering complete! See Cell Labels menu.');

          colorBar.loadData('categorical', true);
          this.show_notification();
        },
        type: 'POST',
        url: 'cgi-bin/run_clustering.py',
      });

    } else {
      console.log('no clustering allowed');
      //show_notification(d3.select("#no_clustering_popup"));
      d3.select('#cluster_popup')
        .select('text')
        .text('Sorry, this dataset cannot be edited.');
      this.show_notification();
    }
  }

  show_notification() {
    let mywidth = parseInt(
      d3
        .select('#cluster_notification')
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

    d3.select('#cluster_notification')
      .style('left', (svg_width / 2 - mywidth / 2).toString() + 'px')
      .style('top', '0px')
      .style('opacity', 0.0)
      .style('visibility', 'visible')
      .transition()
      .duration(500)
      .style('opacity', 1.0);
  }

  hide_notification() {
    d3.select('#cluster_notification')
      .style('opacity', 0.0)
      .style('visibility', 'hidden');
  }

  show_popup() {
    if (forceLayout.mutable) {
      let mywidth = parseInt(
        d3
          .select('#cluster_popup')
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
      d3.select('#cluster_popup')
        .style('left', (svg_width / 2 - mywidth / 2).toString() + 'px')
        .style('top', '80px')
        .style('visibility', 'visible');
    } else {
      d3.select('#cluster_notification')
        .select('text')
        .text('Sorry, this dataset cannot be edited.');
      this.showt_notification();
    }
  }

  hide_popup() {
    d3.select('#cluster_popup').style('visibility', 'hidden');
  }

}
