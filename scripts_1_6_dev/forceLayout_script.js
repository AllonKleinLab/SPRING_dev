function forceLayout(project_directory, sub_directory, callback) {
	d3.select('#toggleforce').select('button').on("click",toggleForce);

	if (d3.select("#sound_toggle").select("img").attr("src") == "scripts_1_6_dev/sound_effects/icon_speaker.svg") {
		var snd = new Audio("scripts_1_6_dev/sound_effects/opennew_sound.wav"); snd.play(); }

	graphData_filename = project_directory + '/' + sub_directory + "/graph_data.json";
    coordinates_filename = graph_directory + '/' + sub_directory + '/coordinates.txt';
    
	d3.text(project_directory + '/' + sub_directory + '/mutability.txt', function(text) {
		mutable = text;
		if (mutable == null) {mutable = 'true'; }
	});


	width = window.innerWidth-15;
	height = window.innerHeight-70;
	var shiftKey, ctrlKey; keyCode = 0;
	being_dragged = false;

	var nodeGraph = null;
	xScale = d3.scale.linear()
	.domain([0,width]).range([0,width]);
	yScale = d3.scale.linear()
	.domain([0,height]).range([0, height]);

	svg = d3.select("#force_layout")
	.attr("tabindex", 1)
	.each(function() { this.focus(); })
	.append("svg")
	.attr("id","force_svg")
	.attr("width", width)
	.attr("height", height)
	.style('background','rgba(0,0,0,0)')
	.style('position','absolute')
	.style('top','0px');


	zoomer = d3.behavior.zoom().
		scaleExtent([0.02,10]).
		x(xScale).
		y(yScale).
		on("zoom", redraw);

	/////////////////////////////////////////////////////////////////////


 	svg_graph = svg.append('svg:g')
 	.attr("id","svg_graph")
	.call(zoomer)


	var rect = svg_graph.append('svg:rect')
	.attr('width', width)
	.attr('height', height)
	.attr('fill', 'transparent')
	.attr('stroke', 'transparent')
	.attr('stroke-width', 1)
	.attr("id", "zrect")


	///////////////////////
	var svg_width = parseInt(d3.select("svg").attr("width"));

	var more_settings_rect = d3.select("svg").append("rect")
	.attr("class","other_frills")
	.attr('id','show_edges_rect')
	.attr("x", svg_width-177).attr("y", 104)
	.attr("fill","black")
	.attr("fill-opacity",.25)
	.attr("width", 200).attr("height", 46);

	d3.select("svg")	
	.append("text").attr("pointer-events","none")
	.attr("class","other_frills").attr('id','edge_text')
	.attr("y", 122).attr("font-family", "sans-serif")
	.attr("font-size", "12px").attr("fill", "white")
	.append("tspan").attr('id','hide_edges_tspan').attr("x",svg_width-167).attr("dy",0).text("Hide edges")
	.append("tspan").attr('id','hide_edges_sub_tspan').attr("x",svg_width-167).attr("dy",17).text("(runs faster)");

	var imgs = d3.select("svg").selectAll("img").data([0]);
	var edge_toggle_image = imgs.enter().append("svg:image")
		.attr('id','edge_toggle_image')
		.attr("xlink:href", "stuff/check-mark.svg")
		.attr("x", svg_width-70)
		.attr("y", 115)
		.attr("width", 25)
		.attr("height", 25)
		.attr("class","other_frills");

	
	edge_toggle_image.on("click",function() {
		if (edge_toggle_image.attr("xlink:href") == "stuff/check-mark.svg") {
			edge_toggle_image.attr("xlink:href","stuff/ex-mark.svg");
			edge_container.visible = false;
			d3.select('#edge_text').selectAll('tspan').remove()
			d3.select('#edge_text')
				.append("tspan").attr('id','hide_edges_tspan').attr("x",svg_width-167).attr("dy",0).text("Show edges")
				.append("tspan").attr('id','hide_edges_sub_tspan').attr("x",svg_width-167).attr("dy",17).text("(runs slower)");

		} 
		else {
			edge_toggle_image.attr("xlink:href","stuff/check-mark.svg");
			edge_container.visible = true;
			d3.select('#edge_text').selectAll('tspan').remove()
			d3.select('#edge_text')
				.append("tspan").attr('id','hide_edges_tspan').attr("x",svg_width-167).attr("dy",0).text("Hide edges")
				.append("tspan").attr('id','hide_edges_sub_tspan').attr("x",svg_width-167).attr("dy",17).text("(runs faster)");

		}
	});


	// Read coordinates file if it exists
	coordinates = []
	d3.text(coordinates_filename, function(text) {
		text.split('\n').forEach(function(entry,index,array) {
			items = entry.split(',')
			if (items.length > 1) {
				xx = parseFloat($.trim(items[1]));
				yy = parseFloat($.trim(items[2]));
				nn = parseInt($.trim(items[0]));
				coordinates.push([xx,yy])
			}
		});

		app = new PIXI.Application(width,height, {backgroundColor: '0xdcdcdc'});
		//app = new PIXI.Application(width,height, {backgroundColor: '0xb0b0b0'});
		document.getElementById('pixi_canvas_holder').appendChild(app.view);

		sprites = new PIXI.Container(coordinates.length, {
			scale: true,
			position: true,
			rotation: true,
			uvs: true,
			alpha: true
		});


		// create an array to store all the sprites
		all_nodes = [];
		all_outlines = [];
		var totalSprites = app.renderer instanceof PIXI.WebGLRenderer ? coordinates.length : 100;
		base_colors = [];
		for (var i = 0; i < totalSprites; i++) {
			var dude = PIXI.Sprite.fromImage('stuff/disc.png');
			//var dude = PIXI.Sprite.fromImage('stuff/frog_sprite.png')
			//var dude = PIXI.Sprite.fromImage('stuff/tinyMaggot2.png')
			//var dude = PIXI.Sprite.fromImage('stuff/mark.png')
			dude.anchor.set(.5);
			dude.scale.set(.5);
			dude.x = coordinates[i][0];
			dude.y = coordinates[i][1];
			dude.tint = rgbToHex(0, 0, 0);
			dude.alpha=1
			dude.interactive = true;
			dude.index = i;
			dude.bump = 0;
			dude.beingDragged = false;
			sprites.addChild(dude);
			all_nodes.push(dude);
			base_colors.push({r:0,g:0,b:0});

			outline = PIXI.Sprite.fromImage('stuff/annulus.png');
			outline.anchor.set(.5);
			outline.scale.set(0.5);
			outline.x = coordinates[i][0];
			outline.y = coordinates[i][1];
			outline.tint = '0xffff00';
			outline.index = i;
			outline.bump = .0001
			outline.alpha = 0;
			outline.selected = false;
			outline.compared = false;
			sprites.addChild(outline);
			all_outlines.push(outline);
		}

		svg_graph
			.call(d3.behavior.drag()
			.on("dragstart", dragstarted)
			.on("drag", dragged)
			.on("dragend", dragended));
		
		
		loadColors();	
		load_edges();
		center_view();
		d3.select("#force_svg").append('g').attr('id','vis')
			
        
	});

	function load_edges() {
		d3.text(project_directory+'/'+sub_directory+'/edges.csv', function(text) {
			
			edge_container = new PIXI.ParticleContainer(all_nodes.length * 20, {scale: true, position: true, rotation: true, uvs: true, alpha: true});
			edge_container.position = sprites.position;
			edge_container.scale = sprites.scale;
			edge_container.alpha=0.5

			app.stage.addChild(edge_container);
			app.stage.addChild(sprites);

			all_edges = [];
			all_edge_ends = []
			text.split('\n').forEach(function(entry,index) {
				if (entry.length > 0) {
					items = entry.split(';')
					var source = parseInt(items[0]);
					var target = parseInt(items[1]);
					var x1 = all_nodes[source].x;
					var y1 = all_nodes[source].y;
					var x2 = all_nodes[target].x;
					var y2 = all_nodes[target].y;
					
					
					var color = 6579301;			
					var s = new LineSprite(4, color, x1, y1, x2, y2);
					s.color = color;
					edge_container.addChild(s);
					all_edges.push(s);
					all_edge_ends.push({source:source, target:target});
				}
			});
			
			callback();
		});
	}

	function dragstarted() {
		if ( selection_mode == 'drag_pan_zoom') {
			var dim = document.getElementById('svg_graph').getBoundingClientRect();
			var x = d3.event.sourceEvent.clientX - dim.left;
			var y = d3.event.sourceEvent.clientY - dim.top;
			x = (x - sprites.position.x) / sprites.scale.x;
			y = (y - sprites.position.y) / sprites.scale.y;
			var clicked_node = -1
			for (i=0; i<all_nodes.length; i++) {
				rad = Math.sqrt((all_nodes[i].x-x)**2 + (all_nodes[i].y-y)**2);
				if (rad < all_nodes[i].scale.x * 20 ) {
					clicked_node = i;
					i = all_nodes.length;
				}
			}
			if (clicked_node != -1) {
				if (all_outlines[clicked_node].selected) {
					being_dragged = true;
					for (i=0; i<all_nodes.length; i++) {
						if (all_outlines[i].selected) {
							all_nodes[i].beingDragged = true;
						}
					}
				}
			}
		}
	}


	function dragged() {
		for (i=0; i<all_nodes.length; i++) {
			if (all_nodes[i].beingDragged) {
				all_nodes[i].x += d3.event.dx / sprites.scale.x ;
				all_nodes[i].y += d3.event.dy / sprites.scale.y ;
				all_outlines[i].x += d3.event.dx / sprites.scale.x ;
				all_outlines[i].y += d3.event.dy / sprites.scale.y ;
			}
		}
		for (i=0; i<all_edges.length; i++) {
			if (all_nodes[all_edge_ends[i].source].beingDragged || all_nodes[all_edge_ends[i].target].beingDragged) {
				//console.log([all_nodes[all_edge_ends[i].source].beingDragged, all_nodes[all_edge_ends[i].target].beingDragged]);
				//console.log([all_nodes[all_edge_ends[i].source].x - all_edges[i].x1, all_nodes[all_edge_ends[i].target].x - all_edges[i].x2]);
				//console.log([all_edges[i].x1,all_edges[i].x2]);
				all_edges[i].x1 = all_nodes[all_edge_ends[i].source].x;
				all_edges[i].y1 = all_nodes[all_edge_ends[i].source].y;
				all_edges[i].x2 = all_nodes[all_edge_ends[i].target].x;
				all_edges[i].y2 = all_nodes[all_edge_ends[i].target].y;
				all_edges[i].updatePosition();
			}
		}

	}

	function dragended() {
		being_dragged = false;
		for (i=0; i<all_nodes.length; i++) {
			all_nodes[i].beingDragged = false;
		}
	}
}


