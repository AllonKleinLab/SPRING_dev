function colorBar(project_directory) {
	
	/* -----------------------------------------------------------------------------------
										   Top menu bar 					
	*/
	var color_profiles = {};
	var color_option = "gradient"
	var color_max = 1;
	var color_stats = null;
	var menuBar = d3.select("#color_chooser")	
	

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
	
	function normalize(x,max) {
		min = 0;
		out = []
		for (var i = 0; i < x.length; i++) {
			if (x[i] > max) { out.push(1); }
			else if ( max==min ) { out.push(0); }
			else { out.push((x[i]-min)/(max-min)); }
		}
		return out;
	}
	
	function componentToHex(c) {
		var hex = c.toString(16);
		return hex.length == 1 ? "0" + hex : hex;
	}

	function rgbToHex(r, g, b) {
		return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
	}
		
	function setNodeColors() {
		
		if (document.getElementById('gradient_button').checked) {
			var current_selection = document.getElementById('gradient_menu').value
			var color_array = normalize(gene_set_color_array[current_selection],1);		
			for (var i = 0; i < color_array.length; i++) {
				node_dict[i].setColor(gradient_color(color_array[i]));
			}
			
		}
		
		if (document.getElementById('channels_button').checked) {
			var green_selection = document.getElementById('green_menu').value
			var green_array = all_gene_color_array[green_selection];
			var max = color_stats[green_selection];
			green_array = normalize(green_array,max[4] * .7);
				
			console.log(green_array);	
			for (var i = 0; i < green_array.length; i++) {
				var gg = Math.floor(green_array[i]*255);
				node_dict[i].setColor(rgbToHex(0,gg,0));
			}

		}
	
		if (document.getElementById('labels_button').checked) {
			var current_selection = document.getElementById('labels_menu').value
			var cat_color_map = categorical_coloring_data[current_selection]['label_colors'];
			var cat_label_list = categorical_coloring_data[current_selection]['label_list'];
			for (var i = 0; i < cat_label_list.length; i++) {
				node_dict[i].setColor(cat_color_map[cat_label_list[i]]);
			
			}
		}
		
		graph.syncDataToFrames()
		
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
	all_gene_color_array = {};
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
						dict = read_csv(text);
						for (var attrname in dict) { 
							if (attrname != "") { 
								all_gene_color_array[attrname] = dict[attrname]; 
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
			d3.select("#green_menu")[0][0].value = 'Elane';
			update_slider();
		}
	}
	d3.json(project_directory+"/color_stats.json", function(data) { color_stats = data; });
	addChunk(0,"");
	
	

	function update_slider() {
		setNodeColors();		
	}
	
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
















