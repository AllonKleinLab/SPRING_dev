function imputation_setup() {
	var popup = d3.select('#force_layout').append('div')
		.attr('id','imputation_popup');
	
	var button_bar = popup.append('div').attr('id','imputation_button_bar')
		.on('mousedown',function() { d3.event.stopPropagation(); });
		
	button_bar.append('label').text('N = ').append('input').attr('id','imputation_N_input').property('value',10);
	button_bar.append('label').text('\u03B2 = ').append('input').attr('id','imputation_beta_input').property('value',0.1);
	button_bar.append('button').text('Smooth').on('click',perform_smoothing);
	button_bar.append('button').text('Close').on('click',hide_imputation_popup);

	var text_box = popup.append('div').attr('id','imputation_description').append('text')
		.text('Smooth gene expression on the graph. Increase N or decrease 	\u03B2 to enhance the degree of smoothing.');

	d3.select("#imputation_popup")
		.call(d3.behavior.drag()
			.on("dragstart", imputation_popup_dragstarted)
			.on("drag", imputation_popup_dragged)
			.on("dragend", imputation_popup_dragended));


	function imputation_popup_dragstarted() {
		d3.event.sourceEvent.stopPropagation();
	}
	function imputation_popup_dragged() {
		var cx = parseFloat(d3.select("#imputation_popup").style("left").split("px")[0])
		var cy = parseFloat(d3.select("#imputation_popup").style("top").split("px")[0])
		d3.select("#imputation_popup").style("left",(cx + d3.event.dx).toString()+"px");
		d3.select("#imputation_popup").style("top",(cy + d3.event.dy).toString()+"px");
	}
	function imputation_popup_dragended() { }
	
	function show_waiting_wheel() {
		popup.append('div').attr('id','wheel_mask');
		var opts = {
			  lines: 17 // The number of lines to draw
			, length: 35 // The length of each line
			, width: 15 // The line thickness
			, radius: 50 // The radius of the inner circle
			, scale: 0.22 // Scales overall size of the spinner
			, corners: 1 // Corner roundness (0..1)
			, color: '#000' // #rgb or #rrggbb or array of colors
			, opacity: 0.2 // Opacity of the lines
			, rotate: 8 // The rotation offset
			, direction: 1 // 1: clockwise, -1: counterclockwise
			, speed: 0.9 // Rounds per second
			, trail: 60 // Afterglow percentage
			, fps: 20 // Frames per second when using setTimeout() as a fallback for CSS
			, zIndex: 2e9 // The z-index (defaults to 2000000000)
			, className: 'spinner' // The CSS class to assign to the spinner
			, top: '50%' // Top position relative to parent
			, left: '50%' // Left position relative to parent
			, shadow: false // Whether to render a shadow
			, hwaccel: true // Whether to use hardware acceleration
			, position: 'relative' // Element positioning
			}
		var target = document.getElementById('wheel_mask');
		var spinner = new Spinner(opts).spin(target);
		$(target).data('spinner', spinner);
	}



	function hide_waiting_wheel() {
		$(".spinner").remove();
		$("#wheel_mask").remove();
	}

	function perform_smoothing() {
		if (document.getElementById('channels_button').checked) {
			var t0 = new Date();

			var beta = $('#imputation_beta_input').val();
			var N = $('#imputation_N_input').val();

			// var all_r = "";
			// var all_g = "";
			// var all_b = "";
		 //    for (i=0; i<all_outlines.length; i++) {
		 //    	var col = base_colors[i];
		 //        all_r = all_r + "," + col["r"].toString();
		 //        all_g = all_g + "," + col["g"].toString();
		 //        all_b = all_b + "," + col["b"].toString();
		 //    }
		 //    all_r = all_r.slice(1, all_r.length);
		 //    all_g = all_g.slice(1, all_g.length);
		 //    all_b = all_b.slice(1, all_b.length);
			var green_string = "";
			for (i=0; i<all_outlines.length; i++) {
				green_string = green_string + "," + green_array_raw[i].toString();
			}
			green_string = green_string.slice(1, green_string.length);

			show_waiting_wheel();
		
			$.ajax({
				url: "cgi-bin/smooth_gene.py",
				type: "POST",
				//data: {base_dir:graph_directory, sub_dir:graph_directory+'/'+sub_directory, raw_r:all_r, raw_g:all_g, raw_b:all_b, beta:beta, n_rounds:N},
				data: {base_dir:graph_directory, sub_dir:graph_directory+'/'+sub_directory, beta:beta, n_rounds:N, raw_g:green_string},
				success: function(data) {
					var t1 = new Date();
					console.log('Smoothed the data: ', t1.getTime() - t0.getTime());
					green_array = data.split(',');
					
					for (var i = 0; i < all_nodes.length; i++) {
						var rawval = green_array[i];
						var gg = normalize_one_val(rawval);
						base_colors[i] = {r:0,g:Math.floor(gg*255),b:0};
					}

					app.stage.children[1].children.sort(function(a,b) {
						return green_array[a.index] - green_array[b.index];
					});

					update_tints();
					if (d3.select("#left_bracket").style("visibility")=="visible"){
						slider_select_update();
						update_selected_count();
					}
				
					hide_waiting_wheel();


		   //      	var spl = data.split(";");
		   //      	var reds = spl[0].split(",");
		   //      	var greens = spl[1].split(",");
		   //      	var blues = spl[2].split(",");
		   //          for (var i = 0; i < all_nodes.length; i++) {
					// 	base_colors[i] = {r:parseInt(reds[i]),g:parseInt(greens[i]),b:parseInt(blues[i])};
					// }
					// update_tints();
			
				}
			});
		 }
	
	}
}

function show_imputation_popup() {

	var mywidth = parseInt(d3.select("#imputation_popup").style("width").split("px")[0])
	var svg_width = parseInt(d3.select("svg").style("width").split("px")[0])
	d3.select("#imputation_popup")
		.style("left",(svg_width/2-mywidth/2).toString()+"px")
		.style("top","80px").style('visibility','visible');
}

function hide_imputation_popup() {
	d3.select("#imputation_popup").style('visibility','hidden');
}