function animation() {
	console.log('ANIM');
	// check if animation exists. if so, hide sprites and load it
	
	$.get(graph_directory + '/' + sub_directory+'/animation.txt')
		.done(function(data) { 
			animation_frames = [];
			data.split('\n').forEach(function(line) {
				if (line.length>0) {
					var aframe = [];
					var xx = line.split(';')[0].split(',');
					var yy = line.split(';')[1].split(',');
					for (i in xx) { aframe.push([parseFloat(xx[i]),parseFloat(yy[i])]); }
					animation_frames.push(aframe);					
				}
			});
			
			sprites.visible = true;
			var current_frame = -1;
			
			coordinates = animation_frames[animation_frames.length-1];
			for (i=0; i<all_nodes.length; i++) {
				all_nodes[i].x = coordinates[i][0];
				all_nodes[i].y = coordinates[i][1];
			}
			
			
			function next_frame() {
				current_frame += 1;
				coordinates = animation_frames[current_frame];
				
				for (i=0; i<all_nodes.length; i++) {
					all_nodes[i].x = coordinates[i][0];
					all_nodes[i].y = coordinates[i][1];
					all_outlines[i].x = coordinates[i][0];
					all_outlines[i].y =  coordinates[i][1];
				}
				
// 				for (i=0; i<all_edges.length; i++) {
// 					all_edges[i].x1 = all_nodes[all_edge_ends[i].source].x;
// 					all_edges[i].y1 = all_nodes[all_edge_ends[i].source].y;
// 					all_edges[i].x2 = all_nodes[all_edge_ends[i].target].x;
// 					all_edges[i].y2 = all_nodes[all_edge_ends[i].target].y;
// 					all_edges[i].updatePosition();
// 				}
				
				if (current_frame+1 < animation_frames.length) {
					setTimeout(next_frame,1);
				} else {
					edge_container.visible = true;
				}
				
			}
			next_frame();
			
				
		}).fail(function() { 
			sprites.visible = true;
			edge_container.visible = true;
			center_view();

		})
}


