import * as d3 from 'd3';
import { colorBar, forceLayout, cloneViewer, project_directory, graph_directory } from './main';
import { read_csv } from './util';

export default class DoubletDetector {
  /** @type DoubletDetector */
  static _instance;

  static get instance() {
    if (!this._instance) {
      throw new Error('You must first call DoubletDetector.create()!');
    }
    return this._instance;
  }

  static create() {
    if (!this._instance) {
      this._instance = new DoubletDetector();
      return this._instance;
    } else {
      throw new Error(
        'DoubletDetector.create() has already been called, get the existing instance with DoubletDetector.instance!',
      );
    }
  }

  constructor() {
    this.popup = d3
      .select('#force_layout')
      .append('div')
      .attr('id', 'doublet_popup');

    this.button_bar = this.popup
      .append('div')
      .attr('id', 'doublet_button_bar')
      .on('mousedown', () => {
        d3.event.stopPropagation();
      });

    this.button_bar
      .append('label')
      .html('<i>k</i> = ')
      .append('input')
      .attr('id', 'doublet_k_input')
      .property('value', 50);
    this.button_bar
      .append('label')
      .html('<i>r</i> = ')
      .append('input')
      .attr('id', 'doublet_r_input')
      .property('value', 2);
    this.button_bar
      .append('label')
      .html('<i>f</i> = ')
      .append('input')
      .attr('id', 'doublet_f_input')
      .property('value', 0.1);
    this.button_bar
      .append('button')
      .text('Run')
      .on('click', this.run_doublet_detector);
    this.button_bar
      .append('button')
      .text('Close')
      .on('click', this.hide_doublet_popup);

    this.text_box = this.popup
      .append('div')
      .attr('id', 'doublet_description')
      .append('text')
      .html(
        'Predict mixed-celltype doublets. \
        Uses a kNN classifier to identify transcriptomes that resemble simulated doublets. \
        <br><br> <b><i>k </i> : </b> the number neighbors used in the classifier \
        <br> <b><i>r </i> : </b> the ratio of simulated doublets to observed cells \
        <br> <b><i>f </i> : </b> the expected doublet rate',
      );

    this.doublet_notify_popup = d3
      .select('#force_layout')
      .append('div')
      .attr('id', 'doublet_notification')
      .style('visibility', 'hidden');
    this.doublet_notify_popup
      .append('div')
      .attr('id', 'doublet_notify_text')
      .append('text')
      .text('Doublet detector finished! See custom colors menu.');

    this.doublet_notify_popup
      .append('button')
      .text('Close')
      .on('mousedown', () => this.hide_doublet_notification());

    d3.select('#doublet_popup').call(
      d3
        .drag()
        .on('start', () => this.doublet_popup_dragstarted())
        .on('drag', () => this.doublet_popup_dragged())
        .on('end', () => this.doublet_popup_dragended()),
    );
  }
  // <-- DoubletDetector Constructor End -->

  doublet_popup_dragstarted() {
    d3.event.sourceEvent.stopPropagation();
  }

  doublet_popup_dragged() {
    let cx = parseFloat(
      d3
        .select('#doublet_popup')
        .style('left')
        .split('px')[0],
    );
    let cy = parseFloat(
      d3
        .select('#doublet_popup')
        .style('top')
        .split('px')[0],
    );
    d3.select('#doublet_popup').style('left', (cx + d3.event.dx).toString() + 'px');
    d3.select('#doublet_popup').style('top', (cy + d3.event.dy).toString() + 'px');
  }

  doublet_popup_dragended() {
    return;
  }

  // function show_processing_mask() {
  // 	popup.append('div').attr('id','doublet_processing_mask').append('div').append('text')
  // 		.text('Running doublet detector... you will be notified upon completion.')
  // 		.style('opacity', 0.0)
  // 		.transition()
  // 		.duration(500)
  // 		.style('opacity', 1.0);

  // let opts = {
  // 	  lines: 17 // The number of lines to draw
  // 	, length: 35 // The length of each line
  // 	, width: 15 // The line thickness
  // 	, radius: 50 // The radius of the inner circle
  // 	, scale: 0.22 // Scales overall size of the spinner
  // 	, corners: 1 // Corner roundness (0..1)
  // 	, color: '#000' // #rgb or #rrggbb or array of colors
  // 	, opacity: 0.2 // Opacity of the lines
  // 	, rotate: 8 // The rotation offset
  // 	, direction: 1 // 1: clockwise, -1: counterclockwise
  // 	, speed: 0.9 // Rounds per second
  // 	, trail: 60 // Afterglow percentage
  // 	, fps: 20 // Frames per second when using setTimeout() as a fallback for CSS
  // 	, zIndex: 2e9 // The z-index (defaults to 2000000000)
  // 	, className: 'spinner' // The CSS class to assign to the spinner
  // 	, top: '50%' // Top position relative to parent
  // 	, left: '50%' // Left position relative to parent
  // 	, shadow: false // Whether to render a shadow
  // 	, hwaccel: true // Whether to use hardware acceleration
  // 	, position: 'relative' // Element positioning
  // 	}
  // let target = document.getElementById('doublet_processing_mask');
  // let spinner = new Spinner(opts).spin(target);
  // $(target).data('spinner', spinner);

