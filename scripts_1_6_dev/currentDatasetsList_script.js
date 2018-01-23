

function add_list_item(project_directory,sub_directory,order) {
	d3.json(project_directory+'/'+sub_directory+'/run_info.json', function(data) {
		data['Date'] = data['Date'].split(' ')[0];
		var list_item = d3.select('#dataset_list').append('li').style('order',order);
		list_item.append('h3').text(sub_directory)

		var display_names = {'Filtered_Genes':'Number of genes that passed filter',
							'Gene_Var_Pctl':'Gene variability %ile (gene filtering)',
							'Min_Cells':'Min expressing cells (gene filtering)',
							'Min_Counts':'Min number of UMIs (gene filtering)',
							'Nodes':'Number of cells',
							'Num_Force_Iter':'Number of force layout iterations',
							'Num_Neighbors':'Number of nearest neighbors',
							'Num_PCs':'Number of principal components'}

		var info_box = list_item.append('div').attr('class','dataset_key_info')
			.style('width','480px');
			
		if ('Description' in data) {
			if (data['Description'].length > 0) {		
				info_box.append('tspan').append('text')
				.text(data['Description'])
				.style('color','rgb(140,140,140)');
			}
		}
		var date_email = ''
		if ('Email' in data) {
			date_email += data['Email']+' - ';
		}
		date_email += data['Date'];
		
		info_box
			.append('tspan').style('margin-top','8px')
			.append('text').text(date_email)
			.style('color','rgb(110,110,110)')
			.style('font-weight','530');
					
				
		var o = $(info_box[0][0]);
		var new_height = o.offset().top - o.parent().offset().top - o.parent().scrollTop() + o.height();

		var show_less_height = (new_height + 8).toString() + 'px';
		var show_more_height = (new_height + 170).toString() + 'px';
		list_item.style('height',show_less_height);
		
		var info_box = list_item.append('div').attr('class','dataset_params');
		var keys = ['Nodes','Filtered_Genes','Min_Cells','Min_Counts','Gene_Var_Pctl','Num_PCs','Num_Neighbors','Num_Force_Iter'];
		for (s in keys) {
			info_box.append('tspan')
				.append('text').text(display_names[keys[s]]+': ').style('font-weight','normal')
				.append('text').text(data[keys[s]]).style('font-weight','bold');
		}
	
		list_item.selectAll('div').selectAll('tspan').selectAll('text')
			.on('click',function() { 
				d3.event.stopPropagation(); 
			});
	
		list_item.append('text').attr('class','show_more_less_text').text('Show more')
		.on('click',function() {
			d3.event.stopPropagation();
			if (d3.select(this).text() == 'Show more') { 
				list_item.transition(200).style('height',show_more_height);
				d3.select(this).text('Show less');
			} else {
				list_item.transition(200).style('height',show_less_height); 
				d3.select(this).text('Show more');
			}
		});
		
		list_item.append('text').attr('class','delete_button').text('Delete')
			.on('click',function() { 
				d3.event.stopPropagation();				
				
				list_item
					.style('z-index','-10')
					.transition().duration(700).style('margin-top','-115px')
					.each('end',function() { 
						list_item.remove();
					});
				
				$.ajax({
					url:"cgi-bin/delete_subdirectory.py",
					type:"POST",
					data:{base_dir: project_directory, sub_dir:sub_directory},
					success: function(python_data){
						console.log(python_data);
					},
				});
				
			});

		
	
		list_item.on('click',function() {
			var my_url = [window.location.href.split('/')[0]];
			my_url.push('springViewer_1_6_dev.html?'); 
			my_url.push(project_directory);
			my_url.push(sub_directory);
			openInNewTab(my_url.join('/'));
		});
		
		
	});
}

function populate_subdirs_list(project_directory) {
	var title = project_directory.split('/');
	title = title[title.length-1];
	d3.select('#project_directory_title').text('SPRING subplots of "'+title+'"')

	$.ajax({
		url: "cgi-bin/list_directories_with_run_info.py",
		type: "POST",
		data: {path: project_directory},
		success: function(output_message) {
			var subdirs = output_message.split(',');
			console.log(subdirs);
			for (i in subdirs) {
				add_list_item(project_directory,subdirs[i],i+1);
			}
		}
	});
}


function openInNewTab(url) {
  var win = window.open(url, '_blank');
  win.focus();
}











