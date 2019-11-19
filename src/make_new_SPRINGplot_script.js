import * as d3 from 'd3';
import { graph_directory, sub_directory, forceLayout } from './main';

const MAXHEIGHT = 660;
const STARTHEIGHT = 610;

export default class SpringPlot {
  /** @type SpringPlot */
  static _instance;

  static get instance() {
    if (!this._instance) {
      throw new Error('You must first call SpringPlot.create()!');
    }
    return this._instance;
  }

  static create() {
    if (!this._instance) {
      this._instance = new SpringPlot();
      return this._instance;
    } else {
      throw new Error(
        'SpringPlot.create() has already been called, get the existing instance with SpringPlot.instance!',
      );
    }
  }

  constructor() {
    this.custom_genes = '';
    this.include_exclude = 'exclude';
    this.popup = d3
      .select('#force_layout')
      .append('div')
      .attr('id', 'make_new_SPRINGplot_popup');

    this.button_bar = this.popup
      .append('div')
      .attr('id', 'make_new_SPRINGplot_button_bar')
      .style('width', '100%');

    this.button_bar.append('text').text('Make new SPRING plot from selection');

    this.close_button = this.button_bar
      .append('button')
      .text('Close')
      .on('mousedown', () => this.hide_make_new_SPRINGplot_popup());

    this.popup
      .append('div')
      .attr('class', 'make_new_SPRINGplot_input_div')
      .append('label')
      .text('Name of plot')
      .append('input')
      .attr('type', 'text')
      .attr('id', 'input_new_dir')
      .attr('value', 'E.g. "My_favorite_cells"')
      .style('width', '220px');

    this.popup
      .append('div')
      .attr('class', 'make_new_SPRINGplot_input_div')
      .append('label')
      .text('Email address')
      .append('input')
      .attr('type', 'text')
      .attr('id', 'input_email')
      .style('width', '220px');

    this.popup
      .append('div')
      .attr('class', 'make_new_SPRINGplot_input_div')
      .attr('id', 'newSPRING_description_box')
      .append('label')
      .text('Description')
      .append('textarea')
      .attr('id', 'input_description')
      .style('width', '217px')
      .style('height', '22px')
      .on('keydown', () => {
        setTimeout(() => {
          let o = d3.select('#input_description');
          o.style('height', '1px');
          o.style('height', o.node().scrollHeight.toString() + 'px');
          if (d3.select('#make_new_SPRINGplot_message_div').style('visibility') === 'hidden') {
            this.popup.style(
              'height',
              d3.min([$('#newSPRING_description_box').height() + 597.223, STARTHEIGHT]).toString() + 'px',
            );
          } else {
            this.popup.style(
              'height',
              d3.min([$('#newSPRING_description_box').height() + 745, MAXHEIGHT]).toString() + 'px',
            );
          }
        }, 0);
      });

    this.batch_correction_blurb = this.popup
      .append('div')
      .attr('class', 'make_new_SPRINGplot_input_div')
      .attr('id', 'batch_correction_blurb')
      .style('width', '320px')
      .style('margin-top', '25px');

    this.batch_correction_blurb
      .append('text')
      .text('Use cell projection to avoid batch effects. ')
      .style('color', 'rgb(220,220,220)');
    this.batch_correction_blurb
      .append('text')
      .text('Negatively selected ')
      .style('color', 'rgb(80,80,255)')
      .style('font-weight', '900');
    this.batch_correction_blurb
      .append('text')
      .text('cells will be projected onto ')
      .style('color', 'rgb(220,220,220)');
    this.batch_correction_blurb
      .append('text')
      .text('positively selected ')
      .style('color', 'yellow')
      .style('font-weight', '900');
    this.batch_correction_blurb
      .append('text')
      .text('cells.')
      .style('color', 'white');

    this.optional_params = this.popup
      .append('div')
      .attr('class', 'make_new_SPRINGplot_input_div')
      .attr('id', 'make_new_SPRINGplot_optional_params');

    this.optional_params.append('hr').style('float', 'left');
    this.optional_params.append('text').text('Optional parameters');
    this.optional_params.append('hr').style('float', 'right');

    this.popup
      .append('div')
      .attr('class', 'make_new_SPRINGplot_input_div')
      .append('label')
      .text('Min expressing cells (gene filtering)')
      .append('input')
      .attr('type', 'text')
      .attr('id', 'input_minCells')
      .attr('value', '3');

    this.popup
      .append('div')
      .attr('class', 'make_new_SPRINGplot_input_div')
      .append('label')
      .text('Min number of UMIs (gene filtering)')
      .append('input')
      .attr('type', 'text')
      .attr('id', 'input_minCounts')
      .attr('value', '3');

    this.popup
      .append('div')
      .attr('class', 'make_new_SPRINGplot_input_div')
      .append('label')
      .text('Gene letiability %ile (gene filtering)')
      .append('input')
      .attr('type', 'text')
      .attr('id', 'input_pctl')
      .attr('value', '90');

    this.popup
      .append('div')
      .attr('class', 'make_new_SPRINGplot_input_div')
      .append('label')
      .text('Number of principal components')
      .append('input')
      .attr('type', 'text')
      .attr('id', 'input_numPC')
      .attr('value', '20');

    this.popup
      .append('div')
      .attr('class', 'make_new_SPRINGplot_input_div')
      .append('label')
      .text('Number of nearest neighbors')
      .append('input')
      .attr('type', 'text')
      .attr('id', 'input_kneigh')
      .attr('value', '3');

    this.popup
      .append('div')
      .attr('class', 'make_new_SPRINGplot_input_div')
      .append('label')
      .text('Number of force layout iterations')
      .append('input')
      .attr('type', 'text')
      .attr('id', 'input_nIter')
      .attr('value', '500');

    this.popup
      .append('div')
      .attr('class', 'make_new_SPRINGplot_input_div')
      .append('label')
      .text('Save force layout animation')
      .append('button')
      .text('No')
      .attr('id', 'input_animation')
      .on('click', () => {
        if (d3.select(this).text() === 'Yes') {
          d3.select(this).text('No');
        } else {
          d3.select(this).text('Yes');
        }
      });

    this.custom_genes_div = this.popup.append('div').attr('class', 'make_new_SPRINGplot_input_div');
    this.custom_genes_div
      .append('label')
      .append('button')
      .text('Exclude')
      .attr('id', 'include_exclude_toggle')
      .on('click', function() {
        if (d3.select(this).text() === 'Exclude') {
          d3.select(this).text('Include');
        } else {
          d3.select(this).text('Exclude');
        }
      });

    this.wrapper = this.custom_genes_div
      .append('label')
      .text(' custom gene list')
      .append('span')
      .attr('id', 'gene_list_upload_wrapper');

    this.wrapper.append('span').text('Choose file');
    this.wrapper
      .append('input')
      .attr('type', 'file')
      .attr('id', 'gene_list_upload_input')
      .on('change', () => {
        if (d3.select('#gene_list_upload_input').node().files.length > 0) {
          let reader = new FileReader();
          let file = d3.select('#gene_list_upload_input').node().files[0];
          reader.readAsText(file, 'UTF-8');
          reader.onload = evt => {
            this.custom_genes = evt.target.result;
            this.wrapper.style('padding', '4px 11px 4px 11px');
            this.wrapper.style('background-color', 'red');
            this.wrapper.select('span').text('Uploaded');
          };
        }
      });

    this.popup
      .append('div')
      .attr('id', 'make_new_SPRINGplot_submission_div')
      .attr('class', 'make_new_SPRINGplot_input_div')
      .append('button')
      .text('Submit')
      .on('click', () => this.submit_new_SPRINGplot());

    this.popup
      .append('div')
      .attr('id', 'make_new_SPRINGplot_message_div')
      .on('mousedown', () => {
        d3.event.stopPropagation();
      })
      .style('overflow', 'scroll')
      .append('text');

    d3.selectAll('.make_new_SPRINGplot_input_div').on('mousedown', () => {
      d3.event.stopPropagation();
    });

    d3.select('#make_new_SPRINGplot_popup').call(
      d3
        .drag()
        .on('start', () => this.make_new_SPRINGplot_popup_dragstarted())
        .on('drag', () => this.make_new_SPRINGplot_popup_dragged())
        .on('end', () => this.make_new_SPRINGplot_popup_dragended()),
    );
  }
  // <-- SpringPlot Constructor End -->

