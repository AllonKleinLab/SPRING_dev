function colorBar(project_directory, counts_stream) {
	
	/* -----------------------------------------------------------------------------------
										   Top menu bar 					
	*/
	var color_profiles = {};
	var color_option = "gradient"
	var color_max = 1;
	var color_stats = null;
	var menuBar = d3.select("#color_chooser")	
	
	svg_width = parseInt(d3.select("svg").attr("width"));
	svg_height = parseInt(d3.select("svg").attr("height"));

	/* -------------------------------    Gene menu    ---------------------------- */
	menuBar.append("div")
		.append("p").text("Genes")
		
	var channelsButton = menuBar.append("input")
		.attr("id","channels_button")
		.style("margin-left", "2px")
		.attr("type","radio")
		.attr("checked",true)
		.on("click", function() {
			document.getElementById("gradient_button").checked = false;
			document.getElementById("labels_button").checked = false;
			update_slider();
		})
			
	var greenMenu = menuBar.append("select")
		.attr("id","green_menu")
		.style("margin-left", "2px")
		.style("font-size","13px")
		.style("background-color", "#b3ffb3")
		.on("change", function() { update_slider(); })
		.sort(function(a,b) {
			if (a.text > b.text) return 1;
			else if (a.text < b.text) return -1;
			else return 0;
		});
		
	/* -------------------------------    Label menu    ---------------------------- */
	menuBar.append("div")
		.append("p").text("Cell labels");
		
	var labelsButton = menuBar.append("input")
		.style("margin-left", "2px")
		.attr("id","labels_button")
		.attr("type","radio")
		.on("click", function() {
			document.getElementById("channels_button").checked = false;
			document.getElementById("gradient_button").checked = false;
			update_slider();
		})	
	
	var labelsMenu = menuBar.append("select")
		.style("margin-left", "3px")
		.style("font-size","13px")
		.style("background", "linear-gradient(to right, #FFBABA, #FFFCBA, #C4FFBA, #BAFFFE, #BAC0FF, #FCBAFF)")
		.attr("id","labels_menu")
		.on("change", function() { update_slider(); });

		
	menuBar.selectAll("options")
		.style("font-size","6px");
	
	/* -------------------------------    Gradient menu    ---------------------------- */
	menuBar.append("div")
		.append("p").text("Gene sets / custom colors");
		
	var gradientButton = menuBar.append("input")
		.style("margin-left", "2px")
		.attr("id","gradient_button")
		.attr("type","radio")
		.on("click", function() {
			document.getElementById("channels_button").checked = false;
			document.getElementById("labels_button").checked = false;
			update_slider();
		})	
	
	var gradientMenu = menuBar.append("select")
		.style("margin-left", "3px")
		.style("font-size","13px")
		.style("background", "linear-gradient(to right, #ff9966 , #ffff99)")
		.attr("id","gradient_menu")
		.on("change", function() { update_slider(); });

	/* -----------------------------    Populate menus    ---------------------------- */	
	var dispatch = d3.dispatch("load", "statechange");
	dispatch.on("load", function(data, tag) {
		if (tag=="gene_sets") { var select = gradientMenu; }	
		else if (tag =="all_genes") { var select = greenMenu; }	
		else { var select = labelsMenu; }				
		select.selectAll("option")
			.data(Object.keys(data))
			.enter().append("option")
			.attr("value", function(d) { return d; })
			.text(function(d) { return d; });
		
		dispatch.on("statechange", function(state) {
			select.property("value", state.id);
		});
	});
	
	/* -----------------------------------------------------------------------------------
										   Graph coloring					
	*/

	var gradient_color = d3.scale.linear()
		.domain([0, .5, 1])
		.range(["black", "red", "yellow"]);
	
	function normalize(x) {
		min = 0; max = color_max;
		out = []
		for (var i = 0; i < x.length; i++) {
			if (x[i] > max) { out.push(1); }
			else if ( max==min ) { out.push(0); }
			else { out.push((x[i]-min)/(max-min)); }
		}
		return out;
	}
		
	function setNodeColors() {
		if (document.getElementById('gradient_button').checked) {
			var current_selection = document.getElementById('gradient_menu').value
			var color_array = normalize(gene_set_color_array[current_selection]);
			d3.select(".node").selectAll("circle")
				.style("fill", function(d) {
					x = color_array[d.number]
					d.color_val = color_array[d.number];
					return gradient_color(x) ;
				})
		}	
		if (document.getElementById('channels_button').checked) {			
            var green_selection = document.getElementById('green_menu').value
            var green_array_sparse = all_gene_color_array[green_selection];
            var cell_indices = all_gene_cellix_array[green_selection];
            var green_array = [];

            for (var ii = 0; ii < n_nodes; ii++) {
                green_array.push(0.0);
            };

            for (var ii = 0; ii < cell_indices.length; ii++) {
                green_array[cell_indices[ii]] = green_array_sparse[ii];
            }

            green_array = normalize(green_array);
			
			d3.select(".node").selectAll("circle")
				.style("fill", function(d) {
					var g = green_array[d.number];
					d.color_val = g;
					return d3.rgb(0,g*255,0);
				})
		}
		if (document.getElementById('labels_button').checked) {
		var name = document.getElementById('labels_menu').value; 
		var cat_color_map = categorical_coloring_data[name]['label_colors'];
		var cat_label_list = categorical_coloring_data[name]['label_list'];
		d3.select(".node").selectAll("circle")
			.style("fill", function(d) {
				return cat_color_map[cat_label_list[d.number]] ;
			})
		}
		
		d3.select(".node").selectAll("circle").sort(function(a,b) {
			a_priority = a.selected || a.inPath
			b_priority = b.selected || b.inPath
			if (a_priority && !b_priority) { return 1; }
			if (!a_priority && b_priority) { return -1; }
			if (a.color_val > b.color_val) { return 1; }
			if (a.color_val < b.color_val) { return -1; }
		});
		
	}	

	/* -----------------------------------------------------------------------------------
					 				Color slider			
	*/
	
	var yellow_gradient = d3.select("svg").append("defs").append("linearGradient")
		.attr("id", "yellow_gradient").attr("x1", "0%").attr("y1", "0%").attr("x2", "100%").attr("y2", "0%").attr("spreadMethod", "pad");
	yellow_gradient.append("stop").attr("offset", "0%").attr("stop-color", "black").attr("stop-opacity", 1);
	yellow_gradient.append("stop").attr("offset", "50%").attr("stop-color", "red").attr("stop-opacity", 1);
	yellow_gradient.append("stop").attr("offset", "100%").attr("stop-color", "yellow").attr("stop-opacity", 1);
		
	var green_gradient = d3.select("svg").append("defs").append("linearGradient")
		.attr("id", "green_gradient").attr("x1", "0%").attr("y1", "0%").attr("x2", "100%").attr("y2", "0%").attr("spreadMethod", "pad");
	green_gradient.append("stop").attr("offset", "0%").attr("stop-color", "black").attr("stop-opacity", 1);
	green_gradient.append("stop").attr("offset", "100%").attr("stop-color", d3.rgb(0,255,0)).attr("stop-opacity", 1);
	
	
	
	var slider_scale = d3.scale.linear()
		.domain([0, 10])
		.range([0, svg_width / 3])
		.clamp(true);

	var slider = d3.select("svg").append("g")
		.attr("class","colorbar_item")
		.attr("id", "slider")
		.attr("transform", "translate(" + svg_width/3 + "," + 42 + ")");
	var slider_select_button = d3.select("svg").append("rect")
		.attr("class","colorbar_item")
		.attr("id", "slider_select_button")
		.attr("transform", "translate(" + parseInt(svg_width/2-54.5) + "," + 9.5 + ")")
		.style("width","114px").style("height","17px")
		.style("fill-color","black")
		.style("fill-opacity",0.25)
		.on("click", toggle_slider_select)
	d3.select("svg")
		.append("text").attr("pointer-events","none")
		.attr("class","colorbar_item")
		.attr("x", svg_width/2-50).attr("y", 22).attr("font-family", "sans-serif")
		.attr("font-size", "12px").attr("fill", "yellow").text("Expression selector")

		
		
	var current_value = 0

	slider.append("line")
		.attr("class","colorbar_item")
		.attr("id", "track")
		.attr("x1", slider_scale.range()[0])
		.attr("x2", slider_scale.range()[1])
		.select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
        .attr("id", "track-inset")
        .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
		.attr("id", "track-overlay");
	
	var slider_gradient = slider.append("rect")
		.attr("class","colorbar_item")
		.attr("id","gradient_bar")
		.attr("fill","url(#yellow_gradient)")
		.attr("x",-2)
		.attr("y",-3.5)
		.attr("width",1)
		.attr("height",7)
	
	var handle = slider.insert("circle", "#track-overlay")
		.attr("class","colorbar_item")
		.attr("id", "handle")
		.style("fill","#FFFF99")
		.attr("r", 8);	
	
	var left_bracket = slider.append("rect", "#track-overlay")
		.attr("class","colorbar_item")
		.attr("id", "left_bracket")
		.style("fill","yellow")
		.attr("width", 6.5)
		.attr("height", 21)
		.attr("x",110)
		.attr("y",-10)
		.style("visibility","hidden");
	
	var right_bracket = slider.append("rect", "#track-overlay")
		.attr("class","colorbar_item")
		.attr("id", "right_bracket")
		.style("fill","yellow")
		.attr("width", 6.5)
		.attr("height", 21)
		.attr("x",240)
		.attr("y",-10)
		.style("visibility","hidden");
		
	var ceiling_bracket = slider.append("rect", "#track-overlay")
		.attr("class","colorbar_item")
		.attr("id", "ceiling_bracket")
		.style("fill","yellow")
		.attr("width", 136.5)
		.attr("height", 5)
		.attr("x",110)
		.attr("y",-12)
		.style("visibility","hidden");
		
	var floor_bracket = slider.append("rect", "#track-overlay")
		.attr("class","colorbar_item")
		.attr("id", "floor_bracket")
		.style("fill","yellow")
		.attr("width", 136.5)
		.attr("height", 5)
		.attr("x",110)
		.attr("y",6)
		.style("visibility","hidden");
	
		
	var slider_ticks = slider.insert("g", "#track-overlay")
		.attr("class","colorbar_item")
		.attr("id", "ticks")
		.attr("transform", "translate(0," + 18 + ")")
		.selectAll("text")
		.data(slider_scale.ticks(10))
		.enter().append("text")
		.attr("x", slider_scale)
		.attr("text-anchor", "middle")
		.text(function(d) { return d});
	
			
	d3.select("#legend")
		.style("left",(svg_width-210).toString()+"px")
		.style("height",(svg_height-158).toString()+"px");
		
	var legendMask = d3.select("svg").append("rect")
		.attr("class","colorbar_item")
		.attr("id","legend_mask")
		.attr("x", svg_width)
		.attr("y",158)
		.attr("fill-opacity",.35)
		.attr("width", 400)
		.attr("height",d3.select("svg").attr("height"));

	var drag_mode = null;
	slider.call(d3.behavior.drag()
		.on("dragstart", function() { 
			var cx = d3.event.sourceEvent.x-svg_width/3;
			if (Math.abs(cx - left_bracket.attr("x"))<12 && (d3.select("#left_bracket").style("visibility")=="visible")) {
				drag_mode = 'left_bracket';
			} else if (Math.abs(cx - right_bracket.attr("x"))<12  && (d3.select("#right_bracket").style("visibility")=="visible")) {
				drag_mode = 'right_bracket';
			} else {
				drag_mode = 'handle';
			}
		})
		.on("drag", function() {
			var cx = d3.event.x-svg_width/3;
			if (drag_mode == 'left_bracket') { set_left_bracket(cx); }
			if (drag_mode == 'right_bracket') { set_right_bracket(cx); }
			else if (drag_mode == 'handle') { set_slider_position(cx); }
		})
		.on("dragend", function() { slider.interrupt(); }));

	function toggle_slider_select() {
		if (d3.select("#slider_select_button").style("stroke")=="none") {
			show_slider_select();
		} else {
			hide_slider_select();
		}
	}
	
	function show_slider_select() {
		d3.select("#slider_select_button")
			.style("fill-opacity",0.7)
			.style("stroke","yellow");	
		d3.select("#left_bracket").style("visibility","visible")
		d3.select("#right_bracket").style("visibility","visible")
		d3.select("#floor_bracket").style("visibility","visible")
		d3.select("#ceiling_bracket").style("visibility","visible")	
		slider_select_update();
	}
	
	function hide_slider_select() {
		d3.select("#slider_select_button")
			.style("fill-opacity",0.25)
			.style("stroke","none");
		d3.select("#left_bracket").style("visibility","hidden")
		d3.select("#right_bracket").style("visibility","hidden")
		d3.select("#floor_bracket").style("visibility","hidden")
		d3.select("#ceiling_bracket").style("visibility","hidden")
	}
	
	function set_left_bracket(h) {
		var cx = slider_scale(slider_scale.invert(h))
		var w = parseInt(d3.select("#right_bracket").attr("x")) - cx + 6.5
		if (w > 12) {
			d3.select("#left_bracket").attr("x",cx)
			floor_bracket.attr("x",cx).style("width",w+"px")
			ceiling_bracket.attr("x",cx).style("width",w+"px")
			slider_select_update();
		}
	}
	
	function set_right_bracket(h) {
		var cx = slider_scale(slider_scale.invert(h))
		var w = cx - parseInt(d3.select("#left_bracket").attr("x")) + 6.5
		if (w > 12) {
			d3.select("#right_bracket").attr("x",cx)
			floor_bracket.style("width",w+"px")
			ceiling_bracket.style("width",w+"px")
			slider_select_update();
		}
	}
	
	function slider_select_update() {
		var color_array = null;
		if (document.getElementById('gradient_button').checked) {
			var current_selection = document.getElementById('gradient_menu').value
			color_array = gene_set_color_array[current_selection];
		}	
		if (document.getElementById('channels_button').checked) {			
			var green_selection = document.getElementById('green_menu').value
			color_array = all_gene_color_array[green_selection];
		}
		if (color_array != null) {
			var lower_bound = slider_scale.invert(left_bracket.attr("x"));
			var upper_bound = slider_scale.invert(right_bracket.attr("x"));
			d3.selectAll(".node circle").classed("selected", function(d) {
				var x = color_array[d.number]; 
				if (x >= lower_bound && x <= upper_bound) { 
					d.selected = true; return true;
				} else {
					d.selected = false; return false;
				}
			});

		}
	}

	function update_slider() {
		
		d3.select("#label_column").selectAll("div").remove();
		d3.select("#count_column").selectAll("div").remove();
		if (document.getElementById('labels_button').checked) {
			d3.selectAll("#gradient_bar").attr("fill","#7e7e7e");
			d3.selectAll("#handle").style("fill","#7e7e7e");
			var name = document.getElementById('labels_menu').value; 
			var cat_color_map = categorical_coloring_data[name]['label_colors'];
			var cat_label_list = categorical_coloring_data[name]['label_list'];
			legendMask.transition().attr("x", svg_width-170)
				.each("end", function() { make_legend(cat_color_map,cat_label_list); });
		} else {
			legendMask.transition().attr("x", svg_width)
			if (color_stats == null) { return; }
			if (document.getElementById('gradient_button').checked) {
				var name = document.getElementById('gradient_menu').value; 
				d3.selectAll("#gradient_bar").attr("fill","url(#yellow_gradient)")
				d3.selectAll("#handle").style("fill","#FFFF99");
			} else {
				var name = document.getElementById('green_menu').value; 
				d3.selectAll("#gradient_bar").attr("fill","url(#green_gradient)")
				d3.selectAll("#handle").style("fill",d3.rgb(0,255,0));	
			}	
			var max = color_stats[name][3];
			slider_scale.domain([0, max]);
			set_slider_position(slider_scale(color_stats[name][4]));
		
		
			slider_ticks.remove();
			d3.select(".ticks").remove();
		
			if (max < 1) { ticknum = max * 10; }
			else if (max < 2) { ticknum = max * 5; }
			else if (max < 10) { ticknum = max; }
			else if (max < 50) { ticknum = max / 5; }
			else if (max < 100){ ticknum = max / 10; }
			else if (max < 200){ ticknum = max / 20; }
			else if (max < 1000){ ticknum = max / 100; }
			else if (max < 20000) { ticknum = max / 1000; }
			else if (max < 200000) { ticknum = max / 10000; }
			else if (max < 2000000) { ticknum = max / 100000; }
			else if (max < 20000000) { ticknum = max / 1000000; }
	
			slider_ticks = slider.insert("g", ".track-overlay")
				.attr("class","colorbar_item")
				.attr("id", "ticks")
				.attr("transform", "translate(0," + 18 + ")")
				.selectAll("text")
				.data(slider_scale.ticks(ticknum))
				.enter().append("text")
				.attr("x", slider_scale)
				.attr("text-anchor", "middle")
				.text(function(d) { return d});
		
			if (document.getElementById('gradient_button').checked) {	
				d3.select(".ticks").append("text").attr("x",svg_width/3+10).text("Z-score");
			} else {
				d3.select(".ticks").append("text").attr("x",svg_width/3+10).text("UMIs");
			}
		}	
		setNodeColors();
		if (left_bracket.style("visibility") == "visible") {
			slider_select_update();
		}
		
	}
	
	
	function set_slider_position(h) {
  		handle.attr("cx",slider_scale(slider_scale.invert(h)));
  		slider_gradient.attr("width",Math.max(slider_scale(slider_scale.invert(h))-6,0));
  		color_max = slider_scale.invert(h);
  		setNodeColors();
	}

function make_legend(cat_color_map,cat_label_list) {
	d3.select("#count_column").selectAll("div")
		.data(Object.keys(cat_color_map)).enter().append("div")
			.style("display","inline-block")
			.attr("class","text_count_div")
			.style("height","25px")
			.style("margin-top","0px")
			.style("width","40px")
			.style("overflow","scroll")
			.style("background-color","rgba(0,0,0,0)")
			.append("p").text("");
	
	d3.select("#label_column").selectAll("div")
		.data(Object.keys(cat_color_map)).enter().append("div")
			.style("display","inline-block")
			.attr("class","legend_row")
			.style("height","25px")
			.style("margin-top","0px")
			.style("width","152px")
			.style("overflow","scroll");

	d3.select("#label_column").selectAll("div").each(function(d) {
		d3.select(this).append("div")
			.style("background-color",cat_color_map[d])
		d3.select(this).append("div")
			.attr("class","text_label_div")
			.append("p").text(d)
			.style("float","left")
			.style("white-space","nowrap")
			.style("margin-top","-6px")
			.style("margin-left","3px");
	});
	d3.selectAll(".legend_row")
		.style("width","152px")	
		.style("background-color","rgba(0, 0, 0, 0)")
		//.on("mouseover", function(d) { d3.selectAll(".legend_row").style("background-color","rgba(0, 0, 0, 0.3)"); })
		//.on("mouseout", function(d) { d3.selectAll(".legend_row").style("background-color","rgba(0, 0, 0, 0)");})
		.on("click", function(d) { 
			var my_cells = d3.selectAll(".node circle").filter(function(dd) { return cat_label_list[dd.number]==d; }) // classed("selected", function(dd) {  
			any_selected = false; my_cells.each(function(d) { if (d.selected) { any_selected = true; } });
			my_cells.classed("selected", function(d) {  
				if (any_selected) { d.selected = false; return false}
				else { d.selected = true; return true}
			});
			count_clusters();
		});
	count_clusters();
	
}




function count_clusters() {

	var name = document.getElementById('labels_menu').value; 
	var cat_color_map = categorical_coloring_data[name]['label_colors'];
	var cat_label_list = categorical_coloring_data[name]['label_list'];

	counts = {}
	Object.keys(cat_color_map).forEach(function(d) { counts[d]=0; });
	d3.selectAll(".node .selected").each(function(d) {
		counts[cat_label_list[d.number]] += 1;
	})
	
	d3.select("#count_column").selectAll("div").each(function(d) {
		d3.select(this)
			.style("background-color","rgba(0,0,0,0)")
			.select("p").text("")
		if (counts[d] > 0) {
			d3.select(this)
				.style("background-color","rgba(0,0,0,.3)")
				.select("p").text(counts[d]);
		}
	});
	
}
		
	/* -----------------------------------------------------------------------------------
									  Load expression data 					
	*/

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
	
	function read_csv_to_sparse(text) {
		// Reads a traditional gene_colors chunk .csv but stores it in memory in sparse format
		dict = {};
		cell_dict = {};
		text.split('\n').forEach(function(entry,index,array) {
			items = entry.split(',')
			gene = items[0]
			exp_array = []
			cell_array = []
			items.forEach(function(e,i,a) {
				if (i > 0) { if (parseFloat(e) > 0) {exp_array.push(parseFloat(e)); cell_array.push(i-1); }}
			});
			dict[gene] = exp_array
			cell_dict[gene] = cell_array
		});
		return [dict, cell_dict]
	}
	
	all_gene_color_array = {};
	all_gene_cellix_array = {};
	
	function read_sparse_exp(fname, callback) {
		d3.text(fname, function(text) {
			text.split('\n').forEach(function(entry,index,array) {
				items = entry.split(',')
				gene = items[0]
				if (gene != "") {
					exp_array = []
					items.forEach(function(e,i,a) {
						if (i > 0) { exp_array.push(parseFloat(e)); }
					});
					all_gene_color_array[gene] = exp_array;
				}
			});
			callback(null)
		});
	}
	
	function read_sparse_cell_index(fname, callback) {
		d3.text(fname, function(text) {
			text.split('\n').forEach(function(entry,index,array) {
				items = entry.split(',')
				gene = items[0]
				if (gene != "") {
					cell_array = []
					items.forEach(function(e,i,a) {
						if (i > 0) { cell_array.push(parseInt(e)); }
					});
					all_gene_cellix_array[gene] = cell_array;
				}
			});
			callback(null)
		});
	}

	function read_sparse_stream(indat, callback) {
        console.log('reading counts from stream');
		indat.split('\n').forEach(function(entry,index,array) {
            if (entry.length > 0) {
		    	items = entry.split('\t');
		    	gene = items[0];
                counts = items[1].split(',');
                indices = items[2].split(',');
		    	if (gene != "") {
		    		cell_array = [];
                    exp_array = [];
		    		counts.forEach(function(e,i,a) {
                        exp_array.push(parseFloat(e));
		    		});
		    		indices.forEach(function(e,i,a) {
                        cell_array.push(parseInt(e));
		    		});
		    		all_gene_cellix_array[gene] = cell_array;
                    all_gene_color_array[gene] = exp_array;
		    	}
            }
		});
        callback(null);
	}

	// open json file containing gene sets and populate drop down menu
	d3.text(project_directory+"/color_data_gene_sets.csv", function(text) {
		gene_set_color_array = read_csv(text);
		dispatch.load(gene_set_color_array,"gene_sets")	;	
		update_slider();
	});
	
	
	// open json file containing gene sets and populate drop down menu
	d3.json(project_directory+"/categorical_coloring_data.json", function(data) {
		categorical_coloring_data = data;
		dispatch.load(categorical_coloring_data,"cell_labels");	
		update_slider();
	});


	// open json file containing all genes and populate drop down menu
	function addChunk(j,dict) {
		var NN = 50;
		if (j < NN) {
			var fname = project_directory+"/gene_colors/color_data_all_genes-"+j.toString()+".csv";
			$.ajax({
				url:fname,
				type:'HEAD',
				error: function() {
					addChunk(j+1,dict);
				},
				success: function() {
					var message = "Loading "+j.toString()+"/50";
					greenMenu.append("option").text(message);
					greenMenu.property("value",message);
					d3.text(fname, function(text) {
						dat = read_csv_to_sparse(text);
						dict = dat[0];
						cell_dict = dat[1];
						for (var attrname in dict) { 
							if (attrname != "") { 
								all_gene_color_array[attrname] = dict[attrname];
								all_gene_cellix_array[attrname] = cell_dict[attrname];
							}
						}
						addChunk(j+1,dict);
					});
				}
			});
		}
			
		if (j == NN) {
			greenMenu.selectAll("option").remove();
			dispatch.load(all_gene_color_array,"all_genes");
			update_slider();
		}
	}
	function loadGenes(url) {
		var xhr = new XMLHttpRequest();
		xhr.open("HEAD", url, true);
		xhr.send();
		xhr.onloadend = function() {
			if(xhr.status == 404) {
				console.log('Loading genes from old format.')
				addChunk(0,"");
			}
			else {
				console.log('Loading genes from sparse format.')
				addChunkSparse(0,"");
			}
		}
	}
	function addChunkSparse(j,dict) {
		var message = "Loading genes";
		greenMenu.append("option").text(message);
		greenMenu.property("value",message);

		var fname1 = project_directory+"/E_sparse_counts.csv";
		var fname2 = project_directory+"/E_sparse_index.csv";

		d3.queue()
		  .defer(read_sparse_exp, fname1)
			.defer(read_sparse_cell_index, fname2)
			.await(function(error) {
				greenMenu.selectAll("option").remove();
				dispatch.load(all_gene_color_array,"all_genes");
				update_slider();
			});
	}
	
	
    function addStreamExp(counts_stream) {
		var message = "Loading genes";
		greenMenu.append("option").text(message);
		greenMenu.property("value",message);

        d3.queue()
          .defer(read_sparse_stream, counts_stream)
          .await(function(error) {
              greenMenu.selectAll("option").remove();
	          dispatch.load(all_gene_color_array,"all_genes");
			  update_slider();
              //counts_stream = null;
          });
    }
	
	
	d3.json(project_directory+"/color_stats.json", function(data) { color_stats = data; });
	//loadGenes(project_directory+"/E_sparse_counts.csv");
	//read_sparse_stream(counts_stream);
	addStreamExp(counts_stream);
	
	
	/* -----------------------------------------------------------------------------------
					 Create button for showing enriched gene for a selection				
	*/
	
	
	d3.select("#termsheet").attr("height",svg_height-5);

	var rankedGenesButtonRect = d3.select("svg").append("rect")
		.attr("class","colorbar_item")
		.attr("x", -70)
		.attr("y", 24)
		.attr("fill-opacity",.35)
		.attr("width", 200)
		.attr("height", 24)
		.on("click", function() {
			showRankedGenes();
		});

	var rankedGenesButtonLabel = d3.select("svg").append("text")
		.attr("class","colorbar_item")
		.attr("x", 6)
		.attr("y", 40)
		.attr("font-family", "sans-serif")
		.attr("font-size", "12px")
		.attr("fill", "white")
		.text("Show enriched genes")
		.attr("pointer-events","none");
		
	
	var rankedMask = d3.select("svg").append("rect")
		.attr("class","colorbar_item")
		.attr("x", -200)
		.attr("y", 48)
		.attr("fill-opacity",.35)
		.style("color","gray")
		.attr("width", 200)
		.attr("height",d3.select("svg").attr("height"));

	exoutGenesButtonLabel = d3.select("svg").append("text")
		.attr("class","colorbar_item")
		.attr("x",180)
		.attr("y",41)
		.attr("font-family", "sans-serif")
		.attr("font-size", "14px")
		.attr("fill", "white")
		.attr("width",40)
		.text("X")
		.attr("pointer-events","none")
		.style("opacity",0);


	var exoutGenesButton = d3.select("svg").append("rect")
		.attr("class","colorbar_item")
		.attr("x",170)
		.attr("y",24)
		.attr("width",40)
		.attr("height",30)
		.attr("fill-opacity",0)
		.on("click", function() {
			hideRankedGenes();
		});
	
	function showRankedGenes() {
		if (color_stats != null) {
			if (d3.select("#sound_toggle").select("img").attr("src") == "scripts_1_5/sound_effects/icon_speaker.svg") {
				var snd = new Audio("scripts_1_5/sound_effects/openclose_sound.wav"); snd.play(); } 
			setNodeColors();
			hideRankedTerms();
			d3.select("#termsheet").style("left","10px");
			d3.select("#termcolumn").selectAll("div").remove()
			d3.select("#scorecolumn").selectAll("div").remove()
			rankedMask.transition().attr("x",0)
				.each("end", function() { renderRankedText(all_gene_color_array, 1); });
			rankedGenesButtonRect.transition().attr("x",0);
			rankedTermsButtonRect.transition().attr("x",0);
			exoutGenesButtonLabel.transition().delay(200).style("opacity",1);	
		}
	}
	
	function hideRankedGenes() {
		if (d3.select("#sound_toggle").select("img").attr("src") == "scripts_1_5/sound_effects/icon_speaker.svg") {
			var snd = new Audio("scripts_1_5/sound_effects/openclose_sound.wav"); snd.play(); }
		d3.select("#termsheet").style("left","-200px");
		d3.select("#termcolumn").selectAll("div").remove()
		d3.select("#scorecolumn").selectAll("div").remove()
		rankedMask.transition().attr("x",-200);
		rankedTermsButtonRect.transition().attr("x",-70);
		rankedGenesButtonRect.transition().attr("x",-70);
		exoutGenesButtonLabel.style("opacity",0);
	}
	

	
	/* -----------------------------------------------------------------------------------
					 Create button for showing enriched gene set for a selection				
	*/
				
	var rankedTermsButtonRect = d3.select("svg").append("rect")
		.attr("class","colorbar_item")
		.attr("x", -70)
		.attr("y", 0)
		.attr("fill-opacity",.35)
		.attr("width", 200)
		.attr("height", 24)
		.on("click", function() {
			showRankedTerms();
		});


	var rankedTermsButtonLabel = d3.select("svg").append("text")
		.attr("class","colorbar_item")
		.attr("x", 6)
		.attr("y", 16)
		.attr("font-family", "sans-serif")
		.attr("font-size", "12px")
		.attr("fill", "white")
		.text("Show enriched terms")
		.attr("pointer-events","none");
				
	var exoutTermsButtonLabel = d3.select("svg").append("text")
		.attr("class","colorbar_item")
		.attr("x",180)
		.attr("y",17)
		.attr("font-family", "sans-serif")
		.attr("font-size", "14px")
		.attr("fill", "white")
		.attr("width",40)
		.text("X")
		.style("opacity",0)
		.attr("pointer-events","none");
		
		
	var exoutTermsButton = d3.select("svg").append("rect")
		.attr("class","colorbar_item")
		.attr("x",170)
		.attr("y",0)
		.attr("width",30)
		.attr("height",30)
		.attr("fill-opacity",0)
		.on("click", function() {
			hideRankedTerms();
		});

	function showRankedTerms() {
		if (color_stats != null) {
			
			if (d3.select("#sound_toggle").select("img").attr("src") == "scripts_1_5/sound_effects/icon_speaker.svg") {
				var snd = new Audio("scripts_1_5/sound_effects/openclose_sound.wav"); snd.play(); }
			setNodeColors();
			hideRankedGenes();
			d3.select("#termsheet").style("left","10px");
			d3.select("#termcolumn").selectAll("div").remove()
			d3.select("#scorecolumn").selectAll("div").remove()
			rankedMask.transition().attr("x",0)
				.each("end", function() { renderRankedText(gene_set_color_array, 0); });
			rankedGenesButtonRect.transition().attr("x",0);
			rankedTermsButtonRect.transition().attr("x",0);		
			exoutTermsButtonLabel.transition().delay(200).style("opacity",1);
		}
	}

	
	function hideRankedTerms() {
		if (d3.select("#sound_toggle").select("img").attr("src") == "scripts_1_5/sound_effects/icon_speaker.svg") {
				var snd = new Audio("scripts_1_5/sound_effects/openclose_sound.wav"); snd.play(); }
		d3.select("#termsheet").style("left","-200px");
		d3.select("#termcolumn").selectAll("div").remove()
		d3.select("#scorecolumn").selectAll("div").remove()
		rankedMask.transition().attr("x",-200);
		rankedTermsButtonRect.transition().attr("x",-70);
		rankedGenesButtonRect.transition().attr("x",-70);
		exoutTermsButtonLabel.style("opacity",0);
	}
	
	function renderRankedText(tracks, version) {
		if (d3.selectAll("circle.selected")[0].length == 0) {
			d3.select("#termcolumn").append("div").append("p").text("No cells selected");
		}
		else {
			rankedText = getRankedText(tracks, version) 
			scorecol = rankedText[1];
			termcol = [] 
			rankedText[0].forEach(function(d) { 
				var term = d;
				termcol.push(term);
			});
			
		d3.select("#termcolumn").selectAll("div")
			.data(termcol).enter()
			.append("div").append("p")
			.text(function(d) { 
				if ( d.length < 20 ) { return d; }
				else { return d.slice(0,17)+'...'; } 
			});	

		d3.select("#scorecolumn").selectAll("div")
			.data(scorecol).enter()
			.append("div").append("p")
			.text(function(d) { return d; });
			
		d3.select("#termcolumn").selectAll("div")
			.style("background-color","rgba(0, 0, 0, 0)")
			.on("mouseover", function(d) { d3.select(this).style("background-color","rgba(0, 0, 0, 0.3)");})
			.on("mouseout", function(d) { d3.select(this).style("background-color","rgba(0, 0, 0, 0)");})
			.on("click", function(d) { 
				if (exoutGenesButtonLabel.style("opacity") == 1) {
					document.getElementById('channels_button').checked = true;
					document.getElementById('gradient_button').checked = false;
					document.getElementById('labels_button').checked = false;
					d3.select("#green_menu")[0][0].value = d;		
				}
				if (exoutTermsButtonLabel.style("opacity") == 1) { 
					document.getElementById('channels_button').checked = false;
					document.getElementById('gradient_button').checked = true;
					document.getElementById('labels_button').checked = false;
					d3.select("#gradient_menu")[0][0].value = d;			
				}
				update_slider();
			});
		
		}
	}
		
	
	function getRankedText(tracks, version) {
		var selected_nodes  = d3.selectAll(".selected");
		var compared_nodes  = d3.selectAll(".compared");
		scoremap = d3.map();
		var scoretotal = 0;
		for (var term in tracks) {
			var selected_score; var compared_score;
			if (selected_nodes[0].length > 0 || compared_nodes[0].length > 0) {
				if (version == 0) {
					dat = tracks[term];
				}
				else {
					var dat_sparse = tracks[term];
					var nonzero_cell_ix = all_gene_cellix_array[term];
					dat = [];
					for (var ii=0; ii<n_nodes; ii++){  //gene_set_color_array['Uniform']) {
						dat.push(0.0);
					};
					for (ii = 0; ii < nonzero_cell_ix.length; ii++) {
						dat[nonzero_cell_ix[ii]] = dat_sparse[ii];
					};
				}
			}
			
			if (selected_nodes[0].length == 0) { selected_score = 0; }
			else { 
				selected_score = getTermScore(dat, selected_nodes) / selected_nodes[0].length;
				selected_score = (selected_score - color_stats[term][0]) / (color_stats[term][1] + .02)
			}
			if (compared_nodes[0].length == 0) { compared_score = 0; }
			else { 
				compared_score = getTermScore(dat, compared_nodes) / compared_nodes[0].length;
				compared_score = (compared_score - color_stats[term][0]) / (color_stats[term][1] + .02)
			}	
			scoremap[term] = (selected_score - compared_score) 
		}
		tuples = [];
		for (var key in scoremap) {
			if (typeof(key)=="string") {
				if (key.length > 1) {
					tuples.push([key, scoremap[key]]);
				}
			}
		}	
		tuples.sort(function(a, b) {
			return b[1] - a[1];
		});
		termcol = ['Term'],
		scorecol = ['Z-score'];
		tuples.forEach(function(d) {
			numline = d[1].toString().slice(0,5);
			termcol.push(d[0]);
			scorecol.push(numline);
		});
		return [termcol.slice(0,1000),scorecol.slice(0,1000)]
	}
	
	function getTermScore(a, nodes) {
		var score = 0
		nodes.each(function(d) {
			score = score + (a[d.number]+.01);
		});
		return score;
	}
	
	function downloadFile(text,name) {
		if (d3.select("#sound_toggle").select("img").attr("src") == "scripts_1_5/sound_effects/icon_speaker.svg") {
			var snd = new Audio("scripts_1_5/sound_effects/download_sound.wav"); snd.play(); }
		var hiddenElement = document.createElement('a');
		hiddenElement.href = 'data:attachment/text,' + encodeURI(text);
		hiddenElement.target = '_blank';
		hiddenElement.download = name;
		hiddenElement.click();
	}

	downloadRankedTerms = function downloadRankedTerms() {	
		if ((d3.selectAll("circle.selected")[0].length == 0) && (rankedMask.attr("x") == -200)) {
			text = "No cells selected!"; }
		else {
			var text = "Selected cells: "
			d3.select(".node").selectAll("circle").each(function(d) {
				if (d.selected) {
					text = text + d.name + ",";
				}
			});
			text = text.slice(0,text.length-1) + "\n";
	
			if (rankedMask.attr("x") == -200) {
				if (document.getElementById('gradient_button').checked) {
					var tracks = gene_set_color_array;
					var sparse_version = 0;
				} else { var tracks = all_gene_color_array; var sparse_version = 1; }	
				rankedTerms = getRankedText(tracks, sparse_version).slice(0,1000)
				termcol = rankedTerms[0];
				scorecol = rankedTerms[1];	
			}
			else { 
				termcol = []; scorecol = [];
				d3.select("#termcolumn").selectAll("div").each(function(d) { termcol.push(d); });
				d3.select("#scorecolumn").selectAll("div").each(function(d) { scorecol.push(d); });	
			}
			termcol.forEach(function(d,i) { 
				text = text + "\n" + d + "\t" + scorecol[i];
			});
		}
		downloadFile(text,"enriched_terms.txt")
	}
}
