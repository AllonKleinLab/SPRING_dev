import * as d3 from 'd3';
import { show_colorpicker_popup } from './colorpicker_layout';
import { forceLayout, graph_directory, selectionScript, project_directory } from './main';
import { rgbToHex, postSelectedCellUpdate, downloadFile } from './util';

export default class ColorBar {
  /** @type ColorBar */
  static _instance;

  static get instance() {
    if (!this._instance) {
      throw new Error('You must first call ColorBar.create()!');
    }
    return this._instance;
  }

  static async create(color_menu_genes) {
    if (!this._instance) {
      this._instance = new ColorBar(color_menu_genes);

      await this._instance.loadData();

      return this._instance;
    } else {
      throw new Error('ColorBar.create() has already been called, get the existing instance with ColorBar.instance!');
    }
  }

  constructor(color_menu_genes) {
    this.color_menu_genes = color_menu_genes;
    this.color_profiles = {};
    this.color_option = 'gradient';
    this.noCache = new Date().getTime();
    this.color_max = 1;
    this.color_stats = null;

    /* -----------------------------------------------------------------------------------
                                        Top menu bar
    */
    this.menuBar = d3.select('#color_chooser');
    // const enrich_script = 'get_gene_zscores.from_npz.dev.py';
    this.enrich_script = 'get_gene_zscores.from_hdf5.dev.py';

    this.svg_width = parseInt(d3.select('svg').attr('width'), 10);
    this.svg_height = parseInt(d3.select('svg').attr('height'), 10);

    /* -------------------------------    Gene menu    ---------------------------- */
    this.channelsButton = this.menuBar
      .append('input')
      .attr('id', 'channels_button')
      .style('margin-left', '-25px')
      .style('visibility', 'hidden')
      .attr('type', 'radio');

    this.greenMenu = this.menuBar
      .append('input')
      .attr('type', 'text')
      .attr('class', 'biginput')
      .attr('id', 'autocomplete')
      .attr('value', 'Enter gene name')
      .style('margin-bottom', '7px')
      .on('click', () => {
        document.getElementById('gradient_button').checked = false;
        document.getElementById('labels_button').checked = false;
        document.getElementById('channels_button').checked = true;
        this.update_color_menu_tints();
        this.update_slider();
      });

    /* -------------------------------    Label menu    ---------------------------- */

    this.labelsButton = this.menuBar
      .append('input')
      .attr('id', 'labels_button')
      .attr('type', 'radio')
      .style('margin-left', '12px')
      .on('click', () => this.labels_click())
      .attr('checked', true);

    this.labelsMenu = this.menuBar
      .append('select')
      .style('margin-left', '-2px')
      .style('font-size', '13px')
      .style(
        'background',
        'linear-gradient(to right, rgb(255, 186, 186), rgb(255, 252, 186), rgb(196, 255, 186), rgb(186, 255, 254), rgb(186, 192, 255), rgb(252, 186, 255))',
      )
      // .style("background", "linear-gradient(to right, rgb(185, 116, 116), rgb(185, 182, 116), rgb(126, 185, 126), rgb(116, 185, 184), rgb(116, 122, 185), rgb(182, 116, 185))")
      .style('background-color', 'rgba(0,0,0,0.5)')
      .style('background-blend-mode', 'screen')
      .attr('id', 'labels_menu')
      .on('change', () => {
        this.update_slider();
      })
      .on('click', () => this.labels_click());

    this.menuBar.selectAll('options').style('font-size', '6px');

    /* -------------------------------    Gradient menu    ---------------------------- */

    this.gradientButton = this.menuBar
      .append('input')
      .style('margin-left', '7px')
      .attr('id', 'gradient_button')
      .attr('type', 'radio')
      .on('click', () => this.gradient_click());

    this.gradientMenu = this.menuBar
      .append('select')
      .style('margin-left', '-1px')
      .style('font-size', '13px')
      // .style("background", "linear-gradient(to right, rgb(255, 153, 102), rgb(255, 255, 153))")
      .style('background', 'linear-gradient(to right, rgb(185, 83, 32), rgb(185, 185, 83))')
      .attr('id', 'gradient_menu')
      .on('change', () => {
        this.update_slider();
      })
      .on('click', () => this.gradient_click());

    /* -----------------------------    Populate menus    ---------------------------- */
    this.dispatch = d3.dispatch('load', 'statechange');
    this.dispatch.on('load', (data, tag) => {
      let select;
      if (tag === 'gene_sets') {
        select = this.gradientMenu;
      } else if (tag === 'all_genes') {
        select = this.greenMenu;
      } else {
        select = this.labelsMenu;
      }
      select.selectAll('option').remove();
      select
        .selectAll('option')
        .data(Object.keys(data))
        .enter()
        .append('option')
        .attr('value', d => {
          return d;
        })
        .text(d => {
          return d;
        });

      this.dispatch.on('statechange', state => {
        select.property('value', state.id);
      });
    });

    d3.select('download_ranked_terms').on('click', () => this.downloadRankedTerms());
    d3.select('download_doublet_scores').on('click', () => this.downloadDoubletScores());

    /* -----------------------------------------------------------------------------------
										   Graph coloring
	  */
    this.gradient_color = d3
      .scaleLinear()
      .domain([0, 0.5, 1])
      // @ts-ignore
      .range(['black', 'red', 'yellow']);

    this.green_array = new Array();
    this.green_array_raw = new Array();

    /* -----------------------------------------------------------------------------------
					 				Color slider
	*/
    this.yellow_gradient = d3
      .select('svg')
      .append('defs')
      .append('linearGradient')
      .attr('id', 'yellow_gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%')
      .attr('spreadMethod', 'pad');
    this.yellow_gradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', 'black')
      .attr('stop-opacity', 1);
    this.yellow_gradient
      .append('stop')
      .attr('offset', '50%')
      .attr('stop-color', 'red')
      .attr('stop-opacity', 1);
    this.yellow_gradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', 'yellow')
      .attr('stop-opacity', 1);

    this.green_gradient = d3
      .select('svg')
      .append('defs')
      .append('linearGradient')
      .attr('id', 'green_gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%')
      .attr('spreadMethod', 'pad');
    this.green_gradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', 'black')
      .attr('stop-opacity', 1);
    this.green_gradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', d3.rgb(0, 255, 0).toString())
      .attr('stop-opacity', 1);

    this.slider_scale = d3
      .scaleLinear()
      .domain([0, 10])
      .range([0, this.svg_width / 3])
      .clamp(true);

    this.slider = d3
      .select('svg')
      .append('g')
      .attr('class', 'colorbar_item')
      .attr('id', 'slider')
      .attr('transform', 'translate(' + this.svg_width / 3 + ',' + 26 + ')');

    this.current_value = 0;

    this.slider
      .append('line')
      .attr('class', 'colorbar_item')
      .attr('id', 'track')
      .attr('x1', this.slider_scale.range()[0])
      .attr('x2', this.slider_scale.range()[1])
      .select(function() {
        return this.parentNode.appendChild(this.cloneNode(true));
      })
      .attr('id', 'track-inset')
      .select(function() {
        return this.parentNode.appendChild(this.cloneNode(true));
      })
      .attr('id', 'track-overlay');

    this.slider_gradient = this.slider
      .append('rect')
      .attr('class', 'colorbar_item')
      .attr('id', 'gradient_bar')
      .attr('fill', 'url(#yellow_gradient)')
      .attr('x', -2)
      .attr('y', -3.5)
      .attr('width', 1)
      .attr('height', 7);

    this.handle = this.slider
      .insert('circle', '#track-overlay')
      .attr('class', 'colorbar_item')
      .attr('id', 'handle')
      .style('fill', '#FFFF99')
      .attr('r', 8);

    this.left_bracket = this.slider
      .append('rect')
      .attr('id', '#track-overlay')
      .attr('class', 'colorbar_item')
      .attr('id', 'left_bracket')
      .style('fill', 'yellow')
      .attr('width', 6.5)
      .attr('height', 21)
      .attr('x', 110)
      .attr('y', -10)
      .style('visibility', 'hidden');

    this.right_bracket = this.slider
      .append('rect')
      .attr('id', '#track-overlay')
      .attr('class', 'colorbar_item')
      .attr('id', 'right_bracket')
      .style('fill', 'yellow')
      .attr('width', 6.5)
      .attr('height', 21)
      .attr('x', 240)
      .attr('y', -10)
      .style('visibility', 'hidden');

    this.left_bracket_label = this.slider
      .append('text')
      .attr('id', '#track-overlay')
      .attr('class', 'bracket_label')
      .attr('id', 'left_bracket_label')
      .attr('x', 110)
      .attr('y', 30)
      .style('visibility', 'hidden')
      .style('color', 'red')
      .text('');

    this.right_bracket_label = this.slider
      .append('text')
      .attr('id', '#track-overlay')
      .attr('class', 'bracket_label')
      .attr('id', 'right_bracket_label')
      .attr('x', 240)
      .attr('y', 30)
      .style('visibility', 'hidden')
      .text('');

    this.ceiling_bracket = this.slider
      .append('rect')
      .attr('id', '#track-overlay')
      .attr('class', 'colorbar_item')
      .attr('id', 'ceiling_bracket')
      .style('fill', 'yellow')
      .attr('width', 136.5)
      .attr('height', 5)
      .attr('x', 110)
      .attr('y', -12)
      .style('visibility', 'hidden');

    this.floor_bracket = this.slider
      .append('rect')
      .attr('id', '#track-overlay')
      .attr('class', 'colorbar_item')
      .attr('id', 'floor_bracket')
      .style('fill', 'yellow')
      .attr('width', 136.5)
      .attr('height', 5)
      .attr('x', 110)
      .attr('y', 6)
      .style('visibility', 'hidden');

    this.slider_ticks = this.slider
      .insert('g', '#track-overlay')
      .attr('class', 'colorbar_item')
      .attr('id', 'ticks')
      .attr('transform', 'translate(0,' + 18 + ')')
      .selectAll('text')
      .data(this.slider_scale.ticks(10))
      .enter()
      .append('text')
      .attr('x', this.slider_scale)
      .attr('text-anchor', 'middle')
      .text(d => {
        return d;
      });

    d3.select('#legend')
      .style('left', (this.svg_width - 224).toString() + 'px')
      .style('height', (this.svg_height - 158).toString() + 'px');

    this.legendMask = d3
      .select('svg')
      .append('rect')
      .attr('class', 'colorbar_item')
      .attr('id', 'legend_mask')
      .attr('x', this.svg_width)
      .attr('y', 158)
      .attr('fill-opacity', 0.35)
      .attr('width', 405)
      .attr('height', d3.select('svg').attr('height'));

    d3.select('#slider_select_button')
      .select('button')
      .on('click', () => this.toggle_slider_select());

    /* -----------------------------------------------------------------------------------
					 Create button for showing enriched gene set for a selection
	*/

    this.rankedTermsButtonRect = d3
      .select('svg')
      .append('rect')
      .attr('class', 'colorbar_item')
      .attr('x', -70)
      .attr('y', 0)
      .attr('fill-opacity', 0.35)
      .attr('width', 200)
      .attr('height', 24)
      .on('click', () => {
        this.showRankedTerms();
      });

    this.rankedTermsButtonLabel = d3
      .select('svg')
      .append('text')
      .attr('class', 'colorbar_item')
      .attr('x', 6)
      .attr('y', 16)
      .attr('font-family', 'sans-serif')
      .attr('font-size', '12px')
      .attr('fill', 'white')
      .text('Show enriched terms')
      .attr('pointer-events', 'none');

    this.exoutTermsButtonLabel = d3
      .select('svg')
      .append('text')
      .attr('class', 'colorbar_item')
      .attr('x', 180)
      .attr('y', 17)
      .attr('font-family', 'sans-serif')
      .attr('font-size', '14px')
      .attr('fill', 'white')
      .attr('width', 40)
      .text('X')
      .style('opacity', 0)
      .attr('pointer-events', 'none');

    this.exoutTermsButton = d3
      .select('svg')
      .append('rect')
      .attr('class', 'colorbar_item')
      .attr('x', 170)
      .attr('y', 0)
      .attr('width', 30)
      .attr('height', 30)
      .attr('fill-opacity', 0)
      .on('click', () => {
        this.hideRankedTerms();
      });

    this.slider.call(
      d3
        .drag()
        .on('start', () => {
          const cx = d3.event.sourceEvent.x - this.svg_width / 3;
          // console.log(svg_width, d3.select("#track").attr("x"));
          if (
            Math.abs(cx - parseFloat(this.left_bracket.attr('x')) - 12) < 5 &&
            d3.select('#left_bracket').style('visibility') === 'visible'
          ) {
            this.drag_mode = 'left_bracket';
            // console.log(cx, parseFloat(left_bracket.attr("x")));
          } else if (
            Math.abs(cx - parseFloat(this.right_bracket.attr('x')) - 12) < 5 &&
            d3.select('#right_bracket').style('visibility') === 'visible'
          ) {
            this.drag_mode = 'right_bracket';
            // console.log(cx, parseFloat(right_bracket.attr("x")));
          } else {
            this.drag_mode = 'handle';
          }
        })
        .on('drag', () => {
          const cx = d3.event.x - this.svg_width / 3;
          if (this.drag_mode === 'left_bracket') {
            this.set_left_bracket(cx);
            selectionScript.update_selected_count();
          }
          if (this.drag_mode === 'right_bracket') {
            this.set_right_bracket(cx);
            selectionScript.update_selected_count();
          } else if (this.drag_mode === 'handle') {
            this.set_slider_position(cx);
          }
        })
        .on('end', () => {
          this.slider.interrupt();
        }),
    );

    this.all_gene_color_array = {};
    this.all_gene_cellix_array = {};

    $('#autocomplete').blur(() => {
      if (this.gene_entered) {
        document.getElementById('autocomplete').value = this.last_gene;
      } else {
        document.getElementById('autocomplete').value = 'Enter gene name';
      }
    });

    $('#autocomplete').focus(() => {
      if (!this.gene_entered) {
        document.getElementById('autocomplete').value = '';
      }
    });

    this.geneAutocomplete(color_menu_genes);

    /* -----------------------------------------------------------------------------------
					 Create button for showing enriched gene for a selection
  	*/
    d3.select('#termsheet').attr('height', this.svg_height - 5);

    this.rankedGenesButtonRect = d3
      .select('svg')
      .append('rect')
      .attr('class', 'colorbar_item')
      .attr('id', 'rankedGenesButton')
      .attr('x', -70)
      .attr('y', 24)
      .attr('fill-opacity', 0.35)
      .attr('width', 200)
      .attr('height', 24)
      .on('click', () => {
        this.showRankedGenes();
      });

    this.rankedGenesButtonLabel = d3
      .select('svg')
      .append('text')
      .attr('class', 'colorbar_item')
      .attr('x', 6)
      .attr('y', 40)
      .attr('font-family', 'sans-serif')
      .attr('font-size', '12px')
      .attr('fill', 'white')
      .text('Show enriched genes')
      .attr('pointer-events', 'none');

    this.rankedMask = d3
      .select('svg')
      .append('rect')
      .attr('class', 'colorbar_item')
      .attr('x', -200)
      .attr('y', 48)
      .attr('fill-opacity', 0.35)
      .style('color', 'gray')
      .attr('width', 200)
      .attr('height', d3.select('svg').attr('height'));

    this.exoutGenesButtonLabel = d3
      .select('svg')
      .append('text')
      .attr('class', 'colorbar_item')
      .attr('x', 180)
      .attr('y', 41)
      .attr('font-family', 'sans-serif')
      .attr('font-size', '14px')
      .attr('fill', 'white')
      .attr('width', 40)
      .text('X')
      .attr('pointer-events', 'none')
      .style('opacity', 0);

    this.exoutGenesButton = d3
      .select('svg')
      .append('rect')
      .attr('class', 'colorbar_item')
      .attr('x', 170)
      .attr('y', 24)
      .attr('width', 40)
      .attr('height', 30)
      .attr('fill-opacity', 0)
      .on('click', () => {
        this.hideRankedGenes();
      });

    return this;
  }
  // <-- ColorBar Constructor End -->

