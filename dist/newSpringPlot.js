define(["require", "exports", "./main"], function (require, exports, main_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function newSpringPlot(callback) {
        console.log('boop');
        let sel2text = '';
        for (let i = 0; i < main_1.forceLayout.all_outlines.length; i++) {
            if (main_1.forceLayout.all_outlines[i].selected) {
                sel2text = sel2text + ',' + i.toString();
            }
        }
        sel2text = sel2text.slice(1, sel2text.length);
        $.ajax({
            data: { base_dir: main_1.graph_directory, current_dir: main_1.sub_directory, new_dir: 'poop', selected_cells: sel2text },
            success: data => {
                console.log(data);
                $('#updater').html(data);
            },
            type: 'POST',
            url: 'cgi-bin/spring_from_selection2.py',
        });
    }
});
