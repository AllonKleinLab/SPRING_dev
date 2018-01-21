'use strict';
function coexpression_setup(project_directory) {
	
	var scatter_jitter = 5;
	var scatter_zoom = 1;
	var scatter_size = 6
	
	var svg_width = parseInt(d3.select("svg").attr("width"));
	var c10 = d3.scale.category10();
	
	var scatter_data = null;
	var scatter_x = null;
	var scatter_y = null;
	var scatter_xAxis = null;
	var scatter_yAxis = null;
	
	d3.select("#coexpression_panel").attr("class","bottom_tab")
	d3.select("#coexpression_panel").style("visibility","visible")
	d3.select("#coexpression_header").append("div")
		.attr("id","coexpression_closeopen")
		.append("button").text("Open")
		.on("click", function() {
			if (d3.select("#coexpression_panel").style("height") == "50px") { 
				open_coexpression(); 
			} else { close_coexpression(); }
		});


	d3.select("#coexpression_header").append("div")
		.attr("id","coexpression_title")
		.append("text").text("Coexpression browser");
		
	d3.select("#coexpression_header").append("div")
		.attr("id","coexpression_refresh_button")
		.append("button")
		.text("Refresh cluster selection")
		.on("click",refresh_selected_clusters);
		
	d3.select("#coexpression_size_slider").on("input", function() {
		scatter_size = this.value / 10;
		quick_scatter_update();
	});
	
	d3.select("#coexpression_jitter_slider").on("input", function() {
		scatter_jitter = parseFloat(this.value);
		quick_scatter_update();
	});
	
	d3.select("#coexpression_zoom_slider").on("input", function() {
		scatter_zoom = parseFloat((100 - this.value)/100);
		quick_scatter_update();
	});
	
	
	function refresh_selected_clusters() {
		
		d3.select("#coexpression_infobox").select("text").remove();		
		d3.select('#coexpression_panel').selectAll("svg").remove();	
		d3.select("#menuDiv").remove();
		d3.select("#n_cells").remove();
		
		make_coexpression_spinner('coexpression_infobox');	
		d3.select("#coexpression_infobox")
			.append("text")
			.text("Loading gene expression data");
		
		var list = [], expression_dict = {}, lengths_list = [];
		d3.selectAll(".coexpression_legend_row").remove();
		
		d3.selectAll(".selected").each(function(d) { list.push(d.name); });
		make_coexpression_legend(list);
		load_clusters(list,lengths_list,expression_dict); 
	}
		
	function load_clusters(list,lengths_list,expression_dict) {
		if (list.length > 0) { load_cluster_expression(list,lengths_list,expression_dict) }
		else {
			$(".coexpression_spinner").remove();
			d3.select("#coexpression_infobox").select("text").remove();
			if ( Object.keys(expression_dict).length > 0 ) {
				scatter_setup(lengths_list,expression_dict);
		 	}
		 	else {
		 		d3.select("#coexpression_infobox")
					.append("text")
					.text("No clusters selected");
		 	}
		}
	}
	
	function close_coexpression() {	
		d3.select("#coexpression_closeopen").select("button").text("Open");
		d3.select("#coexpression_refresh_button").style("visibility","hidden")
		d3.select("#coexpression_panel").transition().duration(500)
			.style("height","50px")
			.style("width","280px")
		d3.select("#menuDiv").style("visibility","hidden");	
		d3.select("#n_cells").style("visibility","hidden");	
		d3.select('#coexpression_panel').selectAll("svg").style("visibility","hidden");
		d3.select("#coexpression_legend").style("visibility","hidden");
		d3.select("#coexpression_settings_box").style("visibility","hidden");
	}
	
	function open_coexpression() {
		d3.selectAll("#coexpression_legend").style("visibility","visible");
		d3.selectAll("#coexpression_settings_box").style("visibility","visible");
		setTimeout(function(){
			d3.select("#coexpression_refresh_button").style("visibility","visible");
			if (d3.selectAll(".coexpression_legend_row")[0].length == 0) {
				refresh_selected_clusters();
			}	
			d3.select("#menuDiv").style("visibility","visible");	
			d3.select("#n_cells").style("visibility","visible");	
			d3.select('#coexpression_panel').selectAll("svg").style("visibility","visible");
		}, 500);
		d3.select("#coexpression_closeopen").select("button").text("Close");
		d3.select("#coexpression_panel").transition().duration(500)
			.style("height","380px")
			.style("width","900px");
	}

	
	function load_cluster_expression(list,lengths_list,expression_dict) {
		name = list[0];
		list = list.slice(1,list.length);
		d3.text(project_directory+"/cluster_expression/"+name+".csv", function(text) {
			var tmp_expression_dict = read_csv(text);
			var random_key = Object.keys(tmp_expression_dict)[0];
			lengths_list.push(tmp_expression_dict[random_key].length);
			if (Object.keys(expression_dict).length == 0) {
				expression_dict = tmp_expression_dict; 	
			}
			else {
				Object.keys(tmp_expression_dict).forEach(function(d) {
					expression_dict[d] = expression_dict[d].concat(tmp_expression_dict[d]);
				});
			}
			load_clusters(list,lengths_list,expression_dict);
		});
	}
	
	function make_coexpression_legend(list) {
		d3.select("#coexpression_legend").selectAll(".coexpression_legend_row")
			.data(list).enter().append("div")
				.style("display","inline-block")
				.attr("class","coexpression_legend_row")
				.style("height","25px")
				.style("margin-top","0px")
				.style("overflow","scroll");

		d3.selectAll(".coexpression_legend_row").each(function(d,i) {
			d3.select(this).append("div")
				.style("background-color",c10(i))
			d3.select(this).append("div")
				.attr("class","coexpression_text_label_div")
				.append("p").text(d)
				.style("float","left")
				.style("white-space","nowrap")
				.style("margin-top","-6px")
				.style("margin-left","3px");
		});	
	}
		
	function scatter_setup(lengths_list,expression_dict) {
				
		var menuDiv = d3.select("#coexpression_header").append("div").attr("id","menuDiv");
	
		menuDiv.append("text").text("X: ").attr("class","coexp_menu_label");
		var Xmenu = menuDiv.append("select")
			.attr("id","Xmenu")
			.style("margin-left", "2px")
			.style("font-size","13px")
			.style("background-color", "#e4e4e4")
			.on("change", function() { scatter_update(expression_dict); })
			.sort(function(a,b) {
				if (a.text > b.text) return 1;
				else if (a.text < b.text) return -1;
				else return 0;
			})
			.selectAll("option")
				.data(Object.keys(expression_dict))
				.enter().append("option")
				.attr("value", function(d) { return d; })
				.text(function(d) { return d; });

		menuDiv.append("text").text("Y: ").attr("class","coexp_menu_label");
		var Ymenu = menuDiv.append("select")
			.attr("id","Ymenu")
			.style("margin-left", "2px")
			.style("font-size","13px")
			.style("background-color", "#e4e4e4")
			.on("change", function() { scatter_update(expression_dict); })
			.sort(function(a,b) {
				if (a.text > b.text) return 1;
				else if (a.text < b.text) return -1;
				else return 0;
			})
			.selectAll("option")
				.data(Object.keys(expression_dict))
				.enter().append("option")
				.attr("value", function(d) { return d; })
				.text(function(d) { return d; });

				
		var geneX = document.getElementById('Xmenu').value;
		var geneY = document.getElementById('Ymenu').value;
		var xx = expression_dict[geneX];
		var yy = expression_dict[geneY];
		scatter_data = [];
		for (var i=0; i < xx.length; i++) {
			scatter_data.push([xx[i],yy[i],(Math.random()-.3)*d3.max(xx)/100,(Math.random()-.3)*d3.max(yy)/100]);
		}

		var margin = {top: 15, right: 535, bottom: 130, left: 85}
		  , width = document.getElementById("coexpression_panel").offsetWidth - margin.left - margin.right
		  , height = document.getElementById("coexpression_panel").offsetHeight - margin.top - margin.bottom;
	
	    scatter_x = d3.scale.linear()
		  .domain([0, d3.max(scatter_data, function(d) { return d[0] })+.1])
		  .range([ 0, width ]);
    
		scatter_y = d3.scale.linear()
		  .domain([0, d3.max(scatter_data, function(d) { return d[1] })+.1])
		  .range([ height, 0 ]);
 
		var chart = d3.select('#coexpression_panel')
		.append('svg:svg')
		.attr('width', width + 108)
		.attr('height', height + margin.top + margin.bottom)
		.attr('class', 'chart');

		var main = chart.append('g')
		.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
		.attr('width', width)
		.attr('height', height)
		.attr('class', 'main');
		
		// draw the x axis
		scatter_xAxis = d3.svg.axis()
		.scale(scatter_x)
		.orient('bottom');

		main.append('g')
		.attr('transform', 'translate(0,' + height + ')')
		.attr('class', 'scatter_axis')
		.attr("id","coexpression_scatter_x_axis")
		.call(scatter_xAxis)
		.append('text')
			.attr("class","axis_label")
        	.attr("fill", "#000")
      		.attr("y", margin.bottom)
      		.attr('x', width/2)
      		.attr('font-size', '320px')
		    .attr("dy", "-5.5em")
      		.style("text-anchor", "middle")
      		.text(geneX + " (UMIs)");

		// draw the y axis
		scatter_yAxis = d3.svg.axis()
		.scale(scatter_y)
		.orient('left');
	
		main.append('g')
		.attr('transform', 'translate(0,0)')
		.attr('class', 'scatter_axis')
		.attr("id","coexpression_scatter_y_axis")
		.call(scatter_yAxis)
		.append('text')
		    .attr("class","axis_label")
        	.attr("fill", "#000")
      		.attr("transform", "rotate(-90)")
      		.attr("y", -margin.left)
      		.attr('x', -height/2)
      		.attr('font-size', '14px')
		    .attr("dy", "2.6em")
      		.style("text-anchor", "middle")
      		.text(geneY + " (UMIs)");

		var g = main.append("svg:g"); 
		var current_color_index = 0;
		var next_length = lengths_list[0]
		var color_counter = 0;
		lengths_list = lengths_list.slice(1,lengths_list.length);
		g.selectAll("coexpression-scatter-dots")
			.data(scatter_data)
			.enter().append("svg:circle")
				.attr("class","coexpression-scatter-dots")
				.attr("cx", function (d,i) { return scatter_x(d[0]+d[2]*scatter_jitter); } )
				.attr("cy", function (d) { return scatter_y(d[1]+d[3]*scatter_jitter); } )
				.attr("r", 5);
			
		d3.selectAll(".coexpression-scatter-dots")		
			.style("fill", function (d,i) { 
				if (color_counter > next_length) {
					next_length = lengths_list[0];
					lengths_list = lengths_list.slice(1,lengths_list.length);
					current_color_index += 1;
					color_counter=0;
				}
				color_counter += 1;
				return c10(current_color_index);
			});
			
		
		var geneX = document.getElementById('Xmenu').value;
		var geneY = document.getElementById('Ymenu').value;
		var xx = expression_dict[geneX];
		var yy = expression_dict[geneY];
		var r = pearsonCorrelation(xx,yy).toString().slice(0,3);
	
		var random_key = Object.keys(expression_dict)[0];
		var n = (expression_dict[random_key].length).toString()
		
		d3.select("#coexpression_header")
		.append("text").attr("id","n_cells")
		.text("n = "+n+" cells, r = "+r);

	}
	
	function scatter_update(expression_dict) {
		var duration = 750;
		var geneX = document.getElementById('Xmenu').value;
		var geneY = document.getElementById('Ymenu').value;
		var xx = expression_dict[geneX];
		var yy = expression_dict[geneY];
		scatter_data = [];
		for (var i=0; i < xx.length; i++) {
			scatter_data.push([xx[i],yy[i],(Math.random()-.3)*d3.max(xx)/100,(Math.random()-.3)*d3.max(yy)/100]);
		}
		
		scatter_x.domain([0, d3.max(scatter_data, function(d) { return d[0]; })*scatter_zoom+.1])
		scatter_y.domain([0, d3.max(scatter_data, function(d) { return d[1]; })*scatter_zoom+.1])
		var svg_use = d3.select('#coexpression_panel').transition();
	
		d3.selectAll(".coexpression-scatter-dots")
			.data(scatter_data)
		  	.enter().append("svg:circle")
		  
		svg_use.selectAll(".coexpression-scatter-dots").duration(duration)
			.attr("cx", function (d,i) { return scatter_x(d[0]+d[2]*scatter_jitter); } )
			.attr("cy", function (d) { return scatter_y(d[1]+d[3]*scatter_jitter); } )

		svg_use.select('#coexpression_scatter_x_axis')
			.duration(duration)
			.call(scatter_xAxis)
		svg_use.select('#coexpression_scatter_y_axis')
			.duration(duration)
			.call(scatter_yAxis)	
			
		d3.select("#coexpression_scatter_x_axis .axis_label").text(geneX + " (UMIs)");
		d3.select("#coexpression_scatter_y_axis .axis_label").text(geneY + " (UMIs)");
		
		var r = pearsonCorrelation(xx,yy).toString().slice(0,5);	
		var random_key = Object.keys(expression_dict)[0];
		var n = (expression_dict[random_key].length).toString()
		d3.select("#n_cells")
		.text("n = "+n+" cells, r = "+r);		
	}
	
	function quick_scatter_update() {	

		scatter_x.domain([0, d3.max(scatter_data, function(d) { return d[0]*scatter_zoom })+.1])
		scatter_y.domain([0, d3.max(scatter_data, function(d) { return d[1]*scatter_zoom })+.1])
		d3.select('#coexpression_scatter_x_axis').call(scatter_xAxis)
		d3.select('#coexpression_scatter_y_axis').call(scatter_yAxis);

		d3.selectAll(".coexpression-scatter-dots")
			.data(scatter_data)
		  	.enter().append("svg:circle")		  
		d3.selectAll(".coexpression-scatter-dots")
			.attr("cx", function (d,i) { return scatter_x(d[0]+d[2]*scatter_jitter); } )
			.attr("cy", function (d) { return scatter_y(d[1]+d[3]*scatter_jitter); } )		
			.style("r", scatter_size / (scatter_zoom + .1));	
	}

}

