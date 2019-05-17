function PAGA_setup() {

	var popup = d3.select('#force_layout').append('div')
		.attr('id','PAGA_popup');

	popup.append('div')
		.style('padding','5px')
		.style('height','35px')
		.append('text').text('Graph abstraction')
		.attr('id','PAGA_title')
		.append("input")
		.attr("type","checkbox")
		.attr('checked',true)
		.attr('id','PAGA_visibility_checkbox')
		.style('margin-left','27px')
		.on('click',toggle_PAGA_visibility);



	popup.append("div")
		.on('mousedown',function() {
			d3.event.stopPropagation();	
		})
		.append('label').text('Node size scale')
		.append("input")
		.attr("type","range")
		.attr('value','40')
		.attr('id','PAGA_node_size_slider')
		.style('margin-left','29px')
		.on('input',PAGA_redraw);

	popup.append("div")
		.on('mousedown',function() {
			d3.event.stopPropagation();	
		})
		.append('label').text('Edge width scale')
		.append("input")
		.attr("type","range")
		.attr('id','PAGA_edge_width_slider')
		.style('margin-left','22px')
		.attr('value','40')
		.on('input',PAGA_redraw);

	popup.append("div")
		.on('mousedown',function() {
			d3.event.stopPropagation();	
		})
		.append('label').text('Min edge weight')
		.append("input")
		.attr("type","range")
		.attr('value','25')
		.attr('id','PAGA_min_edge_weight_slider')
		.style('margin-left','26px')
		.on('input',adjust_min_edge_weight);

	popup.append("div")
		.on('mousedown',function() {
			d3.event.stopPropagation();	
		})
		.append('label').text('Cell mask opacity')
		.append("input")
		.attr("type","range")
		.attr('value','70')
		.attr('id','PAGA_mask_opacity_slider')
		.style('margin-left','20px')
		.on('input',adjust_PAGA_mask_opacity);

	var PAGA_button_options = popup.append('div')
		.style('margin-top','9px')
		.style('margin-left','2px');
		
	PAGA_button_options.append('button')
		.text('Reset')
		.on('click',reset_positions);
	PAGA_button_options.append('button')
		.text('(De)select')
		.on('click',deselect_PAGA);
	PAGA_button_options.append('button')
		.text('Propagate')
		.on('click',propagate);
	PAGA_button_options.append('button')
		.text('Close')
		.on('click',hide_PAGA_popup);

	popup.call(d3.behavior.drag()
		.on("dragstart", PAGA_popup_dragstarted)
		.on("drag", PAGA_popup_dragged)
		.on("dragend", PAGA_popup_dragended));


	var noCache = new Date().getTime();
	d3.json(window.location.search.slice(1,name.length) + "/PAGA_data.json"+"?_="+noCache, function(error, data) {
		
		if (data != undefined) {
		
			PAGA_data = data;
	
			var min_weight_frac = data.edge_weight_meta.min_edge_weight / data.edge_weight_meta.max_edge_weight
			d3.select('#PAGA_min_edge_weight_slider')[0][0].value = Math.log(min_weight_frac * Math.exp(100/20)) * 20;
			
			var PAGA_links = d3.select('#vis').selectAll("line")
				.data(data['links']).enter().append("line")
				.attr('class','PAGA_link')

			var PAGA_circles = d3.select('#vis').selectAll("circle")
				.data(data['nodes']).enter().append("circle")
				.attr('class','PAGA_node')
				.call(d3.behavior.drag()
					.on("dragstart", dragstarted)
					.on("drag", dragged)
					.on("dragend", dragended))
				.on('click', function(d) {
					if ( ! d3.event.defaultPrevented ) {
						d.selected = ! d.selected;
						PAGA_redraw();
					}
				});
	

			PAGA_node_dict = {};
			data['nodes'].forEach(function(d) { 
				PAGA_node_dict[d.index] = d;
				d.coordinates_original = Object.assign({},d.coordinates);
			});	
		
			PAGA_redraw();
		
			PAGA_circles
				.attr('stroke','yellow')
				.attr('stroke-width','0px')
				.style('visibility','hidden');	
		
			PAGA_links
				.style('visibility','hidden');

		}
		
	});
				
	function dragstarted(d) {
		d3.event.sourceEvent.stopPropagation();
		d.beingDragged = true
		if (d.selected == true) {
			d3.selectAll('.PAGA_node').filter(function(d) { return d.selected; }).each(function(d) {
				d.beingDragged = true;
			});
		}
	}

	function dragged(d) {
		d3.selectAll('.PAGA_node').filter(function(d) { return d.beingDragged; }).each(function(d) { 
			d.coordinates[0] += d3.event.dx;
			d.coordinates[1] += d3.event.dy;
		});
		PAGA_redraw();
	}

	function dragended(d) {
		d3.selectAll('.PAGA_node').each(function(d) {
			d.beingDragged = false;
		});
	}
	
	
	function PAGA_popup_dragstarted() {
		d3.event.sourceEvent.stopPropagation();
	}
	function PAGA_popup_dragged() {
		var cx = parseFloat(d3.select("#PAGA_popup").style("left").split("px")[0])
		var cy = parseFloat(d3.select("#PAGA_popup").style("top").split("px")[0])
		d3.select("#PAGA_popup").style("left",(cx + d3.event.dx).toString()+"px");
		d3.select("#PAGA_popup").style("top",(cy + d3.event.dy).toString()+"px");
	}
	function PAGA_popup_dragended() { }



	function reset_positions() {
	
		d3.selectAll('.PAGA_node').each(function(d) {
			d.coordinates = Object.assign({},d.coordinates_original);
		});
		PAGA_redraw();
		
	}
	
	function propagate() {
	
	}
	
	function deselect_PAGA() {
		var any_selected = false;
		d3.selectAll('.PAGA_node').each(function(d) {
			if (d.selected) { any_selected = true; }
		});
		d3.selectAll('.PAGA_node').each(function(d) {
			d.selected = ! any_selected;
		});
		PAGA_redraw();
	}
	
	function adjust_min_edge_weight() {
		var min_weight = Math.exp(parseFloat(d3.select('#PAGA_min_edge_weight_slider')[0][0].value) / 20) / Math.exp(100/20)
		console.log(min_weight * PAGA_data.edge_weight_meta.max_edge_weight);
		PAGA_data.edge_weight_meta.min_edge_weight = min_weight * PAGA_data.edge_weight_meta.max_edge_weight;
		PAGA_redraw();
	}
}

