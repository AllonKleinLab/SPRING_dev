function doublet_setup() {
	var popup = d3.select('#force_layout').append('div')
		.attr('id','doublet_popup');
	
	var button_bar = popup.append('div').attr('id','doublet_button_bar')
		.on('mousedown',function() { d3.event.stopPropagation(); });
		
	button_bar.append('label').html('<i>k</i> = ').append('input').attr('id','doublet_k_input').property('value',50);
	button_bar.append('label').html('<i>r</i> = ').append('input').attr('id','doublet_r_input').property('value',2);
	button_bar.append('label').html('<i>f</i> = ').append('input').attr('id','doublet_f_input').property('value',0.1);
	button_bar.append('button').text('Run').on('click',run_doublet_detector);
	button_bar.append('button').text('Close').on('click',hide_doublet_popup);

	var text_box = popup.append('div').attr('id','doublet_description').append('text')
		.html('Predict mixed-celltype doublets. Uses a kNN classifier to identify transcriptomes that resemble simulated doublets. <br><br> <b><i>k </i> : </b> the number neighbors used in the classifier <br> <b><i>r </i> : </b> the ratio of simulated doublets to observed cells <br> <b><i>f </i> : </b> the expected doublet rate');


	var doublet_notify_popup= d3.select('#force_layout').append('div')
		.attr('id','doublet_notification').style('visibility','hidden');
	doublet_notify_popup.append('div').attr('id','doublet_notify_text').append('text')
		.text('Doublet detector finished! See custom colors menu.');

	doublet_notify_popup.append('button')
		.text('Close')
		.on('mousedown', hide_doublet_notification);



	d3.select("#doublet_popup")
		.call(d3.behavior.drag()
			.on("dragstart", doublet_popup_dragstarted)
			.on("drag", doublet_popup_dragged)
			.on("dragend", doublet_popup_dragended));


	function doublet_popup_dragstarted() {
		d3.event.sourceEvent.stopPropagation();
	}
	function doublet_popup_dragged() {
		var cx = parseFloat(d3.select("#doublet_popup").style("left").split("px")[0])
		var cy = parseFloat(d3.select("#doublet_popup").style("top").split("px")[0])
		d3.select("#doublet_popup").style("left",(cx + d3.event.dx).toString()+"px");
		d3.select("#doublet_popup").style("top",(cy + d3.event.dy).toString()+"px");
	}
	function doublet_popup_dragended() { }
	
	// function show_processing_mask() {
	// 	popup.append('div').attr('id','doublet_processing_mask').append('div').append('text')
	// 		.text('Running doublet detector... you will be notified upon completion.')
	// 		.style('opacity', 0.0)
	// 		.transition()
	// 		.duration(500)
	// 		.style('opacity', 1.0);

		// var opts = {
		// 	  lines: 17 // The number of lines to draw
		// 	, length: 35 // The length of each line
		// 	, width: 15 // The line thickness
		// 	, radius: 50 // The radius of the inner circle
		// 	, scale: 0.22 // Scales overall size of the spinner
		// 	, corners: 1 // Corner roundness (0..1)
		// 	, color: '#000' // #rgb or #rrggbb or array of colors
		// 	, opacity: 0.2 // Opacity of the lines
		// 	, rotate: 8 // The rotation offset
		// 	, direction: 1 // 1: clockwise, -1: counterclockwise
		// 	, speed: 0.9 // Rounds per second
		// 	, trail: 60 // Afterglow percentage
		// 	, fps: 20 // Frames per second when using setTimeout() as a fallback for CSS
		// 	, zIndex: 2e9 // The z-index (defaults to 2000000000)
		// 	, className: 'spinner' // The CSS class to assign to the spinner
		// 	, top: '50%' // Top position relative to parent
		// 	, left: '50%' // Left position relative to parent
		// 	, shadow: false // Whether to render a shadow
		// 	, hwaccel: true // Whether to use hardware acceleration
		// 	, position: 'relative' // Element positioning
		// 	}
		// var target = document.getElementById('doublet_processing_mask');
		// var spinner = new Spinner(opts).spin(target);
		// $(target).data('spinner', spinner);

	// }

	// function hide_processing_mask() {
	// 	// $(".spinner").remove();
	// 	$("#doublet_processing_mask").remove();

	// }

	// function hide_doublet_popup_slowly() {
	// 	d3.select("#doublet_popup").transition()
	// 	.duration(2000)
	// 	.transition()
	// 	.duration(500)
	// 	.style('opacity', 0.0)
	// 	.each("end", function() {
	// 		d3.select("#doublet_popup").style('visibility', 'hidden');
	// 		d3.select("#doublet_popup").style('opacity', '1.0');
	// 	});

	// }


	// function show_doublet_notification() {

	// 	var mywidth = parseInt(d3.select("#doublet_notification").style("width").split("px")[0])
	// 	var svg_width = parseInt(d3.select("svg").style("width").split("px")[0])

	// 	d3.select("#doublet_notification")
	// 		.style("left",(svg_width/2-mywidth/2).toString()+"px")
	// 		.style("top","0px")
	// 		.style('opacity', 0.0)
	// 		.style('visibility','visible')
	// 		.transition()
	// 		.duration(1500)
	// 		.style('opacity', 1.0)
	// 		.transition()
	// 		.duration(2000)
	// 		.transition()
	// 		.duration(1500)
	// 		.style('opacity', 0.0)
	// 		.each("end", function() {
	// 			d3.select("#doublet_notification").style('visibility', 'hidden');
	// 		});

	// 	//d3.select("#doublet_notification").transition(1500).style('visibility','hidden');
	// }

	function run_doublet_detector() {
		if ( mutable ) {
			var t0 = new Date();
			var k = $('#doublet_k_input').val();
			var r = $('#doublet_r_input').val();
			var f = $('#doublet_f_input').val();

			// show_processing_mask();
			// hide_doublet_popup_slowly();

			d3.select("#doublet_notification").select('text')
			  .text('Running doublet detector... you will be notified upon completion.');
			show_doublet_notification();
			hide_doublet_popup();

			console.log(k, r, f);
			$.ajax({
				url: "cgi-bin/run_doublet_detector.py",
				type: "POST",
				data: {base_dir:graph_directory, sub_dir:graph_directory+'/'+sub_directory, k:k, r:r, f:f},
				success: function(data) {
					var t1 = new Date();
					console.log('Ran doublet detector: ', t1.getTime() - t0.getTime());
					d3.select("#doublet_notification").select('text').text('Doublet detector finished! See Custom Colors menu.');
					show_doublet_notification();
					if (d3.select('#clone_viewer_popup').style('visibility') == 'visible') {
						$("#clone_viewer_popup").remove();
						for (i=0; i<all_outlines.length; i++) {
							node_status[i].source = false;
							node_status[i].target = false;
						}
						for (i in clone_nodes) {
							deactivate_nodes(i);
						}
						for (i in clone_edges) {
							deactivate_edges(i);
						}
						targetCircle.clear();

						clone_viewer_setup();
						start_clone_viewer();
					}
					else {
						$("#clone_viewer_popup").remove();
						clone_viewer_setup();
					}
					
					//hide_processing_mask();
					// open json file containing gene sets and populate drop down menu
					var noCache = new Date().getTime();
					d3.json(graph_directory+'/'+sub_directory+"/color_stats.json"+"?_="+noCache, function(data) { color_stats = data; });
					d3.text(graph_directory+'/'+sub_directory+"/color_data_gene_sets.csv"+"?_="+noCache, function(text) {
						gene_set_color_array = read_csv(text);
						dispatch.load(gene_set_color_array,"gene_sets")	;
						update_slider();
						console.log('loaded doublet scores into menu');
					});
				}
			});
		}
		else {
			d3.select("#doublet_notification").select('text').text('Sorry, this dataset cannot be edited.');
			show_doublet_notification();
		}
	
	}
}

function show_doublet_notification() {
	var mywidth = parseInt(d3.select("#doublet_notification").style("width").split("px")[0]);
	var svg_width = parseInt(d3.select("svg").style("width").split("px")[0]);

	d3.select("#doublet_notification")
		.style("left",(svg_width/2-mywidth/2).toString()+"px")
		.style("top","0px")
		.style('opacity', 0.0)
		.style('visibility','visible')
		.transition()
		.duration(500)
		.style('opacity', 1.0);
}

function hide_doublet_notification() {
	console.log('hide');
	d3.select("#doublet_notification").style('opacity', 0.0).style('visibility','hidden');
}

function show_doublet_popup() {
	if (mutable) {
		var mywidth = parseInt(d3.select("#doublet_popup").style("width").split("px")[0]);
		var svg_width = parseInt(d3.select("svg").style("width").split("px")[0]);
		d3.select("#doublet_popup")
			.style("left",(svg_width/2-mywidth/2).toString()+"px")
			.style("top","80px").style('visibility','visible');
	} 
	else {
		d3.select("#doublet_notification").select('text').text('Sorry, this dataset cannot be edited.');
		show_doublet_notification();
	}
}

function hide_doublet_popup() {
	d3.select("#doublet_popup").style('visibility','hidden');
}