function UrlExists(url) {
	$.get(url)
		.done(function() { 
			console.log('yes');
		}).fail(function() { 
			console.log('no');
		})
}


function toggleForce() {
	if (force_on == 1) {
		console.log('turning force off');
		d3.select('#toggleforce').select('button').text('Resume');
		force_on = 0;
		force.stop();
	}
	else {
		console.log('turning force on');
		d3.select('#toggleforce').select('button').text('Pause');
		force_on = 1;
		force.resume();
	}
}

function loadColors() {
	d3.select('#load_colors').remove();
    var base_dir=graph_directory;
    var sub_dir=graph_directory + '/' + sub_directory;
    console.log(base_dir);
    console.log(sub_dir);
    $.ajax({
        url:"cgi-bin/load_counts.py",
        type:"POST",
        data:{base_dir:base_dir},
        success: function(python_data){
            console.log('Got the data');
            //console.log(python_data);
            //colorBar(sub_dir, python_data);
            colorBar(sub_dir, python_data);
        },
    });
}


function makeTextFile(text) {
	var textFile = ''
	var data = new Blob([text], {type: 'text/plain'});

	// If we are replacing a previously generated file we need to
	// manually revoke the object URL to avoid memory leaks.
	window.URL.revokeObjectURL(textFile);

	textFile = window.URL.createObjectURL(data);
	return textFile;
}


