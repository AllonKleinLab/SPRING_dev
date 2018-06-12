function forceLayout(project_directory, sub_directory, callback) {
	d3.select('#toggleforce').select('button').on("click",toggleForce);
	//d3.select('#load_colors').select('button').on("click",loadColors);

	if (d3.select("#sound_toggle").select("img").attr("src") == "scripts_1_5_dev/sound_effects/icon_speaker.svg") {
		var snd = new Audio("scripts_1_5_dev/sound_effects/opennew_sound.wav"); snd.play(); }
	
	graphData_filename = project_directory + '/' + sub_directory + "/graph_data.json";
	//coordinates_filename = 'cgi-bin/coordinates/'+project_directory.split('/')[2] + "_coordinates.txt";  
	//coordinates_filename = 'cgi-bin/coordinates/'+project_directory.split('/')[2] + "_coordinates." + sub_directory + ".txt";  
	coordinates_filename =  project_directory + '/' + sub_directory + "/coordinates.txt";

	d3.text(project_directory + "/" + sub_directory + '/mutability.txt', function(text) { 
		mutable = text; 
		if (mutable == null) {mutable = 'true'; }
	});
	
	

	width = window.innerWidth-15;
	height = window.innerHeight-70;
	var shiftKey, ctrlKey; keyCode = 0;
	
	var nodeGraph = null;
	xScale = d3.scale.linear()
	.domain([0,width]).range([0,width]);
	yScale = d3.scale.linear()
	.domain([0,height]).range([0, height]);
	
	// Read coordinates file if it exists
	coordinates = {}
	d3.text(coordinates_filename, function(text) {
		text.split('\n').forEach(function(entry,index,array) {
			items = entry.split(',')
			if (items.length > 0) {
				xx = parseFloat($.trim(items[1]));
				yy = parseFloat($.trim(items[2]));
				nn = parseInt($.trim(items[0]));
				coordinates[nn] = [xx,yy]
			}
		});
	});
	
	svg = d3.select("#force_layout")
	.attr("tabindex", 1)	
	.each(function() { this.focus(); })
	.append("svg")
	.attr("id","force_svg")
	.style("background","rgb(220,220,220)")
	.attr("width", width)
	.attr("height", height)	
		
	zoomer = d3.behavior.zoom().
		scaleExtent([0.02,10]).
		x(xScale).
		y(yScale).
		on("zoom", redraw);

	function redraw() {
		vis.attr("transform","translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
		d3.select("#rotation_inner_circ")
			.style("stroke-width",function() { return 6/zoomer.scale(); });
		d3.select("#rotation_outer_circ")
			.attr("r",rotator_radius+30+12 / zoomer.scale())
			.style("stroke-width", 18/zoomer.scale());
		d3.select("#rotation_pivot")
			.attr("r",d3.min([13/zoomer.scale(),(rotator_radius+30)/3]))
			.style("stroke-width",d3.min([3/zoomer.scale(),10]))
	}
	
	
	
		
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


	callback();
	
	vis = svg_graph.append("svg:g")
	.attr('id', 'vis');

	link = vis.append("g")
	.attr("class", "link")
	.style("stroke","rgb(100,100,100)")
	.selectAll("line");
	
	
	node = vis.append("g")
	.attr("class", "node")
	.selectAll("circle");
	
	

	var svg_width = parseInt(d3.select("svg").attr("width"));

	var more_settings_rect = d3.select("svg").append("rect")
	.attr("class","other_frills")
	.attr('id','show_edges_rect')
	.attr("x", svg_width-170).attr("y", 104)
	.attr("fill","black")
	.attr("fill-opacity",.25)
	.attr("width", 200).attr("height", 46);
		
	d3.select("svg")	
	.append("text").attr("pointer-events","none")
	.attr("class","other_frills").attr('id','edge_text')
	.attr("y", 122).attr("font-family", "sans-serif")
	.attr("font-size", "12px").attr("fill", "white")
	.append("tspan").attr('id','hide_edges_tspan').attr("x",svg_width-160).attr("dy",0).text("Hide edges")
	.append("tspan").attr('id','hide_edges_sub_tspan').attr("x",svg_width-160).attr("dy",17).text("(runs faster)");
	
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
			d3.selectAll(".link").style("visibility","hidden");
			d3.select('#edge_text').selectAll('tspan').remove()
			d3.select('#edge_text')
				.append("tspan").attr('id','hide_edges_tspan').attr("x",svg_width-160).attr("dy",0).text("Show edges")
				.append("tspan").attr('id','hide_edges_sub_tspan').attr("x",svg_width-160).attr("dy",17).text("(runs slower)");

		} 
		else {
			edge_toggle_image.attr("xlink:href","stuff/check-mark.svg");
			d3.selectAll(".link").style("visibility","visible");
			d3.select('#edge_text').selectAll('tspan').remove()
			d3.select('#edge_text')
				.append("tspan").attr('id','hide_edges_tspan').attr("x",svg_width-160).attr("dy",0).text("Hide edges")
				.append("tspan").attr('id','hide_edges_sub_tspan').attr("x",svg_width-160).attr("dy",17).text("(runs faster)");

		}
	});
	

	
	d3.json(graphData_filename, function(error, graph) {

		nodeGraph = graph;
		
		node_dict = {};
		num_coords = 0;
		graph.nodes.forEach(function(d) { 
			n_nodes = n_nodes + 1;
			node_dict[d.number] = d; 
			if (d.number in coordinates) {
				num_coords = num_coords + 1;
				d.x = coordinates[d.number][0];
				d.y = coordinates[d.number][1];
			}
		});
		
		console.log(n_nodes);
        loadColors();

		graph.links.forEach(function(d) {
			d.source = node_dict[d.source];
			d.target = node_dict[d.target];			
		});

		link = link.data(graph.links).enter().append("line")
		.attr("x1", function(d) { return d.source.x; })
		.attr("y1", function(d) { return d.source.y; })
		.attr("x2", function(d) { return d.target.x; })
		.attr("y2", function(d) { return d.target.y; });
		
		force = d3.layout.force()
		.charge(-5)
		.linkDistance(4)
		.friction(0.95)
		.linkStrength(2.)
		.gravity(.05)
		.nodes(graph.nodes)
		.links(graph.links)
		.size([width, height])
		.start();
		
		if (num_coords == graph.nodes.length) {
			console.log('force stopped - coords supplied');
			toggleForce();
		}
		
		function dragstarted(d) {
			d3.event.sourceEvent.stopPropagation();
			d.beingDragged = true
			if (d.selected == true) {
				d3.selectAll(".selected").each(function(d) {
					d.beingDragged = true;
				});
			}
			node.filter(function(p) { return p.beingDragged; })
			.each(function(p) { p.fixed |= 2; })
		}


		function dragged(d) {
			node.filter(function(d) { return d.beingDragged; })
			.each(function(d) { 
				d.x += d3.event.dx;
				d.y += d3.event.dy;

				d.px += d3.event.dx;
				d.py += d3.event.dy;
			})

			if (force_on == 1) {force.resume();}
			tick();
		}
		
		function dragended(d) {
			node.each(function(d) {
				node.filter(function(d) { return d.beingDragged; })
				.each(function(d) { d.fixed &= ~6; })
				d.beingDragged = false;
			});
		}
		
		node = node.data(graph.nodes).enter().append("circle")
		.attr("r", 5)
		.style("opacity",0.8)
		.attr("cx", function(d) { return d.x; })
		.attr("cy", function(d) { return d.y; })
		.each(function(d) {d.beingDragged = false; })
		.on("dblclick", function(d) { d3.event.stopPropagation(); })
		.call(d3.behavior.drag()
			.on("dragstart", dragstarted)
			.on("drag", dragged)
			.on("dragend", dragended));

		function tick() {		
			link.attr("x1", function(d) { return d.source.x; })
				.attr("y1", function(d) { return d.source.y; })
				.attr("x2", function(d) { return d.target.x; })
				.attr("y2", function(d) { return d.target.y; });

			node.attr('cx', function(d) { return d.x; })
				.attr('cy', function(d) { return d.y; });
		};
		
		force.on("tick", tick);
		center_view();
	});
}

