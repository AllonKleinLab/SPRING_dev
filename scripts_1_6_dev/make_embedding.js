function make_embedding_setup(embed_method) {
	var popup = d3.select('#force_layout').append('div')
		.attr('id','embedding_popup_' + embed_method)
		.attr('class', 'embedding_popup');
	
	var button_bar = popup.append('div').attr('id','embedding_button_bar_' + embed_method).attr('class', 'embedding_button_bar')
		.on('mousedown',function() { d3.event.stopPropagation(); });
	
	if (embed_method === "fa2") {
		button_bar.append('label').html('<i>n_iter</i> = ').append('input').attr('id','fa2_niter_input').property('value',500);
	} else if (embed_method === "umap") {
		button_bar.append('label').html('<i>k</i> = ').append('input').attr('id','umap_k_input').property('value',10);
		button_bar.append('label').html('<i>min_dist</i> = ').append('input').attr('id','umap_mindist_input').property('value',0.5);
	} else if (embed_method === "tsne") {
		button_bar.append('label').html('<i>perplexity</i> = ').append('input').attr('id','tsne_perplex_input').property('value',30);
		button_bar.append('label').html('<i>angle</i> = ').append('input').attr('id','tsne_angle_input').property('value',0.5);
	}
	
	button_bar.append('button').text('Run').on('click',run_embedding);
	button_bar.append('button').text('Close').on('click',hide_embedding_popup);

	// var text_box = popup.append('div').attr('id','embedding_description').append('text')
	// 	.html('Predict mixed-celltype embeddings. Uses a kNN classifier to identify transcriptomes that resemble simulated embeddings. <br><br> <b><i>k </i> : </b> the number neighbors used in the classifier <br> <b><i>r </i> : </b> the ratio of simulated embeddings to observed cells <br> <b><i>f </i> : </b> the expected embedding rate');

	var embedding_notify_popup = d3.select('#force_layout').append('div')
		.attr('id','embedding_notification').style('visibility','hidden');
	embedding_notify_popup.append('div').attr('id','embedding_notify_text').append('text')
		.text('Done getting ' + embed_method);

	embedding_notify_popup.append('button')
		.text('Close')
		.on('mousedown', hide_embedding_notification);

	d3.select("#embedding_popup_"+ embed_method)
		.call(d3.behavior.drag()
			.on("dragstart", embedding_popup_dragstarted)
			.on("drag", embedding_popup_dragged)
			.on("dragend", embedding_popup_dragended));


	function embedding_popup_dragstarted() {
		d3.event.sourceEvent.stopPropagation();
	}
	function embedding_popup_dragged() {
		var element = d3.select(d3.event.sourceEvent.srcElement);
		var cx = parseFloat(element.style("left").split("px")[0])
		var cy = parseFloat(element.style("top").split("px")[0])
		element.style("left",(cx + d3.event.dx).toString()+"px");
		element.style("top",(cy + d3.event.dy).toString()+"px");
	}
	function embedding_popup_dragended() {}

	function run_embedding() {
		if ( mutable ) {
			var embed_method = d3.event.path[2].id.split('_')[2];
			var embed_name_dict = {'fa2': 'Force layout', 'umap': 'UMAP', 'tsne': 'tSNE'};


			var t0 = new Date();

			var n_iter = 0;
			var k = 0;
			var min_dist = 0;
			var perplex = 0;
			var angle = 0;

			if (embed_method === 'fa2') {
				n_iter = $('#fa2_niter_input').val();
			} else if (embed_method === 'umap') {
				k = $('#umap_k_input').val();
				min_dist = $('#umap_mindist_input').val();
			} else if (embed_method === "tsne") {
				perplex = $('#tsne_perplex_input').val();
				angle = $('#tsne_angle_input').val();
			}

			d3.select("#embedding_notification").select('text')
			  .text('Getting ' + embed_name_dict[embed_method] + '...');
			show_embedding_notification();
			hide_embedding_popup(embed_method);

			console.log(embed_method, n_iter, k, min_dist, perplex, angle);

			$.ajax({
				url: "cgi-bin/run_embedding.py",
				type: "POST",
				data: {base_dir:graph_directory, 
					   sub_dir:graph_directory+'/'+sub_directory, 
					   embed_method:embed_method,
					   n_iter:n_iter,
					   k:k,
					   min_dist:min_dist, 
					   perplex:perplex,
					   angle:angle },
				success: function(data) {
					var t1 = new Date();
					console.log('Got ' + embed_method + ':', t1.getTime() - t0.getTime());
					load_new_coordinates(embed_method);
					d3.select("#embedding_notification").select('text')
					   .text('Finished running ' + embed_name_dict[embed_method] + '.');
					show_embedding_notification();
					
				}
			});
		}
		else {
			d3.select("#embedding_notification").select('text').text('Sorry, this dataset cannot be edited.');
			show_embedding_notification();
		}
	
	}
}

