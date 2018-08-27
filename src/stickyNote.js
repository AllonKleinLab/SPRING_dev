import * as d3 from 'd3';
import sweetAlert from 'sweetalert';

import { forceLayout, colorBar, selectionScript, project_directory } from './main';

export default class StickyNote {
  /** @type StickyNote */
  static _instance;

  static get instance() {
    if (!this._instance) {
      throw new Error('You must first call StickyNote.create()!');
    }
    return this._instance;
  }

  static async create() {
    if (!this._instance) {
      this._instance = new StickyNote();
      await this._instance.loadData();
      return this._instance;
    } else {
      throw new Error(
        'StickyNote.create() has already been called, get the existing instance with StickyNote.instance!',
      );
    }
  }

  constructor() {
    this.popup = d3
      .select('#force_layout')
      .append('div')
      .attr('id', 'stickyNote_popup')
      .on('mousedown', this.deactivate_all);

    this.button_bar = this.popup
      .append('div')
      .attr('id', 'stickyNote_button_bar')
      .style('width', '100%');

    this.selected_note = null;

    this.button_bar
      .append('button')
      .text('Close')
      .style('margin-right', '11px')
      .on('click', () => {
        if (!this.is_synched()) {
          this.hide_stickyNote_popup();
        } else {
          this.hide_stickyNote_popup();
        }
      });

    this.button_bar
      .append('button')
      .text('Save')
      .on('click', this.save_note)
      .attr('id', 'sticky_save_button');

    this.button_bar
      .append('button')
      .text('New')
      .on('click', this.new_note);

    this.button_bar
      .append('button')
      .text('Delete')
      .on('click', this.delete_note);

    this.button_bar
      .append('button')
      .text('Bind cells')
      .on('click', this.bind_cells);

    this.button_bar
      .append('button')
      .text('Show selected')
      .on('click', this.show_selected);

    this.sticky_div = this.popup.append('div').attr('id', 'sticky_div');

    this.button_bar.selectAll('button').on('mousedown', () => {
      d3.event.stopPropagation();
    });

    this.popup
      .append('div')
      .attr('id', 'sticky_email')
      .append('label')
      .text('Email address')
      .append('input')
      .attr('type', 'text')
      .on('mousedown', () => {
        d3.event.stopPropagation();
      })
      .attr('id', 'sticky_email_input')
      .style('width', '252px');

    d3.select('#stickyNote_popup').call(
      d3
        .drag()
        .on('start', this.stickyNote_popup_dragstarted)
        .on('drag', this.stickyNote_popup_dragged)
        .on('end', this.stickyNote_popup_dragended),
    );

    return this;
  }
  // <-- StickyNote Constructor End -->

  async loadData() {
    this.sticky_path = project_directory + '/sticky_notes_data.json';
    try {
      await $.get(this.sticky_path);
      const data = await d3.json(this.sticky_path);
      data.forEach(d => {
        this.new_note(d);
      });
    } catch (e) {
      const note = this.new_note();
      this.activate_note(note);
    }
  }
  delete_note() {
    d3.selectAll('.sticky_note').each((d, i) => {
      if (d3.select(d).attr('active') === 'true') {
        d3.select(d).remove();
      }
    });
  }

  new_note(d) {
    if (!d) {
      d = { text: '', emails: '', bound_cells: this.get_selected_cells().join(',') };
    }

    let note = this.sticky_div.insert('div', ':first-child').attr('class', 'sticky_note');
    note.append('textarea').style('height', '90px');
    note.on('mousedown', () => {
      d3.event.stopPropagation();
      if (note.attr('active') !== 'true') {
        this.deactivate_all();
        this.activate_note(note);
      }
    });
    note.attr('bound_cells', d.bound_cells);
    note.attr('saved_text', d.text);
    note.attr('emails', d.emails);
    note.select('textarea').text(d.text);
    note.select('p').text(d.text);

    return note;
  }

  activate_note(note) {
    if (note.attr('active') !== 'true') {
      note.select('p').style('visibility', 'hidden');
      $(note.select('textarea')).focus();

      // 			let emails = note.attr('emails');
      // 			if (emails.length > 0) {
      // 				$('#sticky_email_input').value = emails.split(',')[1];
      // 			}
    }

    note.style('border', 'solid 2px rgba(230,230,230,.8)').attr('active', 'true');

    let my_nodes = [];
    note
      .attr('bound_cells')
      .split(',')
      .forEach(d => {
        if (d !== '') {
          my_nodes.push(parseInt(d, 10));
          forceLayout.all_outlines[d].selected = true;
          forceLayout.all_outlines[d].tint = '0xffff00';
          forceLayout.all_outlines[d].alpha = 1;
        }
      });
    colorBar.count_clusters();
    selectionScript.update_selected_count();
    colorBar.shrinkNodes(10, 10, my_nodes, forceLayout.all_nodes);
  }

