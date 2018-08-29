import * as d3 from 'd3';
import { project_directory } from './main';

export default class PAGA {
  /** @type PAGA */
  static _instance;

  static get instance() {
    if (!this._instance) {
      throw new Error('You must first call PAGA.create()!');
    }
    return this._instance;
  }

  static async create() {
    if (!this._instance) {
      this._instance = new PAGA();
      await this._instance.loadData();
      return this._instance;
    } else {
      throw new Error('PAGA.create() has already been called, get the existing instance with PAGA.instance!');
    }
  }

  constructor() {
    this.PAGA_data = {
      edge_weight_meta: {
        max_edge_weight: 1,
        min_edge_weight: 1,
      },
    };

    this.popup = d3
      .select('#force_layout')
      .append('div')
      .attr('id', 'PAGA_popup');

    this.popup
      .append('div')
      .style('padding', '5px')
      .style('height', '35px')
      .append('text')
      .text('Graph abstraction')
      .attr('id', 'PAGA_title')
      .append('input')
      .attr('type', 'checkbox')
      .attr('checked', true)
      .attr('id', 'PAGA_visibility_checkbox')
      .style('margin-left', '27px')
      .on('click', () => this.toggle_PAGA_visibility());

    this.popup
      .append('div')
      .on('mousedown', () => {
        d3.event.stopPropagation();
      })
      .append('label')
      .text('Node size scale')
      .append('input')
      .attr('type', 'range')
      .attr('value', '40')
      .attr('id', 'PAGA_node_size_slider')
      .style('margin-left', '29px')
      .on('input', () => this.PAGA_redraw());

    this.popup
      .append('div')
      .on('mousedown', () => {
        d3.event.stopPropagation();
      })
      .append('label')
      .text('Edge width scale')
      .append('input')
      .attr('type', 'range')
      .attr('id', 'PAGA_edge_width_slider')
      .style('margin-left', '22px')
      .attr('value', '40')
      .on('input', () => this.PAGA_redraw());

    this.popup
      .append('div')
      .on('mousedown', () => {
        d3.event.stopPropagation();
      })
      .append('label')
      .text('Min edge weight')
      .append('input')
      .attr('type', 'range')
      .attr('value', '25')
      .attr('id', 'PAGA_min_edge_weight_slider')
      .style('margin-left', '26px')
      .on('input', () => this.adjust_min_edge_weight());

    this.popup
      .append('div')
      .on('mousedown', () => {
        d3.event.stopPropagation();
      })
      .append('label')
      .text('Cell mask opacity')
      .append('input')
      .attr('type', 'range')
      .attr('value', '70')
      .attr('id', 'PAGA_mask_opacity_slider')
      .style('margin-left', '20px')
      .on('input', () => this.adjust_PAGA_mask_opacity());

    this.PAGA_button_options = this.popup
      .append('div')
      .style('margin-top', '9px')
      .style('margin-left', '2px');

    this.PAGA_button_options.append('button')
      .text('Reset')
      .on('click', () => this.reset_positions());
    this.PAGA_button_options.append('button')
      .text('(De)select')
      .on('click', () => this.deselect_PAGA());
    this.PAGA_button_options.append('button')
      .text('Propagate')
      .on('click', () => this.propagate());
    this.PAGA_button_options.append('button')
      .text('Close')
      .on('click', () => this.hide_PAGA_popup());

    this.popup.call(
      d3
        .drag()
        .on('start', () => this.PAGA_popup_dragstarted())
        .on('drag', () => this.PAGA_popup_dragged())
        .on('end', () => this.PAGA_popup_dragended()),
    );

    this.noCache = new Date().getTime();
  }
  // <-- PAGA Constructor End -->

  async loadData() {
    try {
      const data = await d3.json(project_directory + '/PAGA_data.json' + '?_=' + this.noCache);
      if (data !== undefined) {
        this.PAGA_data = data;

        let min_weight_frac = data.edge_weight_meta.min_edge_weight / data.edge_weight_meta.max_edge_weight;
        d3.select('#PAGA_min_edge_weight_slider').node().value = Math.log(min_weight_frac * Math.exp(100 / 20)) * 20;

        let PAGA_links = d3
          .select('#vis')
          .selectAll('line')
          .data(data.links)
          .enter()
          .append('line')
          .attr('class', 'PAGA_link');

        let PAGA_circles = d3
          .select('#vis')
          .selectAll('circle')
          .data(data.nodes)
          .enter()
          .append('circle')
          .attr('class', 'PAGA_node')
          .call(
            d3
              .drag()
              .on('start', () => this.dragstarted())
              .on('drag', () => this.dragged())
              .on('end', () => this.dragended()),
          )
          .on('click', d => {
            if (!d3.event.defaultPrevented) {
              d.selected = !d.selected;
              this.PAGA_redraw();
            }
          });

        this.PAGA_node_dict = {};
        data.nodes.forEach(d => {
          this.PAGA_node_dict[d.index] = d;
          d.coordinates_original = Object.assign({}, d.coordinates);
        });

        this.PAGA_redraw();

        PAGA_circles.attr('stroke', 'yellow')
          .attr('stroke-width', '0px')
          .style('visibility', 'hidden');

        PAGA_links.style('visibility', 'hidden');
      }
    } catch (e) {
      console.log(e);
    }
  }

