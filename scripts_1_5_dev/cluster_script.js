
function cluster_setup(project_directory) {
	
	spectrum_dropdown = false;
	explain_dropdown = false; 
	
	
	d3.select("#cluster_dropdown_button").on("click",showClusterDropdown);
	var name = window.location.search.split('/')[2];
	d3.json('cgi-bin/clustering_data/'+name+'_clustering_data.json', function(data) {
		console.log(data);
		clustering_data = data;
		current_clus_name = clustering_data['Current_clustering'];
		last_clus_name = current_clus_name;		
	});
	
	svg_width = parseInt(d3.select("svg").attr("width"));
	d3.select("#create_cluster_box")
		.call(d3.behavior.drag()
			.on("dragstart", cluster_box_dragstarted)
			.on("drag", cluster_box_dragged)
			.on("dragend", cluster_box_dragended));
			
	d3.select("#cluster_view_button")
		.on("click", function() {
			current_clus_name = 'Cluster'+document.getElementById("enter_cluster_number").value;
			var N = parseInt(document.getElementById("enter_cluster_number").value);
			var Nmax = Object.keys(clustering_data['clusters']).length;
			if (N > Nmax || N < 1) {
				sweetAlert({title:'The number of clusters must be between 1 and '+Nmax.toString(),animation:"slide-from-top"});
			}
			else { view_current_clusters(); }
		});
		
	d3.select("#cluster_apply_button")
		.on("click", function() {
			current_clus_name = 'Cluster'+document.getElementById("enter_cluster_number").value;
			var N = parseInt(document.getElementById("enter_cluster_number").value);
			var Nmax = Object.keys(clustering_data['clusters']).length;
			if (N > Nmax || N < 1) {
				alert('The number of clusters must be between 1 and '+Nmax.toString());
			}
			else {
				view_current_clusters();
				if (d3.select("#update_cluster_labels_box").style("visibility") == "visible") {
					show_update_cluster_labels_box();
				}
				last_clus_name = current_clus_name;
			}
			save_cluster_data();
		});
		
	d3.select("#cluster_close_button")
		.on("click", function() {
			current_clus_name = last_clus_name;
			categorical_coloring_data['Current clustering'] = clustering_data['clusters'][current_clus_name];
			if (document.getElementById('labels_button').checked) {
				view_current_clusters();
			}
			if (d3.select("#update_cluster_labels_box").style("visibility") == "visible") {
				show_update_cluster_labels_box();
			}
			hide_create_cluster_box();
			categorical_coloring_data['Current clustering'] = clustering_data['clusters'][current_clus_name];
		});

	d3.select("#enter_cluster_number").on("mousedown",function(){d3.event.stopPropagation();});

	d3.select("#cluster_help_choose_button")
		.on("click", function() {
			toggle_spectrum();
		});
		
	d3.select("#cluster_explanation_button")
		.on("click", function() {
			toggle_explain();
		});
	
	function cluster_box_dragstarted() {
		d3.event.sourceEvent.stopPropagation();
	}
	function cluster_box_dragged() {
		var cx = parseFloat(d3.select("#create_cluster_box").style("left").split("px")[0])
		var cy = parseFloat(d3.select("#create_cluster_box").style("top").split("px")[0])
		d3.select("#create_cluster_box").style("left",(cx + d3.event.dx).toString()+"px");
		d3.select("#create_cluster_box").style("top",(cy + d3.event.dy).toString()+"px");
	}
	function cluster_box_dragended() { }

	d3.select("#update_cluster_labels_box")
		.call(d3.behavior.drag()
			.on("dragstart", update_cluster_labels_box_dragstarted)
			.on("drag", update_cluster_labels_box_dragged)
			.on("dragend", update_cluster_labels_box_dragended));

	function update_cluster_labels_box_dragstarted() {
		d3.event.sourceEvent.stopPropagation();
	}
	function update_cluster_labels_box_dragged() {
		var cx = parseFloat(d3.select("#update_cluster_labels_box").style("left").split("px")[0])
		var cy = parseFloat(d3.select("#update_cluster_labels_box").style("top").split("px")[0])
		d3.select("#update_cluster_labels_box").style("left",(cx + d3.event.dx).toString()+"px");
		d3.select("#update_cluster_labels_box").style("top",(cy + d3.event.dy).toString()+"px");
	}
	function update_cluster_labels_box_dragended() { }

}

function hide_create_cluster_box() {
	d3.select("#create_cluster_box").style("visibility","hidden")
}

