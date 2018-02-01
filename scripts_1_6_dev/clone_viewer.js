
clone_nodes = {};
clone_edges = {};
node_status = {};

function clone_viewer_setup() {

	clone_map = {};
	for (i in all_nodes) {
		clone_map[i] = [];
	}

	d3.json(window.location.search.slice(1,name.length) + "/clone_map.json", function(data) {	
		for (i in data) {
			clone_map[i] = data[i];
		}
		console.log('DONE');
	});
	
	clone_edge_container = new PIXI.Container();
	clone_edge_container.position = sprites.position;
	clone_edge_container.scale = sprites.scale;

	clone_sprites = new PIXI.Container(all_nodes.length, {scale: true, position: true, rotation: true, uvs: true, alpha: true});
	clone_sprites.position = sprites.position;
	clone_sprites.scale = sprites.scale;
	
	show_clone_edges = true;

	app.stage.addChild(clone_edge_container);
	app.stage.addChild(clone_sprites);

	var popup = d3.select('#force_layout').append('div')
		.attr('id','clone_viewer_popup')
		.on('click',update_colorstack);

	popup.append('div')
		.style('padding','5px')
		.style('height','22px')
		.append('text').text('Clone browser')
		.attr('id','clone_title');

	popup.append("div")
		.on('mousedown',function() {
			d3.event.stopPropagation();	
		})
		.append("input")
		.attr("type","range")
		.attr('id','clone_radius_slider')
		.attr('value','25')
		.style('width','110px')
		.style('margin-top','-2px')
		.style('margin-bottom','10px')
		.style('margin-left','5px')

	popup.append('div').append('button')
		.text('Set source nodes')
		.style('width','120px')
		.on('click',set_source_from_selection);
	popup.append('div').append('button')
		.text('Set target nodes')
		.style('width','120px')
		.on('click',set_target_from_selection);
	popup.append('div').append('button')
		.text('Reset all nodes')
		.style('width','120px')
		.on('click',reset_all_nodes);

	popup.append('div').append('button')
		.text('Darken cell colors')
		.style('width','120px')
		.on('click',darken_nodes);
		
	popup.append('div').append('button')
		.style('width','121px')
		.text('Hide clone edges')
		.on('click',function() {
			if (show_clone_edges) {
				show_clone_edges = false;
				d3.select(this).text('Show clone edges');
			} else {
				show_clone_edges = true;
				d3.select(this).text('Hide clone edges');
			}
		});
		
		
	var cc_div = popup.append('div')
	cc_div.append('button')
		.text('Clear')
		.style('width','54px')
		.style('margin-right','12px')
		.on('click',clear_clone_overlays);
	cc_div.append('button')
		.text('Close')
		.style('width','54px')
		.on('click',close_clone_viewer);
		
	function clone_viewer_popup_dragstarted() {
		d3.event.sourceEvent.stopPropagation();
	}
	function clone_viewer_popup_dragged() {
		var cx = parseFloat(d3.select("#clone_viewer_popup").style("left").split("px")[0])
		var cy = parseFloat(d3.select("#clone_viewer_popup").style("top").split("px")[0])
		d3.select("#clone_viewer_popup").style("left",(cx + d3.event.dx).toString()+"px");
		d3.select("#clone_viewer_popup").style("top",(cy + d3.event.dy).toString()+"px");
	}
	function clone_viewer_popup_dragended() { }

	d3.select("#clone_viewer_popup")
		.call(d3.behavior.drag()
			.on("dragstart", clone_viewer_popup_dragstarted)
			.on("drag", clone_viewer_popup_dragged)
			.on("dragend", clone_viewer_popup_dragended));
			
			
	function set_source_from_selection() {
		for (i=0; i<all_outlines.length; i++) {
			if (all_outlines[i].selected) {
				node_status[i].source = true;
			}
		}
	}
	
	function set_target_from_selection() {
		for (i=0; i<all_outlines.length; i++) {
			if (all_outlines[i].selected) {
				node_status[i].target = true;
			}
		}	
	}
	
	function reset_all_nodes() {
		for (i=0; i<all_outlines.length; i++) {
			node_status[i].source = false;
			node_status[i].target = false;
		}
	}
	
	function darken_nodes() {
		for (i=0; i<all_nodes.length; i++) {
			all_nodes[i].tint = '0x000000';
		}
	}
	
	function clear_clone_overlays() {
		for (i in clone_nodes) {
			deactivate_nodes(i);
		}
	}
	
	function close_clone_viewer() {
		svg_graph.on('mousemove',null);
		svg_graph.on('click',null);
		popup.style('visibility','hidden');
		reset_all_nodes();		
	}
	
}

function get_clone_radius() {
	var r = parseInt(d3.select('#clone_radius_slider')[0][0].value);
	return r**(1.5) / 8;
}

