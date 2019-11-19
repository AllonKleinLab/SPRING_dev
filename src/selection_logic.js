import * as d3 from 'd3';

import { colorBar, forceLayout, selectionScript } from './main';

export default class SelectionLogic {
  /** @type SelectionLogic */
  static _instance;

  static get instance() {
    if (!this._instance) {
      throw new Error('You must first call SelectionLogic.create()!');
    }
    return this._instance;
  }

  static create() {
    if (!this._instance) {
      this._instance = new SelectionLogic();
      return this._instance;
    } else {
      throw new Error(
        'SelectionLogic.create() has already been called, get the existing instance with SelectionLogic.instance!',
      );
    }
  }

  constructor() {
    this.selection_data = {};

    this.popup = d3
      .select('#force_layout')
      .append('div')
      .attr('id', 'selection_logic_popup');

    this.add_new_bar = this.popup
      .append('div')
      .attr('id', 'selection_logic_add_new_bar')
      .on('mousedown', () => {
        d3.event.stopPropagation();
      });

    this.add_new_bar
      .append('label')
      .text('Selection name ')
      .append('input')
      .attr('id', 'selection_logic_input');
    this.add_new_bar
      .append('button')
      .text('Close')
      .on('click', this.hide_selection_logic_popup);
    this.add_new_bar
      .append('button')
      .text('Clear')
      .on('click', () => this.clear_options());
    this.add_new_bar
      .append('button')
      .text('Add')
      .on('click', () => this.add_selection());

    this.andor_bar = this.popup.append('div').attr('id', 'selection_logic_andor_bar');
    this.left_dropdown = this.andor_bar.append('select').style('margin-right', '20px');
    this.andor_bar
      .append('button')
      .text('AND')
      .style('margin-right', '12px')
      .on('click', () => this.apply_and);
    this.andor_bar
      .append('button')
      .text('OR')
      .on('click', () => this.apply_or);

    this.right_dropdown = this.andor_bar.append('select').style('margin-left', '20px');

    this.left_dropdown.append('option').text('Current selection');
    this.right_dropdown.append('option').text('Current selection');

    d3.select('#selection_logic_popup').call(
      d3
        .drag()
        .on('start', () => this.selection_logic_popup_dragstarted())
        .on('drag', () => this.selection_logic_popup_dragged())
        .on('end', () => this.selection_logic_popup_dragended()),
    );
  }
  // <-- SelectionLogic Constructor End -->

  get_selections() {
    let left_name = this.left_dropdown.property('value');
    let right_name = this.right_dropdown.property('value');
    let left_sel = [];
    if (left_name === 'Current selection') {
      left_sel = this.get_selected_cells();
    } else {
      left_sel = this.selection_data[left_name];
    }
    let right_sel = [];
    if (right_name === 'Current selection') {
      right_sel = this.get_selected_cells();
    } else {
      right_sel = this.selection_data[right_name];
    }
    return [left_sel, right_sel];
  }

  union_arrays(x, y) {
    let obj = {};
    for (let i = x.length - 1; i >= 0; --i) {
      obj[x[i]] = x[i];
    }
    for (let i = y.length - 1; i >= 0; --i) {
      obj[y[i]] = y[i];
    }
    let res = [];
    for (let k in obj) {
      if (obj.hasOwnProperty(k)) {
        // <-- optional
        res.push(obj[k]);
      }
    }
    return res;
  }

  apply_or() {
    let sels = this.get_selections();
    let new_sel = this.union_arrays(sels[0], sels[1]);
    this.set_selections(new_sel);
    this.get_selections();
  }

  apply_and() {
    let sels = this.get_selections();
    let new_sel = sels[0].filter(n => {
      return sels[1].indexOf(n) !== -1;
    });
    this.set_selections(new_sel);
  }

  set_selections(sel) {
    for (let i = 0; i < forceLayout.all_outlines.length; i++) {
      forceLayout.all_outlines[i].selected = false;
      forceLayout.all_outlines[i].alpha = 0;
    }
    for (let i = 0; i < sel.length; i++) {
      forceLayout.all_outlines[sel[i]].tint = '0xffff00';
      forceLayout.all_outlines[sel[i]].selected = true;
      forceLayout.all_outlines[sel[i]].alpha = forceLayout.all_nodes[sel[i]].alpha;
    }
    selectionScript.update_selected_count();
    colorBar.count_clusters();
  }

  clear_options() {
    this.left_dropdown.selectAll('option').remove();
    this.left_dropdown.append('option').text('Current selection');
    this.right_dropdown.selectAll('option').remove();
    this.right_dropdown.append('option').text('Current selection');
    this.selection_data = {};
  }

  add_selection() {
    let name = $('#selection_logic_input').val();
    $('#selection_logic_input').val('');
    this.left_dropdown
      .append('option')
      .text(name.toString())
      .attr('selected', 'selected');
    this.right_dropdown
      .append('option')
      .text(name.toString())
      .attr('selected', 'selected');
    this.selection_data[name.toString()] = this.get_selected_cells();
  }

  get_selected_cells() {
    let sel = [];
    for (let i = 0; i < forceLayout.all_outlines.length; i++) {
      if (forceLayout.all_outlines[i].selected) {
        sel.push(i);
      }
    }
    return sel;
  }

  selection_logic_popup_dragstarted() {
    d3.event.sourceEvent.stopPropagation();
  }

  selection_logic_popup_dragged() {
    let cx = parseFloat(
      d3
        .select('#selection_logic_popup')
        .style('left')
        .split('px')[0],
    );
    let cy = parseFloat(
      d3
        .select('#selection_logic_popup')
        .style('top')
        .split('px')[0],
    );
    d3.select('#selection_logic_popup').style('left', (cx + d3.event.dx).toString() + 'px');
    d3.select('#selection_logic_popup').style('top', (cy + d3.event.dy).toString() + 'px');
  }

  selection_logic_popup_dragended() {
    return;
  }

  show_selection_logic_popup() {
    let mywidth = parseInt(
      d3
        .select('#selection_logic_popup')
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
    d3.select('#selection_logic_popup')
      .style('left', (svg_width / 2 - mywidth / 2).toString() + 'px')
      .style('top', '220px')
      .style('visibility', 'visible');
  }

  hide_selection_logic_popup() {
    d3.select('#selection_logic_popup').style('visibility', 'hidden');
  }
}
