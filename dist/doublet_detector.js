define(["require", "exports", "d3", "./main", "./util"], function (require, exports, d3, main_1, util_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class DoubletDetector {
        static get instance() {
            if (!this._instance) {
                throw new Error('You must first call DoubletDetector.create()!');
            }
            return this._instance;
        }
        static create() {
            if (!this._instance) {
                this._instance = new DoubletDetector();
                return this._instance;
            }
            else {
                throw new Error('DoubletDetector.create() has already been called, get the existing instance with DoubletDetector.instance!');
            }
        }
        constructor() {
            this.popup = d3
                .select('#force_layout')
                .append('div')
                .attr('id', 'doublet_popup');
            this.button_bar = this.popup
                .append('div')
                .attr('id', 'doublet_button_bar')
                .on('mousedown', () => {
                d3.event.stopPropagation();
            });
            this.button_bar
                .append('label')
                .html('<i>k</i> = ')
                .append('input')
                .attr('id', 'doublet_k_input')
                .property('value', 50);
            this.button_bar
                .append('label')
                .html('<i>r</i> = ')
                .append('input')
                .attr('id', 'doublet_r_input')
                .property('value', 2);
            this.button_bar
                .append('label')
                .html('<i>f</i> = ')
                .append('input')
                .attr('id', 'doublet_f_input')
                .property('value', 0.1);
            this.button_bar
                .append('button')
                .text('Run')
                .on('click', () => {
                this.run_doublet_detector(this);
            });
            this.button_bar
                .append('button')
                .text('Close')
                .on('click', this.hide_doublet_popup);
            this.text_box = this.popup
                .append('div')
                .attr('id', 'doublet_description')
                .append('text')
                .html('Predict mixed-celltype doublets. \
        Uses a kNN classifier to identify transcriptomes that \
        resemble simulated doublets. \
        <br><br> <b><i>k </i> : </b> number neighbors used in the classifier \
        <br> <b><i>r </i> : </b> ratio of simulated doublets to observed cells \
        <br> <b><i>f </i> : </b> expected doublet rate');
            this.doublet_notify_popup = d3
                .select('#force_layout')
                .append('div')
                .attr('id', 'doublet_notification')
                .style('visibility', 'hidden');
            this.doublet_notify_popup
                .append('div')
                .attr('id', 'doublet_notify_text')
                .append('text')
                .text('Doublet detector finished! See custom colors menu.');
            this.doublet_notify_popup
                .append('button')
                .text('Close')
                .on('mousedown', () => this.hide_doublet_notification());
            d3.select('#doublet_popup').call(d3
                .drag()
                .on('start', () => this.doublet_popup_dragstarted())
                .on('drag', () => this.doublet_popup_dragged())
                .on('end', () => this.doublet_popup_dragended()));
        }
        // <-- DoubletDetector Constructor End -->
        doublet_popup_dragstarted() {
            d3.event.sourceEvent.stopPropagation();
        }
        doublet_popup_dragged() {
            let cx = parseFloat(d3
                .select('#doublet_popup')
                .style('left')
                .split('px')[0]);
            let cy = parseFloat(d3
                .select('#doublet_popup')
                .style('top')
                .split('px')[0]);
            d3.select('#doublet_popup').style('left', (cx + d3.event.dx).toString() + 'px');
            d3.select('#doublet_popup').style('top', (cy + d3.event.dy).toString() + 'px');
        }
        doublet_popup_dragended() {
            return;
        }
        // <-- DoubletDetector Constructor End -->
        run_doublet_detector() {
            if (main_1.forceLayout.mutable) {
                let t0 = new Date();
                let k = $('#doublet_k_input').val();
                let r = $('#doublet_r_input').val();
                let f = $('#doublet_f_input').val();
                d3.select('#doublet_notification')
                    .select('text')
                    .text('Running doublet detector... you will be notified upon completion.');
                this.show_doublet_notification();
                this.hide_doublet_popup();
                $.ajax({
                    data: { base_dir: main_1.graph_directory, sub_dir: main_1.project_directory, k: k, r: r, f: f },
                    success: data => {
                        let t1 = new Date();
                        console.log('Ran doublet detector: ', t1.getTime() - t0.getTime());
                        d3.select('#doublet_notification')
                            .select('text')
                            .text('Doublet detector finished! See Custom Colors menu.');
                        this.show_doublet_notification();
                        if (d3.select('#clone_viewer_popup').style('visibility') === 'visible') {
                            $('#clone_viewer_popup').remove();
                            for (let i = 0; i < main_1.forceLayout.all_outlines.length; i++) {
                                main_1.cloneViewer.node_status[i].source = false;
                                main_1.cloneViewer.node_status[i].target = false;
                            }
                            for (let i in main_1.cloneViewer.clone_nodes) {
                                main_1.cloneViewer.deactivate_nodes(i);
                            }
                            for (let i in main_1.cloneViewer.clone_edges) {
                                main_1.cloneViewer.deactivate_edges(i);
                            }
                            main_1.cloneViewer.targetCircle.clear();
                            // cloneViewer.clone_viewer_setup();
                            main_1.cloneViewer.start_clone_viewer();
                        }
                        else {
                            $('#clone_viewer_popup').remove();
                            // cloneViewer.clone_viewer_setup();
                        }
                        // open json file containing gene sets and populate drop down menu
                        let noCache = new Date().getTime();
                        d3.json(main_1.project_directory + '/color_stats.json' + '?_=' + noCache).then(colorData => {
                            main_1.colorBar.color_stats = colorData;
                        });
                        d3.text(main_1.project_directory + '/color_data_gene_sets.csv' + '?_=' + noCache).then(text => {
                            main_1.colorBar.gene_set_color_array = util_1.read_csv(text);
                            main_1.colorBar.dispatch.call('load', this, main_1.colorBar.gene_set_color_array, 'gene_sets');
                            main_1.colorBar.update_slider();
                        });
                    },
                    type: 'POST',
                    url: 'cgi-bin/run_doublet_detector.py',
                });
            }
            else {
                d3.select('#doublet_notification')
                    .select('text')
                    .text('Sorry, this dataset cannot be edited.');
                this.show_doublet_notification();
            }
        }
        show_doublet_notification() {
            let mywidth = parseInt(d3
                .select('#doublet_notification')
                .style('width')
                .split('px')[0], 10);
            let svg_width = parseInt(d3
                .select('svg')
                .style('width')
                .split('px')[0], 10);
            d3.select('#doublet_notification')
                .style('left', (svg_width / 2 - mywidth / 2).toString() + 'px')
                .style('top', '0px')
                .style('opacity', 0.0)
                .style('visibility', 'visible')
                .transition()
                .duration(500)
                .style('opacity', 1.0);
        }
        hide_doublet_notification() {
            d3.select('#doublet_notification')
                .style('opacity', 0.0)
                .style('visibility', 'hidden');
        }
        show_doublet_popup() {
            if (main_1.forceLayout.mutable) {
                let mywidth = parseInt(d3
                    .select('#doublet_popup')
                    .style('width')
                    .split('px')[0], 10);
                let svg_width = parseInt(d3
                    .select('svg')
                    .style('width')
                    .split('px')[0], 10);
                d3.select('#doublet_popup')
                    .style('left', (svg_width / 2 - mywidth / 2).toString() + 'px')
                    .style('top', '80px')
                    .style('visibility', 'visible');
            }
            else {
                d3.select('#doublet_notification')
                    .select('text')
                    .text('Sorry, this dataset cannot be edited.');
                this.show_doublet_notification();
            }
        }
        hide_doublet_popup() {
            d3.select('#doublet_popup').style('visibility', 'hidden');
        }
    }
    exports.default = DoubletDetector;
});