function clone_mousemove() {
	
	var dim = document.getElementById('svg_graph').getBoundingClientRect();
	var x = d3.event.clientX - dim.left;
	var y = d3.event.clientY - dim.top;
	x = (x - sprites.position.x) / sprites.scale.x;
	y = (y - sprites.position.y) / sprites.scale.y;
	
	for (i in clone_nodes) {
		if (! clone_nodes[i].active_stable) {
			deactivate_nodes(i);
		}
	}	
	for (var i=0; i<all_nodes.length; i++) {
		rad = Math.sqrt((all_nodes[i].x-x)**2 + (all_nodes[i].y-y)**2);
		if (rad < all_nodes[i].scale.x * get_clone_radius()) { 				
			if (node_status[i].source) {
				if (! (i in clone_nodes)) {
					activate_edges(i,false);
					activate_node(i,false); 
					//update_colorstack();
				}
			}	
		}	
	}
	
}

	
function clone_click() {
	var dim = document.getElementById('svg_graph').getBoundingClientRect();
	var x = d3.event.clientX - dim.left;
	var y = d3.event.clientY - dim.top;
	x = (x - sprites.position.x) / sprites.scale.x;
	y = (y - sprites.position.y) / sprites.scale.y;
	
	for (var i=0; i<all_nodes.length; i++) {
		if (! all_outlines[i].selected) {
			rad = Math.sqrt((all_nodes[i].x-x)**2 + (all_nodes[i].y-y)**2);
			if (rad < all_nodes[i].scale.x * get_clone_radius() ) { 
				if (node_status[i].source) {
					activate_node(i,true); 
					activate_edges(i,true);
				}
			}
		}
	}
}


function activate_node(i,stable) {	
	if (! (i in clone_nodes)) {		
		var circ = PIXI.Sprite.fromImage('stuff/disc.png');
		circ.anchor.set(.5);
		circ.scale.set(all_nodes[i].scale.x*1.5);
		circ.x = all_nodes[i].x;
		circ.y = all_nodes[i].y;
		var rgb = base_colors[i];
		circ.tint = rgbToHex(rgb.r,rgb.g,rgb.b);
		node_status[i].active = true;
		node_status[i].active_stable = stable;
		sprites.removeChild(circ);
		clone_sprites.addChild(circ);	
		clone_nodes[i] = circ;
	} 
	clone_nodes[i].active_stable = clone_nodes[i].active_stable || stable;
	clone_nodes[i].x = all_nodes[i].x;
	clone_nodes[i].y = all_nodes[i].y;
}

function activate_edges(i,stable) {
	if (! (i in clone_edges)) {		
		var edge_list = [];
		for (var j=0; j<clone_map[i].length; j++)  {	
			if (node_status[clone_map[i][j]].target) {
				activate_node(clone_map[i][j],stable);	
				if (show_clone_edges) {
					var source = i;
					var target = clone_map[i][j];
					var x1 = all_nodes[source].x;
					var y1 = all_nodes[source].y;
					var x2 = all_nodes[target].x;
					var y2 = all_nodes[target].y;
					var rgb = base_colors[clone_map[i][j]];
					var color = rgbToHex(rgb.r,rgb.g,rgb.b);
					var line = new PIXI.Graphics();
					line.lineStyle(5, color, 1);
					line.moveTo(x1,y1);
					line.lineTo(x2,y2);
					clone_edge_container.addChild(line);
					edge_list.push(line);
				}
			}
		}
		clone_edges[i] = edge_list;	
	} 
	
	else if (stable) {
		for (var j=0; j<clone_map[i].length; j++)  {
			if (node_status[clone_map[i][j]].target) {	
				activate_node(clone_map[i][j],stable);
			}	
		}
	}
}

function deactivate_nodes(i) {	
	if (i in clone_nodes) {
		clone_sprites.removeChild(clone_nodes[i]);
		delete clone_nodes[i];
		node_status[i].active = false;
		node_status[i].active_stable = false;
	}
	if (i in clone_edges) {
		for (var j=0; j<clone_edges[i].length; j++) {
			clone_edge_container.removeChild(clone_edges[i][j]);
		}
		delete clone_edges[i];	
	}	
}
	
function start_clone_viewer() {
	for (var i=0; i<all_nodes.length; i++) {
		node_status[i] = {active: false, active_stable:false, source:false, target: false};
	}	
	svg_graph.on('mousemove',clone_mousemove);
	svg_graph.on('click',clone_click);
	d3.select('#clone_viewer_popup').style('visibility','visible')
}

function update_colorstack() {
	/*
	if (Object.keys(clone_nodes).length>0 && d3.select('#clone_viewer_popup').style('width') == '140px') {
		d3.select('#clone_viewer_popup').transition().style('width','280px');
	}
	if (Object.keys(clone_nodes).length==0 && d3.select('#clone_viewer_popup').style('width') == '280px') {
		d3.select('#clone_viewer_popup').transition().style('width','140px');
	}
	*/
}