  async loadData() {
    // open json file containing gene sets and populate drop down menu
    this.categorical_coloring_data = await d3.json(
      project_directory + '/categorical_coloring_data.json' + '?_=' + this.noCache,
    );
    Object.keys(this.categorical_coloring_data).forEach(k => {
      const label_counts = {};
      Object.keys(this.categorical_coloring_data[k].label_colors).forEach(n => {
        label_counts[n] = 0;
      });
      this.categorical_coloring_data[k].label_list.forEach(n => {
        label_counts[n] += 1;
      });
      this.categorical_coloring_data[k].label_counts = label_counts;
    });

    this.dispatch.call('load', this, this.categorical_coloring_data, 'cell_labels');
    this.update_slider();

    this.color_stats = await d3.json(project_directory + '/color_stats.json' + '?_=' + this.noCache);
    this.addStreamExp(this.color_menu_genes);

    this.last_gene = '';
    this.gene_entered = false;

    // open json file containing gene sets and populate drop down menu
    const text = await d3.text(project_directory + '/color_data_gene_sets.csv' + '?_=' + this.noCache);
    this.gene_set_color_array = this.read_csv(text);

    // gradientMenu.selectAll("option").remove();
    this.dispatch.call('load', this, this.gene_set_color_array, 'gene_sets');
    // update_slider();
  }