function show_embedding_notification() {
	var mywidth = parseInt(d3.select("#embedding_notification").style("width").split("px")[0]);
	var svg_width = parseInt(d3.select("svg").style("width").split("px")[0]);

	d3.select("#embedding_notification")
		.style("left",(svg_width/2-mywidth/2).toString()+"px")
		.style("top","0px")
		.style('opacity', 0.0)
		.style('visibility','visible')
		.transition()
		.duration(500)
		.style('opacity', 1.0);
}

function hide_embedding_notification() {
	console.log('hide');
	d3.select("#embedding_notification").style('opacity', 0.0).style('visibility','hidden');
}

function show_embedding_popup(embed_method) {
	if (mutable) {
		var mywidth = parseInt(d3.select("#embedding_popup_" + embed_method).style("width").split("px")[0]);
		var svg_width = parseInt(d3.select("svg").style("width").split("px")[0]);
		d3.select("#embedding_popup_" + embed_method)
			.style("left",(svg_width/2-mywidth/2).toString()+"px")
			.style("top","80px").style('visibility','visible');
	} 
	else {
		d3.select("#embedding_notification").select('text').text('Sorry, this dataset cannot be edited.');
		show_embedding_notification();
	}
}

function hide_embedding_popup(embed_method) {
	if (embed_method != undefined) {
		d3.select("#embedding_popup_" + embed_method).style('visibility','hidden');
	} else {
		var element = d3.select(d3.event.path[2])
		element.style('visibility','hidden');
	}
}


function get_embedding_fa2() {
	hide_embedding_popup('tsne');
	hide_embedding_popup('umap');
	show_embedding_popup('fa2');
}

function get_embedding_umap() {
	hide_embedding_popup('fa2');
	hide_embedding_popup('tsne');
	show_embedding_popup('umap');
}

function get_embedding_tsne() {
	hide_embedding_popup('fa2');
	hide_embedding_popup('umap');
	show_embedding_popup('tsne');
	
}

function load_new_coordinates(embed_method) {
	var fname = graph_directory + '/' + sub_directory + '/coordinates_' + embed_method + '.txt';
	var noCache = new Date().getTime();
	fname = fname + "?_=" + noCache;
	var run_label = "#" + embed_method + "_run";
	var load_label = "#" + embed_method + "_load";
	coordinates_choice[embed_method] = [];
	$.ajax({
		url: fname, 
		type: 'HEAD',
		error: function() {
			console.log('no', embed_method);
			d3.select(load_label).style('visibility','hidden');
			d3.select(run_label).text('Run');
		},
		success: function() {
			console.log('yes', embed_method);
			d3.text(fname, function(text) {
				text.split('\n').forEach(function(entry,index,array) {
					if (entry.length > 0) {
						var items = entry.split(',')
						if (items.length == 3) {
							xx = parseFloat($.trim(items[1]));
							yy = parseFloat($.trim(items[2]));
							nn = parseInt($.trim(items[0]));
						} else if (items.length == 2) {
							xx = parseFloat($.trim(items[0]));
							yy = parseFloat($.trim(items[1]));
						}
						coordinates_choice[embed_method].push([xx,yy]);
					}
				});
				d3.select(run_label).text("Re-run");
				d3.select(load_label).style('visibility','visible');
			});
		}
	});
}



