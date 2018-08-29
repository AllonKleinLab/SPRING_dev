import * as d3 from 'd3';
import { openInNewTab } from './util';

function add_sticky_subdir(project_directory, sub_directory, order) {
  d3.json(project_directory + '/' + sub_directory + '/sticky_notes_data.json').then(data => {
    let list_item = d3
      .select('#dataset_list')
      .append('li')
      .style('order', order);
    let header = list_item.append('div').attr('class', 'list_item_header');
    header.append('h3').text(sub_directory);
    header.append('p').text(' - ' + data.length.toString() + ' sticky notes');

    let all_stickies = list_item.append('div').attr('class', 'all_stickies');
    data.forEach(d => {
      let sticky = all_stickies.append('div').attr('class', 'one_sticky');
      sticky.append('p').text(d.text);
      let emails = d.emails;
      if (emails[0] === ',') {
        emails = emails.slice(1, emails.length);
      }
      sticky.append('p').text(emails.split(',').join(', '));
    });

    list_item
      .append('text')
      .attr('class', 'show_more_less_text')
      .text('Expand')
      .on('click', () => {
        d3.event.stopPropagation();
        if (d3.select(this).text() === 'Expand') {
          list_item.transition('200').style('height', $(list_item.node())[0].scrollHeight.toString() + 'px');
          d3.select(this).text('Collapse');
        } else {
          list_item.transition('200').style('height', '46px');
          d3.select(this).text('Expand');
        }
      });

    list_item.on('click', () => {
      let my_origin = window.location.origin;
      let my_pathname_split = window.location.pathname.split('/');
      let my_pathname_new = my_pathname_split.slice(0, my_pathname_split.length - 1).join('/') + '/springViewer.html';
      let my_url_new = my_origin + my_pathname_new + '?' + project_directory + '/' + sub_directory;
      console.log(my_url_new);
      openInNewTab(my_url_new);
    });
  });
}

function populate_sticky_subdirs_list(project_directory) {
  let title = project_directory.split('/');
  title = title[title.length - 1];
  d3.select('#project_directory_title').text('Sticky notes from "' + title + '"');

  $.ajax({
    data: { path: project_directory, filename: 'sticky_notes_data.json' },
    success: output_message => {
      let subdirs = output_message.split(',');
      console.log(subdirs);
      for (let i in subdirs) {
        add_sticky_subdir(project_directory, subdirs[i], i + 1);
      }
    },
    type: 'POST',
    url: 'cgi-bin/list_directories_with_filename.py',
  });
}
