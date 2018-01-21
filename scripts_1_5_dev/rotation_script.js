

function rotation_update() {
	
	rotation_show();
	
	if (d3.selectAll(".selected")[0].length == 0) {
		deselect_all();
	}

	d3.select("#rotation_pivot").style("opacity",1)
	all_xs = [];
	var all_ys = []; 
	d3.selectAll(".selected").each(function(d) { 
		all_xs.push(d.x);
		all_ys.push(d.y);
	});
	var cx = d3.sum(all_xs) / all_xs.length;
	var cy = d3.sum(all_ys) / all_ys.length;
	
	var minx = Math.min(...all_xs);
	var maxx = Math.max(...all_xs);
	var miny = Math.min(...all_ys);
	var maxy = Math.max(...all_ys);
	
	var dels = [];
	for (i=0; i<all_xs.length; i++) {
		dels.push(Math.sqrt(Math.pow(all_xs[i] - cx,2)+Math.pow(all_ys[i] - cy,2)));
	}
	rotator_radius = d3.max(dels);
	console.log([cx,cy])
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
		d3.selectAll(".selected").each(function(d) {
			d.beingDragged = true;
		});
		node.filter(function(p) { return p.beingDragged; })
		.each(function(p) { p.fixed |= 2; })
	}
	
	function handle_dragged() {
		var cx = parseFloat(d3.select("#rotation_pivot").style("cx").split("px")[0])
		var cy = parseFloat(d3.select("#rotation_pivot").style("cy").split("px")[0])
		var r1 = Math.atan((d3.event.y-cy)/(d3.event.x-cx));
		var r2 = Math.atan((d3.event.y+d3.event.dy-cy)/(d3.event.x+d3.event.dx-cx));
		var rot = r1-r2;
		if (r1-r2 > 1.4) { rot += 3.141592653; }
		d3.select("#rotation_outer_circ").style("opacity",.5);
		
		if (Math.abs(rot) < 1) {
			node.filter(function(d) { return d.beingDragged; })
			.each(function(d) { 
			
				var dx = d.x - cx, dy = d.y - cy;
				var brad = Math.sqrt(dx*dx+dy*dy)
				var ddx = Math.cos(rot)*dx + Math.sin(rot)*dy;
				var ddy = -Math.sin(rot)*dx + Math.cos(rot)*dy;
				var arad = Math.sqrt(ddx*ddx+ddy*ddy)
				if (brad > arad+1) { console.log([arad-brad,dx,dx,ddx,ddy,rot]); }
				d.x = cx + ddx;
				d.y = cy + ddy;
				d.px = cx + ddx;
				d.py = cy + ddy;
			})
		}

		force.resume();
	}
	
	function handle_dragended() {
		d3.select("#rotation_outer_circ").style("opacity",0);
		node.each(function(d) {
			node.filter(function(d) { return d.beingDragged; })
			.each(function(d) { d.fixed &= ~6; })
			d.beingDragged = false;
		});
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