function PAGA_redraw() {

	node_scale = (d3.select('#PAGA_node_size_slider')[0][0].value / 40) ** 1.8
	edge_scale = (d3.select('#PAGA_edge_width_slider')[0][0].value / 40) ** 3

	d3.selectAll('.PAGA_node')
		.attr('cx', function(d) { return d.coordinates[0]; })
		.attr('cy', function(d) { return d.coordinates[1]; })
		.attr("r", function (d) { return Math.sqrt(d.size)*2 * node_scale; })
		.attr("fill", function (d) { return d.color; })
		.attr('stroke-width', function(d) {
			if (d.selected) { return (15 + Math.sqrt(d.size)/5 * node_scale).toString()+'px'; }
			else { return '0px'; }
		});
		
	d3.selectAll('.PAGA_link')
		.attr('opacity',.8).attr('stroke','darkgray')
		.attr('x1', function(d) { return PAGA_node_dict[d.source].coordinates[0]; })
		.attr('y1', function(d) { return PAGA_node_dict[d.source].coordinates[1]; })
		.attr('x2', function(d) { return PAGA_node_dict[d.target].coordinates[0]; })
		.attr('y2', function(d) { return PAGA_node_dict[d.target].coordinates[1]; })
		.attr('stroke-width', function(d) { return d.weight * edge_scale; })
		.style('visibility', function(d) {
			if (d.weight > PAGA_data.edge_weight_meta.min_edge_weight) { return 'visible'; }
			else { return 'hidden'; }
		});
}

	
function adjust_PAGA_mask_opacity() {
	var opacity = parseFloat(d3.select('#PAGA_mask_opacity_slider')[0][0].value) / 100;
	d3.select('svg').style('background','rgba(255,255,255,'+opacity.toString()+')');
}

function toggle_PAGA_visibility() {

	if (document.getElementById('PAGA_visibility_checkbox').checked) {
		d3.selectAll('.PAGA_node').style('visibility','visible');
		d3.selectAll('.PAGA_link').style('visibility','visible');
		adjust_PAGA_mask_opacity();
		PAGA_redraw()
	}
	else {
		d3.selectAll('.PAGA_node').style('visibility','hidden');
		d3.selectAll('.PAGA_link').style('visibility','hidden');
		d3.select('svg').style('background','rgba(255,255,255,0');
	}

}

function show_PAGA_popup() {
	d3.select('#PAGA_popup').style('visibility','visible');
	toggle_PAGA_visibility();
}


function hide_PAGA_popup() {
	d3.select('#PAGA_popup').style('visibility','hidden');
}