function show_create_cluster_box() {
	var mywidth = parseInt(d3.select("#create_cluster_box").style("width").split("px")[0])
	var svg_width = parseInt(d3.select("svg").style("width").split("px")[0])
	d3.select("#create_cluster_box")
		.style("visibility","visible")
		.style("left",(svg_width/2-mywidth/2).toString()+"px")
		.style("top","146px");
	document.getElementById("enter_cluster_number").value = current_clus_name.split('Cluster')[1];
}


function showClusterDropdown() {
	if (d3.select("#cluster_dropdown").style("height") == 'auto') {
		closeDropdown();
		collapse_settings();
		setTimeout(function() {
			document.getElementById("cluster_dropdown").classList.toggle("show");
		}, 10);
	}
}


function view_current_clusters() {
	
	categorical_coloring_data['Current clustering'] = clustering_data['clusters'][current_clus_name];
	if (d3.selectAll("#cluster_option")[0].length == 0) {
		d3.select("#labels_menu").append("option")
			.attr("value", 'Current clustering')
			.attr("id","cluster_option")
			.text('Current_clustering');
	}
	d3.select("#labels_menu").property("value", 'Current clustering')

	document.getElementById('channels_button').checked = false;
	document.getElementById('gradient_button').checked = false;
	document.getElementById('labels_button').checked = true;
	var cat_color_map = clustering_data['clusters'][current_clus_name]['label_colors'];
	var cat_label_list = clustering_data['clusters'][current_clus_name]['label_list'];
	d3.select("#label_column").selectAll("div").remove();
	d3.select("#count_column").selectAll("div").remove();
	d3.select("#legend_mask").transition().attr("x", svg_width-170)
		.each("end", function() { 
			make_legend(cat_color_map,cat_label_list); 
			color_nodes(cat_color_map,cat_label_list);
		});
}

function color_nodes(cat_color_map,cat_label_list) {
	d3.select(".node").selectAll("circle")
		.style("fill", function(d) {
			return cat_color_map[cat_label_list[d.number]] ;
		})
}


function make_new_clustering() {
	show_create_cluster_box();
}

function toggle_spectrum() {
	if (explain_dropdown == true) { 
		hide_explain(); 
		setTimeout(show_spectrum,400);
	} else {
		if (spectrum_dropdown == true) { hide_spectrum(); }
		else { show_spectrum(); }
	}
}

function show_spectrum() {
	console.log('showspec');
	// Set the dimensions of the canvas / graph
	var margin = {top: 30, right: 20, bottom: 55, left: 75},
		width = 648 - margin.left - margin.right,
		height = 280 - margin.top - margin.bottom;

	// Set the ranges
	var x = d3.scale.linear().range([0, width]);
	var y = d3.scale.linear().range([height, 0]);

	// Define the axes
	var xAxis = d3.svg.axis().scale(x)
		.orient("bottom").ticks(10);

	var yAxis = d3.svg.axis().scale(y)
		.orient("left").ticks(5);

	// Define the line
	var valueline = d3.svg.line()
		.x(function(d) { return x(d.x); })
		.y(function(d) { return y(d.y); });
		
	var argmax_line = d3.svg.line()
		.x(function(d) { return x(d.x); })
		.y(function(d) { return y(d.y); });
	
	// Adds the svg canvas
	var svg = d3.select("#cluster_plot_window")
		.append("svg")
			.attr("width", width + margin.left + margin.right)
			.attr("height", height + margin.top + margin.bottom)
			.style("background-color","rgba(255,255,255,.82)")
			.style("margin-left","30px")
			.style("margin-right","30px")
			.style("margin-top","10px")
		.append("g")
			.attr("transform", 
				  "translate(" + margin.left + "," + margin.top + ")");

	// Get the data
	gap_data = [];
	clustering_data["spectral_info"]["gaps"].forEach(function(val,i) {
		dd = Object();
		dd.y = val;
		dd.x = i+1;
		gap_data.push(dd)
	});
	
	// Scale the range of the data
	var maxval = d3.max(gap_data, function(d) { return d.y; });
	x.domain(d3.extent(gap_data, function(d) { return d.x; }));
	y.domain([0, maxval]);

	var argmax = clustering_data['spectral_info']['argmax'];
	svg.append('line')
		.attr({x1:x(argmax), y1:y(0), x2:x(argmax), y2:y(maxval), stroke:'rgba(100,100,100,1)'})
		.style("stroke-dasharray",5)
		.style("stroke-width","2px");
	
	// Add the valueline path.
	svg.append("path")
		.attr("class", "line")
		.attr("d", valueline(gap_data));
		
		svg.append("path")
		.attr("class", "dotted-line")
		.attr("d", valueline(gap_data));
	
	// Add the X Axis
	svg.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0," + height + ")")
		.call(xAxis);

	// Add the Y Axis
	svg.append("g")
		.attr("class", "y axis")
		.call(yAxis);
		
	svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left+8)
      .attr("x",0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("Spectral gap"); 
      
    svg.append("text")             
      .attr("transform",
            "translate(" + (width/2) + " ," + 
                           (height + margin.top + 12) + ")")
      .style("text-anchor", "middle")
      .text("Number of clusters");
    
      
    svg.selectAll("text").style("font","14px sans-serif");
   
    var mywidth = parseInt(d3.select("#create_cluster_box").style("width").split("px")[0])-54 
    d3.select("#cluster_text_window")
    	.style("margin-left","30px")
    	.style("margin-top","10px")
    	.style("width",mywidth.toString()+"px");
    
    var clusnum = (clustering_data["spectral_info"]["argmax"]).toString();
    svg.append("text")
   	  .attr("transform",
            "translate(" + (width-105) + " , 5)")
      .style("text-anchor", "middle")
      .text("Suggested cluster number = "+clusnum);
      
    d3.select("#cluster_text_window").append("text")   
    .style("font","14px sans-serif")
    .style("color","white")
    .text('The recommended number of clusters is '+clusnum+', because this is the first'
         + ' peak in the spectral gap. Spectral gap measures the difference in '
         + 'how much structure is captured by the current cluster number versus one '
         + 'additional cluster. So when the gap is large, that means not much is gained '
         + 'by further increasing the cluster number. This is similar to "elbow" methods '
         + 'for other other clustering approaches. For for information, click "Explanation'
         + ' of method" above.');
         
	d3.select("#create_cluster_box")
		.transition().duration(400)
		.style("height","470px");
	
	spectrum_dropdown = true;
	
}