function downloadFile(text,name) {
	if (d3.select("#sound_toggle").select("img").attr("src") == "scripts_1_6_dev/sound_effects/icon_speaker.svg") {
		var snd = new Audio("scripts_1_6_dev/sound_effects/download_sound.wav"); snd.play(); }
	var hiddenElement = document.createElement('a');
	hiddenElement.href = 'data:attachment/text,' + encodeURI(text);
	hiddenElement.target = '_blank';
	hiddenElement.download = name;
	hiddenElement.click();
}

function hideAccessories() {
	d3.selectAll(".other_frills").style("visibility","hidden");
	d3.selectAll(".selection_option").style("visibility","hidden");
	d3.selectAll(".colorbar_item").style("visibility","hidden");
	d3.select("svg").style("background-color","white");
}

function showAccessories() {
	d3.selectAll(".other_frills").style("visibility","visible");
	d3.selectAll(".selection_option").style("visibility","visible");
	d3.selectAll(".colorbar_item").style("visibility","visible");
	d3.select("svg").style("background-color","#D6D6D6");
}

function downloadSelection() {
	var cell_filter_filename = window.location.search.slice(1,name.length) + "/cell_filter.txt";
	d3.text(cell_filter_filename, function(text) {
		var cell_nums = text.split('\n');
		var text = ""
		for (i=0; i<all_nodes.length; i++) {
			if (all_outlines[i].selected) {
				text = text + i.toString() + ',' + cell_nums[i] + "\n";
			}
		}
		downloadFile(text,"selected_cells.txt")
	});
}

function downloadCoordinates() {
	var text = ""
	for (i=0; i<all_nodes.length; i++) {
		text += (i).toString() + ',' + (all_nodes[i].x).toString() + ',' + (all_nodes[i].y).toString() + '\n';
	}
	downloadFile(text,"coordinates.txt")
}