  normalize(x) {
    const min = 0;
    const max = this.color_max;
    const out = [];
    for (let i = 0; i < x.length; i++) {
      if (x[i] > max) {
        out.push(1);
      } else {
        out.push((x[i] - min) / (max - min));
      }
    }
    return out;
  }

  normalize_one_val(x) {
    const min = 0;
    const max = this.color_max;
    return x > max ? 1 : (x - min) / (max - min);
  }

  update_tints() {
    for (let i = 0; i < forceLayout.base_colors.length; i++) {
      const rgb = forceLayout.base_colors[i];
      forceLayout.all_nodes[i].tint = rgbToHex(rgb.r, rgb.g, rgb.b);
    }
  }

  setNodeColors() {
    if (document.getElementById('gradient_button').checked) {
      const current_selection = document.getElementById('gradient_menu').value;
      const color_array = this.normalize(this.gene_set_color_array[current_selection]);

      for (let i = 0; i < forceLayout.base_colors.length; i++) {
        forceLayout.base_colors[i] = d3.rgb(this.gradient_color(color_array[i]));
      }
      this.update_tints();
    }
    if (document.getElementById('labels_button').checked) {
      const name = document.getElementById('labels_menu').value;
      const cat_color_map = this.getSampleCategoricalColoringData(name).label_colors;
      const cat_label_list = this.getSampleCategoricalColoringData(name).label_list;

      for (let i = 0; i < forceLayout.base_colors.length; i++) {
        forceLayout.base_colors[i] = d3.rgb(cat_color_map[cat_label_list[i]]);
      }
      this.update_tints();
    }
    if (document.getElementById('channels_button').checked) {
      const t0 = new Date();
      const green_selection = document.getElementById('autocomplete').value;
      console.log(green_selection);
      $.ajax({
        data: { base_dir: graph_directory, sub_dir: project_directory, gene: green_selection },
        success: data => {
          const t1 = new Date();
          console.log('Read gene data: ', t1.getTime() - t0.getTime());
          this.green_array = data.split('\n').slice(0, -1);
          this.green_array_raw = data.split('\n').slice(0, -1);
          for (let i = 0; i < forceLayout.all_nodes.length; i++) {
            const rawval = this.green_array[i];
            const gg = this.normalize_one_val(rawval);
            forceLayout.base_colors[i] = { r: 0, g: Math.floor(gg * 255), b: 0 };
          }

          forceLayout.app.stage.children[1].children.sort((a, b) => {
            return this.green_array[a.index] - this.green_array[b.index];
          });

          this.update_tints();
          if (d3.select('#left_bracket').style('visibility') === 'visible') {
            this.slider_select_update();
            selectionScript.update_selected_count();
          }
        },
        type: 'POST',
      url: 'cgi-bin/grab_one_gene.py',
      });
    }
  }

  updateColorMax() {
    if (document.getElementById('gradient_button').checked) {
      const current_selection = document.getElementById('gradient_menu').value;

      const color_array = this.normalize(this.gene_set_color_array[current_selection]);
      for (let i = 0; i < forceLayout.base_colors.length; i++) {
        forceLayout.base_colors[i] = d3.rgb(this.gradient_color(color_array[i]));
      }
      this.update_tints();
    }
    if (document.getElementById('channels_button').checked) {
      for (let i = 0; i < forceLayout.base_colors.length; i++) {
        const gg = this.normalize_one_val(this.green_array[i]);
        forceLayout.base_colors[i] = { r: 0, g: Math.floor(gg * 255), b: 0 };
      }
      this.update_tints();
    }
    if (document.getElementById('labels_button').checked) {
      for (let i = 0; i < forceLayout.base_colors.length; i++) {
        const rr = Math.floor(this.normalize_one_val(forceLayout.base_colors[i].r) * 255);
        const gg = Math.floor(this.normalize_one_val(forceLayout.base_colors[i].g) * 255);
        const bb = Math.floor(this.normalize_one_val(forceLayout.base_colors[i].b) * 255);
        forceLayout.all_nodes[i].tint = rgbToHex(rr, gg, bb);
      }
      // update_tints();
    }
  }