  deactivate_all() {
    d3.selectAll('.sticky_note')
      .attr('active', 'false')
      .style('border', '0px');

    d3.selectAll('.sticky_note')
      .selectAll('textarea')
      .style('background-color', 'transparent')
      .style('border', 'none');
  }

  sync_note(note) {
    if (note.attr('saved_text') !== $(note.select('textarea').node()).val()) {
      note.attr('saved_text', $(note.select('textarea').node()).val());
      let my_emails = note.attr('emails').split(',');
      let current_email = $('#sticky_email_input').val();
      if (my_emails.indexOf(current_email) === -1) {
        my_emails.push(current_email);
        note.attr('emails', my_emails.join(','));
      }
    }
  }

  bind_cells(note) {
    let sel = this.get_selected_cells().join(',');
    d3.selectAll('.sticky_note').each(d => {
      if (d3.select(d).attr('active') === 'true') {
        d3.select(d).attr('bound_cells', sel);
      }
    });
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

  save_note() {
    if (!this.check_email()) {
      this.flash_email();
      return false;
    } else {
      d3.selectAll('.sticky_note').each(d => {
        this.sync_note(d3.select(d));
      });
      this.write_data();
      return true;
    }
  }

  write_data() {
    let all_data = [];
    d3.selectAll('.sticky_note').each(d => {
      let note = d3.select(d);
      let text = note.attr('saved_text');
      let emails = note.attr('emails');
      let bound_cells = note.attr('bound_cells');
      if (text !== '') {
        let my_data = { text: text, emails: emails, bound_cells: bound_cells };
        all_data.push(my_data);
      }
    });
    const path = project_directory + '/sticky_notes_data.json';
    $.ajax({
      data: { path: path, content: JSON.stringify(all_data, null, ' ') },
      success: () => {
        sweetAlert({ title: 'All stickies have been saved' });
      },
      type: 'POST',
      url: 'cgi-bin/save_sticky.py',
    });
  }

  check_email() {
    const emailInput = $('#sticky_email_input').val();
    if (typeof emailInput === 'string' && emailInput.indexOf('@') > -1) {
      return true;
    } else {
      return false;
    }
  }

  flash_email() {
    $('#sticky_email_input').addClass('flash');
    setTimeout(() => {
      $('#sticky_email_input').removeClass('flash');
    }, 500);
  }

  is_synched() {
    return true;
  }

  stickyNote_popup_dragstarted() {
    d3.event.sourceEvent.stopPropagation();
  }
  stickyNote_popup_dragged() {
    let cx = parseFloat(
      d3
        .select('#stickyNote_popup')
        .style('left')
        .split('px')[0],
    );
    let cy = parseFloat(
      d3
        .select('#stickyNote_popup')
        .style('top')
        .split('px')[0],
    );
    d3.select('#stickyNote_popup').style('left', (cx + d3.event.dx).toString() + 'px');
    d3.select('#stickyNote_popup').style('top', (cy + d3.event.dy).toString() + 'px');
  }

  stickyNote_popup_dragended() {
    return;
  }

  show_selected() {
    let selected_cells = [];
    for (let i = 0; i < forceLayout.all_outlines.length; i++) {
      if (forceLayout.all_outlines[i].selected) {
        selected_cells.push(i.toString());
      }
    }
    d3.selectAll('.sticky_note').style('background-color', 'rgba(0,0,0,.5)');
    d3.selectAll('.sticky_note').each(d => {
      let note = d3.select(d);
      const bound_cells = note.attr('bound_cells').split(',');
      if (bound_cells.filter(n => selected_cells.indexOf(n) >= 0).length > 0) {
        note.style('background-color', 'rgba(255,255,0,.4)');
        $(this.sticky_div.node()).prepend(note.node());
      }
    });
  }

  hide_stickyNote_popup() {
    d3.select('#stickyNote_popup').style('visibility', 'hidden');
  }

  show_stickyNote_popup() {
    let mywidth = parseInt(
      d3
        .select('#stickyNote_popup')
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
    d3.select('#stickyNote_popup')
      .style('left', (svg_width / 2 - mywidth / 2).toString() + 'px')
      .style('top', '10px')
      .style('visibility', 'visible');
  }
}
