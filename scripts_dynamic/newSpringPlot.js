function newSpringPlot(callback) {
    console.log('boop');

    var sel2text = "";
    for (i=0; i<all_outlines.length; i++) {
        if (all_outlines[i].selected) {
            sel2text = sel2text + "," + i.toString();
        }
    }
    sel2text = sel2text.slice(1, sel2text.length);
    $.ajax({
        url: "cgi-bin/spring_from_selection2.py",
        type: "POST",
        data: {base_dir:graph_directory, current_dir:sub_directory, new_dir:"poop", selected_cells:sel2text},
        success: function(data) {
            console.log(data);
            $("#updater").html(data);
        }
    });
}