  labels_click() {
    document.getElementById('gradient_button').checked = false;
    document.getElementById('labels_button').checked = true;
    document.getElementById('channels_button').checked = false;
    this.update_color_menu_tints();
    this.update_slider();
  }

  gradient_click() {
    document.getElementById('gradient_button').checked = true;
    document.getElementById('channels_button').checked = false;
    document.getElementById('labels_button').checked = false;
    this.update_color_menu_tints();
    this.update_slider();
  }

  update_color_menu_tints() {
    d3.select('#autocomplete').style('background-color', 'rgb(130,200,130)');
    d3.select('#labels_menu').style(
      'background',
      'linear-gradient(to right, rgb(185, 116, 116), rgb(185, 182, 116), rgb(126, 185, 126), rgb(116, 185, 184), rgb(116, 122, 185), rgb(182, 116, 185))',
    );
    d3.select('#gradient_menu').style('background', 'linear-gradient(to right, rgb(185, 83, 32), rgb(185, 185, 83))');

    if (document.getElementById('gradient_button').checked) {
      d3.select('#gradient_menu').style(
        'background',
        'linear-gradient(to right, rgb(255, 153, 102), rgb(255, 255, 153))',
      );
    }
    if (document.getElementById('labels_button').checked) {
      d3.select('#labels_menu').style(
        'background',
        'linear-gradient(to right, rgb(255, 186, 186), rgb(255, 252, 186), rgb(196, 255, 186), rgb(186, 255, 254), rgb(186, 192, 255), rgb(252, 186, 255))',
      );
    }
    if (document.getElementById('channels_button').checked) {
      d3.select('#autocomplete').style('background-color', '#b3ffb3');
    }
  }

  toggle_slider_select() {
    if (d3.select('#slider_select_button').style('stroke') === 'none') {
      this.show_slider_select();
    } else {
      this.hide_slider_select();
    }
    selectionScript.update_selected_count();
  }

  show_slider_select() {
    d3.select('#slider_select_button')
      .style('fill-opacity', 0.7)
      .style('stroke', 'yellow');
    d3.select('#left_bracket').style('visibility', 'visible');
    d3.select('#right_bracket').style('visibility', 'visible');
    d3.select('#floor_bracket').style('visibility', 'visible');
    d3.select('#ceiling_bracket').style('visibility', 'visible');
    d3.select('#right_bracket_label').style('visibility', 'visible');
    d3.select('#left_bracket_label').style('visibility', 'visible');
    this.slider_select_update();
  }

  hide_slider_select() {
    d3.select('#slider_select_button')
      .style('fill-opacity', 0.25)
      .style('stroke', 'none');
    d3.select('#left_bracket').style('visibility', 'hidden');
    d3.select('#right_bracket').style('visibility', 'hidden');
    d3.select('#floor_bracket').style('visibility', 'hidden');
    d3.select('#ceiling_bracket').style('visibility', 'hidden');
    d3.select('#right_bracket_label').style('visibility', 'hidden');
    d3.select('#left_bracket_label').style('visibility', 'hidden');
  }

  set_left_bracket(h) {
    const cx = this.slider_scale(this.slider_scale.invert(h));
    const w = parseInt(d3.select('#right_bracket').attr('x'), 10) - cx + 6.5;
    if (w > 12) {
      d3.select('#left_bracket').attr('x', cx);
      this.floor_bracket.attr('x', cx).style('width', w + 'px');
      this.ceiling_bracket.attr('x', cx).style('width', w + 'px');
      this.left_bracket_label.attr('x', cx);
      this.slider_select_update();
    }
  }

  set_right_bracket(h) {
    const cx = this.slider_scale(this.slider_scale.invert(h));
    const w = cx - parseInt(d3.select('#left_bracket').attr('x'), 10) + 6.5;
    if (w > 12) {
      d3.select('#right_bracket').attr('x', cx);
      this.floor_bracket.style('width', w + 'px');
      this.ceiling_bracket.style('width', w + 'px');
      this.right_bracket_label.attr('x', cx);
      this.slider_select_update();
    }
  }

  slider_select_update() {
    const lower_bound = this.slider_scale.invert(this.left_bracket.attr('x'));
    const upper_bound = this.slider_scale.invert(this.right_bracket.attr('x'));
    this.left_bracket_label.text(lower_bound.toFixed(2));
    this.right_bracket_label.text(upper_bound.toFixed(2));

    let color_array = null;
    if (document.getElementById('gradient_button').checked) {
      const current_selection = document.getElementById('gradient_menu').value;
      color_array = this.gene_set_color_array[current_selection];
    }
    if (document.getElementById('channels_button').checked) {
      this.green_selection = d3.select('#autocomplete').node().value;
      color_array = this.green_array;
    }
    if (document.getElementById('labels_button').checked) {
      color_array = forceLayout.base_colors.map(this.average_color);
    }
    if (color_array != null) {
      for (let i = 0; i < forceLayout.all_nodes.length; i++) {
        const x = color_array[i];
        if (x >= lower_bound && (x <= upper_bound || upper_bound > this.slider_scale.domain()[1] * 0.98)) {
          forceLayout.all_outlines[i].selected = true;
          forceLayout.all_outlines[i].compared = false;
          forceLayout.all_outlines[i].alpha = forceLayout.all_nodes[i].alpha;
          forceLayout.all_outlines[i].tint = '0xffff00';
        } else {
          forceLayout.all_outlines[i].selected = false;
          forceLayout.all_outlines[i].alpha = 0;
        }
      }
    }
  }