function read_csv(text) {
	dict = {};
	text.split('\n').forEach(function(entry,index,array) {
		items = entry.split(',')
		gene = items[0]
		exp_array = []
		items.forEach(function(e,i,a) {
			if (i > 0) { exp_array.push(parseFloat(e)); }
		});
		dict[gene] = exp_array
	});
	return dict
}

function make_coexpression_spinner(element) {
	var opts = {
		  lines: 17 // The number of lines to draw
		, length: 50 // The length of each line
		, width: 20 // The line thickness
		, radius: 60 // The radius of the inner circle
		, scale: 0.22 // Scales overall size of the spinner
		, corners: 1 // Corner roundness (0..1)
		, color: 'gray' // #rgb or #rrggbb or array of colors
		, opacity: 0.15 // Opacity of the lines
		, rotate: 8 // The rotation offset
		, direction: 1 // 1: clockwise, -1: counterclockwise
		, speed: 0.9 // Rounds per second
		, trail: 60 // Afterglow percentage
		, fps: 20 // Frames per second when using setTimeout() as a fallback for CSS
		, zIndex: 2e9 // The z-index (defaults to 2000000000)
		, className: 'coexpression_spinner' // The CSS class to assign to the spinner
		, top: '30%' // Top position relative to parent
		, left: '50%' // Left position relative to parent
		, shadow: true // Whether to render a shadow
		, hwaccel: true // Whether to use hardware acceleration
		, position: 'absolute' // Element positioning
		}
	var target = document.getElementById(element);
	var spinner = new Spinner(opts).spin(target);
	$(target).data('spinner', spinner);
}

