// tslint:disable:variable-name no-console forin

function colorBar(project_directory, color_menu_genes) {
  /* -----------------------------------------------------------------------------------
										   Top menu bar
	*/
  const color_profiles = {};
  const color_option = 'gradient';
  let noCache = new Date().getTime();
  let color_max = 1;
  let color_stats = null;
  let menuBar = d3.select('#color_chooser');
  // const enrich_script = 'get_gene_zscores.from_npz.dev.py';
  let enrich_script = 'get_gene_zscores.from_hdf5.dev.py';

  let svg_width = parseInt(d3.select('svg').attr('width'), 10);
  let svg_height = parseInt(d3.select('svg').attr('height'), 10);

  /* -------------------------------    Gene menu    ---------------------------- */

  let channelsButton = menuBar
    .append('input')
    .attr('id', 'channels_button')
    .style('margin-left', '-25px')
    .style('visibility', 'hidden')
    .attr('type', 'radio');

  let greenMenu = menuBar
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
      update_color_menu_tints();
      update_slider();
    });

  /* -------------------------------    Label menu    ---------------------------- */

  let labelsButton = menuBar
    .append('input')
    .attr('id', 'labels_button')
    .attr('type', 'radio')
    .style('margin-left', '12px')
    .on('click', labels_click)
    .attr('checked', true);

  let labelsMenu = menuBar
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
      update_slider();
    })
    .on('click', labels_click);

  function labels_click() {
    document.getElementById('gradient_button').checked = false;
    document.getElementById('labels_button').checked = true;
    document.getElementById('channels_button').checked = false;
    update_color_menu_tints();
    update_slider();
  }

  menuBar.selectAll('options').style('font-size', '6px');

  /* -------------------------------    Gradient menu    ---------------------------- */

  const gradientButton = menuBar
    .append('input')
    .style('margin-left', '7px')
    .attr('id', 'gradient_button')
    .attr('type', 'radio')
    .on('click', gradient_click);

  const gradientMenu = menuBar
    .append('select')
    .style('margin-left', '-1px')
    .style('font-size', '13px')
    // .style("background", "linear-gradient(to right, rgb(255, 153, 102), rgb(255, 255, 153))")
    .style('background', 'linear-gradient(to right, rgb(185, 83, 32), rgb(185, 185, 83))')
    .attr('id', 'gradient_menu')
    .on('change', () => {
      update_slider();
    })
    .on('click', gradient_click);

  function gradient_click() {
    document.getElementById('gradient_button').checked = true;
    document.getElementById('channels_button').checked = false;
    document.getElementById('labels_button').checked = false;
    update_color_menu_tints();
    update_slider();
  }

  /* -----------------------------    Populate menus    ---------------------------- */
  const dispatch = d3.dispatch('load', 'statechange');
  dispatch.on('load', (data, tag) => {
    let select;
    if (tag === 'gene_sets') {
      select = gradientMenu;
    } else if (tag === 'all_genes') {
      select = greenMenu;
    } else {
      select = labelsMenu;
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

    dispatch.on('statechange', state => {
      select.property('value', state.id);
    });
  });

  /* -----------------------------------------------------------------------------------
										   Graph coloring
	*/

  const gradient_color = d3
    .scaleLinear()
    .domain([0, 0.5, 1])
    // @ts-ignore
    .range(['black', 'red', 'yellow']);

  const green_array = null;
  const green_array_raw = null;

  function normalize(x) {
    const min = 0;
    const max = color_max;
    const out = [];
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < x.length; i++) {
      if (x[i] > max) {
        out.push(1);
      } else {
        out.push((x[i] - min) / (max - min));
      }
    }
    return out;
  }

  const normalize_one_val = x => {
    const min = 0;
    const max = color_max;
    return x > max ? 1 : (x - min) / (max - min);
  };

  const update_tints = () => {
    for (let i = 0; i < base_colors.length; i++) {
      const rgb = base_colors[i];
      all_nodes[i].tint = rgbToHex(rgb.r, rgb.g, rgb.b);
    }
  };

  const setNodeColors = () => {
    if (document.getElementById('gradient_button').checked) {
      const current_selection = document.getElementById('gradient_menu').value;
      const color_array = normalize(gene_set_color_array[current_selection]);
      for (let i = 0; i < base_colors.length; i++) {
        base_colors[i] = d3.rgb(gradient_color(color_array[i]));
      }
      update_tints();
    }
    if (document.getElementById('labels_button').checked) {
      const name = document.getElementById('labels_menu').value;
      const cat_color_map = categorical_coloring_data[name].label_colors;
      const cat_label_list = categorical_coloring_data[name].label_list;
      for (const i = 0; i < base_colors.length; i++) {
        base_colors[i] = d3.rgb(cat_color_map[cat_label_list[i]]);
      }
      update_tints();
    }
    if (document.getElementById('channels_button').checked) {
      const t0 = new Date();
      const green_selection = document.getElementById('autocomplete').value;
      console.log(green_selection);
      $.ajax({
        data: { base_dir: graph_directory, sub_dir: graph_directory + '/' + sub_directory, gene: green_selection },
        success: function(data) {
          const t1 = new Date();
          console.log('Read gene data: ', t1.getTime() - t0.getTime());
          green_array = data.split('\n').slice(0, -1);
          green_array_raw = data.split('\n').slice(0, -1);
          for (const i = 0; i < all_nodes.length; i++) {
            const rawval = green_array[i];
            const gg = normalize_one_val(rawval);
            base_colors[i] = { r: 0, g: Math.floor(gg * 255), b: 0 };
          }

          app.stage.children[1].children.sort(function(a, b) {
            return green_array[a.index] - green_array[b.index];
          });

          update_tints();
          if (d3.select('#left_bracket').style('visibility') === 'visible') {
            slider_select_update();
            update_selected_count();
          }
        },
        type: 'POST',
        url: 'cgi-bin/grab_one_gene.py',
      });
    }
  };

  const updateColorMax = () => {
    if (document.getElementById('gradient_button').checked) {
      const current_selection = document.getElementById('gradient_menu').value;
      const color_array = normalize(gene_set_color_array[current_selection]);
      for (const i = 0; i < base_colors.length; i++) {
        base_colors[i] = d3.rgb(gradient_color(color_array[i]));
      }
      update_tints();
    }
    if (document.getElementById('channels_button').checked) {
      for (let i = 0; i < base_colors.length; i++) {
        const gg = normalize_one_val(green_array[i]);
        base_colors[i] = { r: 0, g: Math.floor(gg * 255), b: 0 };
      }
      update_tints();
    }
    if (document.getElementById('labels_button').checked) {
      for (let i = 0; i < base_colors.length; i++) {
        const rr = Math.floor(normalize_one_val(base_colors[i].r) * 255);
        const gg = Math.floor(normalize_one_val(base_colors[i].g) * 255);
        const bb = Math.floor(normalize_one_val(base_colors[i].b) * 255);
        all_nodes[i].tint = rgbToHex(rr, gg, bb);
      }
      // update_tints();
    }
  };

  /* -----------------------------------------------------------------------------------
					 				Color slider
	*/

  const yellow_gradient = d3
    .select('svg')
    .append('defs')
    .append('linearGradient')
    .attr('id', 'yellow_gradient')
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '100%')
    .attr('y2', '0%')
    .attr('spreadMethod', 'pad');
  yellow_gradient
    .append('stop')
    .attr('offset', '0%')
    .attr('stop-color', 'black')
    .attr('stop-opacity', 1);
  yellow_gradient
    .append('stop')
    .attr('offset', '50%')
    .attr('stop-color', 'red')
    .attr('stop-opacity', 1);
  yellow_gradient
    .append('stop')
    .attr('offset', '100%')
    .attr('stop-color', 'yellow')
    .attr('stop-opacity', 1);

  const green_gradient = d3
    .select('svg')
    .append('defs')
    .append('linearGradient')
    .attr('id', 'green_gradient')
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '100%')
    .attr('y2', '0%')
    .attr('spreadMethod', 'pad');
  green_gradient
    .append('stop')
    .attr('offset', '0%')
    .attr('stop-color', 'black')
    .attr('stop-opacity', 1);
  green_gradient
    .append('stop')
    .attr('offset', '100%')
    .attr('stop-color', d3.rgb(0, 255, 0))
    .attr('stop-opacity', 1);

  const slider_scale = d3
    .scaleLinear()
    .domain([0, 10])
    .range([0, svg_width / 3])
    .clamp(true);

  const slider = d3
    .select('svg')
    .append('g')
    .attr('class', 'colorbar_item')
    .attr('id', 'slider')
    .attr('transform', 'translate(' + svg_width / 3 + ',' + 26 + ')');

  const current_value = 0;

  slider
    .append('line')
    .attr('class', 'colorbar_item')
    .attr('id', 'track')
    .attr('x1', slider_scale.range()[0])
    .attr('x2', slider_scale.range()[1])
    .select(function() {
      return this.parentNode.appendChild(this.cloneNode(true));
    })
    .attr('id', 'track-inset')
    .select(function() {
      return this.parentNode.appendChild(this.cloneNode(true));
    })
    .attr('id', 'track-overlay');

  const slider_gradient = slider
    .append('rect')
    .attr('class', 'colorbar_item')
    .attr('id', 'gradient_bar')
    .attr('fill', 'url(#yellow_gradient)')
    .attr('x', -2)
    .attr('y', -3.5)
    .attr('width', 1)
    .attr('height', 7);

  const handle = slider
    .insert('circle', '#track-overlay')
    .attr('class', 'colorbar_item')
    .attr('id', 'handle')
    .style('fill', '#FFFF99')
    .attr('r', 8);

  const left_bracket = slider
    .append('rect', '#track-overlay')
    .attr('class', 'colorbar_item')
    .attr('id', 'left_bracket')
    .style('fill', 'yellow')
    .attr('width', 6.5)
    .attr('height', 21)
    .attr('x', 110)
    .attr('y', -10)
    .style('visibility', 'hidden');

  const right_bracket = slider
    .append('rect', '#track-overlay')
    .attr('class', 'colorbar_item')
    .attr('id', 'right_bracket')
    .style('fill', 'yellow')
    .attr('width', 6.5)
    .attr('height', 21)
    .attr('x', 240)
    .attr('y', -10)
    .style('visibility', 'hidden');

  const left_bracket_label = slider
    .append('text', '#track-overlay')
    .attr('class', 'bracket_label')
    .attr('id', 'left_bracket_label')
    .attr('x', 110)
    .attr('y', 30)
    .style('visibility', 'hidden')
    .style('color', 'red')
    .text('');

  const right_bracket_label = slider
    .append('text', '#track-overlay')
    .attr('class', 'bracket_label')
    .attr('id', 'right_bracket_label')
    .attr('x', 240)
    .attr('y', 30)
    .style('visibility', 'hidden')
    .text('');

  const ceiling_bracket = slider
    .append('rect', '#track-overlay')
    .attr('class', 'colorbar_item')
    .attr('id', 'ceiling_bracket')
    .style('fill', 'yellow')
    .attr('width', 136.5)
    .attr('height', 5)
    .attr('x', 110)
    .attr('y', -12)
    .style('visibility', 'hidden');

  const floor_bracket = slider
    .append('rect', '#track-overlay')
    .attr('class', 'colorbar_item')
    .attr('id', 'floor_bracket')
    .style('fill', 'yellow')
    .attr('width', 136.5)
    .attr('height', 5)
    .attr('x', 110)
    .attr('y', 6)
    .style('visibility', 'hidden');

  const slider_ticks = slider
    .insert('g', '#track-overlay')
    .attr('class', 'colorbar_item')
    .attr('id', 'ticks')
    .attr('transform', 'translate(0,' + 18 + ')')
    .selectAll('text')
    .data(slider_scale.ticks(10))
    .enter()
    .append('text')
    .attr('x', slider_scale)
    .attr('text-anchor', 'middle')
    .text(d => {
      return d;
    });

  d3.select('#legend')
    .style('left', (svg_width - 224).toString() + 'px')
    .style('height', (svg_height - 158).toString() + 'px');

  const legendMask = d3
    .select('svg')
    .append('rect')
    .attr('class', 'colorbar_item')
    .attr('id', 'legend_mask')
    .attr('x', svg_width)
    .attr('y', 158)
    .attr('fill-opacity', 0.35)
    .attr('width', 405)
    .attr('height', d3.select('svg').attr('height'));

  d3.select('#slider_select_button')
    .select('button')
    .on('click', toggle_slider_select);

  const drag_mode = null;
  slider.call(
    d3
      .drag()
      .on('start', () => {
        const cx = d3.event.sourceEvent.x - svg_width / 3;
        // console.log(svg_width, d3.select("#track").attr("x"));
        if (
          Math.abs(cx - parseFloat(left_bracket.attr('x')) - 12) < 5 &&
          d3.select('#left_bracket').style('visibility') === 'visible'
        ) {
          drag_mode = 'left_bracket';
          // console.log(cx, parseFloat(left_bracket.attr("x")));
        } else if (
          Math.abs(cx - parseFloat(right_bracket.attr('x')) - 12) < 5 &&
          d3.select('#right_bracket').style('visibility') === 'visible'
        ) {
          drag_mode = 'right_bracket';
          // console.log(cx, parseFloat(right_bracket.attr("x")));
        } else {
          drag_mode = 'handle';
        }
      })
      .on('drag', () => {
        const cx = d3.event.x - svg_width / 3;
        if (drag_mode === 'left_bracket') {
          set_left_bracket(cx);
          update_selected_count();
        }
        if (drag_mode === 'right_bracket') {
          set_right_bracket(cx);
          update_selected_count();
        } else if (drag_mode === 'handle') {
          set_slider_position(cx);
        }
      })
      .on('end', () => {
        slider.interrupt();
      }),
  );

  function update_color_menu_tints() {
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

  function toggle_slider_select() {
    if (d3.select('#slider_select_button').style('stroke') === 'none') {
      show_slider_select();
    } else {
      hide_slider_select();
    }
    update_selected_count();
  }

  function show_slider_select() {
    d3.select('#slider_select_button')
      .style('fill-opacity', 0.7)
      .style('stroke', 'yellow');
    d3.select('#left_bracket').style('visibility', 'visible');
    d3.select('#right_bracket').style('visibility', 'visible');
    d3.select('#floor_bracket').style('visibility', 'visible');
    d3.select('#ceiling_bracket').style('visibility', 'visible');
    d3.select('#right_bracket_label').style('visibility', 'visible');
    d3.select('#left_bracket_label').style('visibility', 'visible');
    slider_select_update();
  }

  function hide_slider_select() {
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

  function set_left_bracket(h) {
    const cx = slider_scale(slider_scale.invert(h));
    const w = parseInt(d3.select('#right_bracket').attr('x'), 10) - cx + 6.5;
    if (w > 12) {
      d3.select('#left_bracket').attr('x', cx);
      floor_bracket.attr('x', cx).style('width', w + 'px');
      ceiling_bracket.attr('x', cx).style('width', w + 'px');
      left_bracket_label.attr('x', cx);
      slider_select_update();
    }
  }

  function set_right_bracket(h) {
    const cx = slider_scale(slider_scale.invert(h));
    const w = cx - parseInt(d3.select('#left_bracket').attr('x'), 10) + 6.5;
    if (w > 12) {
      d3.select('#right_bracket').attr('x', cx);
      floor_bracket.style('width', w + 'px');
      ceiling_bracket.style('width', w + 'px');
      right_bracket_label.attr('x', cx);
      slider_select_update();
    }
  }

  function slider_select_update() {
    const lower_bound = slider_scale.invert(left_bracket.attr('x'));
    const upper_bound = slider_scale.invert(right_bracket.attr('x'));
    left_bracket_label.text(lower_bound.toFixed(2));
    right_bracket_label.text(upper_bound.toFixed(2));

    const color_array = null;
    if (document.getElementById('gradient_button').checked) {
      const current_selection = document.getElementById('gradient_menu').value;
      color_array = gene_set_color_array[current_selection];
    }
    if (document.getElementById('channels_button').checked) {
      const green_selection = d3.select('#autocomplete')[0][0].value;
      color_array = green_array;
    }
    if (document.getElementById('labels_button').checked) {
      color_array = base_colors.map(average_color);
    }
    if (color_array != null) {
      for (i = 0; i < all_nodes.length; i++) {
        const x = color_array[i];
        if (x >= lower_bound && (x <= upper_bound || upper_bound > slider_scale.domain()[1] * 0.98)) {
          all_outlines[i].selected = true;
          all_outlines[i].compared = false;
          all_outlines[i].alpha = all_nodes[i].alpha;
          all_outlines[i].tint = '0xffff00';
        } else {
          all_outlines[i].selected = false;
          all_outlines[i].alpha = 0;
        }
      }
    }
  }

  const update_slider = () => {
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
      let cat_color_map = categorical_coloring_data.Sample.label_colors;
      let cat_label_list = categorical_coloring_data.Sample.label_list;
      d3.select('#legend_mask')
        .transition()
        .attr('x', svg_width - 177)
        .each('end', function() {
          make_legend(cat_color_map, cat_label_list);
        });
      const max = d3.max(base_colors.map(max_color));
      if (max === 0) {
        max = 255;
      }
      color_max = max;
      slider_scale.domain([0, max * 1.05]);
      set_slider_position_only(max);
    } else {
      d3.select('#legend_mask')
        .transition()
        .attr('x', svg_width);
      if (color_stats == null) {
        return;
      }
      if (document.getElementById('gradient_button').checked) {
        const name = document.getElementById('gradient_menu').value;
        d3.selectAll('#gradient_bar').attr('fill', 'url(#yellow_gradient)');
        d3.selectAll('#handle').style('fill', '#FFFF99');
      } else {
        // const name = document.getElementById('green_menu').value;
        const name = document.getElementById('autocomplete').value;
        console.log('Gene = ', name);
        d3.selectAll('#gradient_bar').attr('fill', 'url(#green_gradient)');
        d3.selectAll('#handle').style('fill', d3.rgb(0, 255, 0));
      }
      const max = color_stats[name][3];
      slider_scale.domain([0, max * 1.05]);
      set_slider_position_only(slider_scale(color_stats[name][4]));
    }

    slider_ticks.remove();
    d3.select('.ticks').remove();

    if (max < 1) {
      ticknum = max * 10;
    } else if (max < 2) {
      ticknum = max * 5;
    } else if (max < 10) {
      ticknum = max;
    } else if (max < 50) {
      ticknum = max / 5;
    } else if (max < 100) {
      ticknum = max / 10;
    } else if (max < 200) {
      ticknum = max / 20;
    } else if (max < 1000) {
      ticknum = max / 100;
    } else if (max < 20000) {
      ticknum = max / 1000;
    } else if (max < 200000) {
      ticknum = max / 10000;
    } else if (max < 2000000) {
      ticknum = max / 100000;
    } else if (max < 20000000) {
      ticknum = max / 1000000;
    }

    slider_ticks = slider
      .insert('g', '.track-overlay')
      .attr('class', 'colorbar_item')
      .attr('id', 'ticks')
      .attr('transform', 'translate(0,' + 18 + ')')
      .selectAll('text')
      .data(slider_scale.ticks(ticknum))
      .enter()
      .append('text')
      .attr('x', slider_scale)
      .attr('text-anchor', 'middle')
      .text(d => {
        return d;
      });

    if (document.getElementById('gradient_button').checked) {
      d3.select('.ticks')
        .append('text')
        .attr('x', svg_width / 3 + 10)
        .text('Z-score');
    } else {
      d3.select('.ticks')
        .append('text')
        .attr('x', svg_width / 3 + 10)
        .text('UMIs');
    }
    setNodeColors();
    if (left_bracket.style('visibility') === 'visible') {
      slider_select_update();
    }
  };

  function set_slider_position(h) {
    handle.attr('cx', slider_scale(slider_scale.invert(h)));
    slider_gradient.attr('width', Math.max(slider_scale(slider_scale.invert(h)) - 6, 0));
    color_max = slider_scale.invert(h);
    updateColorMax();
  }

  set_slider_position_only = function set_slider_position_only(h) {
    handle.attr('cx', slider_scale(slider_scale.invert(h)));
    slider_gradient.attr('width', Math.max(slider_scale(slider_scale.invert(h)) - 6, 0));
    color_max = slider_scale.invert(h);
  };

  /* -----------------------------------------------------------------------------------
									  Load expression data
	*/

  function read_csv(text) {
    dict = {};
    text.split('\n').forEach((entry, index, array) => {
      if (entry.length > 0) {
        items = entry.split(',');
        gene = items[0];
        exp_array = [];
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

  all_gene_color_array = {};
  all_gene_cellix_array = {};

  // open json file containing gene sets and populate drop down menu
  d3.text(project_directory + '/color_data_gene_sets.csv' + '?_=' + noCache).then(text => {
    gene_set_color_array = read_csv(text);

    // gradientMenu.selectAll("option").remove();
    dispatch.call('load', gene_set_color_array, 'gene_sets');
    // update_slider();
  });

  // open json file containing gene sets and populate drop down menu
  d3.json(project_directory + '/categorical_coloring_data.json' + '?_=' + noCache).then(data => {
    categorical_coloring_data = data;
    Object.keys(categorical_coloring_data).forEach(k => {
      const label_counts = {};
      Object.keys(categorical_coloring_data[k].label_colors).forEach(n => {
        label_counts[n] = 0;
      });
      categorical_coloring_data[k].label_list.forEach(n => {
        label_counts[n] += 1;
      });
      categorical_coloring_data[k].label_counts = label_counts;
    });

    dispatch.call('load', categorical_coloring_data, 'cell_labels');
    update_slider();
  });

  function addStreamExp(gene_list) {
    const tmpdict = {};
    gene_list.split('\n').forEach(g => {
      if (g.length > 0) {
        tmpdict[g] = 0;
      }
    });
    dispatch.call('load', tmpdict, 'all_genes');
  }

  d3.json(project_directory + '/color_stats.json' + '?_=' + noCache).then(data => {
    color_stats = data;
  });
  addStreamExp(color_menu_genes);

  const last_gene = '';
  const gene_entered = false;

  function geneAutocomplete(gene_list) {
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
        update_slider();
        last_gene = submitGene;
        gene_entered = true;
      },
    });
    $('#autocomplete').keydown(event => {
      if (event.keyCode === 13) {
        const submitGene = document.getElementById('autocomplete').value;
        document.getElementById('gradient_button').checked = false;
        document.getElementById('labels_button').checked = false;
        document.getElementById('channels_button').checked = true;
        update_slider();
        last_gene = submitGene;
        gene_entered = true;
      }
    });
  }

  $('#autocomplete').blur(() => {
    if (gene_entered) {
      document.getElementById('autocomplete').value = last_gene;
    } else {
      document.getElementById('autocomplete').value = 'Enter gene name';
    }
  });

  $('#autocomplete').focus(() => {
    if (!gene_entered) {
      document.getElementById('autocomplete').value = '';
    }
  });

  geneAutocomplete(color_menu_genes);

  /* -----------------------------------------------------------------------------------
					 Create button for showing enriched gene for a selection
	*/

  d3.select('#termsheet').attr('height', svg_height - 5);

  const rankedGenesButtonRect = d3
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
      showRankedGenes();
    });

  const rankedGenesButtonLabel = d3
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

  const rankedMask = d3
    .select('svg')
    .append('rect')
    .attr('class', 'colorbar_item')
    .attr('x', -200)
    .attr('y', 48)
    .attr('fill-opacity', 0.35)
    .style('color', 'gray')
    .attr('width', 200)
    .attr('height', d3.select('svg').attr('height'));

  exoutGenesButtonLabel = d3
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

  const exoutGenesButton = d3
    .select('svg')
    .append('rect')
    .attr('class', 'colorbar_item')
    .attr('x', 170)
    .attr('y', 24)
    .attr('width', 40)
    .attr('height', 30)
    .attr('fill-opacity', 0)
    .on('click', () => {
      hideRankedGenes();
    });

  function showRankedGenes() {
    if (color_stats != null) {
      if (
        d3
          .select('#sound_toggle')
          .select('img')
          .attr('src') === 'scripts_1_6_dev/sound_effects/icon_speaker.svg'
      ) {
        const snd = new Audio('scripts_1_6_dev/sound_effects/openclose_sound.wav');
        snd.play();
      }
      // setNodeColors();
      hideRankedTerms();
      d3.select('#termsheet').style('left', '10px');
      d3.select('#termcolumn')
        .selectAll('div')
        .remove();
      d3.select('#scorecolumn')
        .selectAll('div')
        .remove();
      rankedMask
        .transition()
        .attr('x', 0)
        .each('end', () => {
          renderRankedText(all_gene_color_array, 1);
        });
      rankedGenesButtonRect.transition().attr('x', 0);
      rankedTermsButtonRect.transition().attr('x', 0);
      exoutGenesButtonLabel
        .transition()
        .delay(200)
        .style('opacity', 1);
    }
  }

  function hideRankedGenes() {
    if (
      d3
        .select('#sound_toggle')
        .select('img')
        .attr('src') === 'scripts_1_6_dev/sound_effects/icon_speaker.svg'
    ) {
      const snd = new Audio('scripts_1_6_dev/sound_effects/openclose_sound.wav');
      snd.play();
    }
    d3.select('#termsheet').style('left', '-200px');
    d3.select('#termcolumn')
      .selectAll('div')
      .remove();
    d3.select('#scorecolumn')
      .selectAll('div')
      .remove();
    rankedMask.transition().attr('x', -200);
    rankedTermsButtonRect.transition().attr('x', -70);
    rankedGenesButtonRect.transition().attr('x', -70);
    exoutGenesButtonLabel.style('opacity', 0);
  }

  /* -----------------------------------------------------------------------------------
					 Create button for showing enriched gene set for a selection
	*/

  const rankedTermsButtonRect = d3
    .select('svg')
    .append('rect')
    .attr('class', 'colorbar_item')
    .attr('x', -70)
    .attr('y', 0)
    .attr('fill-opacity', 0.35)
    .attr('width', 200)
    .attr('height', 24)
    .on('click', () => {
      showRankedTerms();
    });

  const rankedTermsButtonLabel = d3
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

  const exoutTermsButtonLabel = d3
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

  const exoutTermsButton = d3
    .select('svg')
    .append('rect')
    .attr('class', 'colorbar_item')
    .attr('x', 170)
    .attr('y', 0)
    .attr('width', 30)
    .attr('height', 30)
    .attr('fill-opacity', 0)
    .on('click', () => {
      hideRankedTerms();
    });

  function showRankedTerms() {
    if (color_stats != null) {
      if (
        d3
          .select('#sound_toggle')
          .select('img')
          .attr('src') === 'scripts_1_6_dev/sound_effects/icon_speaker.svg'
      ) {
        const snd = new Audio('scripts_1_6_dev/sound_effects/openclose_sound.wav');
        snd.play();
      }
      // setNodeColors();
      hideRankedGenes();
      d3.select('#termsheet').style('left', '10px');
      d3.select('#termcolumn')
        .selectAll('div')
        .remove();
      d3.select('#scorecolumn')
        .selectAll('div')
        .remove();
      rankedMask
        .transition()
        .attr('x', 0)
        .each('end', () => {
          renderRankedText(gene_set_color_array, 0);
        });
      rankedGenesButtonRect.transition().attr('x', 0);
      rankedTermsButtonRect.transition().attr('x', 0);
      exoutTermsButtonLabel
        .transition()
        .delay(200)
        .style('opacity', 1);
    }
  }

  function hideRankedTerms() {
    if (
      d3
        .select('#sound_toggle')
        .select('img')
        .attr('src') === 'scripts_1_6_dev/sound_effects/icon_speaker.svg'
    ) {
      const snd = new Audio('scripts_1_6_dev/sound_effects/openclose_sound.wav');
      snd.play();
    }
    d3.select('#termsheet').style('left', '-200px');
    d3.select('#termcolumn')
      .selectAll('div')
      .remove();
    d3.select('#scorecolumn')
      .selectAll('div')
      .remove();
    rankedMask.transition().attr('x', -200);
    rankedTermsButtonRect.transition().attr('x', -70);
    rankedGenesButtonRect.transition().attr('x', -70);
    exoutTermsButtonLabel.style('opacity', 0);
  }

  function renderRankedText(tracks, version) {
    any_selected = false;
    for (i = 0; i < all_outlines.length; i++) {
      if (all_outlines[i].selected || all_outlines[i].compared) {
        any_selected = true;
      }
    }
    if (!any_selected) {
      d3.select('#termcolumn')
        .append('div')
        .append('p')
        .text('No cells selected');
    } else {
      getRankedText(tracks, version);
    }
  }

  function actuallyRenderRankedText(rankedText) {
    scorecol = rankedText[1];
    termcol = [];
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
        d3.select(this).style('background-color', 'rgba(0, 0, 0, 0.3)');
      })
      .on('mouseout', d => {
        d3.select(this).style('background-color', 'rgba(0, 0, 0, 0)');
      })
      .on('click', d => {
        if (exoutGenesButtonLabel.style('opacity') === 1) {
          document.getElementById('channels_button').checked = true;
          document.getElementById('gradient_button').checked = false;
          document.getElementById('labels_button').checked = false;
          document.getElementById('autocomplete').value = d.toString();
          // d3.select("#green_menu")[0][0].value = d;
          // $("#autocomplete").attr("value", d);// = d;
        }
        if (exoutTermsButtonLabel.style('opacity') === 1) {
          document.getElementById('channels_button').checked = false;
          document.getElementById('gradient_button').checked = true;
          document.getElementById('labels_button').checked = false;
          d3.select('#gradient_menu')[0][0].value = d;
        }
        update_slider();
      });
  }

  // preload_enrichments();
  function preload_enrichments() {
    const sel2text = '';
    for (i = 0; i < all_outlines.length; i++) {
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
        sub_dir: graph_directory + '/' + sub_directory,
      },
      success: data => {
        const t1 = new Date();
        console.log('Preloaded enrichments: ', t1.getTime() - t0.getTime());
        enrich_script = 'get_gene_zscores.from_hdf5.dev.py';
      },
      type: 'POST',
      url: 'cgi-bin/get_gene_zscores.from_hdf5.dev.py',
    });
  }

  function getRankedText(tracks, version) {
    const selected_nodes = [];
    const compared_nodes = [];
    for (const i in all_outlines) {
      if (all_outlines[i].selected) {
        selected_nodes.push(i);
      }
      if (all_outlines[i].compared) {
        compared_nodes.push(i);
      }
    }
    scoremap = d3.map();
    const scoretotal = 0;
    const selected_score = 0;
    const compared_score = 0;
    if (version === 0) {
      for (const term in tracks) {
        if (selected_nodes.length > 0 || compared_nodes.length > 0) {
          dat = tracks[term];
        }
        if (selected_nodes.length === 0) {
          selected_score = 0;
        } else {
          selected_score = getTermScore(dat, selected_nodes) / selected_nodes.length;
          selected_score = (selected_score - color_stats[term][0]) / (color_stats[term][1] + 0.02);
        }
        if (compared_nodes.length === 0) {
          compared_score = 0;
        } else {
          compared_score = getTermScore(dat, compared_nodes) / compared_nodes.length;
          compared_score = (compared_score - color_stats[term][0]) / (color_stats[term][1] + 0.02);
        }
        scoremap[term] = selected_score - compared_score;
      }
      tuples = [];
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
      (termcol = ['Term']), (scorecol = ['Z-score']);
      tuples.forEach(d => {
        numline = d[1].toString().slice(0, 5);
        termcol.push(d[0]);
        scorecol.push(numline);
      });
      actuallyRenderRankedText([termcol.slice(0, 1000), scorecol.slice(0, 1000)]);
    } else {
      const sel2text = '';
      const comp2text = '';
      const n_highlight = 0;
      for (let i = 0; i < all_outlines.length; i++) {
        if (all_outlines[i].selected) {
          sel2text = sel2text + ',' + i.toString();
          n_highlight = n_highlight + 1;
        }
        if (all_outlines[i].compared) {
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
      enrich_script = 'get_gene_zscores.from_hdf5.dev.py';
      const t0 = new Date();
      console.log(enrich_script);
      $.ajax({
        data: {
          base_dir: graph_directory,
          compared_cells: comp2text,
          selected_cells: sel2text,
          sub_dir: graph_directory + '/' + sub_directory,
        },
        success: data => {
          const t1 = new Date();
          console.log(t1.getTime() - t0.getTime());
          data = data.split('\t');
          termcol = data[0].split('\n');
          scorecol = data[1].split('\n').slice(0, -1);
          actuallyRenderRankedText([termcol, scorecol]);
        },
        type: 'POST',
        url: 'cgi-bin/' + enrich_script,
      });
    }
  }

  function getTermScore(a, nodes) {
    const score = 0;
    nodes.forEach(i => {
      score = score + (a[i] + 0.01);
    });
    return score;
  }

  function downloadFile(text, name) {
    if (
      d3
        .select('#sound_toggle')
        .select('img')
        .attr('src') === 'scripts_1_6_dev/sound_effects/icon_speaker.svg'
    ) {
      const snd = new Audio('scripts_1_6_dev/sound_effects/download_sound.wav');
      snd.play();
    }
    const hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:attachment/text,' + encodeURI(text);
    hiddenElement.target = '_blank';
    hiddenElement.download = name;
    hiddenElement.click();
  }

  downloadRankedTerms = function downloadRankedTerms() {
    const num_selected = 0;
    for (i = 0; i < all_nodes.length; i++) {
      if (all_outlines[i].selected) {
        num_selected += 1;
      }
    }
    if (num_selected === 0 && rankedMask.attr('x') === -200) {
      text = 'No cells selected!';
    } else {
      if (rankedMask.attr('x') === -200) {
        if (document.getElementById('gradient_button').checked) {
          const tracks = gene_set_color_array;
          const sparse_version = 0;
        } else {
          const tracks = all_gene_color_array;
          const sparse_version = 1;
        }
        rankedTerms = getRankedText(tracks, sparse_version).slice(0, 1000);
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
      const text = '';
      termcol.forEach((d, i) => {
        text = text + '\n' + d + '\t' + scorecol[i];
      });
      text = text.slice(1, text.length);
    }
    downloadFile(text, 'enriched_terms.txt');
  };
}

function make_legend(cat_color_map, cat_label_list) {
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
        const pct = d3
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
    .each(function(d) {
      d3.select(this)
        .append('div')
        .style('background-color', cat_color_map[d])
        .on('click', () => {
          show_colorpicker_popup(d);
        });
      d3.select(this)
        .append('div')
        .attr('class', 'text_label_div')
        .append('p')
        .text(d)
        .style('float', 'left')
        .style('white-space', 'nowrap')
        .style('margin-top', '-6px')
        .style('margin-left', '3px')
        .on('click', () => {
          categorical_click(d, cat_label_list);
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

  count_clusters();
}

function categorical_click(d, cat_label_list) {
  all_selected = true;
  for (i = 0; i < all_nodes.length; i++) {
    if (cat_label_list[i] === d) {
      if (!(all_outlines[i].selected || all_outlines[i].compared)) {
        all_selected = false;
      }
    }
  }

  const my_nodes = [];
  for (i = 0; i < all_nodes.length; i++) {
    if (cat_label_list[i] === d) {
      my_nodes.push(i);
      if (all_selected) {
        all_outlines[i].selected = false;
        all_outlines[i].compared = false;
        all_outlines[i].alpha = 0;
      } else {
        if (selection_mode === 'negative_select') {
          all_outlines[i].compared = true;
          all_outlines[i].tint = '0x0000ff';
          all_outlines[i].alpha = all_nodes[i].alpha;
        } else {
          all_outlines[i].selected = true;
          all_outlines[i].tint = '0xffff00';
          all_outlines[i].alpha = all_nodes[i].alpha;
        }
      }
    }
  }

  if (all_nodes.length < 25000) {
    shrinkNodes(6, 10, my_nodes);
  }
  update_selected_count();
  count_clusters();
}

function shrinkNodes(scale, numsteps, my_nodes) {
  const current_radii = {};
  const nodes = [];
  for (ii in my_nodes) {
    // console.log(['A',my_nodes[ii], all_nodes[my_nodes[ii]].active_scaling]);
    if (all_nodes[my_nodes[ii]].active_scaling !== true) {
      nodes.push(my_nodes[ii]);
    }
  }
  for (ii in nodes) {
    current_radii[ii] = all_nodes[nodes[ii]].scale.x;
    all_nodes[nodes[ii]].active_scaling = true;
  }
  const refreshIntervalId = setInterval(() => {
    if (scale < 1) {
      for (ii in nodes) {
        current_radii[ii] = all_nodes[nodes[ii]].scale.x;
        all_nodes[nodes[ii]].active_scaling = false;
        // console.log(['B',nodes[ii], all_nodes[nodes[ii]].active_scaling]);
      }
      clearInterval(refreshIntervalId);
    } else {
      for (ii in nodes) {
        const i = nodes[ii];
        all_outlines[i].scale.set(scale * current_radii[ii]);
        all_nodes[i].scale.set(scale * current_radii[ii]);
      }
      scale = scale - scale / numsteps;
    }
  }, 5);
}

function count_clusters() {
  const name = document.getElementById('labels_menu').value;
  if (name.length > 0) {
    const cat_color_map = categorical_coloring_data[name].label_colors;
    const cat_label_list = categorical_coloring_data[name].label_list;
    const cat_counts = categorical_coloring_data[name].label_counts;

    counts = {};
    Object.keys(cat_color_map).forEach(d => {
      counts[d] = 0;
    });
    for (i = 0; i < all_nodes.length; i++) {
      if (all_outlines[i].selected || all_outlines[i].compared) {
        counts[cat_label_list[i]] += 1;
      }
    }

    d3.select('#count_column')
      .selectAll('div')
      .each(function(d) {
        d3.select(this)
          .style('visibility', 'hidden')
          .select('p')
          .text('');
        if (counts[d] > 0) {
          d3.select(this)
            .attr('count', counts[d])
            .attr('pct', Math.floor((counts[d] / cat_counts[d]) * 1000) / 10)
            .style('visibility', 'visible')
            .select('p')
            .text(counts[d]);
        }
      });
  }
}

function toggle_legend_hover_tooltip() {
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
        const cat_color_map = categorical_coloring_data[name].label_colors;
        const cat_label_list = categorical_coloring_data[name].label_list;

        let hover_clusters = [];
        const dim = document.getElementById('svg_graph').getBoundingClientRect();
        let x = d3.event.clientX - dim.left;
        let y = d3.event.clientY - dim.top;
        x = (x - sprites.position.x) / sprites.scale.x;
        y = (y - sprites.position.y) / sprites.scale.y;
        for (i = 0; i < all_nodes.length; i++) {
          rad = Math.sqrt((all_nodes[i].x - x) ** 2 + (all_nodes[i].y - y) ** 2);
          if (rad < all_nodes[i].scale.x * 20) {
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

function get_hover_cells(e) {
  const dim = document.getElementById('svg_graph').getBoundingClientRect();
  let x = e.clientX - dim.left;
  let y = e.clientY - dim.top;
  x = (x - sprites.position.x) / sprites.scale.x;
  y = (y - sprites.position.y) / sprites.scale.y;
  const hover_cells = [];
  for (i = 0; i < all_nodes.length; i++) {
    if (all_outlines[i].selected) {
      rad = Math.sqrt((all_nodes[i].x - x) ** 2 + (all_nodes[i].y - y) ** 2);
      if (rad < all_nodes[i].scale.x * 20) {
        hover_cells.push(i);
      }
    }
  }
  return hover_cells;
}

function max_color(c) {
  return d3.max([c.r, c.b, c.g]);
}

function min_color(c) {
  return d3.min([c.r, c.b, c.g]);
}

function average_color(c) {
  return d3.mean([c.r, c.b, c.g]);
}
