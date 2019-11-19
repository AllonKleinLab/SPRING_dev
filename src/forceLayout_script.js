import * as d3 from 'd3';

import { LineSprite } from './LineSprite';
import {
  cloneViewer,
  cluster2,
  colorBar,
  downloadSelectedExpr,
  paga,
  project_directory,
  selectionLogic,
  selectionScript,
  smoothingImputation,
  springPlot,
  sub_directory,
} from './main';
import { SPRITE_IMG_WIDTH, downloadFile, rgbToHex } from './util';
import { collapse_settings } from './settings_script';
import { rotation_update } from './rotation_script';
import { getData } from './file_helper';

export default class ForceLayout {
  /** @type ForceLayout */
  static _instance;

  static get instance() {
    if (!this._instance) {
      throw new Error('You must first call ForceLayout.create()!');
    }
    return this._instance;
  }

  static async create() {
    if (!this._instance) {
      this._instance = new ForceLayout();
      await this._instance.loadData();
      return this._instance;
    } else {
      throw new Error(
        'ForceLayout.create() has already been called, get the existing instance with ForceLayout.instance!',
      );
    }
  }

  constructor() {
    this.width = window.innerWidth - 15;
    this.height = window.innerHeight - 70;

    this.all_edge_ends = new Array();
    this.all_edges = new Array();
    this.all_nodes = [];
    this.all_outlines = [];
    this.app = new PIXI.Application(this.width, this.height, { backgroundColor: 0xdcdcdc });
    this.base_colors = new Array();
    this.being_dragged = false;
    this.coordinates = new Array();
    this.edge_container = new PIXI.Container();
    this.force_on = 1;
    this.mutable = true;
    this.sprites = new PIXI.Container();
    this.stashed_coordinates = new Array();
    this.svg_graph = d3.select(null);
    this.xScale = d3.scaleLinear();
    this.yScale = d3.scaleLinear();
    this.zoomer = d3.zoom();

    d3.select('#toggleforce')
      .select('button')
      .on('click', () => this.toggleForce());
    d3.select('#sound_toggle').style('visibility', 'hidden');
    if (
      d3
        .select('#sound_toggle')
        .select('img')
        .attr('src') === 'src/sound_effects/icon_speaker.svg'
    ) {
      let snd = new Audio('src/sound_effects/opennew_sound.wav');
      snd.play();
    }

    this.keyCode = 0;
    this.nodeGraph = null;

    this.svg = d3
      .select('#force_layout')
      .attr('tabindex', 1)
      .each((d, i, nodes) => {
        nodes[i].focus();
      })
      .append('svg')
      .attr('id', 'force_svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .style('background', 'rgba(0,0,0,0)')
      .style('position', 'absolute')
      .style('top', '0px');

    this.zoomer = d3
      .zoom()
      .scaleExtent([0.02, 10])
      .on('zoom', () => this.redraw());
    /////////////////////////////////////////////////////////////////////

    this.svg_graph = this.svg
      .append('svg:g')
      .call(this.zoomer)
      .attr('id', 'svg_graph');

    d3.select('#force_svg')
      .append('g')
      .attr('id', 'vis');

    this.rect = this.svg_graph
      .append('svg:rect')
      .attr('width', this.width) //*1000)
      .attr('height', this.height) //*1000)
      //.attr('x',-width*500)
      //.attr('y',-height*500)
      .attr('fill', 'transparent')
      .attr('stroke', 'transparent')
      .attr('stroke-width', 1)
      .attr('id', 'zrect');

    ///////////////////////
    this.svg_width = parseInt(d3.select('svg').attr('width'), 10);

    this.more_settings_rect = d3
      .select('svg')
      .append('rect')
      .attr('class', 'other_frills')
      .attr('id', 'show_edges_rect')
      .attr('x', this.svg_width - 177)
      .attr('y', 104)
      .attr('fill', 'black')
      .attr('fill-opacity', 0.25)
      .attr('width', 200)
      .attr('height', 46);

    d3.select('svg')
      .append('text')
      .attr('pointer-events', 'none')
      .attr('class', 'other_frills')
      .attr('id', 'edge_text')
      .attr('y', 122)
      .attr('font-family', 'sans-serif')
      .attr('font-size', '12px')
      .attr('fill', 'white')
      .append('tspan')
      .attr('id', 'hide_edges_tspan')
      .attr('x', this.svg_width - 167)
      .attr('dy', 0)
      .text('Hide edges')
      .append('tspan')
      .attr('id', 'hide_edges_sub_tspan')
      .attr('x', this.svg_width - 167)
      .attr('dy', 17)
      .text('(runs faster)');

    this.imgs = d3
      .select('svg')
      .selectAll('img')
      .data([0]);
    this.edge_toggle_image = this.imgs
      .enter()
      .append('svg:image')
      .attr('id', 'edge_toggle_image')
      .attr('xlink:href', 'stuff/check-mark.svg')
      .attr('x', this.svg_width - 70)
      .attr('y', 115)
      .attr('width', 25)
      .attr('height', 25)
      .attr('class', 'other_frills')
      .on('click', () => this.toggle_edges());

    d3.select('#toggle_edges_layout').on('click', () => this.toggle_edges());
    return this;
  }
  // <-- ForceLayout Constructor End -->

  async loadData() {
    const filePath = project_directory + '/mutability.txt';
    try {
      const mutableText = await d3.text(filePath);
      if (mutableText === null) {
        this.mutable = true;
      } else {
        this.mutable = false;
      }
    } catch (err) {
      console.log(`Unable to get mutability.txt at ${filePath}\n${err}`);
    }

    // Read coordinates file if it exists
    const text = await getData('coordinates', 'txt');
    if (!text.push) {
      text.split('\n').forEach((entry, index, array) => {
        let items = entry.split(',');
        if (items.length > 1) {
          let xx = parseFloat($.trim(items[1]));
          let yy = parseFloat($.trim(items[2]));
          let nn = parseInt($.trim(items[0]), 10);
          this.coordinates.push([xx, yy]);
        }
      });
    } else {
      this.coordinates = text;
    }
    document.getElementById('pixi_canvas_holder').appendChild(this.app.view);

    this.sprites.interactive = true;
    this.sprites.interactiveChildren = true;

    // create an array to store all the sprites
    let totalSprites = this.app.renderer instanceof PIXI.WebGLRenderer ? this.coordinates.length : 100;

    this.create_sprites(totalSprites);

    let stashed_coordinates = [{}];
    for (let i in this.all_nodes) {
      stashed_coordinates[0][i] = [this.all_nodes[i].x, this.all_nodes[i].y];
    }

    this.svg_graph.call(
      d3
        .drag()
        .on('start', () => this.dragstarted())
        .on('drag', () => this.dragged())
        .on('end', () => this.dragended()),
    );

    await this.load_edges(this.all_nodes, this.sprites);
  }

  create_sprites(totalSprites) {
    for (let i = 0; i < totalSprites; i++) {
      let dude = PIXI.Sprite.fromImage('stuff/disc.png');
      dude.anchor.set(0.5);
      dude.scale.set((0.5 * 32) / SPRITE_IMG_WIDTH);
      dude.x = this.coordinates[i][0];
      dude.y = this.coordinates[i][1];
      dude.tint = parseInt(rgbToHex(0, 0, 0), 16);
      dude.alpha = 1;
      dude.interactive = true;
      dude.index = i;
      dude.bump = 0;
      dude.beingDragged = false;
      this.sprites.addChild(dude);
      this.all_nodes.push(dude);
      this.base_colors.push({ r: 0, g: 0, b: 0 });

      let outline = PIXI.Sprite.fromImage('stuff/annulus.png');
      outline.anchor.set(0.5);
      outline.scale.set(0.5);
      outline.x = this.coordinates[i][0];
      outline.y = this.coordinates[i][1];
      outline.tint = 0xffff00;
      outline.index = i;
      outline.bump = 0.0001;
      outline.alpha = 0;
      outline.selected = false;
      outline.compared = false;
      this.sprites.addChild(outline);
      this.all_outlines.push(outline);
    }
  }

  load_edges = async (all_nodes, sprites) => {
    this.edge_container.position = sprites.position;
    this.edge_container.scale = sprites.scale;
    this.edge_container.alpha = 0.5;
    this.neighbors = {};
    for (let i = 0; i < all_nodes.length; i++) {
      this.neighbors[i] = [];
    }
    try {
      const edgesText = await d3.text(project_directory + '/edges.csv');
      edgesText.split('\n').forEach((entry, index) => {
        if (entry.length > 0) {
          let items = entry.split(';');
          let source = parseInt(items[0], 10);
          let target = parseInt(items[1], 10);

          this.neighbors[source].push(target);
          this.neighbors[target].push(source);

          let x1 = all_nodes[source].x;
          let y1 = all_nodes[source].y;
          let x2 = all_nodes[target].x;
          let y2 = all_nodes[target].y;

          let color = 6579301;
          let s = new LineSprite(4, color, x1, y1, x2, y2);
          s._color = color;
          this.edge_container.addChild(s);
          this.all_edges.push(s);
          this.all_edge_ends.push({ source: source, target: target });
        }
      });
    } catch (e) {
      console.log(`Error setting up edges: ${e}`);
    } finally {
      this.app.stage.addChild(this.edge_container);
      this.app.stage.addChild(sprites);
    }
  };

  dragstarted() {
    if (selectionScript.selection_mode === 'drag_pan_zoom') {
      let dim = document.getElementById('svg_graph').getBoundingClientRect();
      let x = d3.event.sourceEvent.clientX - dim.left;
      let y = d3.event.sourceEvent.clientY - dim.top;
      x = (x - this.sprites.position.x) / this.sprites.scale.x;
      y = (y - this.sprites.position.y) / this.sprites.scale.y;
      let clicked_pos_sel = false;
      let clicked_neg_sel = false;
      for (let i = 0; i < this.all_nodes.length; i++) {
        if (this.all_outlines[i].selected) {
          let rad = Math.sqrt((this.all_nodes[i].x - x) ** 2 + (this.all_nodes[i].y - y) ** 2);
          if (rad < this.all_nodes[i].scale.x * 20) {
            clicked_pos_sel = true;
          }
        }
        if (this.all_outlines[i].compared) {
          const newRad = Math.sqrt((this.all_nodes[i].x - x) ** 2 + (this.all_nodes[i].y - y) ** 2);
          if (newRad < this.all_nodes[i].scale.x * 20) {
            clicked_neg_sel = true;
          }
        }
      }
      if (clicked_pos_sel || clicked_neg_sel) {
        let stash_i = this.stashed_coordinates.length;
        this.stashed_coordinates.push({});
        for (let i in this.all_nodes) {
          this.stashed_coordinates[stash_i][i] = [this.all_nodes[i].x, this.all_nodes[i].y];
        }
      }
      if (clicked_pos_sel) {
        this.being_dragged = true;
        for (let i = 0; i < this.all_nodes.length; i++) {
          if (this.all_outlines[i].selected) {
            this.all_nodes[i].beingDragged = true;
          }
        }
      }
      if (clicked_neg_sel) {
        this.being_dragged = true;
        for (let i = 0; i < this.all_nodes.length; i++) {
          if (this.all_outlines[i].compared) {
            this.all_nodes[i].beingDragged = true;
          }
        }
      }
    }
  }

  dragged() {
    for (let i = 0; i < this.all_nodes.length; i++) {
      if (this.all_nodes[i].beingDragged) {
        this.all_nodes[i].x += d3.event.dx / this.sprites.scale.x;
        this.all_nodes[i].y += d3.event.dy / this.sprites.scale.y;
        this.all_outlines[i].x += d3.event.dx / this.sprites.scale.x;
        this.all_outlines[i].y += d3.event.dy / this.sprites.scale.y;
      }
    }
    for (let i = 0; i < this.all_edges.length; i++) {
      if (
        this.all_nodes[this.all_edge_ends[i].source].beingDragged ||
        this.all_nodes[this.all_edge_ends[i].target].beingDragged
      ) {
        this.all_edges[i].x1 = this.all_nodes[this.all_edge_ends[i].source].x;
        this.all_edges[i].y1 = this.all_nodes[this.all_edge_ends[i].source].y;
        this.all_edges[i].x2 = this.all_nodes[this.all_edge_ends[i].target].x;
        this.all_edges[i].y2 = this.all_nodes[this.all_edge_ends[i].target].y;
        this.all_edges[i].updatePosition();
      }
    }
  }

  dragended() {
    this.being_dragged = false;
    for (let i = 0; i < this.all_nodes.length; i++) {
      this.all_nodes[i].beingDragged = false;
    }
  }

  toggle_edges() {
    if (this.edge_container.visible === true) {
      this.edge_toggle_image.attr('xlink:href', 'stuff/ex-mark.svg');
      this.edge_container.visible = false;
      d3.select('#edge_text')
        .selectAll('tspan')
        .remove();
      d3.select('#edge_text')
        .append('tspan')
        .attr('id', 'hide_edges_tspan')
        .attr('x', this.svg_width - 167)
        .attr('dy', 0)
        .text('Show edges')
        .append('tspan')
        .attr('id', 'hide_edges_sub_tspan')
        .attr('x', this.svg_width - 167)
        .attr('dy', 17)
        .text('(runs slower)');
      d3.select('#toggle_edges_layout').text('Show edges');
    } else {
      this.edge_toggle_image.attr('xlink:href', 'stuff/check-mark.svg');
      this.edge_container.visible = true;
      d3.select('#edge_text')
        .selectAll('tspan')
        .remove();
      d3.select('#edge_text')
        .append('tspan')
        .attr('id', 'hide_edges_tspan')
        .attr('x', this.svg_width - 167)
        .attr('dy', 0)
        .text('Hide edges')
        .append('tspan')
        .attr('id', 'hide_edges_sub_tspan')
        .attr('x', this.svg_width - 167)
        .attr('dy', 17)
        .text('(runs faster)');
      d3.select('#toggle_edges_layout').text('Hide edges');
    }
  }

  move_selection_aside(side) {
    // find left and right most edge of selected and non selected cells
    let sel_x = [];
    let non_x = [];
    for (let i = 0; i < this.all_nodes.length; i++) {
      if (this.all_outlines[i].selected) {
        sel_x.push(this.all_nodes[i].x);
      } else {
        non_x.push(this.all_nodes[i].x);
      }
    }
    let new_coordinates = {};
    let offset = 0;
    if (side === 'left') {
      offset = d3.min(non_x) - d3.max(sel_x) - 5;
    } else {
      offset = d3.max(non_x) - d3.min(sel_x) + 5;
    }

    const next_frame = (steps, current_frame) => {
      current_frame += 1;
      for (let i = 0; i < this.all_nodes.length; i++) {
        if (this.all_outlines[i].selected) {
          let y = this.all_nodes[i].y;
          let x = this.all_nodes[i].x + offset / steps;
          this.move_node(i, x, y);
        }
      }
      if (current_frame < steps) {
        setTimeout(() => {
          next_frame(steps, current_frame);
        }, 2);
      } else {
        this.center_view(false);
        this.adjust_edges();
        if (d3.select('#edge_toggle_image').attr('xlink:href') === 'stuff/check-mark.svg') {
          this.blend_edges();
        }
      }
    };

    this.edge_container.visible = false;
    next_frame(6, -1);
  }

  revert_positions = () => {
    let stash_i = this.stashed_coordinates.length - 1;
    for (let i in this.stashed_coordinates  [stash_i]) {
      this.move_node(i, this.stashed_coordinates[stash_i][i][0], this.stashed_coordinates[stash_i][i][1]);
    }
    this.adjust_edges();
    this.stashed_coordinates = this.stashed_coordinates.slice(0, this.stashed_coordinates.length - 1);
  };

  move_node = (i, x, y) => {
    this.all_nodes[i].x = x;
    this.all_nodes[i].y = y;
    this.all_outlines[i].x = x;
    this.all_outlines[i].y = y;
  };

  adjust_edges = () => {
    for (let i in this.all_edges) {
      this.all_edges[i].x1 = this.all_nodes[this.all_edge_ends[i].source].x;
      this.all_edges[i].y1 = this.all_nodes[this.all_edge_ends[i].source].y;
      this.all_edges[i].x2 = this.all_nodes[this.all_edge_ends[i].target].x;
      this.all_edges[i].y2 = this.all_nodes[this.all_edge_ends[i].target].y;
      this.all_edges[i].updatePosition();
    }
  };

  animation = () => {
    // check if animation exists. if so, hide sprites and load it
    const filePath = project_directory + '/animation.txt';
    d3.text(filePath)
      .then(data => {
        let animation_frames = [];
        data.split('\n').forEach(line => {
          if (line.length > 0) {
            let aframe = [];
            let xx = line.split(';')[0].split(',');
            let yy = line.split(';')[1].split(',');
            for (let i in xx) {
              aframe.push([parseFloat(xx[i]), parseFloat(yy[i])]);
            }
            animation_frames.push(aframe);
          }
        });
        let any_diff = false;
        for (let i = 0; i < this.coordinates.length; i++) {
          if (Math.abs(this.coordinates[i][0] - animation_frames[animation_frames.length - 1][i][0]) > 5) {
            any_diff = true;
          }
          if (Math.abs(this.coordinates[i][1] - animation_frames[animation_frames.length - 1][i][1]) > 5) {
            any_diff = true;
          }
        }

        this.sprites.visible = true;

        const next_frame_anim = current_frame => {
          current_frame += 1;
          let tmp_coordinates = animation_frames[current_frame];

          for (let i = 0; i < this.all_nodes.length; i++) {
            this.all_nodes[i].x = tmp_coordinates[i][0];
            this.all_nodes[i].y = tmp_coordinates[i][1];
            this.all_outlines[i].x = tmp_coordinates[i][0];
            this.all_outlines[i].y = tmp_coordinates[i][1];
          }

          if (current_frame + 1 < animation_frames.length) {
            setTimeout(() => {
              next_frame_anim(current_frame);
            }, 1);
          } else {
            next_frame_interp(-1, 10);
          }
        };

        const next_frame_interp = (current_frame, steps) => {
          current_frame += 1;
          if (current_frame + 1 > steps || !any_diff) {
            this.blend_edges();
          } else {
            let last_frame = animation_frames[animation_frames.length - 1];
            for (let i = 0; i < this.all_nodes.length; i++) {
              this.all_nodes[i].x += (this.coordinates[i][0] - last_frame[i][0]) / steps;
              this.all_nodes[i].y += (this.coordinates[i][1] - last_frame[i][1]) / steps;
              this.all_outlines[i].x += (this.coordinates[i][0] - last_frame[i][0]) / steps;
              this.all_outlines[i].y += (this.coordinates[i][1] - last_frame[i][1]) / steps;
            }
            setTimeout(() => {
              next_frame_interp(current_frame, steps);
            }, 1);
          }
        };

        next_frame_anim(-1);
      })
      .catch(err => {
        this.sprites.visible = true;
        this.edge_container.visible = true;
      });
  };

  blend_edges = () => {
    this.edge_container.alpha = 0;
    this.edge_container.visible = true;

    const next_frame = (current_frame, min, max, steps) => {
      current_frame += 1;
      let alpha = (current_frame * (max - min)) / steps + min;
      this.edge_container.alpha = alpha;
      if (alpha < max) {
        setTimeout(() => {
          next_frame(current_frame, min, max, steps);
        }, 5);
      }
    };

    next_frame(-1, 0, 0.5, 10);
  };

  toggleForce = () => {
    if (this.force_on === 1) {
      d3.select('#toggleforce')
        .select('button')
        .text('Resume');
      this.force_on = 0;
      this.force.stop();
    } else {
      d3.select('#toggleforce')
        .select('button')
        .text('Pause');
      this.force_on = 1;
      if (this.force) {
        this.force = d3.forceSimulation();
      }
      this.force.tick();
    }
  };

  hideAccessories = () => {
    d3.selectAll('.other_frills').style('visibility', 'hidden');
    d3.selectAll('.selection_option').style('visibility', 'hidden');
    d3.selectAll('.colorbar_item').style('visibility', 'hidden');
    d3.select('svg').style('background-color', 'white');
  };

  showAccessories = () => {
    d3.selectAll('.other_frills').style('visibility', 'visible');
    d3.selectAll('.selection_option').style('visibility', 'visible');
    d3.selectAll('.colorbar_item').style('visibility', 'visible');
    d3.select('svg').style('background-color', '#D6D6D6');
  };

  downloadSelection = () => {
    let name = window.location.search;
    let cell_filter_filename = window.location.search.slice(1, name.length) + '/cell_filter.txt';
    d3.text(cell_filter_filename).then(cellText => {
      let cell_nums = cellText.split('\n');
      let text = '';
      for (let i = 0; i < this.all_nodes.length; i++) {
        if (this.all_outlines[i].selected) {
          text = text + i.toString() + ',' + cell_nums[i] + '\n';
        }
      }
      downloadFile(text, 'selected_cells.txt');
    });
  };

  downloadCoordinates = () => {
    let text = '';
    for (let i = 0; i < this.all_nodes.length; i++) {
      text += i.toString() + ',' + this.all_nodes[i].x.toString() + ',' + this.all_nodes[i].y.toString() + '\n';
    }
    downloadFile(text, 'coordinates.txt');
  };

  initiateButtons = () => {
    d3.select('#help').on('click', () => {
      let win = window.open('helppage.html', '_blank');
      win.focus();
    });

    d3.select('#center_view').on('click', () => {
      this.center_view(true);
    });

    d3.select('#revert_positions').on('click', () => this.revert_positions());

    d3.select('#move_left').on('click', () => {
      this.move_selection_aside('left');
    });
    d3.select('#move_right').on('click', () => {
      this.move_selection_aside('right');
    });

    d3.select('#save_coords')
      .select('button')
      .on('click', () => {
        if (this.mutable) {
          let text = '';
          d3.select('.node')
            .selectAll('circle')
            .each(d => {
              text = text + d.number + ',' + d.x.toString() + ',' + d.y.toString() + '\n';
            });
          let name = window.location.search;
          let path =
            'coordinates/' + name.slice(9, name.length).split('/')[1] + '_coordinates.' + sub_directory + '.txt';
          $.ajax({
            data: { path: path, content: text },
            type: 'POST',
            url: 'cgi-bin/save_data.py',
          });
        }
      });

    d3.select('#download_png')
      .on('click', () => this.download_png())
      .on('mouseenter', () => {
        d3.select('#container')
          .append('div')
          .attr('id', 'screenshot_tooltip')
          .style('position', 'absolute')
          .style('padding-top', '8px')
          .style('padding-bottom', '8px')
          .style('padding-left', '10px')
          .style('padding-right', '10px')
          .style('width', '150px')
          .style(
            'left',
            (
              parseInt(
                d3
                  .select('#download_dropdown')
                  .style('left')
                  .split('px')[0],
                10,
              ) - 8
            ).toString() + 'px',
          )
          .style('top', d3.select('#download_dropdown').style('height'))
          .style('background-color', 'rgba(0,0,0,.4)')
          .append('p')
          .text('Zoom in on plot for higher resolution download')
          .style('margin', '0px')
          .style('color', 'white')
          .style('font-family', 'sans-serif')
          .style('font-size', '13px');
      })
      .on('mouseleave', () => {
        d3.select('#screenshot_tooltip').remove();
      });

    d3.select('#rotation_update').on('click', () => rotation_update());

    d3.select('#download_coordinates').on('click', () => this.downloadCoordinates());

    d3.select('#download_selection').on('click', () => this.downloadSelection());

    d3.select('#show_download__selected_expr_popup').on('click', () =>
      downloadSelectedExpr.show_downloadSelectedExpr_popup(),
    );

    d3.select('#show_make_new_SPRINGplot_popup').on('click', () => springPlot.show_make_new_SPRINGplot_popup());

    d3.select('#start_clone_viewer').on('click', () => {
      cloneViewer.start_clone_viewer();
    });

    d3.select('#show_imputation_popup').on('click', () => smoothingImputation.show_imputation_popup());
    d3.select('#show_selection_logic_popup').on('click', () => selectionLogic.show_selection_logic_popup());
    d3.select('#show_doublet_popup').on('click', () => springPlot.show_make_new_SPRINGplot_popup());
    d3.select('#run_clustering').on('click', () => cluster2.run_clustering());
    d3.select('#show_PAGA_popup').on('click', () => paga.show_PAGA_popup());
    d3.select('#toggle_legend_hover_tooltip_button').on('click', () => colorBar.toggle_legend_hover_tooltip());
    d3.select('#extend_selection').on('click', () => selectionScript.extend_selection());
  };

  download_png = () => {
    let searchPaths = window.location.search.split('/');
    const path = searchPaths[searchPaths.length - 2] + '_' + searchPaths[searchPaths.length - 1] + '.png';
    this.download_sprite_as_png(this.app.renderer, this.app.stage, path);
  };

  download_sprite_as_png = (renderer, sprite, fileName) => {
    renderer.extract.canvas(sprite).toBlob(b => {
      let a = document.createElement('a');
      document.body.appendChild(a);
      a.download = fileName;
      a.href = URL.createObjectURL(b);
      a.click();
      a.remove();
    }, 'image/png');
  };

  showToolsDropdown() {
    if (d3.select('#tools_dropdown').style('height') === 'auto') {
      this.closeDropdown();
      collapse_settings();
      setTimeout(() => {
        document.getElementById('tools_dropdown').classList.toggle('show');
      }, 10);
    }
  }

  showDownloadDropdown() {
    if (d3.select('#download_dropdown').style('height') === 'auto') {
      this.closeDropdown();
      collapse_settings();
      setTimeout(() => {
        document.getElementById('download_dropdown').classList.toggle('show');
      }, 10);
    }
  }

  showLayoutDropdown() {
    if (d3.select('#layout_dropdown').style('height') === 'auto') {
      this.closeDropdown();
      collapse_settings();
      setTimeout(() => {
        document.getElementById('layout_dropdown').classList.toggle('show');
      }, 10);
    }
  }

  closeDropdown() {
    let dropdowns = document.getElementsByClassName('dropdown-content');
    for (let i = 0; i < dropdowns.length; i++) {
      let openDropdown = dropdowns[i];
      if (openDropdown.classList.contains('show')) {
        openDropdown.classList.remove('show');
      }
    }
  }

  setup_download_dropdown() {
    //d3.select("#download_dropdown_button").on("mouseenter",showDownloadDropdown);
    d3.select('#download_dropdown_button').on('click', () => this.showDownloadDropdown());
  }

  setup_tools_dropdown() {
    d3.select('#tools_dropdown_button').on('click', () => this.showToolsDropdown());
  }

  setup_layout_dropdown() {
    //d3.select("#layout_dropdown_button").on("mouseover",showLayoutDropdown);
    d3.select('#layout_dropdown_button').on('click', () => this.showLayoutDropdown());
  }

  fix() {
    if (d3.selectAll('.selected')[0].length === 0) {
      d3.selectAll('.node circle').each(d => {
        d.fixed = true;
      });
    }
    d3.selectAll('.selected').each(d => {
      d.fixed = true;
    });
  }

  unfix() {
    d3.selectAll('.selected').each(d => {
      d.fixed = false;
    });
    if (d3.selectAll('.selected')[0].length === 0) {
      d3.selectAll('.node circle').each(d => {
        d.fixed = false;
      });
    }
  }

  redraw() {
    if (!this.being_dragged && d3.event.sourceEvent) {
      let dim = document.getElementById('svg_graph').getBoundingClientRect();
      let x = d3.event.sourceEvent.clientX;
      let y = d3.event.sourceEvent.clientY;
      x = (x - this.sprites.position.x) / this.sprites.scale.x;
      y = (y - this.sprites.position.y) / this.sprites.scale.y;

      let extraX = x * (d3.event.transform.k - this.sprites.scale.x);
      let extraY = y * (d3.event.transform.k - this.sprites.scale.y);
      this.sprites.position.x += d3.event.sourceEvent.movementX - extraX;
      this.sprites.position.y += d3.event.sourceEvent.movementY - extraY;

      this.sprites.scale.x = d3.event.transform.k;
      this.sprites.scale.y = d3.event.transform.k;
      this.edge_container.position = this.sprites.position;
      this.edge_container.scale = this.sprites.scale;

      cloneViewer.clone_edge_container.position = this.sprites.position;
      cloneViewer.clone_edge_container.scale = this.sprites.scale;
      cloneViewer.clone_sprites.position = this.sprites.position;
      cloneViewer.clone_sprites.scale = this.sprites.scale;

      // text_container.position = sprites.position;
      // text_container.scale = sprites.scale;

      d3.select('#vis').attr(
        'transform',
        'translate(' +
          [this.sprites.position.x, this.sprites.position.y] +
          ')' +
          ' scale(' +
          this.sprites.scale.x +
          ')',
      );
    }
  }

  center_view(on_selected) {
    let all_xs = [];
    let all_ys = [];
    let num_selected = 0;
    for (let i = 0; i < this.all_nodes.length; i++) {
      if (this.all_outlines[i].selected) {
        num_selected += 1;
      }
    }
    for (let i = 0; i < this.all_nodes.length; i++) {
      if (!on_selected || this.all_outlines[i].selected || num_selected === 0) {
        all_xs.push(this.all_nodes[i].x);
        all_ys.push(this.all_nodes[i].y);
      }
    }

    let minx = d3.min(all_xs);
    let maxx = d3.max(all_xs);
    let miny = d3.min(all_ys);
    let maxy = d3.max(all_ys);

    const dx = maxx - minx + 50;
    const dy = maxy - miny + 50;
    const x = (maxx + minx) / 2;
    const y = (maxy + miny) / 2;
    let scale = 0.85 / Math.max(dx / this.width, dy / this.height);

    // perform transition in 750 ms with 25ms steps
    let N_STEPS = 5;
    let delta_x = (this.width / 2 - ((maxx + minx) / 2) * scale - this.sprites.position.x) / N_STEPS;
    let delta_y = (this.height / 2 + 30 - ((maxy + miny) / 2) * scale - this.sprites.position.y) / N_STEPS;
    let delta_scale = (scale - this.sprites.scale.x) / N_STEPS;

    let step = 0;
    const move = () => {
      if (step < N_STEPS) {
        this.sprites.position.x += delta_x;
        this.sprites.position.y += delta_y;
        this.sprites.scale.x += delta_scale;
        this.sprites.scale.y += delta_scale;
        this.edge_container.position = this.sprites.position;
        this.edge_container.scale = this.sprites.scale;
        cloneViewer.clone_edge_container.position = this.sprites.position;
        cloneViewer.clone_edge_container.scale = this.sprites.scale;
        cloneViewer.clone_sprites.position = this.sprites.position;
        cloneViewer.clone_sprites.scale = this.sprites.scale;

        d3.select('#vis').attr(
          'transform',
          'translate(' +
            [this.sprites.position.x, this.sprites.position.y] +
            ')' +
            ' scale(' +
            this.sprites.scale.x +
            ')',
        );
        this.zoomer.scaleTo(d3.select('svg').select('g'), this.sprites.scale.x);
        step += 1;
        setTimeout(move, 10);
      }
    };
    move();
  }

  save_coords = () => {
    if (this.mutable) {
      let text = '';
      for (let i in this.coordinates) {
        text = text + [i.toString(), this.all_nodes[i].x.toString(), this.all_nodes[i].y.toString()].join(',') + '\n';
      }
      let name = window.location.search;
      let path = name.slice(1, name.length) + '/coordinates.txt';
      $.ajax({
        data: { path: path, content: text },
        type: 'POST',
        url: 'cgi-bin/save_data.py',
      });
    }
  };
}