  update_slider() {
    d3.select('#label_column')
      .selectAll('div')
      .remove();
    d3.select('#count_column')
      .selectAll('div')
      .remove();
    if (document.getElementById('labels_button').checked) {
      d3.selectAll('#gradient_bar').attr('fill', '#7e7e7e');
      d3.selectAll('#handle').style('fill', '#7e7e7e');
      const name = document.getElementById('labels_menu').value;

      let cat_color_map = this.getSampleCategoricalColoringData(name).label_colors;
      let cat_label_list = this.getSampleCategoricalColoringData(name).label_list;
      d3.select('#legend_mask')
        .transition()
        .attr('x', this.svg_width - 177)
        .on('end', () => {
          this.make_legend(cat_color_map, cat_label_list);
        });

      let max = parseInt(d3.max(forceLayout.base_colors.map(this.max_color)), 10);
      if (max === 0) {
        max = 255;
      }
      this.color_max = max;
      this.slider_scale.domain([0, max * 1.05]);

      this.set_slider_position_only(max);
    } else {
      d3.select('#legend_mask')
        .transition()
        .attr('x', this.svg_width);
      if (this.color_stats == null) {
        return;
      }
      let geneName = '';
      if (document.getElementById('gradient_button').checked) {
        geneName = document.getElementById('gradient_menu').value;
        d3.selectAll('#gradient_bar').attr('fill', 'url(#yellow_gradient)');
        d3.selectAll('#handle').style('fill', '#FFFF99');
      } else {
        // const name = document.getElementById('green_menu').value;
        geneName = document.getElementById('autocomplete').value;
        d3.selectAll('#gradient_bar').attr('fill', 'url(#green_gradient)');
        d3.selectAll('#handle').style('fill', d3.rgb(0, 255, 0).toString());
      }
      if (this.color_stats[geneName]) {
        const max = this.color_stats[geneName][3];
        this.slider_scale.domain([0, max * 1.05]);
        this.set_slider_position_only(this.slider_scale(this.color_stats[geneName][4]));
      }
    }

    if (this.slider_ticks) {
      this.slider_ticks.remove();
      d3.select('.ticks').remove();
    }

    let ticknum = 0;

    if (this.color_max < 1) {
      ticknum = this.color_max * 10;
    } else if (this.color_max < 2) {
      ticknum = this.color_max * 5;
    } else if (this.color_max < 10) {
      ticknum = this.color_max;
    } else if (this.color_max < 50) {
      ticknum = this.color_max / 5;
    } else if (this.color_max < 100) {
      ticknum = this.color_max / 10;
    } else if (this.color_max < 200) {
      ticknum = this.color_max / 20;
    } else if (this.color_max < 1000) {
      ticknum = this.color_max / 100;
    } else if (this.color_max < 20000) {
      ticknum = this.color_max / 1000;
    } else if (this.color_max < 200000) {
      ticknum = this.color_max / 10000;
    } else if (this.color_max < 2000000) {
      ticknum = this.color_max / 100000;
    } else if (this.color_max < 20000000) {
      ticknum = this.color_max / 1000000;
    }

    this.slider_ticks = this.slider
      .insert('g', '.track-overlay')
      .attr('class', 'colorbar_item')
      .attr('id', 'ticks')
      .attr('transform', 'translate(0,' + 18 + ')')
      .selectAll('text')
      .data(this.slider_scale.ticks(ticknum))
      .enter()
      .append('text')
      .attr('x', this.slider_scale)
      .attr('text-anchor', 'middle')
      .text(d => {
        return d;
      });

    if (document.getElementById('gradient_button').checked) {
      d3.select('.ticks')
        .append('text')
        .attr('x', this.svg_width / 3 + 10)
        .text('Z-score');
    } else {
      d3.select('.ticks')
        .append('text')
        .attr('x', this.svg_width / 3 + 10)
        .text('UMIs');
    }
    this.setNodeColors();
    if (this.left_bracket.style('visibility') === 'visible') {
      this.slider_select_update();
    }
  }

  set_slider_position(h) {
    this.handle.attr('cx', this.slider_scale(this.slider_scale.invert(h)));
    this.slider_gradient.attr('width', Math.max(this.slider_scale(this.slider_scale.invert(h)) - 6, 0));
    this.color_max = this.slider_scale.invert(h);
    this.updateColorMax();
  }

  set_slider_position_only(h) {
    this.handle.attr('cx', this.slider_scale(this.slider_scale.invert(h)));
    this.slider_gradient.attr('width', Math.max(this.slider_scale(this.slider_scale.invert(h)) - 6, 0));
    this.color_max = this.slider_scale.invert(h);
  }

  /* -----------------------------------------------------------------------------------
									  Load expression data
	*/

  read_csv(text) {
    let dict = {};
    text.split('\n').forEach((entry, index, array) => {
      if (entry.length > 0) {
        let items = entry.split(',');
        let gene = items[0];
        let exp_array = [];
        items.forEach((e, i, a) => {
          if (i > 0) {
            exp_array.push(parseFloat(e));
          }
        });
        dict[gene] = exp_array;
      }
    });
    return dict;
  }

  addStreamExp(gene_list) {
    const tmpdict = {};
    gene_list.split('\n').forEach(g => {
      if (g.length > 0) {
        tmpdict[g] = 0;
      }
    });
    this.dispatch.call('load', this, tmpdict, 'all_genes');
  }

  getSampleCategoricalColoringData(key) {
    return this.categorical_coloring_data[key];
  }

  geneAutocomplete(gene_list) {
    const gene_lookup = [];
    gene_list.split('\n').forEach(g => {
      if (g.length > 0) {
        gene_lookup.push({ value: g, data: g });
      }
    });
    console.log('# genes = ', gene_lookup.length);

    $('#autocomplete').autocomplete({
      lookup: gene_lookup,
      onSelect: suggestion => {
        const submitGene = suggestion.data;
        document.getElementById('autocomplete').value = submitGene;
        document.getElementById('gradient_button').checked = false;
        document.getElementById('labels_button').checked = false;
        document.getElementById('channels_button').checked = true;
        this.update_slider();
        this.last_gene = submitGene;
        this.gene_entered = true;
      },
    });
    $('#autocomplete').keydown(event => {
      if (event.keyCode === 13) {
        const submitGene = document.getElementById('autocomplete').value;
        document.getElementById('gradient_button').checked = false;
        document.getElementById('labels_button').checked = false;
        document.getElementById('channels_button').checked = true;
        this.update_slider();
        this.last_gene = submitGene;
        this.gene_entered = true;
      }
    });
  }

  showRankedGenes() {
    if (this.color_stats != null) {
      if (
        d3
          .select('#sound_toggle')
          .select('img')
          .attr('src') === 'src/sound_effects/icon_speaker.svg'
      ) {
        const snd = new Audio('src/sound_effects/openclose_sound.wav');
        snd.play();
      }
      // setNodeColors();
      this.hideRankedTerms();
      d3.select('#termsheet').style('left', '10px');
      d3.select('#termcolumn')
        .selectAll('div')
        .remove();
      d3.select('#scorecolumn')
        .selectAll('div')
        .remove();
      this.rankedMask
        .transition()
        .attr('x', 0)
        .each(() => {
          this.renderRankedText(this.all_gene_color_array, 1);
        });
      this.rankedGenesButtonRect.transition().attr('x', 0);
      this.rankedTermsButtonRect.transition().attr('x', 0);
      this.exoutGenesButtonLabel
        .transition()
        .delay(200)
        .style('opacity', 1);
    }
  }

  hideRankedGenes() {
    if (
      d3
        .select('#sound_toggle')
        .select('img')
        .attr('src') === 'src/sound_effects/icon_speaker.svg'
    ) {
      const snd = new Audio('src/sound_effects/openclose_sound.wav');
      snd.play();
    }
    d3.select('#termsheet').style('left', '-200px');
    d3.select('#termcolumn')
      .selectAll('div')
      .remove();
    d3.select('#scorecolumn')
      .selectAll('div')
      .remove();
    this.rankedMask.transition().attr('x', -200);
    this.rankedTermsButtonRect.transition().attr('x', -70);
    this.rankedGenesButtonRect.transition().attr('x', -70);
    this.exoutGenesButtonLabel.style('opacity', 0);
  }

