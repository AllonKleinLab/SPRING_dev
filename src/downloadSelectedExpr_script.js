import * as d3 from 'd3';
import { forceLayout, graph_directory, sub_directory } from './main';

export default class DownloadSelectedExpr {
  /** @type DownloadSelectedExpr */
  static _instance;

  static get instance() {
    if (!this._instance) {
      throw new Error('You must first call DownloadSelectedExpr.create()!');
    }
    return this._instance;
  }

  static create(project_directory, color_menu_genes) {
    if (!this._instance) {
      this._instance = new DownloadSelectedExpr();
      return this._instance;
    } else {
      throw new Error(
        'DownloadSelectedExpr.create() has already been called, get the existing instance with DownloadSelectedExpr.instance!',
      );
    }
  }

  constructor() {
    this.popup = d3
      .select('#force_layout')
      .append('div')
      .attr('id', 'downloadSelectedExpr_popup');

    this.button_bar = this.popup
      .append('div')
      .attr('id', 'downloadSelectedExpr_button_bar')
      .style('width', '100%');

    this.button_bar.append('text').text('Download raw data for selected cells');

    this.close_button = this.button_bar
      .append('button')
      .text('Close')
      .on('mousedown', () => this.hide_downloadSelectedExpr_popup());

    this.popup
      .append('div')
      .attr('class', 'downloadSelectedExpr_input_div')
      .append('label')
      .text('Cell subset name')
      .append('input')
      .attr('type', 'text')
      .attr('id', 'input_subset_name_download')
      .attr('value', 'e.g. "My_favorite_cells"')
      .style('width', '220px');

    this.popup
      .append('div')
      .attr('class', 'downloadSelectedExpr_input_div')
      .append('label')
      .text('Email address')
      .append('input')
      .attr('type', 'text')
      .attr('id', 'input_email_download')
      .style('width', '220px');

    // popup.append('div').attr('class','downloadSelectedExpr_input_div')
    // 	.append('label').text('Save force layout animation')
    // 	.append('button').text('No')
    // 	.attr('id','input_animation')
    // 	.on('click', function() {
    // 		if (d3.select(this).text()=='Yes') { d3.select(this).text('No'); }
    // 		else { d3.select(this).text('Yes'); }
    // 	});

    this.popup
      .append('div')
      .attr('id', 'downloadSelectedExpr_submission_div')
      .attr('class', 'downloadSelectedExpr_input_div')
      .append('button')
      .text('Submit')
      .on('click', () => this.downloadSelectedExpr());

    this.popup
      .append('div')
      .attr('id', 'downloadSelectedExpr_message_div')
      .on('mousedown', () => {
        d3.event.stopPropagation();
      })
      .style('overflow', 'scroll')
      .append('text');

    d3.selectAll('.downloadSelectedExpr_input_div').on('mousedown', () => {
      d3.event.stopPropagation();
    });

    d3.select('#downloadSelectedExpr_popup').call(
      d3
        .drag()
        .on('start', () => this.downloadSelectedExpr_popup_dragstarted())
        .on('drag', () => this.downloadSelectedExpr_popup_dragged())
        .on('end', () => this.downloadSelectedExpr_popup_dragended()),
    );
  }
  // <-- DownloadSelectedExpr Constructor End -->

  downloadSelectedExpr_popup_dragstarted() {
    d3.event.sourceEvent.stopPropagation();
  }

  downloadSelectedExpr_popup_dragged() {
    let cx = parseFloat(
      d3
        .select('#downloadSelectedExpr_popup')
        .style('left')
        .split('px')[0],
    );
    let cy = parseFloat(
      d3
        .select('#downloadSelectedExpr_popup')
        .style('top')
        .split('px')[0],
    );
    d3.select('#downloadSelectedExpr_popup').style('left', (cx + d3.event.dx).toString() + 'px');
    d3.select('#downloadSelectedExpr_popup').style('top', (cy + d3.event.dy).toString() + 'px');
  }

  downloadSelectedExpr_popup_dragended() {
    return;
  }

  hide_downloadSelectedExpr_popup() {
    d3.select('#downloadSelectedExpr_popup')
      .style('visibility', 'hidden')
      .style('height', '200px');
  }

  show_downloadSelectedExpr_popup = () => {
    let mywidth = parseInt(
      d3
        .select('#downloadSelectedExpr_popup')
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
    d3.select('#input_description').style('height', '22px');
    d3.select('#downloadSelectedExpr_message_div')
      .style('visibility', 'hidden')
      .style('height', '0px');
    d3.select('#input_description').node().value = '';
    d3.select('#downloadSelectedExpr_popup')
      .style('left', (svg_width / 2 - mywidth / 2).toString() + 'px')
      .style('top', '10px')
      .style('padding-bottom', '0px')
      .style('visibility', 'visible'); //.style('height','300px');
  };
  downloadSelectedExpr() {
    let sel2text = '';
    for (let i = 0; i < forceLayout.all_outlines.length; i++) {
      if (forceLayout.all_outlines[i].selected) {
        sel2text = sel2text + ',' + i.toString();
      }
    }
    if (sel2text.length > 0) {
      sel2text = sel2text.slice(1, sel2text.length);
    }
    let t0 = new Date();
    let my_origin = window.location.origin;
    let my_pathname = window.location.pathname;
    let my_pathname_split = my_pathname.split('/');
    let my_pathname_start = my_pathname_split.slice(0, my_pathname_split.length - 1).join('/');

    let subset_name = $('#input_subset_name_download').val();
    let user_email = $('#input_email_download').val();

    let output_message = 'Checking input...<br>';

    d3.select('#downloadSelectedExpr_popup')
      .transition()
      .duration(200)
      .style('height', '375px');

    d3.select('#downloadSelectedExpr_message_div')
      .transition()
      .duration(200)
      .style('height', '120px')
      .each(() => {
        d3.select('#downloadSelectedExpr_message_div').style('visibility', 'inherit');
        d3.select('#downloadSelectedExpr_message_div')
          .select('text')
          .html(output_message);
      });

    console.log('Downloading expression');
    $.ajax({
      data: {
        base_dir: graph_directory,
        current_dir: graph_directory + '/' + sub_directory,
        email: user_email,
        my_origin: my_origin + my_pathname_start,
        selected_cells: sel2text,
        selection_name: subset_name,
      },
      success: data => {
        let t1 = new Date();
        //console.log(data);
        d3.select('#downloadSelectedExpr_message_div')
          .select('text')
          .html(data);
      },
      type: 'POST',
      url: 'cgi-bin/download_expression.submit.py',
    });
  }
}
