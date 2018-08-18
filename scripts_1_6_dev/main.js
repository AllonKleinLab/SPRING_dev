import { forceLayout, setup_tools_dropdown, setup_download_dropdown, center_view, animation, setup_layout_dropdown, initiateButtons, closeDropdown } from './forceLayout_script.js';
import { doublet_setup } from './doublet_detector.js';
import { selection_setup } from './selection_script.js';
import { clone_viewer_setup } from './clone_viewer.js';
import { cluster_setup } from './cluster_script.js';

let rotator_radius = null;

setup_download_dropdown();
setup_tools_dropdown();

d3.select('#sound_toggle')
  .append('img')
  .attr('src', 'scripts_1_6_dev/sound_effects/icon_mute.svg')
  .on('click', function() {
    if (
      d3
        .select('#sound_toggle')
        .select('img')
        .attr('src') === 'scripts_1_6_dev/sound_effects/icon_speaker.svg'
    ) {
      d3.select('#sound_toggle')
        .select('img')
        .attr('src', 'scripts_1_6_dev/sound_effects/icon_mute.svg');
    } else {
      d3.select('#sound_toggle')
        .select('img')
        .attr('src', 'scripts_1_6_dev/sound_effects/icon_speaker.svg');
    }
  });

const callback = () => {
  center_view(false);
  sprites.visible = false;
  edge_container.visible = false;
  animation();

  settings_setup();
  selection_setup();
  setup_layout_dropdown();
  initiateButtons();
  make_new_SPRINGplot_setup();
  downloadSelectedExpr_setup();
  clone_viewer_setup();
  stickyNote_setup();
  imputation_setup();
  doublet_setup();
  cluster_setup();

  selection_logic_setup();
  colorpicker_setup();
  PAGA_setup();

  //load_text_annotation();
  //stratify_setup();
  //show_stratify_popup();
  //start_clone_viewer();
  //show_imputation_popup();
  //show_colorpicker_popup('HSC_HSC_fate1');

  window.onclick = function(event) {
    if (!event.target.matches('#settings_dropdown *')) {
      collapse_settings();
    }
    if (!event.target.matches('#download_dropdown_button')) {
      closeDropdown();
    }
    if (!event.target.matches('#layout_dropdown_button')) {
      closeDropdown();
    }
  };
}

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

let force_on = 1;
let n_nodes = 0;
let colors_loaded = 0;
let graph_directory = name.slice(1, name.length);
let tmp = graph_directory.split('/');
graph_directory = tmp.slice(0, tmp.length - 1).join('/');
let sub_directory = tmp[tmp.length - 1];

document.title = tmp[tmp.length - 1];

let clone_sprites = {};
let clone_edge_container = {};
let edge_container = [];

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

forceLayout(graph_directory, graph_directory, sub_directory, callback);