function pearsonCorrelation(xx,yy) {
	var prefs = new Array(xx,yy)
	var p1 = 0;
	var p2 = 1;

	var si = [];
	for (var key in prefs[p1]) {
		if (prefs[p2][key]) si.push(key);
	}
	var n = si.length;
	if (n == 0) return 0;
	var sum1 = 0;
	for (var i = 0; i < si.length; i++) sum1 += prefs[p1][si[i]];
	var sum2 = 0;
	for (var i = 0; i < si.length; i++) sum2 += prefs[p2][si[i]];
	var sum1Sq = 0;
	for (var i = 0; i < si.length; i++) {
		sum1Sq += Math.pow(prefs[p1][si[i]], 2);
	}
	var sum2Sq = 0;
	for (var i = 0; i < si.length; i++) {
		sum2Sq += Math.pow(prefs[p2][si[i]], 2);
	}
	var pSum = 0;
	for (var i = 0; i < si.length; i++) {
		pSum += prefs[p1][si[i]] * prefs[p2][si[i]];
	}
	var num = pSum - (sum1 * sum2 / n);
	var den = Math.sqrt((sum1Sq - Math.pow(sum1, 2) / n) *
	  (sum2Sq - Math.pow(sum2, 2) / n));
	if (den == 0) return 0;
	return num / den;
}

