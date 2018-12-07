define(["require", "exports", "./currentDatasetsList_script.js"], function (require, exports, currentDatasetsList_script_js_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    let project_directory = window.location.search;
    currentDatasetsList_script_js_1.populate_dataset_subdirs_list(project_directory.slice(1, project_directory.length));
});
