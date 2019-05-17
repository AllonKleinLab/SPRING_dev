'use strict';
function diffex_setup(project_directory) {
	
	var scatter_zoom = .2;
	var scatter_size = 4;
	var scatter_jitter = 0;
	
	var scatter_data = null;
	var scatter_x = null;
	var scatter_y = null;
	var scatter_xAxis = null;
	var scatter_yAxis = null;
	var gene_list = null;
	
	d3.select("#diffex_panel").attr("class","bottom_tab");
	d3.select("#diffex_header").append("div")
		.attr("id","diffex_closeopen")
		.append("button").text("Open")
		.on("click", function() {
			if (d3.select("#diffex_panel").style("height") == "50px") { 
				open_diffex(); 
			} else { close_diffex(); }
		});

	d3.select("#diffex_header").append("div")
		.attr("id","diffex_title")
		.append("text").text("Differential expression");

	d3.select("#diffex_header").append("div")
		.attr("id","diffex_refresh_button")
		.append("button")
		.text("Refresh cluster selection")
		.on("click",refresh_selected_clusters);

	make_diffex_spinner("diffex_infobox");
	
	d3.select("#diffex_size_slider").on("input", function() {
		scatter_size = this.value / 15;
		quick_scatter_update();
	});
	
	d3.select("#diffex_jitter_slider").on("input", function() {
		scatter_jitter = parseFloat(this.value) / 50;
		quick_scatter_update();
	});
	
	d3.select("#diffex_zoom_slider").on("input", function() {
		scatter_zoom = 5/(parseFloat(this.value) + 5);
		quick_scatter_update();
	});
	
	//open_diffex();
	
	function open_diffex() {
		gene_list = Object.keys(all_gene_color_array);
		d3.selectAll("#diffex_panel").style("z-index","4");
		setTimeout(function(){
			d3.select("#diffex_refresh_button").style("visibility","visible");
			d3.select('#diffex_panel').selectAll("svg").style("visibility","visible");
			d3.selectAll(".diffex_legend").style("visibility","visible");
			d3.select("#diffex_settings_box").style("visibility","visible");
		}, 200);
		setTimeout(function(){
			if (d3.select("#diffex_panel").select("svg")[0][0] == null) {
				refresh_selected_clusters();
			}
		}, 500);
		d3.select("#diffex_closeopen").select("button").text("Close");
		d3.select("#diffex_panel").transition().duration(500)
			.style("height","380px")
			.style("width","900px")
			.style("bottom","5px");
	}
	
	function close_diffex() {
		d3.select("#diffex_closeopen").select("button").text("Open");
		d3.select("#diffex_refresh_button").style("visibility","hidden");
		d3.select('#diffex_panel').selectAll("svg").style("visibility","hidden");
		d3.selectAll(".diffex_legend").style("visibility","hidden");
		d3.select("#diffex_settings_box").style("visibility","hidden");
		d3.select("#diffex_infobox").style("visibility","hidden");
		d3.select("#diffex_panel").transition().duration(500)
			.style("height","50px")
			.style("width","280px")
			.style("bottom","106px");
			
		setTimeout(function() { 
			d3.selectAll("#diffex_panel").style("z-index","1");
		},500);
	}
	
		
	function refresh_selected_clusters() {
		d3.select("#diffex_infobox").style("visibility","visible");
		d3.select("#diffex_infobox").select("text").remove();		
		d3.select('#diffex_panel').selectAll("svg").remove();
		d3.selectAll(".diffex_legend").selectAll("div").remove();	
		
		var n_sel = d3.selectAll(".selected")[0].length;
		var n_com = d3.selectAll(".compared")[0].length;
		if (n_sel == 0 && n_com == 0) {
			d3.select("#diffex_infobox")
				.append("text")
				.text("No clusters selected");
		} else { 
			setTimeout(function() { d3.select(".diffex_spinner").style("visibility","visible"); }, 1 )
			setTimeout(function() {
				make_diffex_legend();
				scatter_setup(); 	
				d3.select(".diffex_spinner").style("visibility","hidden");
				d3.select("#diffex_infobox").style("visibility","hidden");
			},100);
		}	
	}
	
	function scatter_setup() {

		var blue_selection = [];
		var yellow_selection = [];
		d3.selectAll(".selected").each(function(d) { yellow_selection.push(d.number); });
		d3.selectAll(".compared").each(function(d) { blue_selection.push(d.number); });

		var xx = [];
		var yy = [];
		gene_list.forEach(function(d) {
			xx.push(masked_average(all_gene_color_array[d], blue_selection));
			yy.push(masked_average(all_gene_color_array[d], yellow_selection));
		});
		
		
		scatter_data = [];
		xx.forEach(function(d,i) {
			if ((xx[i]==0 && yy[i]!=0) || (xx[i]!=0 && yy[i]==0) || (xx[i]/yy[i]>1.5) ||  (yy[i]/xx[i]>1.5)) {
				scatter_data.push([xx[i],yy[i],(Math.random()-.3)*d3.max(xx)/100,(Math.random()-.3)*d3.max(yy)/100, gene_list[i]]);
			}
		});
		
		
		var margin = {top: 15, right: 545, bottom: 130, left: 95}
		  , width = document.getElementById("diffex_panel").offsetWidth - margin.left - margin.right
		  , height = document.getElementById("diffex_panel").offsetHeight - margin.top - margin.bottom;
		
	    scatter_x = d3.scale.linear()
		  .domain([0, d3.max(scatter_data, function(d) { return d[0]*scatter_zoom })+ .02])
		  .range([ 0, width ]);
    
		scatter_y = d3.scale.linear()
		  .domain([0, d3.max(scatter_data, function(d) { return d[0]*scatter_zoom })+ .02])
		  .range([ height, 0 ]);
 
		var chart = d3.select('#diffex_panel')
		.append('svg:svg')
		.attr('width', width + 108)
		.attr('height', height + margin.top + margin.bottom )
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
		.attr("id","diffex_scatter_x_axis")
		.call(scatter_xAxis)
		.append('text')
			.attr("class","axis_label")
        	.style("fill","blue")
      		.attr("y", margin.bottom)
      		.attr('x', width/2)
      		.style('font-size', '18px')
		    .attr("dy", "-4.8em")
      		.style("text-anchor", "middle")
      		.text("Negative selection (blue)");

		// draw the y axis
		scatter_yAxis = d3.svg.axis()
		.scale(scatter_y)
		.orient('left');
	
		main.append('g')
		.attr('transform', 'translate(0,0)')
		.attr('class', 'scatter_axis')
		.attr("id","diffex_scatter_y_axis")
		.call(scatter_yAxis)
		.append('text')
		    .attr("class","axis_label")
        	.style("fill", "#999900")
      		.attr("transform", "rotate(-90)")
      		.attr("y", -margin.left)
      		.attr('x', -height/2)
      		.style('font-size', '18px')
		    .attr("dy", "2.6em")
      		.style("text-anchor", "middle")
      		.text("Positive selection (yellow)");

		var g = main.append("svg:g");
		
		var mask_points = scatter_x(0).toString()+","+scatter_y(0).toString()+" "
		                + scatter_x(100).toString()+","+scatter_y(150).toString()+" "
		                + scatter_x(150).toString()+","+scatter_y(100).toString()+" "
		                + scatter_x(0).toString()+","+scatter_y(0).toString();
		                
		g.append("svg:polygon")
			.attr("id","diffex_scatter_mask")
			.style("fill","#bdbdbd")
			.attr("points",mask_points);
		
		g.selectAll(".diffex-scatter-dots")
			.data(scatter_data)
			.enter().append("svg:circle")
				.attr("class","diffex-scatter-dots")
				.attr("cx", function (d,i) { return scatter_x(d[0]+d[2]*scatter_jitter); } )
				.attr("cy", function (d) { return scatter_y(d[1]+d[2]*scatter_jitter); } )
				.attr("r", scatter_size );	
		
				
		d3.selectAll(".diffex-scatter-dots")			
			.on("mouseenter", function(d){
				var g = d[4];
				d3.select("#tooltip_gene_name").select("text").text(g);	
				d3.select("#tooltip").style("background-color","green");
				var ww = d3.select("#tooltip_gene_name")[0][0].getBoundingClientRect().width;
				d3.select("#tooltip").style("width",(65 + ww).toString()+"px")
				d3.select("#tooltip").style("visibility", "visible"); 
				
				var rect = d3.select("body")[0][0].getBoundingClientRect();
				d3.select("#tooltip").style("bottom", (rect.height - 5 - event.pageY)+"px").style("right",(rect.width-event.pageX+20)+"px");
				d3.select(this).attr("r",scatter_size *3)
			})
			.on("mouseleave", function(){
				d3.select("#tooltip").style("visibility", "hidden"); 
				d3.select(this).attr("r",scatter_size)
			})
			.on("click", function(d) {
				d3.select("#green_menu")[0][0].value = d[4];
				update_slider();
			});				
	}
	
	function masked_average(vals, indexes) {
		if (indexes.length == 0) {
			return d3.sum(vals) / vals.length;
		} else {
			var out = 0
			indexes.forEach(function(d) { out = out + vals[d]; });
			return out / indexes.length;
		}		
	}
	
	function quick_scatter_update() {	

		scatter_x.domain([0, d3.max(scatter_data, function(d) { return d[0]*scatter_zoom })+ .02])
		scatter_y.domain([0, d3.max(scatter_data, function(d) { return d[0]*scatter_zoom })+ .02])
		d3.select('#diffex_scatter_x_axis').call(scatter_xAxis)
		d3.select('#diffex_scatter_y_axis').call(scatter_yAxis);

		d3.selectAll(".diffex-scatter-dots")
			.data(scatter_data)
		  	.enter().append("svg:circle")		  
		d3.selectAll(".diffex-scatter-dots")
			.attr("cx", function (d,i) { return scatter_x(d[0]+d[2]*scatter_jitter); } )
			.attr("cy", function (d) { return scatter_y(d[1]+d[3]*scatter_jitter); } )	
			.attr("r", scatter_size );
	}
	
	function make_diffex_legend() {
		var yellow_list = [];
		var blue_list = [];
		d3.selectAll(".selected").each(function(d) { yellow_list.push(d); });
		d3.selectAll(".compared").each(function(d) { blue_list.push(d); });
		
		if (yellow_list.length > 0) {
			d3.select("#diffex_legend_upper")
				.selectAll(".diffex_legend_row")
				.data(yellow_list).enter().append("div")
					.style("display","inline-block")
					.attr("class","diffex_legend_row")
					.style("height","22px")
					.style("margin-top","0px")
					.style("overflow","scroll")
					.style("background-color","yellow");
		} else {
			d3.select("#diffex_legend_upper")
				.append("div").style("margin-top","18px")
				.append("p").text("All clusters"); }
		
		if (blue_list.length > 0) {
			d3.select("#diffex_legend_lower")
				.selectAll(".diffex_legend_row")
				.data(blue_list).enter().append("div")
					.style("display","inline-block")
					.attr("class","diffex_legend_row")
					.style("height","22px")
					.style("margin-top","0px")
					.style("overflow","scroll")
					.style("background-color","#9999ff");
		} else {
			d3.select("#diffex_legend_lower")
				.append("div").style("margin-top","18px")
				.append("p").text("All clusters"); }

		d3.selectAll(".diffex_legend_row")
			.append("div")
			.attr("class","diffex_text_label_div")
			.append("p").text(function(d) { return d.name; })
			.style("float","left")
			.style("white-space","nowrap")
			.style("margin-top","-6px")
			.style("margin-left","3px");

	

	}




	
}

function make_diffex_spinner(element) {
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
		, zIndex: 3000 // The z-index (defaults to 2000000000)
		, className: 'diffex_spinner' // The CSS class to assign to the spinner
		, top: '30%' // Top position relative to parent
		, left: '50%' // Left position relative to parent
		, shadow: true // Whether to render a shadow
		, hwaccel: true // Whether to use hardware acceleration
		, position: 'absolute' // Element positioning
		}
	var target = document.getElementById(element);
	var spinner = new Spinner(opts).spin(target);
	$(target).data('spinner', spinner);
	d3.select(".diffex_spinner").style("visibility","hidden");
}