  showRankedTerms() {
    if (this.color_stats != null) {
      if (
        d3
          .select('#sound_toggle')
          .select('img')
          .attr('src') === 'src/sound_effects/icon_speaker.svg'
      ) {
        const snd = new Audio('src/sound_effects/openclose_sound.wav');
        snd.play();
      }
      // setNodeColors();
      this.hideRankedGenes();
      d3.select('#termsheet').style('left', '10px');
      d3.select('#termcolumn')
        .selectAll('div')
        .remove();
      d3.select('#scorecolumn')
        .selectAll('div')
        .remove();
      this.rankedMask
        .transition()
        .attr('x', 0)
        .each(() => {
          this.renderRankedText(this.gene_set_color_array, 0);
        });
      this.rankedGenesButtonRect.transition().attr('x', 0);
      this.rankedTermsButtonRect.transition().attr('x', 0);
      this.exoutTermsButtonLabel
        .transition()
        .delay(200)
        .style('opacity', 1);
    }
  }

  hideRankedTerms() {
    if (
      d3
        .select('#sound_toggle')
        .select('img')
        .attr('src') === 'src/sound_effects/icon_speaker.svg'
    ) {
      const snd = new Audio('src/sound_effects/openclose_sound.wav');
      snd.play();
    }
    d3.select('#termsheet').style('left', '-200px');
    d3.select('#termcolumn')
      .selectAll('div')
      .remove();
    d3.select('#scorecolumn')
      .selectAll('div')
      .remove();
    this.rankedMask.transition().attr('x', -200);
    this.rankedTermsButtonRect.transition().attr('x', -70);
    this.rankedGenesButtonRect.transition().attr('x', -70);
    this.exoutTermsButtonLabel.style('opacity', 0);
  }

  renderRankedText(tracks, version) {
    let any_selected = false;
    for (let i = 0; i < forceLayout.all_outlines.length; i++) {
      if (forceLayout.all_outlines[i].selected || forceLayout.all_outlines[i].compared) {
        any_selected = true;
      }
    }
    if (!any_selected) {
      d3.select('#termcolumn')
        .append('div')
        .append('p')
        .text('No cells selected');
    } else {
      this.getRankedText(tracks, version);
    }
  }

  actuallyRenderRankedText(rankedText) {
    let scorecol = rankedText[1];
    let termcol = [];
    rankedText[0].forEach(d => {
      const term = d;
      termcol.push(term);
    });

    d3.select('#termcolumn')
      .selectAll('div')
      .data(termcol)
      .enter()
      .append('div')
      .append('p')
      .text(d => {
        if (d.length < 20) {
          return d;
        } else {
          return d.slice(0, 17) + '...';
        }
      });

    d3.select('#scorecolumn')
      .selectAll('div')
      .data(scorecol)
      .enter()
      .append('div')
      .append('p')
      .text(d => {
        return d;
      });

    d3.select('#termcolumn')
      .selectAll('div')
      .style('background-color', 'rgba(0, 0, 0, 0)')
      .on('mouseover', d => {
        d3.select(d).style('background-color', 'rgba(0, 0, 0, 0.3)');
      })
      .on('mouseout', d => {
        d3.select(d).style('background-color', 'rgba(0, 0, 0, 0)');
      })
      .on('click', d => {
        if (this.exoutGenesButtonLabel.style('opacity') === '1') {
          document.getElementById('channels_button').checked = true;
          document.getElementById('gradient_button').checked = false;
          document.getElementById('labels_button').checked = false;
          document.getElementById('autocomplete').value = d.toString();
          // d3.select("#green_menu")[0][0].value = d;
          // $("#autocomplete").attr("value", d);// = d;
        }
        if (this.exoutTermsButtonLabel.style('opacity') === '1') {
          document.getElementById('channels_button').checked = false;
          document.getElementById('gradient_button').checked = true;
          document.getElementById('labels_button').checked = false;
          d3.select('#gradient_menu').node().value = d;
        }
        this.update_slider();
      });
  }

  // preload_enrichments();
  preload_enrichments() {
    let sel2text = '';
    for (let i = 0; i < forceLayout.all_outlines.length; i++) {
      sel2text = sel2text + ',' + i.toString();
    }
    sel2text = sel2text.slice(1, sel2text.length);
    const t0 = new Date();
    console.log('Preloading enrichments');
    $.ajax({
      data: {
        base_dir: graph_directory,
        compared_cells: '',
        selected_cells: sel2text,
        sub_dir: project_directory,
      },
      success: data => {
        const t1 = new Date();
        console.log('Preloaded enrichments: ', t1.getTime() - t0.getTime());
        this.enrich_script = 'get_gene_zscores.from_hdf5.dev.py';
      },
      type: 'POST',
      url: 'cgi-bin/get_gene_zscores.from_hdf5.dev.py',
    });
  }

  getRankedText(tracks, version) {
    const selected_nodes = [];
    const compared_nodes = [];
    for (const i in forceLayout.all_outlines) {
      if (forceLayout.all_outlines[i].selected) {
        selected_nodes.push(i);
      }
      if (forceLayout.all_outlines[i].compared) {
        compared_nodes.push(i);
      }
    }
    let scoremap = d3.map();
    let scoretotal = 0;
    let selected_score = 0;
    let compared_score = 0;
    let dat = null;

    if (version === 0) {
      for (const term in tracks) {
        if (selected_nodes.length > 0 || compared_nodes.length > 0) {
          dat = tracks[term];
        }
        if (selected_nodes.length === 0) {
          selected_score = 0;
        } else {
          selected_score = this.getTermScore(dat, selected_nodes) / selected_nodes.length;
          selected_score = (selected_score - this.color_stats[term][0]) / (this.color_stats[term][1] + 0.02);
        }
        if (compared_nodes.length === 0) {
          compared_score = 0;
        } else {
          compared_score = this.getTermScore(dat, compared_nodes) / compared_nodes.length;
          compared_score = (compared_score - this.color_stats[term][0]) / (this.color_stats[term][1] + 0.02);
        }
        scoremap[term] = selected_score - compared_score;
      }
      let tuples = [];
      for (const key in scoremap) {
        if (typeof key === 'string') {
          if (key.length > 1) {
            tuples.push([key, scoremap[key]]);
          }
        }
      }
      tuples.sort((a, b) => {
        return b[1] - a[1];
      });
      let termcol = ['Term'];
      let scorecol = ['Z-score'];

      tuples.forEach(d => {
        let numline = d[1].toString().slice(0, 5);
        termcol.push(d[0]);
        scorecol.push(numline);
      });
      this.actuallyRenderRankedText([termcol.slice(0, 1000), scorecol.slice(0, 1000)]);
    } else {
      let sel2text = '';
      let comp2text = '';
      let n_highlight = 0;
      for (let i = 0; i < forceLayout.all_outlines.length; i++) {
        if (forceLayout.all_outlines[i].selected) {
          sel2text = sel2text + ',' + i.toString();
          n_highlight = n_highlight + 1;
        }
        if (forceLayout.all_outlines[i].compared) {
          comp2text = comp2text + ',' + i.toString();
          n_highlight = n_highlight + 1;
        }
      }
      if (sel2text.length > 0) {
        sel2text = sel2text.slice(1, sel2text.length);
      }
      if (comp2text.length > 0) {
        comp2text = comp2text.slice(1, comp2text.length);
      }

      // if (all_nodes.length > 0) {const script="get_gene_zscores.from_npz.dev.py"; console.log("npz enrichment");}
      // else {const script="get_gene_zscores.from_hdf5.dev.py"; console.log("hdf5 enrichment");}
      // if (n_highlight > 500) {const script="get_gene_zscores.from_npz.py"; console.log("npz enrichment");}
      // else {const script="get_gene_zscores.py"; console.log("hdf5 enrichment");}
      this.enrich_script = 'get_gene_zscores.from_hdf5.dev.py';
      const t0 = new Date();
      console.log(this.enrich_script);
      $.ajax({
        data: {
          base_dir: graph_directory,
          compared_cells: comp2text,
          selected_cells: sel2text,
          sub_dir: project_directory,
        },
        success: data => {
          const t1 = new Date();
          console.log(t1.getTime() - t0.getTime());
          data = data.split('\t');
          let termcol = data[0].split('\n');
          let scorecol = data[1].split('\n').slice(0, -1);
          this.actuallyRenderRankedText([termcol, scorecol]);
        },
        type: 'POST',
        url: 'cgi-bin/' + this.enrich_script,
      });
    }
  }