function hide_spectrum() {	
	d3.select("#create_cluster_box")
		.transition().duration(400)
		.style("height","52px")
		.each("end", function() {
			d3.select("#cluster_plot_window").select("svg").remove();
			d3.select("#cluster_text_window").select("text").remove();
		});
	spectrum_dropdown = false;
}

function toggle_explain() {
	if (spectrum_dropdown == true) { 
		hide_spectrum(); 
		setTimeout(show_explain,400);
	}
	else {
		if (explain_dropdown == true) { hide_explain(); }
		else { show_explain(); }
	}

}

function show_explain() {
	d3.select("#create_cluster_box")
		.transition().duration(400)
		.style("height","260px")
		
	var mywidth = parseInt(d3.select("#create_cluster_box").style("width").split("px")[0])-54 
    d3.select("#cluster_text_window")
    	.style("margin-left","30px")
    	.style("margin-top","15px")
    	.style("width",mywidth.toString()+"px");
      
    d3.select("#cluster_text_window").append("text")   
		.style("font","14px sans-serif")
		.style("color","white")
		.text('Cells have been clustered using spectral clustering on the SPRING '
			 + 'k-nearest-neighbor graph. Spectral clustering a technique where each cell '
			 + 'is mapped to new "spectral" coordinates (based on its "position" in the graph'
			 + ' and then a conventional clustering method (in our case, k-means) is applied'
			 + ' in these new coordinates. For information, see the links below. There are'
			 + ' are several variants of spectral remapping distinguished by the method of'
			 + ' normalization applied to the graph Laplacian. Here, we are using the "random-walk"'
			 + ' normalization.');
         
    d3.select("#cluster_text_window")
    	.append("div").attr("class","explain_link").style("margin-top","15px")
    	.append("a").attr("target","_blank").style("color","white")
		.attr("href", "https://en.wikipedia.org/wiki/Spectral_clustering")
  		.append("text").text("Wikipedia article on spectral clustering")
  		.style("font","14px sans-serif");
    
    d3.select("#cluster_text_window")
    	.append("div").attr("class","explain_link").style("margin-top","8px")
    	.append("a").attr("target","_blank").style("color","white")
		.attr("href", "http://www.cs.cmu.edu/~aarti/Class/10701/readings/Luxburg06_TR.pdf")
  		.append("text").text("A tutorial on spectral clustering (Luxburg, 2006)")
  		.style("font","14px sans-serif");
	explain_dropdown = true; 
}

function hide_explain() {

	d3.select("#create_cluster_box")
		.transition().duration(400)
		.style("height","52px")
		.each("end", function() {
			d3.selectAll(".explain_link").remove();
			d3.select("#cluster_text_window").select("text").remove();
		});
	explain_dropdown = false; 
}