function UrlExists(url) {
	var http = new XMLHttpRequest();
	http.open('HEAD', url, false);
	http.send();
	return http.status!=404;
}

function toggleForce() {
	if (force_on == 1) {
		console.log('turning force off');
		d3.select('#toggleforce').select('button').text('Resume dynamics');
		force_on = 0;
		force.stop();
	}
	else {
		console.log('turning force on');
		d3.select('#toggleforce').select('button').text('Pause dynamics');
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
        data:{base_dir:base_dir, sub_dir:sub_dir},
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
	if (d3.select("#sound_toggle").select("img").attr("src") == "scripts_1_5_dev/sound_effects/icon_speaker.svg") {
		var snd = new Audio("scripts_1_5_dev/sound_effects/download_sound.wav"); snd.play(); }
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
	var text = ""
	d3.select(".node").selectAll("circle").each(function(d) {
		if (d.selected) {
			text = text + d.name + "\n";
		}
	});
	downloadFile(text,"selected_cells.txt")
}

function downloadCoordinates() {	
	var text = ""
	d3.select(".node").selectAll("circle")
		.sort(function(a,b) { return a.number - b.number; })
		.each(function(d) { text = text + d.name + "," + d.x.toString() + "," + d.y.toString() + "\n"; });
	downloadFile(text,"coordinates.txt")
}

function downloadEdges() {	
	var text = ""
	d3.select(".link").selectAll("line")
		.each(function(d) { text = text + d.source.name + "," + d.target.name + "\n"; });
	downloadFile(text,"edge_list.txt")
}


function initiateButtons() {
	
	d3.select("#help").on("click", function() {
		var win = window.open("helppage.html", '_blank');
		win.focus();
	});

	d3.select("#center_view").on("click", function() {
		center_view();
	});
	
}

function save_coords() {
	if (mutable.slice(0,5) != 'false') {
		var text = ""
		d3.select(".node").selectAll("circle")
			.sort(function(a,b) { return a.number - b.number; })
			.each(function(d) { text = text + d.name + "," + d.x.toString() + "," + d.y.toString() + "\n"; });
		var name = window.location.search;
		//name = name.split('?cgi-bin/')[1];
		//name = name.split('?data/')[1];
		path = name.slice(1,name.length) + "/coordinates.txt";
		console.log(path)
		$.ajax({
		  url: "cgi-bin/save_data.py",
		  type: "POST",
		  data: {path:path, content:text},
		});
	}
}

function center_view() {
	var all_xs = [];
	var all_ys = [];
	if (d3.selectAll(".selected")[0].length == 0) { 
		d3.selectAll(".node circle").each(function(d) { 
			all_xs.push(d.x);
			all_ys.push(d.y);
		});
	} else {
		d3.selectAll(".selected").each(function(d) { 
			all_xs.push(d.x);
			all_ys.push(d.y);
		});
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
	var translate = [width / 2 - scale * x, height / 2 - scale * y];
	svg_graph.transition().duration(400)
	.call(zoomer.translate(translate).scale(scale).event);
}

function downloadSVG() {

	hideAccessories();
	var svg = d3.select("svg")[0][0];
	
	//get svg source.
	var serializer = new XMLSerializer();	
	var source = serializer.serializeToString(svg);
	//add name spaces.
	if(!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
		source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
	}
	if(!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)){
		source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
	}
	//add xml declaration
	//source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
	downloadFile(source,"screenshot.svg")
	showAccessories();
}

function downloadPNG() {
	//if (d3.select("#sound_toggle").select("img").attr("src") == "scripts_1_5_dev/sound_effects/icon_speaker.svg") {
    //		var snd = new Audio("scripts_1_5_dev/sound_effects/download_sound.wav"); snd.play(); }
	hideAccessories();
	var svgElement = d3.select('svg')[0][0];
	var simg = new Simg(svgElement);
	simg.download('screenshot');
	showAccessories();
}

function downloadPDF() {
	//Get svg markup as string

	var svg = d3.select("svg")[0][0].innerHTML;
	//svg = svg.replace(/\r?\n|\r/g, '').trim();

	var canvas = d3.select('canvas')[0][0];
	var context = canvas.getContext('2d');
	context.clearRect(0, 0, canvas.width, canvas.height);
	canvg(canvas, svg);

	var imgData = canvas.toDataURL('image/png');

	// Generate PDF
	var doc = new jsPDF('p', 'pt', 'a4');
	doc.addImage(imgData, 'PNG', 40, 40, 75, 75);
	doc.save('test.pdf');
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

function showGotoDropdown() {
	if (d3.select("#goto_dropdown").style("height") == 'auto') {
		closeDropdown();
		collapse_settings();
		setTimeout(function() {
			document.getElementById("goto_dropdown").classList.toggle("show");
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