function initiateButtons() {

	d3.select("#help").on("click", function() {
		var win = window.open("helppage.html", '_blank');
		win.focus();
	});

	d3.select("#center_view").on("click", function() {
		center_view();
	});


	d3.select('#save_coords').select('button').on("click",function() {
		if (mutable.slice(0,5) != 'false') {
			var text = ""
			d3.select(".node").selectAll("circle").each(function(d) {
				text = text + d.number + "," + d.x.toString() + "," + d.y.toString() + "\n";
			});
			var name = window.location.search;
			path = "coordinates/"+name.slice(9,name.length).split('/')[1] + "_coordinates." + sub_directory + ".txt";
			$.ajax({
			  url: "cgi-bin/save_data.py",
			  type: "POST",
			  data: {path:path, content:text},
			});
		}
	});
	
	d3.select('#download_png')
		.on('click',download_png)
		.on('mouseenter',function() {
			d3.select('#container').append('div')
				.attr('id','screenshot_tooltip')
				.style('position','absolute')
				.style('padding-top','8px')
				.style('padding-bottom','8px')
				.style('padding-left','10px')
				.style('padding-right','10px')
				.style('width','150px')
				.style('left',(parseInt(d3.select('#download_dropdown').style('left').split('px')[0])-8).toString()+'px')
				.style('top',d3.select('#download_dropdown').style('height'))
				.style('background-color','rgba(0,0,0,.4)')
				.append('p').text('Zoom in on plot for higher resolution download')
				.style('margin','0px').style('color','white')
				.style('font-family','sans-serif').style('font-size','13px');
		})
		.on('mouseleave',function() {
			d3.select('#screenshot_tooltip').remove();
		});
}


function download_png() {
	var path = window.location.search.split('/');
	path = path[path.length-2] + '_' + path[path.length-1] + '.png';
	download_sprite_as_png(app.renderer, app.stage, path) 
}

function download_sprite_as_png(renderer, sprite, fileName) {
	renderer.extract.canvas(sprite).toBlob(function(b){
		var a = document.createElement('a');
		document.body.append(a);
		a.download = fileName;
		a.href = URL.createObjectURL(b);
		a.click();
		a.remove();
	}, 'image/png');
}

function showGotoDropdown() {
	if (d3.select("#goto_dropdown").style("height") == 'auto') {
		closeDropdown();
		collapse_settings();
		setTimeout(function() {
			document.getElementById("goto_dropdown").classList.toggle("show");
		}, 10);
	}
}

function showToolsDropdown() {
	if (d3.select("#tools_dropdown").style("height") == 'auto') {
		closeDropdown();
		collapse_settings();
		setTimeout(function() {
			document.getElementById("tools_dropdown").classList.toggle("show");
		}, 10);
	}
}



function showDownloadDropdown() {
	if (d3.select("#download_dropdown").style("height") == 'auto') {
		closeDropdown();
		collapse_settings();
		setTimeout(function() {
			document.getElementById("download_dropdown").classList.toggle("show");
		}, 10);
	}
}

function showLayoutDropdown() {
	if (d3.select("#layout_dropdown").style("height") == 'auto') {
		closeDropdown();
		collapse_settings();
		setTimeout(function() {
			document.getElementById("layout_dropdown").classList.toggle("show");
		}, 10);
	}
}

function closeDropdown() {
	var dropdowns = document.getElementsByClassName("dropdown-content");
		var i;
		for (i = 0; i < dropdowns.length; i++) {
			var openDropdown = dropdowns[i];
			if (openDropdown.classList.contains('show')) {
				openDropdown.classList.remove('show');
			}
		}
}

function setup_download_dropdown() {
	//d3.select("#download_dropdown_button").on("mouseenter",showDownloadDropdown);
	d3.select("#download_dropdown_button").on("click",showDownloadDropdown);
}



function setup_goto_dropdown() {
	d3.select("#goto_dropdown_button").on("click",showGotoDropdown);
}

function setup_tools_dropdown() {
	d3.select("#tools_dropdown_button").on("click",showToolsDropdown);
}


function setup_layout_dropdown() {
	//d3.select("#layout_dropdown_button").on("mouseover",showLayoutDropdown);
	d3.select("#layout_dropdown_button").on("click",showLayoutDropdown);
}


function fix() {
	if (d3.selectAll(".selected")[0].length == 0) {
		d3.selectAll(".node circle").each(function(d) { d.fixed = true; });
	}
	d3.selectAll(".selected").each(function(d) { d.fixed = true; });
}

