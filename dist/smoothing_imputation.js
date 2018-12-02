define(["require", "exports", "d3", "spinner", "./main"], function (require, exports, d3, Spinner, main_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class SmoothingImputation {
        static get instance() {
            if (!this._instance) {
                throw new Error('You must first call SmoothingImputation.create()!');
            }
            return this._instance;
        }
        static create() {
            if (!this._instance) {
                this._instance = new SmoothingImputation();
                return this._instance;
            }
            else {
                throw new Error('SmoothingImputation.create() has already been called, get the existing instance with SmoothingImputation.instance!');
            }
        }
        constructor() {
            this.popup = d3
                .select('#force_layout')
                .append('div')
                .attr('id', 'imputation_popup');
            this.button_bar = this.popup
                .append('div')
                .attr('id', 'imputation_button_bar')
                .on('mousedown', () => {
                d3.event.stopPropagation();
            });
            this.button_bar
                .append('label')
                .text('N = ')
                .append('input')
                .attr('id', 'imputation_N_input')
                .property('value', 10);
            this.button_bar
                .append('label')
                .text('\u03B2 = ')
                .append('input')
                .attr('id', 'imputation_beta_input')
                .property('value', 0.1);
            this.button_bar
                .append('button')
                .text('Restore')
                .on('click', () => this.restore_colors());
            this.button_bar
                .append('button')
                .text('Smooth')
                .on('click', () => this.perform_smoothing());
            this.button_bar
                .append('button')
                .text('Close')
                .on('click', () => this.hide_imputation_popup());
            this.text_box = this.popup
                .append('div')
                .attr('id', 'imputation_description')
                .append('text')
                .text('Smooth gene expression on the graph. Increase N or decrease 	\u03B2 to enhance the degree of smoothing.');
            d3.select('#imputation_popup').call(d3
                .drag()
                .on('start', () => this.imputation_popup_dragstarted())
                .on('drag', () => this.imputation_popup_dragged())
                .on('end', () => this.imputation_popup_dragended()));
        }
        // <-- SmoothingImputation Constructor End -->
        imputation_popup_dragstarted() {
            d3.event.sourceEvent.stopPropagation();
        }
        imputation_popup_dragged() {
            let cx = parseFloat(d3
                .select('#imputation_popup')
                .style('left')
                .split('px')[0]);
            let cy = parseFloat(d3
                .select('#imputation_popup')
                .style('top')
                .split('px')[0]);
            d3.select('#imputation_popup').style('left', (cx + d3.event.dx).toString() + 'px');
            d3.select('#imputation_popup').style('top', (cy + d3.event.dy).toString() + 'px');
        }
        imputation_popup_dragended() {
            return;
        }
        show_waiting_wheel() {
            this.popup.append('div').attr('id', 'wheel_mask');
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
            let target = document.getElementById('wheel_mask');
            let spinner = new Spinner(opts).spin(target);
            $(target).data('spinner', spinner);
        }
        restore_colors() {
            main_1.colorBar.setNodeColors();
        }
        hide_waiting_wheel() {
            $('.spinner').remove();
            $('#wheel_mask').remove();
        }
        perform_smoothing() {
            if (true) {
                let t0 = new Date();
                //update_slider();
                let beta = $('#imputation_beta_input').val();
                let N = $('#imputation_N_input').val();
                let all_r = '';
                let all_g = '';
                let all_b = '';
                let sel = '';
                let sel_nodes = [];
                for (let i = 0; i < main_1.forceLayout.all_outlines.length; i++) {
                    let col = {};
                    if (main_1.forceLayout.all_nodes[i].tint === '0x000000' && main_1.cloneViewer.clone_nodes[i] === undefined) {
                        col = { r: 0, b: 0, g: 0 };
                    }
                    else {
                        col = main_1.forceLayout.base_colors[i];
                    }
                    if (main_1.forceLayout.all_outlines[i].selected) {
                        sel = sel + ',' + i.toString();
                        sel_nodes.push(i);
                    }
                    all_r = all_r + ',' + col.r.toString();
                    all_g = all_g + ',' + col.g.toString();
                    all_b = all_b + ',' + col.b.toString();
                }
                all_r = all_r.slice(1, all_r.length);
                all_g = all_g.slice(1, all_g.length);
                all_b = all_b.slice(1, all_b.length);
                sel = '#' + sel.slice(1, sel.length);
                this.show_waiting_wheel();
                console.log(sel);
                $.ajax({
                    data: {
                        base_dir: main_1.graph_directory,
                        beta: beta,
                        n_rounds: N,
                        raw_b: all_b,
                        raw_g: all_g,
                        raw_r: all_r,
                        selected: sel,
                        sub_dir: main_1.graph_directory + '/' + main_1.sub_directory,
                    },
                    //data: {base_dir:graph_directory, sub_dir:graph_directory+'/'+sub_directory, beta:beta, n_rounds:N, raw_g:green_string},
                    success: data => {
                        if (data && data.length >= 1) {
                            let t1 = new Date();
                            console.log('Smoothed the data: ', t1.getTime() - t0.getTime());
                            let datasplit = data.split('|');
                            let new_min = parseFloat(datasplit[0]) - 0.02;
                            let new_max = parseFloat(datasplit[1]);
                            let current_min = 0;
                            let current_max = 0;
                            if (document.getElementById('channels_button').checked) {
                                current_min = 0;
                                current_max = parseFloat(d3.max(main_1.colorBar.green_array));
                            }
                            else {
                                current_max = parseFloat(d3.max(main_1.forceLayout.base_colors.map(main_1.colorBar.max_color)));
                                current_min = parseFloat(d3.min(main_1.forceLayout.base_colors.map(main_1.colorBar.min_color)));
                            }
                            function nrm(x) {
                                return (((parseFloat(x) - new_min + current_min) / (new_max - new_min + 0.01)) * (current_max - current_min));
                            }
                            let spl = datasplit[2].split(';');
                            let reds = spl[0].split(',').map(nrm);
                            let greens = spl[1].split(',').map(nrm);
                            let blues = spl[2].split(',').map(nrm);
                            if (document.getElementById('channels_button').checked) {
                                main_1.colorBar.green_array = greens;
                                greens = greens.map(x => main_1.colorBar.normalize_one_val(x));
                            }
                            if (sel_nodes.length === 0) {
                                for (let i = 0; i < main_1.forceLayout.all_nodes.length; i++) {
                                    main_1.forceLayout.base_colors[i] = {
                                        r: Math.floor(reds[i]),
                                        g: Math.floor(greens[i]),
                                        b: Math.floor(blues[i]),
                                    };
                                }
                            }
                            else {
                                for (let i = 0; i < sel_nodes.length; i++) {
                                    main_1.forceLayout.base_colors[sel_nodes[i]] = {
                                        r: Math.floor(reds[i]),
                                        g: Math.floor(greens[i]),
                                        b: Math.floor(blues[i]),
                                    };
                                }
                            }
                            main_1.colorBar.updateColorMax();
                            main_1.forceLayout.app.stage.children.sort((a, b) => {
                                return (main_1.colorBar.average_color(main_1.forceLayout.base_colors[a.tabIndex]) -
                                    main_1.colorBar.average_color(main_1.forceLayout.base_colors[b.tabIndex]));
                            });
                        }
                        else {
                            console.log('Got empty smoothing data.');
                        }
                        this.hide_waiting_wheel();
                    },
                    type: 'POST',
                    url: 'cgi-bin/smooth_gene.py',
                });
            }
        }
        show_imputation_popup() {
            let mywidth = parseInt(d3
                .select('#imputation_popup')
                .style('width')
                .split('px')[0], 10);
            let svg_width = parseInt(d3
                .select('svg')
                .style('width')
                .split('px')[0], 10);
            d3.select('#imputation_popup')
                .style('left', (svg_width / 2 - mywidth / 2).toString() + 'px')
                .style('top', '80px')
                .style('visibility', 'visible');
        }
        hide_imputation_popup() {
            d3.select('#imputation_popup').style('visibility', 'hidden');
        }
    }
    exports.default = SmoothingImputation;
});
