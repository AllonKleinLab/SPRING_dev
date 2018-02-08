

function add_sticky_subdir(project_directory,sub_directory,order) {
	d3.json(project_directory+'/'+sub_directory+'/sticky_notes_data.json', function(data) {
		
		var list_item = d3.select('#dataset_list').append('li').style('order',order);
		var header = list_item.append('div').attr('class','list_item_header')
		header.append('h3').text(sub_directory);
		header.append('p').text(' - ' + (data.length).toString() + ' sticky notes');
		
		var all_stickies = list_item.append('div').attr('class','all_stickies');
		data.forEach(function(d) {
			var sticky = all_stickies.append('div').attr('class','one_sticky')
			sticky.append('p').text(d.text);
			var emails = d.emails;
			if (emails[0]==',') { emails = emails.slice(1,emails.length); }
			sticky.append('p').text(emails.split(',').join(', '));
		});

		
		list_item.append('text').attr('class','show_more_less_text').text('Expand')
		.on('click',function() {
			d3.event.stopPropagation();
			if (d3.select(this).text() == 'Expand') {
				list_item.transition(200).style('height',($(list_item[0][0])[0].scrollHeight).toString()+'px' );
				d3.select(this).text('Collapse');
			} else {
				list_item.transition(200).style('height','46px');
				d3.select(this).text('Expand');
			}
		});

		
		list_item.on('click',function() {
			var my_origin = window.location.origin;
			var my_pathname_split = window.location.pathname.split("/");
			var my_pathname_new = my_pathname_split.slice(0,my_pathname_split.length-1).join("/") + "/springViewer_1_6_dev.html"
			var my_url_new = my_origin + my_pathname_new + "?" + project_directory + "/" + sub_directory;
			console.log(my_url_new);
			openInNewTab(my_url_new);

		});
		


	});
}

function populate_subdirs_list(project_directory) {
	var title = project_directory.split('/');
	title = title[title.length-1];
	d3.select('#project_directory_title').text('Sticky notes from "'+title+'"')

	
	$.ajax({
		url: "cgi-bin/list_directories_with_filename.py",
		type: "POST",
		data: {path: project_directory, filename:'sticky_notes_data.json'},
		success: function(output_message) {
			var subdirs = output_message.split(',');
			console.log(subdirs)
			for (i in subdirs) {
				add_sticky_subdir(project_directory,subdirs[i],i+1);
			}
		}
	});
	
}


function openInNewTab(url) {
  var win = window.open(url, '_blank');
  win.focus();
}