function unfix() {
	d3.selectAll(".selected").each(function(d) { d.fixed = false; });
	if (d3.selectAll(".selected")[0].length == 0) {
		d3.selectAll(".node circle").each(function(d) { d.fixed = false; });
	}
}

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return "0x" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function redraw() {
	if (! being_dragged) {

		var dim = document.getElementById('svg_graph').getBoundingClientRect();
		var x = d3.event.sourceEvent.clientX;
		var y = d3.event.sourceEvent.clientY;
		x = (x - sprites.position.x) / sprites.scale.x;
		y = (y - sprites.position.y) / sprites.scale.y;

		var extraX = x * (d3.event.scale - sprites.scale.x);
		var extraY = y * (d3.event.scale - sprites.scale.y);
		sprites.position.x += d3.event.sourceEvent.movementX - extraX;
		sprites.position.y += d3.event.sourceEvent.movementY - extraY;

		sprites.scale.x = d3.event.scale;
		sprites.scale.y = d3.event.scale;
		edge_container.position = sprites.position;
		edge_container.scale = sprites.scale;
		clone_edge_container.position = sprites.position;
		clone_edge_container.scale = sprites.scale;
		clone_sprites.position = sprites.position;
		clone_sprites.scale = sprites.scale;
		
		
	}
}

function get_center_view_transform() {

	var all_xs = [];
	var all_ys = [];
	var num_selected = 0
	for (i=0; i<all_nodes.length; i++) {
		if (all_outlines[i].selected) {
			num_selected += 1;
		}	
	}
	for (i=0; i<all_nodes.length; i++) {
		if (all_outlines[i].selected || num_selected==0) {
			all_xs.push(all_nodes[i].x);
			all_ys.push(all_nodes[i].y);
		}
	}

	var minx = Math.min(...all_xs);
	var maxx = Math.max(...all_xs);
	var miny = Math.min(...all_ys);
	var maxy = Math.max(...all_ys);

	var dx = maxx - minx + 50,
		dy = maxy - miny + 50,
		x = (maxx + minx) / 2,
		y = (maxy + miny) / 2;

	var scale = .85 / Math.max(dx / width, dy / height);
	var new_x = width/2-(maxx+minx)/2 * scale;
	var new_y = height/2+30-(maxy+miny)/2 * scale;
	return {'scale':scale, 'new_x':new_x, 'new_y' :new_y};

}

function center_view_instant() {
	var c = get_center_view_transform();
	sprites.position.x = c.new_x;
	sprites.position.y = c.new_y;
	sprites.scale.x = c.scale;
	sprites.scale.y = c.scale;
	edge_container.position = sprites.position;
	edge_container.scale = sprites.scale;
	if (typeof clone_edge_container !== 'undefined') { clone_edge_container.position = sprites.position; }
	if (typeof clone_edge_container !== 'undefined') { clone_edge_container.scale = sprites.scale; }
	if (typeof clone_sprites !== 'undefined') { clone_sprites.position = sprites.position; }
	if (typeof clone_sprites !== 'undefined') { clone_sprites.scale = sprites.scale; }
	zoomer.scale(sprites.scale.x);
}


function center_view() {
	var c = get_center_view_transform();
	var N_STEPS = 10;
	var delta_x = (c.new_x - sprites.position.x) / N_STEPS;
	var delta_y = (c.new_y - sprites.position.y) / N_STEPS;
	var delta_scale = (c.scale - sprites.scale.x) / N_STEPS;

	var step = 0;
	(function move() {
		if (step < N_STEPS) {
			sprites.position.x += delta_x;
			sprites.position.y += delta_y;
			sprites.scale.x += delta_scale;
			sprites.scale.y += delta_scale;
			edge_container.position = sprites.position;
			edge_container.scale = sprites.scale;
			clone_edge_container.position = sprites.position;
			clone_edge_container.scale = sprites.scale;
			clone_sprites.position = sprites.position;
			clone_sprites.scale = sprites.scale;			
			
			zoomer.scale(sprites.scale.x);
			step += 1;
			setTimeout(move,2);
		}
	})();
}

function save_coords() {
	if (mutable.slice(0,5) != 'false') {
		var text = ""
		for (i in coordinates) {
			text = text + [i.toString(),all_nodes[i].x.toString(),all_nodes[i].y.toString()].join(',') + '\n';
		}
		var name = window.location.search;
		console.log(text);
		path = name.slice(1,name.length) + "/coordinates.txt";
		$.ajax({
		  url: "cgi-bin/save_data.py",
		  type: "POST",
		  data: {path:path, content:text},
		});
	}
}


