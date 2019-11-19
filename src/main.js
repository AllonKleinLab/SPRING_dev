import * as d3 from 'd3';

import CloneViewer from './clone_viewer.js';
import Cluster from './cluster_script.js';
import Cluster2 from './cluster2_script.js';
import ColorBar from './colorBar';
import DoubletDetector from './doublet_detector.js';
import DownloadSelectedExpr from './downloadSelectedExpr_script.js';
import ForceLayout from './forceLayout_script.js';
import PAGA from './PAGA_viewer.js';
import SelectionScript from './selection_script.js';
import SpringPlot from './make_new_SPRINGplot_script.js';
import SelectionLogic from './selection_logic.js';
import SmoothingImputation from './smoothing_imputation.js';
import StickyNote from './stickyNote.js';

import { colorpicker_setup } from './colorpicker_layout.js';
import { getData } from './file_helper';
import { settings_setup, collapse_settings } from './settings_script.js';
import { postMessageToParent } from './util.js';

/** @type CloneViewer */
export let cloneViewer;

/** @type Cluster */
export let cluster;

/** @type Cluster2 */
export let cluster2;

/** @type ColorBar */
export let colorBar;

/** @type DoubletDetector */
export let doubletDetector;

/** @type DownloadSelectedExpr */
export let downloadSelectedExpr;

/** @type ForceLayout */
export let forceLayout;

/** @type PAGA */
export let paga;

/** @type SelectionScript */
export let selectionScript;

/** @type SelectionLogic */
export let selectionLogic;

/** @type SmoothingImputation */
export let smoothingImputation;

/** @type SpringPlot */
export let springPlot;

/** @type StickyNote */
export let stickyNote;

d3.select('#sound_toggle')
  .append('img')
  .attr('src', 'src/sound_effects/icon_mute.svg')
  .on('click', () => {
    if (
      d3
        .select('#sound_toggle')
        .select('img')
        .attr('src') === 'src/sound_effects/icon_speaker.svg'
    ) {
      d3.select('#sound_toggle')
        .select('img')
        .attr('src', 'src/sound_effects/icon_mute.svg');
    } else {
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

export let graph_directory = tmp.slice(0, tmp.length - 1).join('/');
export let sub_directory = tmp[tmp.length - 1];
export let project_directory = graph_directory + '/' + sub_directory;

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

const loadData = async () => {
  forceLayout = await ForceLayout.create();
  settings_setup();
  colorBar = await getColorBarFromAjax();
  cloneViewer = await CloneViewer.create();
  selectionScript = await SelectionScript.create();
  stickyNote = await StickyNote.create();
  cluster = await Cluster.create();
  cluster2 = await Cluster2.create();
  await setupUserInterface();
};

const getColorBarFromAjax = async args => {
  try {
    const python_data = await $.ajax({
      data: { base_dir: graph_directory },
      type: 'POST',
      url: 'cgi-bin/load_counts.py',
    });
    const result = await ColorBar.create(python_data);
    return result;
  } catch (e) {
    const geneData = await getData('genes', 'txt');
    const result = await ColorBar.create(geneData);
    return result;
  }
};

loadData()
  .then(res => {
    console.log('Spring done loading!');
    postMessageToParent({ type: 'loaded' });
  })
  .catch(e => {
    console.log(e);
  });

const setupUserInterface = async () => {
  d3.select('#load_colors').remove();
  forceLayout.initiateButtons();
  forceLayout.setup_download_dropdown();
  forceLayout.setup_tools_dropdown();
  forceLayout.center_view(false);

  cloneViewer.clone_sprites.visible = true;
  cloneViewer.edge_container.visible = true;

  forceLayout.animation();
  forceLayout.setup_layout_dropdown();

  springPlot = SpringPlot.create();
  downloadSelectedExpr = DownloadSelectedExpr.create();

  smoothingImputation = SmoothingImputation.create();
  doubletDetector = DoubletDetector.create();
  selectionLogic = SelectionLogic.create();
  colorpicker_setup();
  paga = await PAGA.create();

  // load_text_annotation();
  // stratify_setup();
  // show_stratify_popup();
  // start_clone_viewer();
  // show_imputation_popup();
  // show_colorpicker_popup('HSC_HSC_fate1');

  window.onclick = function(event) {
    if (!event.target.matches('#settings_dropdown *')) {
      collapse_settings();
    }
    if (!event.target.matches('#download_dropdown_button')) {
      forceLayout.closeDropdown();
    }
    if (!event.target.matches('#layout_dropdown_button')) {
      forceLayout.closeDropdown();
    }
  };

  window.addEventListener('message', event => {
    if (!event.isTrusted && event.origin === window.location.origin) {
      return;
    }
    try {
      if (typeof event.data === 'string') {
        const parsedData = JSON.parse(event.data);
        switch (parsedData.type) {
          case 'init': {
            if (parsedData.payload.categories && parsedData.payload.categories.length >= 1) {
              setLabelSelection(parsedData.payload.categories);
              window.cacheData.set('categories', parsedData.payload.categories);
            }
            if (parsedData.payload.indices && parsedData.payload.indices.length >= 1) {
              setIndexSelection(parsedData.payload.indices);
              window.cacheData.set('indices', parsedData.payload.indices);
            }
            break;
          }
          case 'selected-labels-update': {
            setLabelSelection(parsedData.payload.selectedLabels);
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
      }
    } catch (err) {
      console.log(`Unable to parse received message.\n\
      Data: ${event.data}
      Error: ${err}`);
    } finally {
      selectionScript.update_selected_count();
      colorBar.count_clusters();
    }
  });
};

const setLabelSelection = labels => {
  if (labels) {
    const selectedCategory = document.getElementById('labels_menu').value;
    const { label_list } = colorBar.getSampleCategoricalColoringData(selectedCategory);
    for (let i = 0; i < forceLayout.all_nodes.length; i++) {
      if (labels.includes(label_list[i])) {
        forceLayout.all_outlines[i].selected = true;
        forceLayout.all_outlines[i].tint = '0xffff00';
        forceLayout.all_outlines[i].alpha = forceLayout.all_nodes[i].alpha;
      } else {
        forceLayout.all_outlines[i].selected = false;
        forceLayout.all_outlines[i].alpha = 0;
      }
    }
  }
};

const setIndexSelection = indices => {
  if (indices) {
    for (let i = 0; i < forceLayout.all_outlines.length; i++) {
      forceLayout.all_outlines[i].selected = false;
      forceLayout.all_outlines[i].alpha = 0;
    }
    for (const coordinateIndex of indices) {
      forceLayout.all_outlines[coordinateIndex].tint = '0xffff00';
      forceLayout.all_outlines[coordinateIndex].selected = true;
      forceLayout.all_outlines[coordinateIndex].alpha = forceLayout.all_nodes[coordinateIndex].alpha;
    }
  }
};
