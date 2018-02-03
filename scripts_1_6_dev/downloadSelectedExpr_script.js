function downloadSelectedExpr_setup() {
	var popup = d3.select('#force_layout').append('div')
		.attr('id','downloadSelectedExpr_popup');

	var button_bar = popup.append('div')
		.attr('id','downloadSelectedExpr_button_bar')
		.style('width','100%')

	button_bar.append('text')
		.text('Download raw data for selected cells');

	var close_button = button_bar.append('button')
		.text('Close')
		.on('mousedown',hide_downloadSelectedExpr_popup);


	popup.append('div').attr('class','downloadSelectedExpr_input_div')
		.append('label').text('Cell subset name')
		.append('input').attr('type','text')
		.attr('id','input_subset_name_download')
		.attr('value','e.g. "My_favorite_cells"')
		.style('width','220px');

	popup.append('div').attr('class','downloadSelectedExpr_input_div')
		.append('label').text('Email address')
		.append('input').attr('type','text')
		.attr('id','input_email_download')
		.style('width','220px');

	// popup.append('div').attr('class','downloadSelectedExpr_input_div')
	// 	.append('label').text('Save force layout animation')
	// 	.append('button').text('No')
	// 	.attr('id','input_animation')
	// 	.on('click', function() {
	// 		if (d3.select(this).text()=='Yes') { d3.select(this).text('No'); }
	// 		else { d3.select(this).text('Yes'); }
	// 	});

	popup.append('div')
		.attr('id','downloadSelectedExpr_submission_div')
		.attr('class','downloadSelectedExpr_input_div')
		.append('button').text('Submit')
		.on('click',downloadSelectedExpr)

	popup.append('div')
		.attr('id','downloadSelectedExpr_message_div')
		.on('mousedown',function() { d3.event.stopPropagation(); })
		.style('overflow', 'scroll')
		.append('text');

	d3.selectAll('.downloadSelectedExpr_input_div').on('mousedown',function() {
		d3.event.stopPropagation();
	});


	function downloadSelectedExpr_popup_dragstarted() {
		d3.event.sourceEvent.stopPropagation();
	}
	function downloadSelectedExpr_popup_dragged() {
		var cx = parseFloat(d3.select("#downloadSelectedExpr_popup").style("left").split("px")[0])
		var cy = parseFloat(d3.select("#downloadSelectedExpr_popup").style("top").split("px")[0])
		d3.select("#downloadSelectedExpr_popup").style("left",(cx + d3.event.dx).toString()+"px");
		d3.select("#downloadSelectedExpr_popup").style("top",(cy + d3.event.dy).toString()+"px");
	}
	function downloadSelectedExpr_popup_dragended() { }

	d3.select("#downloadSelectedExpr_popup")
		.call(d3.behavior.drag()
			.on("dragstart", downloadSelectedExpr_popup_dragstarted)
			.on("drag", downloadSelectedExpr_popup_dragged)
			.on("dragend", downloadSelectedExpr_popup_dragended));

}


function hide_downloadSelectedExpr_popup() {
	d3.select("#downloadSelectedExpr_popup").style("visibility","hidden").style('height', '200px');
}

function show_downloadSelectedExpr_popup() {
	var mywidth = parseInt(d3.select("#downloadSelectedExpr_popup").style("width").split("px")[0])
	var svg_width = parseInt(d3.select("svg").style("width").split("px")[0])
	d3.select('#input_description').style('height','22px');
	d3.select('#downloadSelectedExpr_message_div')
		.style('visibility','hidden')
		.style('height','0px');
	d3.select('#input_description')[0][0].value = '';
	d3.select("#downloadSelectedExpr_popup")
		.style("left",(svg_width/2-mywidth/2).toString()+"px")
		.style("top","10px").style('padding-bottom','0px')
		.style('visibility','visible');//.style('height','300px');

}


function downloadSelectedExpr() {
		var sel2text = "";
		for (i=0; i<all_outlines.length; i++) {
			if (all_outlines[i].selected) {
						sel2text = sel2text + "," + i.toString();
				}
		}
		if (sel2text.length>0) { sel2text = sel2text.slice(1, sel2text.length); }
		var t0 = new Date();
		var my_origin = window.location.origin;
		var my_pathname = window.location.pathname;
		var my_pathname_split = my_pathname.split('/');
		var my_pathname_start = my_pathname_split.slice(0, my_pathname_split.length-1).join('/');

		var subset_name = $("#input_subset_name_download").val();
		var user_email = $("#input_email_download").val();



		var output_message = "Checking input...<br>";

		d3.select('#downloadSelectedExpr_popup')
			.transition().duration(200)
			.style('height', '375px');

		d3.select('#downloadSelectedExpr_message_div')
			.transition().duration(200)
			.style('height','120px')
			.each('end',function() {
				d3.select('#downloadSelectedExpr_message_div')
					.style('visibility','inherit');
				d3.select('#downloadSelectedExpr_message_div')
					.select('text').html(output_message);
			});



		console.log('Downloading expression');
		$.ajax({
				url: "cgi-bin/download_expression.submit.py",
				type: "POST",
				data: {email:user_email, selection_name:subset_name, base_dir:graph_directory, current_dir:graph_directory+'/'+sub_directory, selected_cells:sel2text, my_origin:my_origin + my_pathname_start},
				success: function(data) {
						var t1 = new Date();
						//console.log(data);
						d3.select('#downloadSelectedExpr_message_div')
							.select('text').html(data);
				}
		});
}