  getTermScore(a, nodes) {
    let score = 0;
    nodes.forEach(i => {
      score = score + (a[i] + 0.01);
    });
    return score;
  }

  downloadFile(text, name) {
    if (
      d3
        .select('#sound_toggle')
        .select('img')
        .attr('src') === 'src/sound_effects/icon_speaker.svg'
    ) {
      const snd = new Audio('src/sound_effects/download_sound.wav');
      snd.play();
    }
    const hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:attachment/text,' + encodeURI(text);
    hiddenElement.target = '_blank';
    hiddenElement.download = name;
    hiddenElement.click();
  }

  downloadFileDirect(path, filename) {
    console.log(path);
    var hiddenElement = document.createElement('a');
    // hiddenElement.href = ''
    hiddenElement.href = path;
    hiddenElement.target = '_blank';
    hiddenElement.download = filename;
    hiddenElement.click();
  }

  downloadRankedTerms = () => {
    let num_selected = 0;
    let termcol = [];
    let scorecol = [];
    let tracks = this.all_gene_color_array;
    let sparse_version = 1;
    for (let i = 0; i < forceLayout.all_nodes.length; i++) {
      if (forceLayout.all_outlines[i].selected) {
        num_selected += 1;
      }
    }
    let text = '';
    if (num_selected === 0 && this.rankedMask.attr('x') === '-200') {
      text = 'No cells selected!';
    } else {
      if (this.rankedMask.attr('x') === '-200') {
        if (document.getElementById('gradient_button').checked) {
          tracks = this.gene_set_color_array;
          sparse_version = 0;
        } else {
          tracks = this.all_gene_color_array;
          sparse_version = 1;
        }
        let rankedTerms = this.getRankedText(tracks, sparse_version).slice(0, 1000);
        termcol = rankedTerms[0];
        scorecol = rankedTerms[1];
      } else {
        termcol = [];
        scorecol = [];
        d3.select('#termcolumn')
          .selectAll('div')
          .each(d => {
            termcol.push(d);
          });
        d3.select('#scorecolumn')
          .selectAll('div')
          .each(d => {
            scorecol.push(d);
          });
      }
      text = '';
      termcol.forEach((d, i) => {
        text = text + '\n' + d + '\t' + scorecol[i];
      });
      text = text.slice(1, text.length);
    }
    this.downloadFile(text, 'enriched_terms.txt');
  };

  downloadDoubletScores = () => {
    this.downloadFileDirect(`${project_directory}/doublet_results.tsv`, 'doublet_results.tsv');
  };

  make_legend(cat_color_map, cat_label_list) {
    d3.select('#count_column')
      .selectAll('div')
      .data(Object.keys(cat_color_map))
      .enter()
      .append('div')
      .style('display', 'inline-block')
      .attr('class', 'text_count_div')
      .style('height', '25px')
      .style('margin-top', '0px')
      .style('width', '48px')
      .style('overflow', 'hidden')
      .append('p')
      .text('');

    d3.select('#count_column')
      .on('mouseenter', () => {
        d3.selectAll('.text_count_div').each(function() {
          var pct = d3
            .select(this)
            .select('p')
            .text(d3.select(this).attr('pct') + '%');
        });
      })
      .on('mouseleave', () => {
        d3.selectAll('.text_count_div').each(function() {
          d3.select(this)
            .select('p')
            .text(d3.select(this).attr('count'));
        });
      });

    d3.select('#label_column')
      .selectAll('div')
      .data(Object.keys(cat_color_map))
      .enter()
      .append('div')
      .style('display', 'inline-block')
      .attr('class', 'legend_row')
      .style('height', '25px')
      .style('margin-top', '0px')
      .style('width', '152px');
    // .style("overflow","hidden");

    d3.select('#label_column')
      .selectAll('div')
      .data(Object.keys(cat_color_map))
      .enter()
      .append('div')
      .style('display', 'inline-block')
      .attr('class', 'legend_row')
      .style('height', '25px')
      .style('margin-top', '0px')
      .style('width', '152px');
    //.style("overflow","hidden");

    d3.select('#label_column')
      .selectAll('div')
      .each((d, i, nodes) => {
        d3.select(nodes[i])
          .append('div')
          .style('background-color', cat_color_map[d])
          .on('click', () => {
            show_colorpicker_popup(d);
          });
        d3.select(nodes[i])
          .append('div')
          .attr('class', 'text_label_div')
          .append('p')
          .text(d)
          .style('float', 'left')
          .style('white-space', 'nowrap')
          .style('margin-top', '-6px')
          .style('margin-left', '3px')
          .on('click', () => {
            this.categorical_click(d, cat_label_list);
          });
      });

    d3.selectAll('.legend_row')
      .style('width', '152px')
      .style('background-color', 'rgba(0, 0, 0, 0)')
      .on('mouseover', function(d) {
        d3.select(this).style('background-color', 'rgba(0, 0, 0, 0.3)');
      })
      .on('mouseout', function(d) {
        d3.select(this).style('background-color', 'rgba(0, 0, 0, 0)');
      });

    d3.selectAll('.legend_row')
      .selectAll('p')
      .style('width', '150px');

    this.count_clusters();
  }

  categorical_click(selectedLabel, cat_label_list) {
    this.all_selected = true;
    for (let i = 0; i < forceLayout.all_nodes.length; i++) {
      if (cat_label_list[i] === selectedLabel) {
        if (!(forceLayout.all_outlines[i].selected || forceLayout.all_outlines[i].compared)) {
          this.all_selected = false;
        }
      }
    }

    const my_nodes = [];
    const indices = [];
    for (let i = 0; i < forceLayout.all_nodes.length; i++) {
      if (cat_label_list[i] === selectedLabel) {
        my_nodes.push(i);
        if (this.all_selected) {
          forceLayout.all_outlines[i].selected = false;
          forceLayout.all_outlines[i].compared = false;
          forceLayout.all_outlines[i].alpha = 0;
        } else {
          if (selectionScript && selectionScript.selection_mode === 'negative_select') {
            forceLayout.all_outlines[i].compared = true;
            forceLayout.all_outlines[i].tint = '0x0000ff';
            forceLayout.all_outlines[i].alpha = forceLayout.all_nodes[i].alpha;
          } else {
            forceLayout.all_outlines[i].selected = true;
            forceLayout.all_outlines[i].tint = '0xffff00';
            forceLayout.all_outlines[i].alpha = forceLayout.all_nodes[i].alpha;
          }
        }
      }
      if (forceLayout.all_outlines[i].selected) {
        indices.push(i);
      }
    }

    if (forceLayout.all_nodes.length < 25000) {
      this.shrinkNodes(6, 10, my_nodes, forceLayout.all_nodes);
    }

    if (selectionScript) {
      selectionScript.update_selected_count();
    }

    postSelectedCellUpdate(indices);

    this.count_clusters();
  }

