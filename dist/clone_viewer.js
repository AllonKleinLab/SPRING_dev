var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
define(["require", "exports", "d3", "spinner", "./util", "./main"], function (require, exports, d3, Spinner, util_1, main_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class CloneViewer {
        static get instance() {
            if (!this._instance) {
                throw new Error('You must first call CloneViewer.create()!');
            }
            return this._instance;
        }
        static create() {
            return __awaiter(this, void 0, void 0, function* () {
                if (!this._instance) {
                    this._instance = new CloneViewer();
                    yield this._instance.loadData();
                    return this._instance;
                }
                else {
                    throw new Error('CloneViewer.create() has already been called, get the existing instance with CloneViewer.instance!');
                }
            });
        }
        constructor() {
            this.svg_graph = null;
            this.targetCircle = new PIXI.Graphics();
            this.clone_nodes = new Array();
            this.clone_edges = new Array();
            this.node_status = new Array();
            this.clone_sprites = new PIXI.Container();
            this.edge_container = new PIXI.Container();
            this.clone_edge_container = new PIXI.Container();
            this.clone_edge_container.position = main_1.forceLayout.sprites.position;
            this.clone_edge_container.scale = main_1.forceLayout.sprites.scale;
            this.clone_sprites.position = main_1.forceLayout.sprites.position;
            this.clone_sprites.scale = main_1.forceLayout.sprites.scale;
            this.targetCircle.alpha = 0;
            this.clone_sprites.addChild(this.targetCircle);
            this.show_clone_edges = false;
            this.show_source_nodes = false;
            main_1.forceLayout.app.stage.addChild(this.clone_edge_container);
            main_1.forceLayout.app.stage.addChild(this.clone_sprites);
            this.popup = d3
                .select('#force_layout')
                .append('div')
                .attr('id', 'clone_viewer_popup');
            this.popup
                .append('div')
                .style('padding', '5px')
                .style('height', '22px')
                .append('text')
                .text('Linkage browser')
                .attr('id', 'clone_title');
            this.clone_key = '';
            this.cloneKeyMenu = this.popup
                .append('div')
                .append('select')
                .style('font-size', '13px')
                // .style('margin-left','50px')
                //.style("text-align", "center")
                .attr('id', 'clone_key_menu')
                .on('change', () => {
                this.clone_key = document.getElementById('clone_key_menu').value;
            });
            this.cloneDispatch = d3.dispatch('load', 'statechange');
            this.cloneDispatch.on('load', data => {
                this.cloneKeyMenu.selectAll('option').remove();
                this.cloneKeyMenu
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
                this.cloneDispatch.on('statechange', state => {
                    select.property('value', state.id);
                });
            });
            this.popup
                .append('div')
                .on('mousedown', () => {
                d3.event.stopPropagation();
            })
                .append('label')
                .text('Selector radius')
                .append('input')
                .attr('type', 'range')
                .attr('id', 'clone_selector_size_slider')
                .style('margin-left', '21px')
                .attr('value', '25')
                .on('input', () => this.draw_target_circle());
            this.popup
                .append('div')
                .on('mousedown', () => {
                d3.event.stopPropagation();
            })
                .append('label')
                .text('Highlight size')
                .append('input')
                .attr('type', 'range')
                .attr('value', '25')
                .attr('id', 'clone_node_size_slider')
                .style('margin-left', '31px')
                .on('input', () => this.update_highlight_size());
            this.popup
                .append('div')
                .on('mousedown', () => {
                d3.event.stopPropagation();
            })
                .append('label')
                .text('Darkness level')
                .append('input')
                .attr('type', 'range')
                .attr('value', '25')
                .attr('id', 'clone_darkness_slider')
                .style('margin-left', '23px')
                .on('input', () => this.darken_nodes());
            this.popup
                .append('div')
                .on('mousedown', () => {
                d3.event.stopPropagation();
            })
                .append('label')
                .text('Max group size')
                .append('input')
                .attr('type', 'text')
                .attr('value', '0')
                .attr('id', 'clone_size_input')
                .style('margin-left', '23px')
                .on('input', () => this.darken_nodes());
            let source_target_options = this.popup.append('div');
            source_target_options
                .append('button')
                .text('Source')
                .style('width', '60px')
                .on('click', () => this.set_source_from_selection());
            source_target_options
                .append('button')
                .text('Target')
                .style('width', '60px')
                .on('click', () => this.set_target_from_selection());
            source_target_options
                .append('button')
                .text('Reset all')
                .style('width', '87px')
                .on('click', () => this.reset_all_nodes());
            let node_color_options = this.popup.append('div');
            node_color_options
                .append('button')
                .text('Darken')
                .on('click', () => this.darken_nodes());
            node_color_options
                .append('button')
                .text('Burn')
                .on('click', () => this.burn());
            node_color_options
                .append('button')
                .text('Restore')
                .on('click', () => this.restore_colors());
            node_color_options
                .append('button')
                .text('Clear')
                .on('click', () => this.clear_clone_overlays());
            let show_things_options = this.popup.append('div');
            show_things_options
                .append('button')
                .style('width', '106px')
                .text('Show edges')
                .on('click', d => {
                if (this.show_clone_edges) {
                    this.show_clone_edges = false;
                    d3.select(d).text('Show edges');
                }
                else {
                    this.show_clone_edges = true;
                    d3.select(d).text('Hide edges');
                }
            });
            show_things_options
                .append('button')
                .style('width', '106px')
                .text('Show source')
                .on('click', d => {
                if (this.show_source_nodes) {
                    this.show_source_nodes = false;
                    d3.select(d).text('Show source');
                }
                else {
                    this.show_source_nodes = true;
                    d3.select(d).text('Hide source');
                }
            });
            let other_options = this.popup.append('div');
            other_options
                .append('button')
                .text('Extend from selection')
                .style('width', '156px')
                .on('click', () => this.extend_from_selection());
            other_options
                .append('button')
                .text('Close')
                .style('width', '56px')
                .on('click', () => this.close_clone_viewer());
            this.loading_screen = this.popup.append('div').attr('id', 'clone_loading_screen');
            this.show_waiting_wheel();
            this.loading_screen.append('p').text('Loading linkage data');
            d3.select('#clone_viewer_popup').call(d3
                .drag()
                .on('start', () => this.clone_viewer_popup_dragstarted())
                .on('drag', () => this.clone_viewer_popup_dragged())
                .on('end', () => this.clone_viewer_popup_dragended()));
            return this;
        }
        // <-- CloneViewer Constructor End -->
        loadData() {
            return __awaiter(this, void 0, void 0, function* () {
                this.clone_map = {};
                const noCache = new Date().getTime();
                const filePath = main_1.project_directory + '/clone_map.json';
                try {
                    const cloneData = yield d3.json(filePath + '?_=' + noCache);
                    //console.log(error);
                    for (let k in cloneData) {
                        this.clone_map[k] = {};
                        for (let i in main_1.forceLayout.all_nodes) {
                            this.clone_map[k][i] = [];
                        }
                        for (let i in cloneData[k]) {
                            this.clone_map[k][i] = cloneData[k][i];
                        }
                    }
                }
                catch (e) {
                    console.log(`Error getting clone data, continuing.\n${e}`);
                }
                finally {
                    d3.select('#clone_loading_screen').style('visibility', 'hidden');
                    this.cloneDispatch.call('load', this, this.clone_map);
                    this.clone_key = document.getElementById('clone_key_menu').value;
                }
            });
        }
        reset() {
            return;
        }
        show_waiting_wheel() {
            this.loading_screen.append('div').attr('id', 'clone_wheel_mask');
            let opts = {
                className: 'spinner',
                color: '#000',
                corners: 1,
                direction: 1,
                fps: 20,
                hwaccel: true,
                left: '50%',
                length: 35,
                lines: 17,
                opacity: 0.2,
                position: 'relative',
                radius: 50,
                rotate: 8,
                scale: 0.22,
                shadow: false,
                speed: 0.9,
                top: '50%',
                trail: 60,
                width: 15,
                zIndex: 2e9,
            };
            let target = document.getElementById('clone_wheel_mask');
            let spinner = new Spinner(opts).spin(target);
            $(target).data('spinner', spinner);
            return this;
        }
        clone_viewer_popup_dragstarted() {
            d3.event.sourceEvent.stopPropagation();
        }
        clone_viewer_popup_dragged() {
            let cx = parseFloat(d3
                .select('#clone_viewer_popup')
                .style('left')
                .split('px')[0]);
            let cy = parseFloat(d3
                .select('#clone_viewer_popup')
                .style('top')
                .split('px')[0]);
            d3.select('#clone_viewer_popup').style('left', (cx + d3.event.dx).toString() + 'px');
            d3.select('#clone_viewer_popup').style('top', (cy + d3.event.dy).toString() + 'px');
        }
        clone_viewer_popup_dragended() {
            return;
        }
        reset_all_nodes() {
            for (let i = 0; i < main_1.forceLayout.all_outlines.length; i++) {
                this.node_status[i].source = false;
                this.node_status[i].target = false;
            }
        }
        clear_clone_overlays() {
            for (let i in this.clone_nodes) {
                this.deactivate_nodes(i);
            }
            for (let i in this.clone_edges) {
                this.deactivate_edges(i);
            }
        }
        close_clone_viewer() {
            this.svg_graph.on('mousemove', null);
            this.svg_graph.on('click', null);
            this.popup.style('visibility', 'hidden');
            this.reset_all_nodes();
            this.clear_clone_overlays();
            this.targetCircle.clear();
        }
        update_highlight_size() {
            let my_scale = parseFloat(d3.select('#clone_node_size_slider').node().value) / 10;
            for (let i in this.clone_nodes) {
                this.clone_nodes[i].scale.x = main_1.forceLayout.all_nodes[i].scale.x * my_scale;
                this.clone_nodes[i].scale.y = main_1.forceLayout.all_nodes[i].scale.x * my_scale;
            }
        }
        burn() {
            for (let i = 0; i < main_1.forceLayout.all_nodes.length; i++) {
                if (this.clone_nodes[i] === undefined && main_1.forceLayout.all_nodes[i].tint === '0x000000') {
                    main_1.forceLayout.base_colors[i] = { r: 0, g: 0, b: 0 };
                }
            }
            main_1.colorBar.update_tints();
            main_1.forceLayout.app.stage.children.sort((a, b) => {
                return (main_1.colorBar.average_color(main_1.forceLayout.base_colors[a.tabIndex]) -
                    main_1.colorBar.average_color(main_1.forceLayout.base_colors[b.tabIndex]));
            });
            this.clear_clone_overlays();
        }
        restore_colors() {
            main_1.colorBar.setNodeColors();
        }
        extend_from_selection() {
            for (let i in this.clone_nodes) {
                if (!this.clone_nodes[i].active_stable) {
                    this.deactivate_nodes(i);
                }
            }
            for (let i in this.clone_edges) {
                this.deactivate_edges(i);
            }
            let maxGroupSize = parseFloat(d3.select('#clone_size_input').node().value);
            if (maxGroupSize > 0 === false) {
                maxGroupSize = 100000000;
            }
            for (let i = 0; i < main_1.forceLayout.all_nodes.length; i++) {
                if (main_1.forceLayout.all_outlines[i].selected &&
                    this.clone_map[this.clone_key][i].length < maxGroupSize &&
                    this.node_status[i].source) {
                    if (!(i in this.clone_nodes)) {
                        this.activate_edges(i, false);
                        if (this.show_source_nodes) {
                            this.activate_node(i, false);
                        }
                    }
                }
            }
        }
        draw_target_circle() {
            this.targetCircle.clear();
            this.targetCircle.lineStyle(7, 0xffffff); //(thickness, color)
            this.targetCircle.drawCircle(0, 0, this.get_clone_radius() + main_1.forceLayout.all_nodes[0].scale.x * util_1.SPRITE_IMG_WIDTH); //(x,y,radius)
            this.targetCircle.endFill();
            this.targetCircle.alpha = 1;
        }
        get_clone_radius() {
            let r = parseInt(d3.select('#clone_selector_size_slider').node().value, 10);
            return Math.pow(r, 1.5) / 8;
        }
        clone_mousemove() {
            let dim = document.getElementById('svg_graph').getBoundingClientRect();
            let x = d3.event.clientX - dim.left;
            let y = d3.event.clientY - dim.top;
            x = (x - main_1.forceLayout.sprites.position.x) / main_1.forceLayout.sprites.scale.x;
            y = (y - main_1.forceLayout.sprites.position.y) / main_1.forceLayout.sprites.scale.y;
            this.targetCircle.x = x;
            this.targetCircle.y = y;
            for (let i in this.clone_nodes) {
                if (!this.clone_nodes[i].active_stable) {
                    this.deactivate_nodes(i);
                }
            }
            for (let i in this.clone_edges) {
                this.deactivate_edges(i);
            }
            let maxGroupSize = parseFloat(d3.select('#clone_size_input').node().value);
            if (maxGroupSize > 0 === false) {
                maxGroupSize = 100000000;
            }
            for (let i = 0; i < main_1.forceLayout.all_nodes.length; i++) {
                const rad = Math.sqrt(Math.pow((main_1.forceLayout.all_nodes[i].x - x), 2) + Math.pow((main_1.forceLayout.all_nodes[i].y - y), 2));
                if (rad <= this.get_clone_radius()) {
                    const nodeAndCloneExist = this.node_status[i].source && this.clone_map[this.clone_key] && this.clone_map[this.clone_key][i];
                    if (nodeAndCloneExist && this.clone_map[this.clone_key][i].length < maxGroupSize) {
                        if (!(i in this.clone_nodes)) {
                            this.activate_edges(i, false);
                            if (this.show_source_nodes) {
                                this.activate_node(i, false);
                            }
                        }
                    }
                }
            }
            this.targetCircle.alpha = 0.75;
            setTimeout(() => {
                dim_target_circle(0.75);
            }, 150);
            const dim_target_circle = newX => {
                if (newX > 0 && this.targetCircle.alpha === newX) {
                    this.targetCircle.alpha = newX - 0.08;
                    let dimmer = setTimeout(() => {
                        dim_target_circle(newX - 0.08);
                    }, 20);
                }
            };
        }
        start_clone_viewer() {
            this.svg_graph = d3.select('#svg_graph');
            for (let i = 0; i < main_1.forceLayout.all_nodes.length; i++) {
                this.node_status[i] = { active: false, active_stable: false, source: false, target: false };
            }
            this.svg_graph.on('mousemove', () => this.clone_mousemove());
            this.svg_graph.on('click', () => this.clone_click());
            d3.select('#clone_viewer_popup').style('visibility', 'visible');
            d3.select('#settings_range_background_color').node().value = 65;
            main_1.forceLayout.app.renderer.backgroundColor = parseInt(util_1.rgbToHex(65, 65, 65), 16);
            this.draw_target_circle();
            this.set_source_from_selection();
            this.set_target_from_selection();
            this.darken_nodes();
        }
        activate_node(i, stable) {
            if (!(i in this.clone_nodes)) {
                let circ = PIXI.Sprite.fromImage('stuff/disc.png');
                circ.anchor.set(0.5);
                let my_scale = parseFloat(d3.select('#clone_node_size_slider').node().value) / 10;
                circ.scale.set(main_1.forceLayout.all_nodes[i].scale.x * my_scale);
                circ.x = main_1.forceLayout.all_nodes[i].x;
                circ.y = main_1.forceLayout.all_nodes[i].y;
                let rgb = main_1.forceLayout.base_colors[i];
                circ.tint = parseInt(util_1.rgbToHex(rgb.r, rgb.g, rgb.b), 16);
                this.node_status[i].active = true;
                this.node_status[i].active_stable = stable;
                main_1.forceLayout.sprites.removeChild(circ);
                this.clone_sprites.addChild(circ);
                this.clone_nodes[i] = circ;
            }
            this.clone_nodes[i].active_stable = this.clone_nodes[i].active_stable || stable;
            this.clone_nodes[i].x = main_1.forceLayout.all_nodes[i].x;
            this.clone_nodes[i].y = main_1.forceLayout.all_nodes[i].y;
        }
        activate_edges(i, stable) {
            if (!(i in this.clone_edges)) {
                let edge_list = [];
                for (let j = 0; j < this.clone_map[this.clone_key][i].length; j++) {
                    //console.log([i,clone_map[i][j]]);
                    if (this.node_status[this.clone_map[this.clone_key][i][j]].target) {
                        this.activate_node(this.clone_map[this.clone_key][i][j], stable);
                        if (this.show_clone_edges) {
                            let source = i;
                            let target = this.clone_map[this.clone_key][i][j];
                            let x1 = main_1.forceLayout.all_nodes[source].x;
                            let y1 = main_1.forceLayout.all_nodes[source].y;
                            let x2 = main_1.forceLayout.all_nodes[target].x;
                            let y2 = main_1.forceLayout.all_nodes[target].y;
                            let rgb = main_1.forceLayout.base_colors[this.clone_map[this.clone_key][i][j]];
                            let color = util_1.rgbToHex(rgb.r, rgb.g, rgb.b);
                            let line = new PIXI.Graphics();
                            line.lineStyle(5, parseInt(color, 16), 1);
                            line.moveTo(x1, y1);
                            line.lineTo(x2, y2);
                            this.clone_edge_container.addChild(line);
                            edge_list.push(line);
                        }
                    }
                }
                this.clone_edges[i] = edge_list;
            }
            else if (stable) {
                for (let j = 0; j < this.clone_map[this.clone_key][i].length; j++) {
                    if (this.node_status[this.clone_map[this.clone_key][i][j]].target) {
                        this.activate_node(this.clone_map[this.clone_key][i][j], stable);
                    }
                }
            }
        }
        clone_click() {
            /*
            let dim = document.getElementById('svg_graph').getBoundingClientRect();
            let x = d3.event.clientX - dim.left;
            let y = d3.event.clientY - dim.top;
            x = (x - sprites.position.x) / sprites.scale.x;
            y = (y - sprites.position.y) / sprites.scale.y;
            for (let i=0; i<all_nodes.length; i++) {
              if (! all_outlines[i].selected) {
                rad = Math.sqrt((all_nodes[i].x-x)**2 + (all_nodes[i].y-y)**2);
                if (rad < get_clone_radius()) {
                  if (node_status[i].source) {
                    if (show_source_nodes) {
                      activate_node(i,true);
                    }
                    activate_edges(i,true);
                  }
                }
              }
            }
            */
        }
        deactivate_nodes(i) {
            if (i in this.clone_nodes) {
                this.clone_sprites.removeChild(this.clone_nodes[i]);
                delete this.clone_nodes[i];
                this.node_status[i].active = false;
                this.node_status[i].active_stable = false;
            }
        }
        deactivate_edges(i) {
            if (i in this.clone_edges) {
                for (let j = 0; j < this.clone_edges[i].length; j++) {
                    this.clone_edge_container.removeChild(this.clone_edges[i][j]);
                }
                delete this.clone_edges[i];
            }
        }
        set_source_from_selection() {
            let none_selected = true;
            for (let i = 0; i < main_1.forceLayout.all_outlines.length; i++) {
                if (main_1.forceLayout.all_outlines[i].selected) {
                    none_selected = false;
                    i = main_1.forceLayout.all_outlines.length;
                }
            }
            for (let i = 0; i < main_1.forceLayout.all_outlines.length; i++) {
                if (main_1.forceLayout.all_outlines[i].selected || none_selected) {
                    this.node_status[i].source = true;
                }
            }
        }
        set_target_from_selection() {
            let none_selected = true;
            for (let i = 0; i < main_1.forceLayout.all_outlines.length; i++) {
                if (main_1.forceLayout.all_outlines[i].selected) {
                    none_selected = false;
                    i = main_1.forceLayout.all_outlines.length;
                }
            }
            for (let i = 0; i < main_1.forceLayout.all_outlines.length; i++) {
                if (main_1.forceLayout.all_outlines[i].selected || none_selected) {
                    this.node_status[i].target = true;
                }
            }
        }
        darken_nodes() {
            let darkness = parseFloat(d3.select('#clone_darkness_slider').node().value) / 100;
            for (let i = 0; i < main_1.forceLayout.all_nodes.length; i++) {
                let cc = main_1.forceLayout.base_colors[i];
                let r = Math.floor(cc.r * darkness);
                let b = Math.floor(cc.b * darkness);
                let g = Math.floor(cc.g * darkness);
                main_1.forceLayout.all_nodes[i].tint = util_1.rgbToHex(r, g, b);
            }
        }
    }
    exports.default = CloneViewer;
});
