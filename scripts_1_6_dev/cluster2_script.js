function cluster_setup() {
  let cluster_popup = d3
    .select('#force_layout')
    .append('div')
    .attr('id', 'cluster_popup')
    .style('visibility', 'hidden');
  cluster_popup
    .append('div')
    .attr('id', 'cluster_text')
    .append('text')
    .text('Now clustering...');

  cluster_popup
    .append('button')
    .text('Close')
    .on('mousedown', hide_notification);
}

function show_notification(myObject) {
  let mywidth = parseInt(myObject.style('width').split('px')[0], 10);
  let svg_width = parseInt(
    d3
      .select('svg')
      .style('width')
      .split('px')[0],
    10,
  );

  myObject
    .style('left', (svg_width / 2 - mywidth / 2).toString() + 'px')
    .style('top', '0px')
    .style('opacity', 0.0)
    .style('visibility', 'visible')
    .transition()
    .duration(500)
    .style('opacity', 1.0);
  // .transition()
  // .duration(2000)
  // .transition()
  // .duration(1500)
  // .style('opacity', 0.0)
  // .each("end", function() {
  // 	d3.select("myObject").style('visibility', 'hidden');
  // });
}

function hide_notification() {
  console.log('hide');
  d3.select('#cluster_popup')
    .style('opacity', 0.0)
    .style('visibility', 'hidden');
}

export const run_clustering = (mutable, graph_directory, sub_directory) => {
  if (mutable) {
    console.log('running!');
    let t0 = new Date();
    d3.select('#cluster_popup')
      .select('text')
      .text('Now clustering...');
    show_notification(d3.select('#cluster_popup'));
    $.ajax({
      data: { base_dir: graph_directory, sub_dir: graph_directory + '/' + sub_directory },
      success: function(data) {
        console.log(data);
        let t1 = new Date();
        console.log('Ran clustering: ', t1.getTime() - t0.getTime());
        d3.select('#cluster_popup')
          .select('text')
          .text('Clustering complete! See Cell Labels menu.');
        show_notification(d3.select('#cluster_popup'));

        let noCache = new Date().getTime();

        d3.json(graph_directory + '/' + sub_directory + '/categorical_coloring_data.json' + '?_=' + noCache).then(
          json => {
            let categorical_coloring_data = json;
            Object.keys(categorical_coloring_data).forEach(function(k) {
              let label_counts = {};
              Object.keys(categorical_coloring_data[k].label_colors).forEach(function(n) {
                label_counts[n] = 0;
              });
              categorical_coloring_data[k].label_list.forEach(function(n) {
                label_counts[n] += 1;
              });
              categorical_coloring_data[k].label_counts = label_counts;
            });

            dispatch.load(categorical_coloring_data, 'cell_labels');
            update_slider();
          },
        );
      },

      type: 'POST',
      url: 'cgi-bin/run_clustering.py',
    });
  } else {
    console.log('no clustering allowed');
    //show_notification(d3.select("#no_clustering_popup"));
    d3.select('#cluster_popup')
      .select('text')
      .text('Sorry, this dataset cannot be edited.');
    show_notification(d3.select('#cluster_popup'));
  }
}