  dragstarted(d) {
    d3.event.sourceEvent.stopPropagation();
    d.beingDragged = true;
    if (d.selected === true) {
      d3.selectAll('.PAGA_node')
        .filter(() => {
          return d.selected;
        })
        .each(() => {
          d.beingDragged = true;
        });
    }
  }

  dragged(d) {
    d3.selectAll('.PAGA_node')
      .filter(() => {
        return d.beingDragged;
      })
      .each(() => {
        d.coordinates[0] += d3.event.dx;
        d.coordinates[1] += d3.event.dy;
      });
    this.PAGA_redraw();
  }

  dragended(d) {
    d3.selectAll('.PAGA_node').each(() => {
      d.beingDragged = false;
    });
  }

  PAGA_popup_dragstarted() {
    d3.event.sourceEvent.stopPropagation();
  }

  PAGA_popup_dragged() {
    let cx = parseFloat(
      d3
        .select('#PAGA_popup')
        .style('left')
        .split('px')[0],
    );
    let cy = parseFloat(
      d3
        .select('#PAGA_popup')
        .style('top')
        .split('px')[0],
    );
    d3.select('#PAGA_popup').style('left', (cx + d3.event.dx).toString() + 'px');
    d3.select('#PAGA_popup').style('top', (cy + d3.event.dy).toString() + 'px');
  }

  PAGA_popup_dragended() {
    return;
  }

  reset_positions() {
    d3.selectAll('.PAGA_node').each(d => {
      d.coordinates = Object.assign({}, d.coordinates_original);
    });
    this.PAGA_redraw();
  }

  propagate() {
    return;
  }

  deselect_PAGA() {
    let any_selected = false;
    d3.selectAll('.PAGA_node').each(d => {
      if (d.selected) {
        any_selected = true;
      }
    });
    d3.selectAll('.PAGA_node').each(d => {
      d.selected = !any_selected;
    });
    this.PAGA_redraw();
  }

  adjust_min_edge_weight() {
    let min_weight =
      Math.exp(parseFloat(d3.select('#PAGA_min_edge_weight_slider').node().value) / 20) / Math.exp(100 / 20);
    console.log(min_weight * this.PAGA_data.edge_weight_meta.max_edge_weight);
    this.PAGA_data.edge_weight_meta.min_edge_weight = min_weight * this.PAGA_data.edge_weight_meta.max_edge_weight;
    this.PAGA_redraw();
  }

  PAGA_redraw() {
    let node_scale = (d3.select('#PAGA_node_size_slider').node().value / 40) ** 1.8;
    let edge_scale = (d3.select('#PAGA_edge_width_slider').node().value / 40) ** 3;

    d3.selectAll('.PAGA_node')
      .attr('cx', d => {
        return d.coordinates[0];
      })
      .attr('cy', d => {
        return d.coordinates[1];
      })
      .attr('r', d => {
        return Math.sqrt(d.size) * 2 * node_scale;
      })
      .attr('fill', d => {
        return d.color;
      })
      .attr('stroke-width', d => {
        if (d.selected) {
          return (15 + (Math.sqrt(d.size) / 5) * node_scale).toString() + 'px';
        } else {
          return '0px';
        }
      });

    d3.selectAll('.PAGA_link')
      .attr('opacity', 0.8)
      .attr('stroke', 'darkgray')
      .attr('x1', d => {
        return this.PAGA_node_dict[d.source].coordinates[0];
      })
      .attr('y1', d => {
        return this.PAGA_node_dict[d.source].coordinates[1];
      })
      .attr('x2', d => {
        return this.PAGA_node_dict[d.target].coordinates[0];
      })
      .attr('y2', d => {
        return this.PAGA_node_dict[d.target].coordinates[1];
      })
      .attr('stroke-width', d => {
        return d.weight * edge_scale;
      })
      .style('visibility', d => {
        if (d.weight > this.PAGA_data.edge_weight_meta.min_edge_weight) {
          return 'visible';
        } else {
          return 'hidden';
        }
      });
  }

  adjust_PAGA_mask_opacity() {
    let opacity = parseFloat(d3.select('#PAGA_mask_opacity_slider').node().value) / 100;
    d3.select('svg').style('background', 'rgba(255,255,255,' + opacity.toString() + ')');
  }

  toggle_PAGA_visibility() {
    if (document.getElementById('PAGA_visibility_checkbox').checked) {
      d3.selectAll('.PAGA_node').style('visibility', 'visible');
      d3.selectAll('.PAGA_link').style('visibility', 'visible');
      this.adjust_PAGA_mask_opacity();
      this.PAGA_redraw();
    } else {
      d3.selectAll('.PAGA_node').style('visibility', 'hidden');
      d3.selectAll('.PAGA_link').style('visibility', 'hidden');
      d3.select('svg').style('background', 'rgba(255,255,255,0');
    }
  }

  show_PAGA_popup() {
    d3.select('#PAGA_popup').style('visibility', 'visible');
    this.toggle_PAGA_visibility();
  }

  hide_PAGA_popup() {
    d3.select('#PAGA_popup').style('visibility', 'hidden');
  }
}
