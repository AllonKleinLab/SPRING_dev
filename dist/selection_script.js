define(["require", "exports", "d3", "./rotation_script", "./main", "./util"], function (require, exports, d3, rotation_script_1, main_1, util_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class SelectionScript {
        static get instance() {
            if (!this._instance) {
                throw new Error('You must first call SelectionScript.create()!');
            }
            return this._instance;
        }
        static create() {
            if (!this._instance) {
                this._instance = new SelectionScript();
                return this._instance;
            }
            else {
                throw new Error('SelectionScript.create() has already been called, get the existing instance with SelectionScript.instance!');
            }
        }
        get svg_width() {
            const result = parseInt(d3.select('svg').attr('width'), 10);
            return result ? result : 0;
        }
        constructor() {
            this.selection_mode = 'drag_pan_zoom';
            this.drag_pan_zoom_rect = d3
                .select('svg')
                .append('rect')
                .attr('class', 'selection_option')
                .attr('x', this.svg_width - 177)
                .attr('y', 0)
                .attr('fill-opacity', 0.5)
                .attr('width', 200)
                .attr('height', 24)
                .on('click', () => {
                this.selection_mode = 'drag_pan_zoom';
                this.switch_mode();
            });
            this.positive_select_rect = d3
                .select('svg')
                .append('rect')
                .attr('class', 'selection_option')
                .attr('x', this.svg_width - 177)
                .attr('y', 24)
                .attr('fill-opacity', 0.15)
                .attr('width', 200)
                .attr('height', 24)
                .on('click', () => {
                this.selection_mode = 'positive_select';
                this.switch_mode();
            });
            this.negative_select_rect = d3
                .select('svg')
                .append('rect')
                .attr('class', 'selection_option')
                .attr('x', this.svg_width - 177)
                .attr('y', 48)
                .attr('fill-opacity', 0.15)
                .attr('width', 200)
                .attr('height', 24)
                .on('click', () => {
                this.selection_mode = 'negative_select';
                this.switch_mode();
            });
            this.deselect_rect = d3
                .select('svg')
                .append('rect')
                .attr('class', 'selection_option')
                .attr('x', this.svg_width - 177)
                .attr('y', 72)
                .attr('fill-opacity', 0.15)
                .attr('width', 200)
                .attr('height', 24)
                .on('click', () => {
                this.selection_mode = 'deselect';
                this.switch_mode();
            });
            this.pos_select_count_rect = d3
                .select('svg')
                .append('rect')
                .attr('class', 'selection_option')
                .attr('x', this.svg_width)
                .attr('y', 103)
                .attr('fill-opacity', 0.25)
                .attr('width', 200)
                .attr('height', 24);
            this.neg_select_count_rect = d3
                .select('svg')
                .append('rect')
                .attr('class', 'selection_option')
                .attr('x', this.svg_width)
                .attr('y', 127)
                .attr('fill-opacity', 0.25)
                .attr('width', 200)
                .attr('height', 24);
            this.switch_div = d3
                .select('#force_layout')
                .append('div')
                .attr('id', 'selection_switch_div')
                .style('position', 'absolute')
                .style('top', '35px')
                .style('right', '0px')
                .style('width', '20px')
                .style('height', '30px')
                .on('click', () => this.switch_pos_neg())
                .append('img')
                .attr('src', 'stuff/switch_arrow.png')
                .style('height', '100%')
                .style('width', '8px')
                .style('margin-left', '8px');
            d3.select('svg')
                .append('text')
                .attr('pointer-events', 'none')
                .attr('class', 'selection_option')
                .attr('x', this.svg_width - 167)
                .attr('y', 16)
                .attr('font-family', 'sans-serif')
                .attr('font-size', '12px')
                .attr('fill', 'white')
                .text('Drag/pan/zoom');
            d3.select('svg')
                .append('text')
                .attr('pointer-events', 'none')
                .attr('class', 'selection_option')
                .attr('x', this.svg_width - 167)
                .attr('y', 40)
                .attr('font-family', 'sans-serif')
                .attr('font-size', '12px')
                .attr('fill', 'yellow')
                .text('Positive select (shift)');
            d3.select('svg')
                .append('text')
                .attr('pointer-events', 'none')
                .attr('class', 'selection_option')
                .attr('x', this.svg_width - 167)
                .attr('y', 64)
                .attr('font-family', 'sans-serif')
                .attr('font-size', '12px')
                .attr('fill', 'blue')
                .text('Negative select (Shift+Esc)');
            d3.select('svg')
                .append('text')
                .attr('pointer-events', 'none')
                .attr('class', 'selection_option')
                .attr('x', this.svg_width - 167)
                .attr('y', 88)
                .attr('font-family', 'sans-serif')
                .attr('font-size', '12px')
                .attr('fill', 'white')
                .text('Deselect (command)');
            this.pos_select_count_text = d3
                .select('svg')
                .append('text')
                .attr('pointer-events', 'none')
                .attr('class', 'selection_option')
                .attr('x', this.svg_width)
                .attr('y', 119)
                .attr('font-family', 'sans-serif')
                .attr('font-size', '12px')
                .attr('fill', 'yellow')
                .text('0 cells selected');
            this.neg_select_count_text = d3
                .select('svg')
                .append('text')
                .attr('pointer-events', 'none')
                .attr('class', 'selection_option')
                .attr('x', this.svg_width)
                .attr('y', 143)
                .attr('font-family', 'sans-serif')
                .attr('font-size', '12px')
                .attr('fill', 'blue')
                .text('0 cells selected');
            d3.select('body')
                .on('keydown', () => this.keydown())
                .on('keyup', () => this.keyup());
            this.base_radius = parseInt(d3.select('#settings_range_node_size').attr('value'), 10) / 100;
            this.large_radius = this.base_radius * 3;
            this.setup_brusher();
            // "(De)select All" button
            d3.select('#deselect')
                .select('button')
                .on('click', () => this.deselect_all());
        }
        // <-- SelectionScript Constructor End -->
        setup_brusher() {
            this.brusher = d3
                .brush()
                .on('brush', () => {
                let extent = d3
                    .selectAll('.brush .selection')
                    .node()
                    .getBoundingClientRect();
                for (let i = 0; i < main_1.forceLayout.all_nodes.length; i++) {
                    let d = main_1.forceLayout.all_nodes[i];
                    let dim = document.getElementById('svg_graph').getBoundingClientRect();
                    let x = d.x * main_1.forceLayout.sprites.scale.x + dim.left;
                    let y = d.y * main_1.forceLayout.sprites.scale.y + dim.top;
                    x = x + main_1.forceLayout.sprites.position.x;
                    y = y + main_1.forceLayout.sprites.position.y;
                    let inrect = extent.left <= x && x < extent.right && extent.top <= y && y < extent.bottom;
                    let o = main_1.forceLayout.all_outlines[i];
                    if (this.selection_mode === 'positive_select' || this.selection_mode === 'negative_select') {
                        o.selected = (o.selected && !o.compared) || (this.selection_mode === 'positive_select' && inrect);
                        o.compared = (o.compared && !o.selected) || (this.selection_mode === 'negative_select' && inrect);
                    }
                    if (this.selection_mode === 'deselect') {
                        o.selected = o.selected && !inrect;
                        o.compared = o.compared && !inrect;
                    }
                    if (o.selected) {
                        o.alpha = main_1.forceLayout.all_nodes[i].alpha;
                        o.tint = '0xffff00';
                    }
                    if (o.compared) {
                        o.alpha = main_1.forceLayout.all_nodes[i].alpha;
                        o.tint = '0x0000ff';
                    }
                    if (o.selected || o.compared) {
                        // 				all_outlines[i].scale.set(large_radius);
                        // 				all_nodes[i].scale.set(large_radius);
                    }
                    else {
                        o.alpha = 0;
                        // 				all_outlines[i].scale.set(base_radius);
                        // 				all_nodes[i].scale.set(base_radius);
                    }
                }
                this.update_selected_count();
                main_1.colorBar.count_clusters();
            })
                .on('end', d => {
                // Ensures we don't recursively call 'brush end' events: https://github.com/d3/d3-brush/issues/25
                if (d3.event.sourceEvent.type !== 'end') {
                    this.brusher.move(this.brush, null);
                }
                let selected = [];
                let indices = [];
                for (let i = 0; i < main_1.forceLayout.all_outlines.length; ++i) {
                    if (main_1.forceLayout.all_outlines[i].selected) {
                        selected.push(main_1.forceLayout.all_outlines[i]);
                        indices.push(i);
                    }
                }
                util_1.postMessageToParent({ type: 'selected-cells-update', payload: { indices } });
                if (selected.length === 0) {
                    rotation_script_1.rotation_hide();
                }
            });
            this.brush = d3
                .select('#svg_graph')
                .append('g')
                .datum(() => {
                return { selected: false };
            })
                .attr('class', 'brush');
            this.brush
                .call(this.brusher)
                .on('mousedown.brush', null)
                .on('touchstart.brush', null)
                .on('touchmove.brush', null)
                .on('touchend.brush', null);
            this.brush.select('.background').style('cursor', 'auto');
        }
        switch_pos_neg() {
            let pos_cells = [];
            let neg_cells = [];
            for (let i = 0; i < main_1.forceLayout.all_outlines.length; i++) {
                if (main_1.forceLayout.all_outlines[i].selected) {
                    pos_cells.push(i);
                }
                if (main_1.forceLayout.all_outlines[i].compared) {
                    neg_cells.push(i);
                }
            }
            for (let i = 0; i < neg_cells.length; i++) {
                main_1.forceLayout.all_outlines[neg_cells[i]].tint = '0xffff00';
                main_1.forceLayout.all_outlines[neg_cells[i]].selected = true;
                main_1.forceLayout.all_outlines[neg_cells[i]].compared = false;
            }
            for (let i = 0; i < pos_cells.length; i++) {
                main_1.forceLayout.all_outlines[pos_cells[i]].tint = '0x0000ff';
                main_1.forceLayout.all_outlines[pos_cells[i]].compared = true;
                main_1.forceLayout.all_outlines[pos_cells[i]].selected = false;
            }
        }
        switch_mode() {
            this.drag_pan_zoom_rect.transition('5').attr('fill-opacity', this.selection_mode === 'drag_pan_zoom' ? 0.5 : 0.15);
            this.positive_select_rect
                .transition()
                .duration(5)
                .attr('fill-opacity', this.selection_mode === 'positive_select' ? 0.5 : 0.15);
            this.negative_select_rect
                .transition()
                .duration(5)
                .attr('fill-opacity', this.selection_mode === 'negative_select' ? 0.5 : 0.15);
            this.deselect_rect.transition('5').attr('fill-opacity', this.selection_mode === 'deselect' ? 0.5 : 0.15);
            if (this.selection_mode !== 'drag_pan_zoom') {
                d3.select('#svg_graph').select('g')
                    .call(main_1.forceLayout.zoomer)
                    .on('mousedown.zoom', null)
                    .on('touchstart.zoom', null)
                    .on('touchmove.zoom', null)
                    .on('touchend.zoom', null);
                this.brush.select('.background').style('cursor', 'crosshair');
                this.brush.call(this.brusher);
            }
            if (this.selection_mode === 'drag_pan_zoom') {
                this.brush
                    .call(this.brusher)
                    .on('mousedown.brush', null)
                    .on('touchstart.brush', null)
                    .on('touchmove.brush', null)
                    .on('touchend.brush', null);
                this.brush.select('.background').style('cursor', 'auto');
                d3.select('#svg_graph').select('g').call(main_1.forceLayout.zoomer);
            }
        }
        keydown() {
            let shiftKey = d3.event.shiftKey;
            let metaKey = d3.event.metaKey; // command key on a mac
            let keyCode = d3.event.keyCode;
            if (shiftKey && keyCode !== 27) {
                this.selection_mode = 'positive_select';
            }
            if (shiftKey && keyCode === 27) {
                this.selection_mode = 'negative_select';
            }
            if (metaKey) {
                this.selection_mode = 'deselect';
            }
            this.switch_mode();
        }
        keyup() {
            let shiftKey = d3.event.shiftKey || d3.event.metaKey;
            let ctrlKey = d3.event.ctrlKey;
            let keyCode = 0;
            this.selection_mode = 'drag_pan_zoom';
            this.switch_mode();
        }
        retract_edge_toggle(callback) {
            d3.select('#edge_toggle_image')
                .transition()
                .duration(400)
                .attr('x', this.svg_width);
            d3.select('#show_edges_rect')
                .transition()
                .duration(400)
                .attr('x', this.svg_width);
            d3.select('#edge_text')
                .selectAll('tspan')
                .transition()
                .duration(400)
                .attr('x', this.svg_width)
                .each(() => callback());
        }
        update_selected_count() {
            let num_selected = 0;
            let num_compared = 0;
            const selectedNodeIndices = new Array();
            for (let i = 0; i < main_1.forceLayout.all_nodes.length; i++) {
                if (main_1.forceLayout.all_outlines[i].selected) {
                    num_selected += 1;
                    selectedNodeIndices.push(i);
                }
                if (main_1.forceLayout.all_outlines[i].compared) {
                    num_compared += 1;
                }
            }
            if (num_selected === 0 && this.pos_count_extended) {
                this.pos_count_extended = false;
                if (!this.neg_count_extended) {
                    this.pos_select_count_rect.transition('500').attr('x', this.svg_width);
                    this.pos_select_count_text
                        .transition('500')
                        .attr('x', this.svg_width)
                        .each(() => this.extend_edge_toggle());
                }
                else {
                    this.pos_select_count_rect
                        .transition()
                        .duration(500)
                        .attr('x', this.svg_width);
                    this.pos_select_count_text
                        .transition()
                        .duration(500)
                        .attr('x', this.svg_width);
                }
            }
            if (num_selected !== 0) {
                if (!this.pos_count_extended) {
                    this.pos_count_extended = true;
                    if (!this.neg_count_extended) {
                        this.retract_edge_toggle(() => {
                            this.pos_select_count_rect
                                .transition()
                                .duration(500)
                                .attr('x', this.svg_width - 177);
                            this.pos_select_count_text
                                .transition()
                                .duration(500)
                                .attr('x', this.svg_width - 167);
                        });
                    }
                    else {
                        this.pos_select_count_rect
                            .transition()
                            .duration(500)
                            .attr('x', this.svg_width - 177);
                        this.pos_select_count_text
                            .transition()
                            .duration(500)
                            .attr('x', this.svg_width - 167);
                    }
                }
                let pct = Math.floor((num_selected / main_1.forceLayout.all_nodes.length) * 100);
                this.pos_select_count_text.text(num_selected.toString() + ' cells selected   (' + pct.toString() + '%)');
            }
            if (num_compared === 0 && this.neg_count_extended) {
                this.neg_count_extended = false;
                if (!this.pos_count_extended) {
                    this.neg_select_count_rect
                        .transition()
                        .duration(500)
                        .attr('x', this.svg_width);
                    this.neg_select_count_text
                        .transition()
                        .duration(500)
                        .attr('x', this.svg_width)
                        .each(() => this.extend_edge_toggle());
                }
                else {
                    this.neg_select_count_rect
                        .transition()
                        .duration(500)
                        .attr('x', this.svg_width);
                    this.neg_select_count_text
                        .transition()
                        .duration(500)
                        .attr('x', this.svg_width);
                }
            }
            if (num_compared !== 0) {
                if (!this.neg_count_extended) {
                    this.neg_count_extended = true;
                    if (!this.pos_count_extended) {
                        this.retract_edge_toggle(() => {
                            this.neg_select_count_rect
                                .transition()
                                .duration(500)
                                .attr('x', this.svg_width - 177);
                            this.neg_select_count_text
                                .transition()
                                .duration(500)
                                .attr('x', this.svg_width - 167);
                        });
                    }
                    else {
                        this.neg_select_count_rect
                            .transition()
                            .duration(500)
                            .attr('x', this.svg_width - 177);
                        this.neg_select_count_text
                            .transition()
                            .duration(500)
                            .attr('x', this.svg_width - 167);
                    }
                }
                let newPct = Math.floor((num_compared / main_1.forceLayout.all_nodes.length) * 100);
                this.neg_select_count_text.text(num_compared.toString() + ' cells selected   (' + newPct.toString() + '%)');
            }
        }
        extend_edge_toggle() {
            d3.select('#edge_toggle_image')
                .transition()
                .duration(400)
                .attr('x', this.svg_width - 77);
            d3.select('#show_edges_rect')
                .transition()
                .duration(400)
                .attr('x', this.svg_width - 177);
            d3.select('#edge_text')
                .selectAll('tspan')
                .transition()
                .duration(400)
                .attr('x', this.svg_width - 167);
        }
        deselect_all() {
            let any_selected = false;
            for (let i = 0; i < main_1.forceLayout.all_nodes.length; i++) {
                if (main_1.forceLayout.all_outlines[i].selected) {
                    any_selected = true;
                }
                if (main_1.forceLayout.all_outlines[i].compared) {
                    any_selected = true;
                }
            }
            if (any_selected) {
                rotation_script_1.rotation_hide();
                for (let i = 0; i < main_1.forceLayout.all_nodes.length; i++) {
                    main_1.forceLayout.all_outlines[i].alpha = 0;
                    main_1.forceLayout.all_outlines[i].selected = false;
                    main_1.forceLayout.all_outlines[i].compared = false;
                    // 				all_nodes[i].scale.set(base_radius);
                    // 				all_outlines[i].scale.set(base_radius);
                }
            }
            if (!any_selected) {
                for (let i = 0; i < main_1.forceLayout.all_nodes.length; i++) {
                    main_1.forceLayout.all_outlines[i].alpha = main_1.forceLayout.all_nodes[i].alpha;
                    main_1.forceLayout.all_outlines[i].tint = '0xffff00';
                    main_1.forceLayout.all_outlines[i].selected = true;
                    // 				all_outlines[i].scale.set(large_radius);
                    // 				all_nodes[i].scale.set(large_radius);
                }
            }
            main_1.colorBar.count_clusters();
            this.update_selected_count();
        }
        loadSelectedCells(project_directory) {
            // load selected cells if it exists
            let selection_filename = project_directory + '/selected_cells.txt';
            let new_selection = new Array();
            d3.text(selection_filename).then(text => {
                text.split('\n').forEach((entry, index, array) => {
                    if (entry !== '') {
                        new_selection.push(parseInt(entry, 10));
                    }
                });
                d3.selectAll('.node circle').classed('selected', d => {
                    if (new_selection.indexOf(d.name) >= 0) {
                        d.selected = true;
                        return true;
                    }
                });
            });
        }
        extend_selection() {
            for (let i = 0; i < main_1.forceLayout.all_nodes.length; i++) {
                if (main_1.forceLayout.all_outlines[i].selected) {
                    for (let j in main_1.forceLayout.neighbors[i]) {
                        let jj = main_1.forceLayout.neighbors[i][j];
                        main_1.forceLayout.all_outlines[jj].alpha = main_1.forceLayout.all_nodes[i].alpha;
                        main_1.forceLayout.all_outlines[jj].tint = '0xffff00';
                        main_1.forceLayout.all_outlines[jj].selected = true;
                    }
                }
            }
        }
    }
    exports.default = SelectionScript;
});