function show_update_cluster_labels_box() {

	if (d3.select("#update_cluster_labels_box").style("visibility") == "hidden") {
		d3.select("#download_legend_button").on("click",download_legend_image);
		d3.select("#apply_legend_button").on("click",apply_legend);
		d3.select("#close_cluster_label_button").on("click",hide_update_cluster_labels_box);

		var mywidth = parseInt(d3.select("#update_cluster_labels_box").style("width").split("px")[0])
		var svg_width = parseInt(d3.select("svg").style("width").split("px")[0])
		d3.select("#update_cluster_labels_box")
			.style("visibility","visible")
			.style("left",(svg_width/2-mywidth/2).toString()+"px")
			.style("top","220px");	
	}
	
	d3.select("#update_cluster_labels_box").selectAll("g").remove();	
	d3.select("#update_cluster_labels_box").selectAll("g")
		.data(Object.keys(clustering_data['clusters'][current_clus_name]['label_colors']))
		.enter().append("g").append("div")
		.attr("class","cluster_label_row")
		
	
	d3.selectAll(".cluster_label_row").each(function(d) {
		d3.select(this).append("div")
 			.attr("class","cluster_swatch")
 			.style("background-color",clustering_data['clusters'][current_clus_name]['label_colors'][d])
		d3.select(this).append("div")
			.style("margin-left","35px")
 			.style("margin-top","8px")
 			.attr("pointer-events","none")
			.append("form")
				.attr("onSubmit","return false")
				.append("input")
					.attr("class","cluster_name_input")
					.attr("type","text").attr("value",d)
					.on("mousedown",function(){d3.event.stopPropagation();});
	});	
}

function hide_update_cluster_labels_box() {
	d3.select("#update_cluster_labels_box").style("visibility","hidden");
}


function apply_legend() {
	new_clus = Object();
	new_colors = Object();
	new_labels = [];
	new_names = [];
	mapping = Object();
	new_name_set = new Set();
	
	d3.selectAll(".cluster_label_row").each(function(d) {
		newname = d3.select(this).selectAll(".cluster_name_input")[0][0].value;
		new_names.push(newname);
		new_name_set.add(newname)
		mapping[d] = newname;
		new_colors[newname] = clustering_data['clusters'][current_clus_name]['label_colors'][d];
	});
	
	if (new_name_set.size < new_names.length) {
		sweetAlert({title:'Cluster names must be distinct' ,animation:"slide-from-top"});
	}
	else {
		clustering_data['clusters'][current_clus_name]['label_list'].forEach(function(d) {
			new_labels.push(mapping[d]);
		});
	
		new_clus['label_list'] = new_labels;
		new_clus['label_colors'] = new_colors;
		clustering_data['clusters'][current_clus_name] = new_clus;
	
		if (document.getElementById('labels_button').checked) {
			console.log(document.getElementById('labels_menu').value);
			if (document.getElementById('labels_menu').value == 'Current clustering') {
				d3.select("#label_column").selectAll("div").remove();
				d3.select("#count_column").selectAll("div").remove();
				make_legend(new_colors,new_labels);
			}
		}
		show_update_cluster_labels_box();
		save_cluster_data();
	}
}

function save_cluster_data() {
	clustering_data['Current_clustering'] = current_clus_name;
	var name = window.location.search.split('/')[2];
	var path = "clustering_data/"+name+"_clustering_data_clustmp.json";
	$.ajax({
	  url: "cgi-bin/save_data.py",
	  type: "POST",
	  data: {path:path, content:JSON.stringify(clustering_data,null,'    ')},
	});
}


function download_legend_image() {
	var original_visibility = d3.select("#update_cluster_labels_box").style("visibility")
	show_update_cluster_labels_box();
	d3.select("#cluster_label_button_bar").style("visibility","hidden");
	d3.select("#cluster_label_button_bar").style("height","5px");
	d3.select("#update_cluster_labels_box").style("background-color","white");
	d3.selectAll(".cluster_name_input").style("color","black");

	html2canvas([ document.getElementById('update_cluster_labels_box') ],{
	onrendered: function(canvas) {
		var a = document.createElement('a');
		// toDataURL defaults to png, so we need to request a jpeg, then convert for file download.
		a.href = canvas.toDataURL("image/png");
		a.download = 'SPRING_legend.png';
		a.click();
	}});
	
	d3.select("#cluster_label_button_bar").style("visibility","inherit");
	d3.select("#cluster_label_button_bar").style("height","31.1px");
	d3.select("#update_cluster_labels_box").style("background-color","rgba(80, 80, 80, 0.5)");
	d3.selectAll(".cluster_name_input").style("color","white");
	if (original_visibility == 'hidden') { hide_update_cluster_labels_box(); }
}

function download_clustering() {
	var text = ""
	var label_list = clustering_data['clusters'][current_clus_name]['label_list'];
	d3.select(".node").selectAll("circle")
		.sort(function(a,b) { return a.number - b.number; })
		.each(function(d) { text = text + d.name.toString() + ',' + label_list[d.number] + '\n' });
	downloadFile(text,"clustering.txt")
}









