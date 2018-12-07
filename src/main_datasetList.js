import { populate_dataset_subdirs_list } from './currentDatasetsList_script.js';
let project_directory = window.location.search;
populate_dataset_subdirs_list(project_directory.slice(1,project_directory.length));

