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
	
	d3.select("#imputation_popup")
		.call(d3.behavior.drag()
			.on("dragstart", imputation_popup_dragstarted)
			.on("drag", imputation_popup_dragged)
			.on("dragend", imputation_popup_dragended));


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


