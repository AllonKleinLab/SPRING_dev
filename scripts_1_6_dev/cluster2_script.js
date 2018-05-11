function cluster_setup() {
	

 
	var cluster_started_popup = d3.select('#force_layout').append('div')
		.attr('id','cluster_started_popup').style('visibility','hidden');
	cluster_started_popup.append('div').attr('id','cluster_started_text').append('text')
		.text('Now clustering...');


	var cluster_finished_popup = d3.select('#force_layout').append('div')
		.attr('id','cluster_finished_popup').style('visibility','hidden');
	cluster_finished_popup.append('div').attr('id','cluster_finished_text').append('text')
		.text('Clustering finished! See Cell Labels menu.');

}

function show_notification(myObject) {
	console.log('hey');
	//var mywidth = parseInt(d3.select("#doublet_notification").style("width").split("px")[0])
	var mywidth = parseInt(myObject.style("width").split("px")[0])
	var svg_width = parseInt(d3.select("svg").style("width").split("px")[0])

	myObject.style("left",(svg_width/2-mywidth/2).toString()+"px")
		.style("top","0px")
		.style('opacity', 0.0)
		.style('visibility','visible')
		.transition()
		.duration(1500)
		.style('opacity', 1.0)
		.transition()
		.duration(2000)
		.transition()
		.duration(1500)
		.style('opacity', 0.0)
		.each("end", function() {
			d3.select("myObject").style('visibility', 'hidden');
		});

}

function run_clustering() {
	console.log('running!');
	var t0 = new Date();
	show_notification(d3.select("#cluster_started_popup"));
	$.ajax({
		url: "cgi-bin/run_clustering.py",
		type: "POST",
		data: {base_dir:graph_directory, sub_dir:graph_directory+'/'+sub_directory},
		success: function(data) {
			console.log(data);
			var t1 = new Date();
			console.log('Ran clustering: ', t1.getTime() - t0.getTime());
			show_notification(d3.select("#cluster_finished_popup"));
			
			var noCache = new Date().getTime();

			d3.json(graph_directory+'/'+sub_directory+"/categorical_coloring_data.json"+"?_="+noCache, function(data) {
				categorical_coloring_data = data;
				Object.keys(categorical_coloring_data).forEach(function(k) {
					var label_counts = {}
					Object.keys(categorical_coloring_data[k].label_colors).forEach(function(n) { label_counts[n] = 0; });
					categorical_coloring_data[k].label_list.forEach(function(n) { label_counts[n] += 1; });
					categorical_coloring_data[k]['label_counts'] = label_counts;
				});

				dispatch.load(categorical_coloring_data,"cell_labels");
				update_slider();
			});



			// d3.json(graph_directory+'/'+sub_directory+"/color_stats.json"+"?_="+noCache, function(data) { color_stats = data; });
			// d3.text(graph_directory+'/'+sub_directory+"/color_data_gene_sets.csv"+"?_="+noCache, function(text) {
			// 	gene_set_color_array = read_csv(text);
			// 	dispatch.load(gene_set_color_array,"gene_sets")	;
			// 	update_slider();
			// });
		}
	});
}


