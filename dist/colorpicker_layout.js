define(["require", "exports", "d3", "./main", "./util"], function (require, exports, d3, main_1, util_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    let tmp_cat_coloring = null;
    (function ($) {
        let initLayout = function () {
            let hash = window.location.hash.replace('#', '');
            $('#colorpickerHolder').ColorPicker({ flat: true });
        };
        EYE.register(initLayout, 'init');
    })(jQuery);
    exports.colorpicker_submit = (hex) => {
        console.log(hex);
    };
    exports.colorpicker_setup = () => {
        let popup = d3.select('#colorpicker_popup');
        popup.attr('current_color', '');
        popup.attr('current_nodes', '');
        popup.attr('current_label', '');
        popup.attr('current_track', '');
        popup.on('mouseup', exports.colorpicker_update);
        popup.on('mousemove', exports.colorpicker_update);
        popup.call(d3.drag()
            .on('start', colorpicker_popup_dragstarted)
            .on('drag', colorpicker_popup_dragged)
            .on('end', colorpicker_popup_dragended));
        let button_bar = d3.select('#colorpicker_button_bar');
        button_bar
            .append('button')
            .text('Close')
            .on('click', exports.close_colorpicker_popup);
        button_bar
            .append('button')
            .text('Save')
            .on('click', exports.save_colorpicker_colors);
        button_bar
            .append('button')
            .text('Restore')
            .on('click', exports.restore_colorpicker);
        d3.select('#colorpickerHolder').on('mousedown', function () {
            d3.event.stopPropagation();
            exports.colorpicker_update();
        });
        popup.append('div').attr('id', 'colorpicker_save_check');
        function colorpicker_popup_dragstarted() {
            d3.event.sourceEvent.stopPropagation();
        }
        function colorpicker_popup_dragged() {
            let cx = parseFloat(d3
                .select('#colorpicker_popup')
                .style('left')
                .split('px')[0]);
            let cy = parseFloat(d3
                .select('#colorpicker_popup')
                .style('top')
                .split('px')[0]);
            d3.select('#colorpicker_popup').style('left', (cx + d3.event.dx).toString() + 'px');
            d3.select('#colorpicker_popup').style('top', (cy + d3.event.dy).toString() + 'px');
        }
        function colorpicker_popup_dragended() {
            return;
        }
    };
    exports.restore_colorpicker = () => {
        main_1.colorBar.setNodeColors();
        let current_label = d3.select('#colorpicker_popup').attr('current_label');
        if (current_label !== '') {
            let current_track = d3.select('#colorpicker_popup').attr('current_track');
            tmp_cat_coloring = Object.assign({}, main_1.colorBar.categorical_coloring_data[current_track].label_colors);
            let current_color = main_1.colorBar.categorical_coloring_data[current_track].label_colors[current_label].replace('#', '0x');
            $('#colorpickerHolder').ColorPickerSetColor(current_color);
            d3.selectAll('.legend_row').each(function (d) {
                if (d === current_label) {
                    d3.select(this)
                        .select('div')
                        .style('background-color', current_color.replace('0x', '#'));
                }
            });
        }
    };
    exports.show_colorpicker_popup = (label) => {
        if (main_1.forceLayout.mutable) {
            let current_track = document.getElementById('labels_menu').value;
            let current_color = main_1.colorBar.categorical_coloring_data[current_track].label_colors[label].replace('#', '0x');
            let nodes = [];
            main_1.colorBar.categorical_coloring_data[current_track].label_list.forEach(function (l, i) {
                if (label === l) {
                    nodes.push(i);
                }
            });
            d3.select('#colorpicker_popup').attr('current_nodes', nodes.join(','));
            d3.select('#colorpicker_popup').attr('current_label', label);
            d3.select('#colorpicker_popup').attr('current_color', current_color);
            d3.select('#colorpicker_popup').attr('current_track', current_track);
            $('#colorpickerHolder').ColorPickerSetColor(current_color);
            tmp_cat_coloring = Object.assign({}, main_1.colorBar.categorical_coloring_data[current_track].label_colors);
            let top = parseFloat(d3
                .select('body')
                .style('height')
                .replace('px', '')) - 216;
            let left = parseFloat(d3
                .select('body')
                .style('width')
                .replace('px', '')) - 480;
            d3.select('#colorpicker_popup').style('top', top.toString() + 'px');
            d3.select('#colorpicker_popup').style('left', left.toString() + 'px');
            d3.select('#colorpicker_popup').style('visibility', 'visible');
        }
    };
    exports.close_colorpicker_popup = () => {
        d3.select('#colorpicker_popup').style('visibility', 'hidden');
        d3.select('#colorpicker_popup').attr('current_nodes', '');
        d3.select('#colorpicker_popup').attr('current_label', '');
        d3.select('#colorpicker_popup').attr('current_color', '');
        d3.select('#colorpicker_popup').attr('current_track', '');
        tmp_cat_coloring = null;
    };
    exports.colorpicker_update = () => {
        let rgb = d3.select('.colorpicker_new_color').style('background-color');
        rgb = rgb
            .replace('rgb(', '')
            .replace(')', '')
            .replace(',', '')
            .replace(',', '')
            .split(' ');
        let current_color = util_1.rgbToHex(parseInt(rgb[0], 10), parseInt(rgb[1], 10), parseInt(rgb[2], 10));
        if (current_color !== d3.select('#colorpicker_popup').attr('current_color')) {
            d3.select('#colorpicker_popup')
                .attr('current_nodes')
                .split(',')
                .forEach(function (i) {
                main_1.forceLayout.all_nodes[i].tint = current_color;
            });
        }
        let current_label = d3.select('#colorpicker_popup').attr('current_label');
        if (current_label !== '') {
            tmp_cat_coloring[current_label] = current_color.replace('0x', '#');
            d3.selectAll('.legend_row').each(function (d) {
                if (d === current_label) {
                    d3.select(this)
                        .select('div')
                        .style('background-color', current_color.replace('0x', '#'));
                }
            });
        }
    };
    exports.save_colorpicker_colors = () => {
        let current_track = document.getElementById('labels_menu').value;
        if (current_track === d3.select('#colorpicker_popup').attr('current_track')) {
            if (tmp_cat_coloring != null) {
                main_1.colorBar.categorical_coloring_data[current_track].label_colors = tmp_cat_coloring;
                let text = JSON.stringify(main_1.colorBar.categorical_coloring_data);
                let name = window.location.search;
                let path = name.slice(1, name.length) + '/categorical_coloring_data.json';
                console.log('gothere');
                $.ajax({
                    data: { path: path, content: text },
                    success: function () {
                        d3.select('#colorpicker_save_check').style('opacity', '1');
                        setTimeout(function () {
                            d3.select('#colorpicker_save_check')
                                .transition()
                                .duration(600)
                                .style('opacity', '0');
                        }, 250);
                    },
                    type: 'POST',
                    url: 'cgi-bin/save_data.py',
                });
            }
        }
    };
});
