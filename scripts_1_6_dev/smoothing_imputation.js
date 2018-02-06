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
	var beta = $('#imputation_beta_input').val();
	var N = $('#imputation_N_input').val();
	console.log([beta,N]);
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