  // }

  // function hide_processing_mask() {
  // 	// $(".spinner").remove();
  // 	$("#doublet_processing_mask").remove();

  // }

  // function hide_doublet_popup_slowly() {
  // 	d3.select("#doublet_popup").transition()
  // 	.duration(2000)
  // 	.transition()
  // 	.duration(500)
  // 	.style('opacity', 0.0)
  // 	.each("end", function() {
  // 		d3.select("#doublet_popup").style('visibility', 'hidden');
  // 		d3.select("#doublet_popup").style('opacity', '1.0');
  // 	});

  // }

  // function show_doublet_notification() {

  // 	let mywidth = parseInt(d3.select("#doublet_notification").style("width").split("px")[0])
  // 	let svg_width = parseInt(d3.select("svg").style("width").split("px")[0])

  // 	d3.select("#doublet_notification")
  // 		.style("left",(svg_width/2-mywidth/2).toString()+"px")
  // 		.style("top","0px")
  // 		.style('opacity', 0.0)
  // 		.style('visibility','visible')
  // 		.transition()
  // 		.duration(1500)
  // 		.style('opacity', 1.0)
  // 		.transition()
  // 		.duration(2000)
  // 		.transition()
  // 		.duration(1500)
  // 		.style('opacity', 0.0)
  // 		.each("end", function() {
  // 			d3.select("#doublet_notification").style('visibility', 'hidden');
  // 		});

  // 	//d3.select("#doublet_notification").transition(1500).style('visibility','hidden');
  // }

  // <-- DoubletDetector Constructor End -->
  run_doublet_detector() {
    if (forceLayout.mutable) {
      var t0 = new Date();
      var k = $('#doublet_k_input').val();
      var r = $('#doublet_r_input').val();
      var f = $('#doublet_f_input').val();

      // show_processing_mask();
      // hide_doublet_popup_slowly();

      d3.select('#doublet_notification')
        .select('text')
        .text('Running doublet detector... you will be notified upon completion.');
      this.show_doublet_notification();
      this.hide_doublet_popup();

      console.log(k, r, f);
      $.ajax({
        data: {
          base_dir: graph_directory,
          sub_dir: project_directory,
          k: k,
          r: r,
          f: f,
        },
        success: data => {
          let t1 = new Date();
          console.log('Ran doublet detector: ', t1.getTime() - t0.getTime());
          d3.select('#doublet_notification')
            .select('text')
            .text('Doublet detector finished! See Custom Colors menu.');
          this.show_doublet_notification();
          if (d3.select('#clone_viewer_popup').style('visibility') === 'visible') {
            $('#clone_viewer_popup').remove();
            for (let i = 0; i < forceLayout.all_outlines.length; i++) {
              cloneViewer.node_status[i].source = false;
              cloneViewer.node_status[i].target = false;
            }
            for (let i in cloneViewer.clone_nodes) {
              cloneViewer.deactivate_nodes(i);
            }
            for (let i in cloneViewer.clone_edges) {
              cloneViewer.deactivate_edges(i);
            }
            cloneViewer.targetCircle.clear();

            cloneViewer.start_clone_viewer();
          } else {
            $('#clone_viewer_popup').remove();
          }

          // hide_processing_mask();
          // open json file containing gene sets and populate drop down menu
          let noCache = new Date().getTime();
          d3.json(project_directory + '/color_stats.json' + '?_=' + noCache).then(colorData => {
            colorBar.color_stats = colorData;
          });
          d3.text(project_directory + '/color_data_gene_sets.csv' + '?_=' + noCache).then(text => {
            colorBar.gene_set_color_array = read_csv(text);
            colorBar.dispatch.call('load', this, colorBar.gene_set_color_array, 'gene_sets');
            colorBar.update_slider();
            console.log('loaded doublet scores into menu');
          });
        },
        type: 'POST',
        url: 'cgi-bin/run_doublet_detector.py',
      });
    } else {
      d3.select('#doublet_notification')
        .select('text')
        .text('Sorry, this dataset cannot be edited.');
      this.show_doublet_notification();
    }
  }

  show_doublet_notification() {
    let mywidth = parseInt(
      d3
        .select('#doublet_notification')
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

    d3.select('#doublet_notification')
      .style('left', (svg_width / 2 - mywidth / 2).toString() + 'px')
      .style('top', '0px')
      .style('opacity', 0.0)
      .style('visibility', 'visible')
      .transition()
      .duration(500)
      .style('opacity', 1.0);
  }

  hide_doublet_notification() {
    d3.select('#doublet_notification')
      .style('opacity', 0.0)
      .style('visibility', 'hidden');
  }

  show_doublet_popup() {
    if (forceLayout.mutable) {
      let mywidth = parseInt(
        d3
          .select('#doublet_popup')
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
      d3.select('#doublet_popup')
        .style('left', (svg_width / 2 - mywidth / 2).toString() + 'px')
        .style('top', '80px')
        .style('visibility', 'visible');
    } else {
      d3.select('#doublet_notification')
        .select('text')
        .text('Sorry, this dataset cannot be edited.');
      this.show_doublet_notification();
    }
  }

  hide_doublet_popup() {
    d3.select('#doublet_popup').style('visibility', 'hidden');
  }
}
