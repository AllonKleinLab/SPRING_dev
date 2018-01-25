function settings_setup() {

	var dropdown = d3.select("#button_panel").append("div")
		.attr("id","settings_dropdown")
	
	var slider_scroller = dropdown.append("div")
		.attr("id","settings_slider_scroller");
		
	dropdown.append("div")
		.attr("class","settings_slider_box")
		.style("height","40px")
		.style("background-color","rgb(100,100,100)")
		.append("button")
			.attr("id","settings_restore_defaults_button")
			.style("visibility","hidden")
			.text("Restore defaults")
			.on("click", restore_defaults);


	add_slider_box(slider_scroller,"settings_range_node_repulsion","Physics: node repulsion")
	add_slider_box(slider_scroller,"settings_range_link_distance","Physics: link distance")
	add_slider_box(slider_scroller,"settings_range_link_strength","Physics: link strength")
	add_slider_box(slider_scroller,"settings_range_gravity","Physics: gravity")
	add_slider_box(slider_scroller,"settings_range_node_size","Layout: node size")
	add_slider_box(slider_scroller,"settings_range_node_opacity","Layout: node opacity")
	add_slider_box(slider_scroller,"settings_range_background_color","Layout: background color")
	add_slider_box(slider_scroller,"settings_range_edge_color","Layout: edge color")
	add_slider_box(slider_scroller,"settings_range_edge_thickness","Layout: edge thickness")
	add_slider_box(slider_scroller,"settings_range_edge_opacity","Layout: edge opacity")

	//d3.select("#settings").on("mouseenter", expand_settings);
	d3.select("#settings").on("click", toggle_settings);
	
	d3.select("#settings_range_node_repulsion")
		.attr("min",0).attr("max",300).attr("value",50)
		.on("input", function() { node_repulsion_change(this.value); });

	d3.select("#settings_range_link_distance")
		.attr("min",0).attr("max",500).attr("value",40)
		.on("input", function() { link_distance_change(this.value); });

	d3.select("#settings_range_link_strength")
		.attr("min",0).attr("max",100).attr("value",20)
		.on("input", function() { link_strength_change(this.value); });

	d3.select("#settings_range_gravity")
		.attr("min",0).attr("max",40).attr("value",5)
		.on("input", function() { gravity_change(this.value); });

	d3.select("#settings_range_node_size")
		.attr("min",0).attr("max",200).attr("value",50)
		.on("input", function() { node_size_change(this.value); });
		
	d3.select("#settings_range_node_opacity")
		.attr("min",0).attr("max",100).attr("value",80)
		.on("input", function() { node_opacity_change(this.value); });


	d3.select("#settings_range_background_color")
		.attr("min",0).attr("max",255).attr("value",220)
		.on("input", function() { background_color_change(this.value); });	

	d3.select("#settings_range_edge_color")
		.attr("min",0).attr("max",300).attr("value",100)
		.on("input", function() { edge_color_change(this.value); });	

	d3.selectAll(".link line").attr("stroke-width",1.2);
	d3.select("#settings_range_edge_thickness")
		.attr("min",0).attr("max",800).attr("value",120)
		.on("input", function() { edge_thickness_change(this.value); });

	d3.select("#settings_range_edge_opacity")
		.attr("min",0).attr("max",100).attr("value",100)
		.on("input", function() { edge_opacity_change(this.value); });
	
	function node_repulsion_change(val) { force.charge(-val/10); force.start(); }
	function link_distance_change(val) { force.linkDistance(val/10); force.start(); }
	function link_strength_change(val) {  force.linkStrength(val/10); force.start(); }
	function gravity_change(val) { force.gravity(val/100); force.start(); }
	function node_size_change(val) { d3.selectAll(".node circle").attr("r",val/10); }
	function node_opacity_change(val) { d3.selectAll(".node circle").style("opacity",(val/100).toString()); }
	function background_color_change(val) { d3.select("#force_svg").style("background-color",rgb_string(val)); }
	function edge_color_change(val) { d3.selectAll(".link line").style("stroke",rgb_string(val)); }
	function edge_thickness_change(val) { d3.selectAll(".link line").attr("stroke-width",val/100); }
	function edge_opacity_change(val) { d3.selectAll(".link line").style("opacity",(val/100).toString()); }
	function rgb_string(val) { return "rgb("+val.toString()+","+val.toString()+","+val.toString()+")"; }
		
	function add_slider_box(host,id,name) {
		var slider_box = host.append("div").attr("class","settings_slider_box")
		slider_box.append("input").attr("type","range").attr("id",id);	
		slider_box.append("p").text(name);
	}
	
	function restore_defaults() {
		document.getElementById("settings_range_node_repulsion").value = 50;
		node_repulsion_change(50);
	
		document.getElementById("settings_range_link_distance").value = 40;
		link_distance_change(40);

		document.getElementById("settings_range_link_strength").value = 20;
		link_strength_change(20);
	
		document.getElementById("settings_range_gravity").value = 5;
		gravity_change(5);
	
		document.getElementById("settings_range_node_size").value = 50;
		node_size_change(50);
		
		document.getElementById("settings_range_node_opacity").value = 80;
		node_opacity_change(80);

		document.getElementById("settings_range_background_color").value = 220;
		background_color_change(220);

		document.getElementById("settings_range_edge_color").value = 100;
		edge_color_change(100);

		document.getElementById("settings_range_edge_thickness").value = 120;
		edge_thickness_change(120);
		
		document.getElementById("settings_range_edge_opacity").value = 100;
		edge_opacity_change(100);
		
	}
}


function toggle_settings() {
	if (d3.select("#settings_dropdown").style("visibility")=="hidden") {
		expand_settings();
	} else {
		collapse_settings();
	}

}
function expand_settings() {
	closeDropdown();
	if (d3.select("#settings_dropdown").style("visibility")=="hidden") {
		setTimeout(function() {
			d3.select("#settings_dropdown").style("height","477px");
			d3.select("#settings_dropdown").style("visibility","visible")
			d3.select("#settings_restore_defaults_button").style("visibility","visible");
		},5);
	}
}

function collapse_settings() {
	if (parseInt(d3.select("#settings_dropdown").style("height").split("px")[0]) > 400) {
		closeDropdown();
		d3.select("#settings_dropdown").style("height","0px");
		d3.select("#settings_restore_defaults_button").style("visibility","hidden")
		d3.select("#settings_dropdown").style("visibility","hidden");
	}
}


