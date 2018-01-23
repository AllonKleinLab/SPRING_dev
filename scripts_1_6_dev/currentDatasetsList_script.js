

function add_list_item(project_directory,sub_directory,order) {
	console.log(sub_directory);
	d3.json(project_directory+'/'+sub_directory+'/run_info.json', function(data) {
		data['Date'] = data['Date'].split(' ')[0];
		var list_item = d3.select('#dataset_list').append('li').style('order',order);
		list_item.append('h3').text(sub_directory);


		var display_names = {'Email':'Author email',
							'Filtered_Genes':'Number of genes that passed filter',
							'Gene_Var_Pctl':'Gene variability %ile (gene filtering)',
							'Min_Cells':'Min expressing cells (gene filtering)',
							'Min_Counts':'Min number of UMIs (gene filtering)',
							'Nodes':'Number of cells',
							'Num_Force_Iter':'Number of force layout iterations',
							'Num_Neighbors':'Number of nearest neighbors',
							'Num_PCs':'Number of principal components',
							'Date':'Date created'}
		
		var keys = ['Email','Date','Nodes'];
		var info_box = list_item.append('div').attr('class','dataset_key_info');
		for (s in keys) {
			info_box.append('tspan')
				.append('text').text(display_names[keys[s]]+': ').style('font-weight','normal')
				.append('text').text(data[keys[s]]).style('font-weight','bold');
		}
		var info_box = list_item.append('div').attr('class','dataset_params');
		var keys = ['Filtered_Genes','Min_Cells','Min_Counts','Gene_Var_Pctl','Num_PCs','Num_Neighbors','Num_Force_Iter'];
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
				list_item.transition(200).style('height','250px');
				d3.select(this).text('Show less');
			} else {
				list_item.transition(200).style('height','105px'); 
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
			var my_url = window.location.href.split('/');
			my_url = my_url.slice(0,my_url.length-1);
			my_url.push('springViewer_1_6_dev.html?cgi-bin/client_datasets'); 
			my_url.push(project_directory);
			my_url.push(sub_directory);
			openInNewTab(my_url.join('/'));
		});
		
		
	});
}

function populate_subdirs_list(project_directory) {
	d3.select('#project_directory_title').text('SPRING subplots of "'+project_directory+'"')

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











