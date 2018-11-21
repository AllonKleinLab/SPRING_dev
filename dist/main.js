var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
define(["require", "exports", "d3", "./clone_viewer.js", "./cluster_script.js", "./cluster2_script.js", "./colorBar", "./doublet_detector.js", "./downloadSelectedExpr_script.js", "./forceLayout_script.js", "./PAGA_viewer.js", "./selection_script.js", "./make_new_SPRINGplot_script.js", "./selection_logic.js", "./smoothing_imputation.js", "./stickyNote.js", "./colorpicker_layout.js", "./file_helper", "./settings_script.js", "./util.js"], function (require, exports, d3, clone_viewer_js_1, cluster_script_js_1, cluster2_script_js_1, colorBar_1, doublet_detector_js_1, downloadSelectedExpr_script_js_1, forceLayout_script_js_1, PAGA_viewer_js_1, selection_script_js_1, make_new_SPRINGplot_script_js_1, selection_logic_js_1, smoothing_imputation_js_1, stickyNote_js_1, colorpicker_layout_js_1, file_helper_1, settings_script_js_1, util_js_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    d3.select('#sound_toggle')
        .append('img')
        .attr('src', 'src/sound_effects/icon_mute.svg')
        .on('click', () => {
        if (d3
            .select('#sound_toggle')
            .select('img')
            .attr('src') === 'src/sound_effects/icon_speaker.svg') {
            d3.select('#sound_toggle')
                .select('img')
                .attr('src', 'src/sound_effects/icon_mute.svg');
        }
        else {
            d3.select('#sound_toggle')
                .select('img')
                .attr('src', 'src/sound_effects/icon_speaker.svg');
        }
    });
    let name = window.location.search;
    let my_origin = window.location.origin;
    let my_pathname = window.location.pathname;
    let path_split = my_pathname.split('/');
    let path_start = path_split.slice(0, path_split.length - 1).join('/');
    path_split[path_split.length - 1] = 'springViewer_1_5_dev.html';
    let dynamic_path = path_split.join('/');
    d3.select('#changeViewer_link').attr('href', my_origin + dynamic_path + name);
    let base_dirs = name.slice(1, name.length).split('/');
    let base_dir_name = base_dirs.slice(0, base_dirs.length - 1).join('/');
    d3.select('#all_SPRINGplots_menu').attr('href', my_origin + path_start + '/currentDatasetsList.html?' + base_dir_name);
    let tmp = name.slice(1, name.length).split('/');
    exports.graph_directory = tmp.slice(0, tmp.length - 1).join('/');
    exports.sub_directory = tmp[tmp.length - 1];
    exports.project_directory = exports.graph_directory + '/' + exports.sub_directory;
    document.title = `SPRING Viewer - ${tmp[tmp.length - 1]}`;
    d3.select('#force_layout')
        .select('svg')
        .remove();
    d3.select('#color_chooser')
        .selectAll('div')
        .remove();
    d3.select('#color_chooser')
        .selectAll('input')
        .remove();
    d3.select('#color_chooser')
        .selectAll('select')
        .remove();
    const loadData = () => __awaiter(this, void 0, void 0, function* () {
        exports.forceLayout = yield forceLayout_script_js_1.default.create();
        settings_script_js_1.settings_setup();
        exports.colorBar = yield getColorBarFromAjax();
        exports.cloneViewer = yield clone_viewer_js_1.default.create();
        exports.selectionScript = yield selection_script_js_1.default.create();
        exports.stickyNote = yield stickyNote_js_1.default.create();
        exports.cluster = yield cluster_script_js_1.default.create();
        exports.cluster2 = yield cluster2_script_js_1.default.create();
        yield setupUserInterface();
    });
    const getColorBarFromAjax = (args) => __awaiter(this, void 0, void 0, function* () {
        try {
            const python_data = yield $.ajax({
                data: { base_dir: exports.graph_directory },
                type: 'POST',
                url: 'cgi-bin/load_counts.py',
            });
            console.log('ajax returned');
            const result = yield colorBar_1.default.create(python_data);
            console.log('returning python data');
            return result;
        }
        catch (e) {
            const geneData = yield file_helper_1.getData('genes', 'txt');
            const result = yield colorBar_1.default.create(geneData);
            console.log('returning gene data');
            return result;
        }
    });
    loadData()
        .then(res => {
        console.log('Spring done loading!');
        util_js_1.postMessageToParent({ type: 'loaded' });
    })
        .catch(e => {
        console.log(e);
    });
    const setupUserInterface = () => __awaiter(this, void 0, void 0, function* () {
        console.log('setting up UI');
        d3.select('#load_colors').remove();
        exports.forceLayout.initiateButtons();
        exports.forceLayout.setup_download_dropdown();
        exports.forceLayout.setup_tools_dropdown();
        exports.forceLayout.center_view(false);
        exports.cloneViewer.clone_sprites.visible = false;
        exports.cloneViewer.edge_container.visible = false;
        exports.forceLayout.animation();
        exports.forceLayout.setup_layout_dropdown();
        exports.springPlot = make_new_SPRINGplot_script_js_1.default.create();
        exports.downloadSelectedExpr = downloadSelectedExpr_script_js_1.default.create();
        exports.smoothingImputation = smoothing_imputation_js_1.default.create();
        exports.doubletDetector = doublet_detector_js_1.default.create();
        exports.selectionLogic = selection_logic_js_1.default.create();
        colorpicker_layout_js_1.colorpicker_setup();
        exports.paga = yield PAGA_viewer_js_1.default.create();
        // load_text_annotation();
        // stratify_setup();
        // show_stratify_popup();
        // start_clone_viewer();
        // show_imputation_popup();
        // show_colorpicker_popup('HSC_HSC_fate1');
        console.log('setting up window');
        window.onclick = function (event) {
            if (!event.target.matches('#settings_dropdown *')) {
                settings_script_js_1.collapse_settings();
            }
            if (!event.target.matches('#download_dropdown_button')) {
                exports.forceLayout.closeDropdown();
            }
            if (!event.target.matches('#layout_dropdown_button')) {
                exports.forceLayout.closeDropdown();
            }
        };
        window.addEventListener('message', event => {
            if (!event.isTrusted && event.origin === window.location.origin) {
                return;
            }
            try {
                const parsedData = JSON.parse(event.data);
                switch (parsedData.type) {
                    case 'init': {
                        if (parsedData.payload.categories && parsedData.payload.categories.length >= 1) {
                            setCategorySelection(parsedData.payload.categories);
                            window.cacheData.set('categories', parsedData.payload.categories);
                        }
                        if (parsedData.payload.indices && parsedData.payload.indices.length >= 1) {
                            setIndexSelection(parsedData.payload.indices);
                            window.cacheData.set('indices', parsedData.payload.indices);
                        }
                        break;
                    }
                    case 'selected-category-update': {
                        setCategorySelection(parsedData.payload.categories);
                        break;
                    }
                    case 'selected-cells-update': {
                        setIndexSelection(parsedData.payload.indices);
                        break;
                    }
                    default: {
                        break;
                    }
                }
                console.log('updated selection');
                exports.selectionScript.update_selected_count();
            }
            catch (err) {
                console.log(`Unable to parse received message.\n\
      Data: ${event.data}
      Error: ${err}`);
            }
        });
    });
    const setCategorySelection = categories => {
        if (categories) {
            const cat_label_list = exports.colorBar.categorical_coloring_data.Sample.label_list;
            for (let i = 0; i < exports.forceLayout.all_nodes.length; i++) {
                if (categories.includes(cat_label_list[i])) {
                    exports.forceLayout.all_outlines[i].selected = true;
                    exports.forceLayout.all_outlines[i].tint = '0xffff00';
                    exports.forceLayout.all_outlines[i].alpha = exports.forceLayout.all_nodes[i].alpha;
                }
                else {
                    exports.forceLayout.all_outlines[i].selected = false;
                    exports.forceLayout.all_outlines[i].alpha = 0;
                }
            }
        }
    };
    const setIndexSelection = indices => {
        console.log(`setting indices ${indices}`);
        if (indices) {
            for (let i = 0; i < exports.forceLayout.all_outlines.length; i++) {
                exports.forceLayout.all_outlines[i].selected = false;
                exports.forceLayout.all_outlines[i].alpha = 0;
            }
            for (const coordinateIndex of indices) {
                exports.forceLayout.all_outlines[coordinateIndex].tint = '0xffff00';
                exports.forceLayout.all_outlines[coordinateIndex].selected = true;
                exports.forceLayout.all_outlines[coordinateIndex].alpha = exports.forceLayout.all_nodes[coordinateIndex].alpha;
            }
        }
    };
});
