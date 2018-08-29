import { forceLayout, graph_directory, sub_directory } from './main';

function newSpringPlot(callback) {
  console.log('boop');

  let sel2text = '';
  for (let i = 0; i < forceLayout.all_outlines.length; i++) {
    if (forceLayout.all_outlines[i].selected) {
      sel2text = sel2text + ',' + i.toString();
    }
  }
  sel2text = sel2text.slice(1, sel2text.length);
  $.ajax({
    data: { base_dir: graph_directory, current_dir: sub_directory, new_dir: 'poop', selected_cells: sel2text },
    success: data => {
      console.log(data);
      $('#updater').html(data);
    },
    type: 'POST',
    url: 'cgi-bin/spring_from_selection2.py',
  });
}