  count_clusters() {
    const name = document.getElementById('labels_menu').value;
    if (name.length > 0) {
      const cat_color_map = this.getSampleCategoricalColoringData(name).label_colors;
      const cat_label_list = this.getSampleCategoricalColoringData(name).label_list;
      const cat_counts = this.getSampleCategoricalColoringData(name).label_counts;

      let counts = {};
      Object.keys(cat_color_map).forEach(d => {
        counts[d] = 0;
      });
      for (let i = 0; i < forceLayout.all_nodes.length; i++) {
        if (forceLayout.all_outlines[i].selected || forceLayout.all_outlines[i].compared) {
          counts[cat_label_list[i]] += 1;
        }
      }

      d3.select('#count_column')
        .selectAll('div')
        .each((d, i, nodes) => {
          d3.select(nodes[i])
            .style('visibility', 'hidden')
            .select('p')
            .text('');
          if (counts[d] > 0) {
            d3.select(nodes[i])
              .attr('count', counts[d])
              .attr('pct', Math.floor((counts[d] / cat_counts[d]) * 1000) / 10)
              .style('visibility', 'visible')
              .select('p')
              .text(counts[d]);
          }
        });
    }
  }

  shrinkNodes(scale, numsteps, my_nodes, all_nodes) {
    const current_radii = {};
    const nodes = [];
    for (let ii in my_nodes) {
      // console.log(['A',my_nodes[ii], all_nodes[my_nodes[ii]].active_scaling]);
      if (all_nodes[my_nodes[ii]].active_scaling !== true) {
        nodes.push(my_nodes[ii]);
      }
    }
    for (let ii in nodes) {
      current_radii[ii] = all_nodes[nodes[ii]].scale.x;
      all_nodes[nodes[ii]].active_scaling = true;
    }
    const refreshIntervalId = setInterval(() => {
      if (scale < 1) {
        for (let ii in nodes) {
          current_radii[ii] = all_nodes[nodes[ii]].scale.x;
          all_nodes[nodes[ii]].active_scaling = false;
          // console.log(['B',nodes[ii], all_nodes[nodes[ii]].active_scaling]);
        }
        clearInterval(refreshIntervalId);
      } else {
        for (let ii in nodes) {
          const i = nodes[ii];
          forceLayout.all_outlines[i].scale.set(scale * current_radii[ii]);
          all_nodes[i].scale.set(scale * current_radii[ii]);
        }
        scale = scale - scale / numsteps;
      }
    }, 5);
  }

  toggle_legend_hover_tooltip() {
    const button = d3.select('#toggle_legend_hover_tooltip_button');
    if (button.text() === 'Hide label tooltip') {
      button.text('Show label tooltip');
      d3.select('#legend_hover_tooltip').remove();
    } else {
      button.text('Hide label tooltip');

      const tooltip = d3
        .select('#force_layout')
        .append('div')
        .attr('id', 'legend_hover_tooltip')
        .style('background-color', 'rgba(100,100,100,.92)')
        .style('position', 'absolute')
        .style('top', '100px')
        .style('left', '100px')
        .style('padding', '5px')
        .style('width', '200px')
        .style('border-radius', '5px')
        .style('visibility', 'hidden');

      d3.select('#force_layout').on('mousemove', () => {
        const name = document.getElementById('labels_menu').value;
        if (name.length > 0) {
          const cat_color_map = this.categorical_coloring_data[name].label_colors;
          const cat_label_list = this.categorical_coloring_data[name].label_list;

          let hover_clusters = [];
          const dim = document.getElementById('svg_graph').getBoundingClientRect();
          let x = d3.event.clientX - dim.left;
          let y = d3.event.clientY - dim.top;
          x = (x - forceLayout.sprites.position.x) / forceLayout.sprites.scale.x;
          y = (y - forceLayout.sprites.position.y) / forceLayout.sprites.scale.y;
          for (let i = 0; i < forceLayout.all_nodes.length; i++) {
            const rad = Math.sqrt((forceLayout.all_nodes[i].x - x) ** 2 + (forceLayout.all_nodes[i].y - y) ** 2);
            if (rad < forceLayout.all_nodes[i].scale.x * 20) {
              hover_clusters.push(cat_label_list[i]);
            }
          }

          hover_clusters = hover_clusters.filter((item, pos) => {
            return hover_clusters.indexOf(item) === pos;
          });

          if (hover_clusters.length > 0) {
            tooltip.style('visibility', 'visible');
          } else {
            tooltip.style('visibility', 'hidden');
          }

          tooltip.selectAll('div').remove();
          tooltip
            .selectAll('div')
            .data(hover_clusters)
            .enter()
            .append('div')
            .attr('class', 'legend_row')
            .style('height', '25px')
            .style('margin-top', '0px');

          const widths = [];
          tooltip.selectAll('div').each(function(d) {
            d3.select(this)
              .append('div')
              .style('background-color', cat_color_map[d]);
            const tt = d3
              .select(this)
              .append('div')
              .attr('class', 'text_label_div')
              .append('p')
              .text(d)
              .style('float', 'left')
              .style('white-space', 'nowrap')
              .style('margin-top', '-6px')
              .style('margin-left', '3px');
            widths.push(parseFloat(tt.style('width').split('px')[0]));
          });

          const height = parseFloat(tooltip.style('height').split('px')[0]);
          tooltip
            .style('width', (d3.max(widths) + 45).toString() + 'px')
            .style('left', d3.event.x.toString() + 'px')
            .style('top', (d3.event.y - height - 40).toString() + 'px');
        }
      });
    }
  }

  get_hover_cells = e => {
    const dim = document.getElementById('svg_graph').getBoundingClientRect();
    let x = e.clientX - dim.left;
    let y = e.clientY - dim.top;
    x = (x - forceLayout.sprites.position.x) / forceLayout.sprites.scale.x;
    y = (y - forceLayout.sprites.position.y) / forceLayout.sprites.scale.y;
    const hover_cells = [];
    for (let i = 0; i < forceLayout.all_nodes.length; i++) {
      if (forceLayout.all_outlines[i].selected) {
        const rad = Math.sqrt((forceLayout.all_nodes[i].x - x) ** 2 + (forceLayout.all_nodes[i].y - y) ** 2);
        if (rad < forceLayout.all_nodes[i].scale.x * 20) {
          hover_cells.push(i);
        }
      }
    }
    return hover_cells;
  };

  max_color = c => {
    return d3.max([c.r, c.b, c.g]);
  };

  min_color = c => {
    return d3.min([c.r, c.b, c.g]);
  };

  average_color = c => {
    return d3.mean([c.r, c.b, c.g]);
  };
}