  make_new_SPRINGplot_popup_dragstarted() {
    d3.event.sourceEvent.stopPropagation();
  }

  make_new_SPRINGplot_popup_dragged() {
    let cx = parseFloat(
      d3
        .select('#make_new_SPRINGplot_popup')
        .style('left')
        .split('px')[0],
    );
    let cy = parseFloat(
      d3
        .select('#make_new_SPRINGplot_popup')
        .style('top')
        .split('px')[0],
    );
    d3.select('#make_new_SPRINGplot_popup').style('left', (cx + d3.event.dx).toString() + 'px');
    d3.select('#make_new_SPRINGplot_popup').style('top', (cy + d3.event.dy).toString() + 'px');
  }

  make_new_SPRINGplot_popup_dragended() {
    return;
  }

  hide_make_new_SPRINGplot_popup = () => {
    d3.select('#make_new_SPRINGplot_popup').style('visibility', 'hidden');
    d3.select('#gene_list_upload_wrapper').style('padding', '4px 8px 4px 8px');
    d3.select('#gene_list_upload_wrapper').style('background-color', 'rgba(0,0,0,.7)');
    d3.select('#gene_list_upload_wrapper')
      .select('span')
      .text('Choose file');
  };

  show_make_new_SPRINGplot_popup = () => {
    let mywidth = parseInt(
      d3
        .select('#make_new_SPRINGplot_popup')
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
    d3.select('#make_new_SPRINGplot_message_div')
      .style('visibility', 'hidden')
      .style('height', '0px');
    d3.select('#input_description').node().value = '';
    d3.select('#make_new_SPRINGplot_popup')
      .style('left', (svg_width / 2 - mywidth / 2).toString() + 'px')
      .style('top', '10px')
      .style('padding-bottom', '0px')
      .style('visibility', 'visible')
      .style('height', STARTHEIGHT);
  };

  submit_new_SPRINGplot() {
    let running_online = false;
    this.include_exclude = d3.select('#include_exclude_toggle').text();

    // Do cgi stuff to check for valid input
    // When finished...
    let sel2text = '';
    let com2text = '';
    for (let i = 0; i < forceLayout.all_outlines.length; i++) {
      if (forceLayout.all_outlines[i].selected) {
        sel2text = sel2text + ',' + i.toString();
      }
      if (forceLayout.all_outlines[i].compared) {
        com2text = com2text + ',' + i.toString();
      }
    }
    sel2text = sel2text.slice(1, sel2text.length);
    com2text = com2text.slice(1, com2text.length);
    let new_dir = $('#input_new_dir').val();
    let email = $('#input_email').val();
    let description = $('#input_description').val();
    let minCells = $('#input_minCells').val();
    let minCounts = $('#input_minCounts').val();
    let letPctl = $('#input_pctl').val();
    let kneigh = $('#input_kneigh').val();
    let numPC = $('#input_numPC').val();
    let nIter = $('#input_nIter').val();
    let animate = d3.select('#input_animation').text();
    let this_url = window.location.href;

    let output_message = '';
    let subplot_script = '';

    if (running_online) {
      output_message = 'Checking input...';
      subplot_script = 'cgi-bin/spring_from_selection2.online.py';
    } else {
      output_message = 'Please wait...<br>';
      output_message +=
        "If everything goes smoothly, a link to your new subplot will appear when ready, and you'll receive a link via email (if provided).<br>";
      output_message += '<br>This may take several minutes.<br>';
      subplot_script = 'cgi-bin/spring_from_selection2.py';
    }

    //let MAXHEIGHT = 772;

    d3.select('#make_new_SPRINGplot_popup')
      .transition()
      .duration(200)
      .style('height', d3.min([$('#newSPRING_description_box').height() + 745, MAXHEIGHT]).toString() + 'px');

    d3.select('#make_new_SPRINGplot_message_div')
      .transition()
      .duration(200)
      .style('height', '120px')
      .each(() => {
        d3.select('#make_new_SPRINGplot_message_div').style('visibility', 'inherit');
        d3.select('#make_new_SPRINGplot_message_div')
          .select('text')
          .html(output_message);
      });

    console.log(subplot_script);
    $.ajax({
      data: {
        animate: animate,
        base_dir: graph_directory,
        compared_cells: com2text,
        current_dir: sub_directory,
        custom_genes: this.custom_genes,
        description: description,
        email: email,
        include_exclude: this.include_exclude,
        kneigh: kneigh,
        minCells: minCells,
        minCounts: minCounts,
        nIter: nIter,
        new_dir: new_dir,
        numPC: numPC,
        selected_cells: sel2text,
        this_url: this_url,
        letPctl: letPctl,
      },
      success: success_message => {
        console.log(success_message);

        if (running_online) {
          let orig_message = success_message;
          d3.select('#make_new_SPRINGplot_message_div')
            .select('text')
            .html(orig_message);

          function checkLog() {
            jQuery.get(graph_directory + '/' + new_dir + '/lognewspring2.txt', logdata => {
              let logdata_split = logdata.split('\n');
              let display_message = orig_message + '<br>' + logdata_split[logdata_split.length - 2];
              d3.select('#make_new_SPRINGplot_message_div')
                .select('text')
                .html(display_message);
              if (!display_message.endsWith('</a><br>')) {
                setTimeout(checkLog, 500);
              }
            });
          }

          if (orig_message.endsWith('several minutes.<br>\n') || orig_message.endsWith('email.<br>\n')) {
            setTimeout(checkLog, 500);
          }
        } else {
          d3.select('#make_new_SPRINGplot_message_div')
            .select('text')
            .html(success_message);
        }
      },
      type: 'POST',
      url: subplot_script,
    });
  }
}
