

function rotation_update() {
	
	var selected = [];
	var stash_i = stashed_coordinates.length;
	stashed_coordinates.push({});
	for (i in all_nodes) {
		if (all_outlines[i].selected) { selected.push(i); }
		stashed_coordinates[stash_i][i] = [all_nodes[i].x, all_nodes[i].y];
	}
	if (selected.length==0) { 
		deselect_all();
		selected = d3.range(0,all_nodes.length);
	}	
	var real_scale = 1;
	
	vis = d3.select('#vis')
	vis.attr("transform","translate(" + [sprites.x,sprites.y] + ")" + " scale(" + sprites.scale.x + ")");
	vis.append("circle").attr("id","rotation_outer_circ");
	vis.append("circle").attr("id","rotation_inner_circ");
	vis.append("circle").attr("id","rotation_pivot");
	
	rotation_show();
	d3.select("#rotation_pivot").style("opacity",1)
	
	var all_xs = [];
	var all_ys = []; 
	for (i in all_nodes) {
		if (all_outlines[i].selected) {
			all_xs.push(all_nodes[i].x);
			all_ys.push(all_nodes[i].y);
		}
	}
	var cx = d3.sum(all_xs) / all_xs.length;
	var cy = d3.sum(all_ys) / all_ys.length;
	var dels = [];
	for (i=0; i<all_xs.length; i++) {
		dels.push(Math.sqrt(Math.pow(all_xs[i] - cx,2)+Math.pow(all_ys[i] - cy,2)));
	}
	rotator_radius = d3.median(dels) * 1.5;
	d3.select("#rotation_pivot")
		.attr("r",d3.min([13/zoomer.scale(),(rotator_radius+30)/3]))
		.style("stroke-width",d3.min([3/zoomer.scale(),10]))
		.style("cx",cx)
		.style("cy",cy);
	d3.select("#rotation_outer_circ")
		.attr("r",rotator_radius+30+12 / zoomer.scale())
		.style("cx",cx)
		.style("cy",cy)
		.style("stroke-width", 18/zoomer.scale());
	d3.select("#rotation_inner_circ")
		.attr("r",rotator_radius+30)
		.style("cx",cx)
		.style("cy",cy)
		.style("stroke-width", 6/zoomer.scale());

		
	d3.select("#rotation_outer_circ")
		.on("mouseover",function() { d3.select("#rotation_outer_circ").style("opacity",.5) })
		.on("mouseout",function() { d3.select("#rotation_outer_circ").style("opacity",0) })

	d3.select("#rotation_pivot")
		.call(d3.behavior.drag()
			.on("dragstart", pivot_dragstarted)
			.on("drag", pivot_dragged)
			.on("dragend", pivot_dragended));
			
	d3.select("#rotation_outer_circ")
		.call(d3.behavior.drag()
			.on("dragstart", handle_dragstarted)
			.on("drag", handle_dragged)
			.on("dragend", handle_dragended));
	

	function pivot_dragstarted() {
		d3.event.sourceEvent.stopPropagation();
	}
	function pivot_dragged() {
		var cx = parseFloat(d3.select("#rotation_pivot").style("cx").split("px")[0])
		var cy = parseFloat(d3.select("#rotation_pivot").style("cy").split("px")[0])
		d3.select("#rotation_pivot").style("cx",cx + d3.event.dx);
		d3.select("#rotation_pivot").style("cy",cy + d3.event.dy);
		d3.select("#rotation_inner_circ").style("cx",cx + d3.event.dx);
		d3.select("#rotation_inner_circ").style("cy",cy + d3.event.dy);
		d3.select("#rotation_outer_circ").style("cx",cx + d3.event.dx);
		d3.select("#rotation_outer_circ").style("cy",cy + d3.event.dy);
	}
	function pivot_dragended() { }
	
	
	
	function handle_dragstarted() { 
		d3.event.sourceEvent.stopPropagation();
		d3.select("#rotation_outer_circ").style("opacity",.5);
		real_scale = 1;
	}
	
	function handle_dragged() {
		var cx = parseFloat(d3.select("#rotation_pivot").style("cx").split("px")[0]);
		var cy = parseFloat(d3.select("#rotation_pivot").style("cy").split("px")[0]);

		var r1 = Math.atan((d3.event.y-cy)/(d3.event.x-cx));
		var r2 = Math.atan((d3.event.y+d3.event.dy-cy)/(d3.event.x+d3.event.dx-cx));
		var rot = (r1-r2);
		if (r1-r2 > 1.4) { rot += 3.141592653; }
		
		var d1 = Math.sqrt((d3.event.y-cy)**2 + (d3.event.x-cx)**2);
		var d2 = Math.sqrt((d3.event.y+d3.event.dy-cy)**2 + (d3.event.x+d3.event.dx-cx)**2);
		real_scale = real_scale * d2 / d1;
		if (Math.abs(real_scale - 1) > .5) { var scale = d2 / d1; }
		else { var scale = 1; }
		
		if (Math.abs(rot) < 1) {
			for (i in all_outlines) {
				if (all_outlines[i].selected) {
					var d = all_nodes[i];
					var dx = d.x - cx, dy = d.y - cy;
					var brad = Math.sqrt(dx*dx+dy*dy)
					var ddx = Math.cos(rot)*dx + Math.sin(rot)*dy;
					var ddy = -Math.sin(rot)*dx + Math.cos(rot)*dy;
					var arad = Math.sqrt(ddx*ddx+ddy*ddy)
					move_node(i, cx + ddx * scale, cy + ddy * scale);
				}
			}
			adjust_edges();
		}
	}
	
	function handle_dragended() {
		d3.select("#rotation_outer_circ").style("opacity",0);
	}
		
}

function rotation_show() {
	d3.select("#rotation_outer_circ").style("visibility","visible");
	d3.select("#rotation_inner_circ").style("visibility","visible");
	d3.select("#rotation_pivot").style("visibility","visible");
}

function rotation_hide() {
	d3.select("#rotation_outer_circ").style("visibility","hidden");
	d3.select("#rotation_inner_circ").style("visibility","hidden");
	d3.select("#rotation_pivot").style("visibility","hidden");
}




