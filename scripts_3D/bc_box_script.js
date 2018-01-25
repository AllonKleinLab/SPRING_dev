function bc_box_setup(project_directory) {

	d3.json(project_directory+"/bc_list.json", function(data) { 
		bc_data = data;
		d3.selectAll("circle").on("click",function(d) {
			var lines = bc_data[d.name];
			if (lines.length > -1) {
				make_bc_box(d3.event.pageX,d3.event.pageY,lines);
			}
		});
		
	});
	
	
}

function nodeClick(d) {
	console.log(d);
}

function make_bc_box(left,top,line_list) {
	var myHeight = 19.2*line_list.length+5;
	var bc_box = d3.select('body').append('div')
		.attr('class','bc_box')
		.style('top',(top-myHeight-10).toString()+"px")
		.style("left",(left-97).toString()+"px")
		.style('height',myHeight.toString()+'px')
		.style('width','195px')
		.style("padding-left","10px")
		.style("padding-top","4px")
		.style('position','absolute')
		.style('background','rgba(80,80,80,.6)')
		.call(d3.behavior.drag()
			.on("dragstart", bc_box_dragstarted)
			.on("drag", bc_box_dragged)
			.on("dragend", bc_box_dragended));
			
	line_list.forEach(function(l) { 
		bc_box.append("tspan").append("div").append("text")
			.style("font-family", "Courier New")
			.style("font-size", "14px")
			.style("color", "white")
			.text(l);
	});
			
	
	var exoutBcBoxButtonLabel = bc_box.append("text")
		.style("position","absolute")
		.style("right","10px")
		.style("top","7px")
		.style("font-family", "sans-serif")
		.style("font-size", "14px")
		.style("color", "white")
		.text("X")
		.attr("pointer-events","none");


	var exoutBcBoxButton = bc_box.append("div")
		.style("position","absolute")
		.style("right","0px")
		.style("top","0px")
		.style("width","27px")
		.style("height","27px")
		.on("click", function() {
			removeBcBox()
		});

		
	function bc_box_dragstarted() {
		d3.event.sourceEvent.stopPropagation();
	}

	function bc_box_dragged() {
		var cx = parseFloat(bc_box.style("left").split("px")[0])
		var cy = parseFloat(bc_box.style("top").split("px")[0])
		bc_box.style("left",(cx + d3.event.dx).toString()+"px");
		bc_box.style("top",(cy + d3.event.dy).toString()+"px");
	}
	function bc_box_dragended() { }

	function removeBcBox() {
		bc_box.remove();
	}


}


/*

	d3.select("#create_cluster_box")
		.call(d3.behavior.drag()
			.on("dragstart", cluster_box_dragstarted)
			.on("drag", cluster_box_dragged)
			.on("dragend", cluster_box_dragended));


	
	#create_cluster_box {
	position: absolute;
	visibility: hidden;	
	background: rgba(80,80,80,.5);
	height: 52px;
	overflow: hidden;
	}


*/