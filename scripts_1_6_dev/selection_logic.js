function selection_logic_setup() {
	
	var selection_data = {};
	
	var popup = d3.select('#force_layout').append('div')
		.attr('id','selection_logic_popup');
	
	var add_new_bar = popup.append('div').attr('id','selection_logic_add_new_bar')
		.on('mousedown',function() { d3.event.stopPropagation(); });
			
	add_new_bar.append('label').text('Selection name ').append('input').attr('id','selection_logic_input')	
	add_new_bar.append('button').text('Close').on('click',hide_selection_logic_popup);
	add_new_bar.append('button').text('Clear').on('click',clear_options);
	add_new_bar.append('button').text('Add').on('click',add_selection);
	
	var andor_bar = popup.append('div').attr('id','selection_logic_andor_bar');
	var left_dropdown = andor_bar.append("select").style('margin-right','20px');
	andor_bar.append('button').text('AND').style('margin-right','12px').on('click',apply_and);
	andor_bar.append('button').text('OR').on('click',apply_or);
	var right_dropdown = andor_bar.append("select").style('margin-left','20px');

	left_dropdown.append('option').text('Current selection')
	right_dropdown.append('option').text('Current selection')
	
	function get_selections() {
		var left_name = left_dropdown.property('value');
		var right_name = right_dropdown.property('value');
		if (left_name == 'Current selection') {
			var left_sel = get_selected_cells();
		} else {
			var left_sel = selection_data[left_name];
		}
		if (right_name == 'Current selection') {
			var right_sel = get_selected_cells();
		} else {
			var right_sel = selection_data[right_name];
		}
		return [left_sel, right_sel];

	}
	
	function union_arrays(x, y) {
		var obj = {};
		for (var i = x.length-1; i >= 0; -- i) {
			obj[x[i]] = x[i];
		}
		for (var i = y.length-1; i >= 0; -- i) {
			obj[y[i]] = y[i];
		}
		var res = [];
		for (var k in obj) {
			if (obj.hasOwnProperty(k))  // <-- optional
			res.push(obj[k]);
		}
		return res;
	}
		
	function apply_or() {
		var sels = get_selections();
		var new_sel = union_arrays(sels[0],sels[1]);
		set_selections(new_sel);
	}
	
	function apply_and() {
		var sels = get_selections();
		var new_sel = sels[0].filter(function(n) { return sels[1].indexOf(n) !== -1; });
		set_selections(new_sel);
	}
	
	function set_selections(sel) {
		for (i=0; i<all_outlines.length; i++) {
			all_outlines[i].selected = false;
			all_outlines[i].alpha=0;
		}
		for (i=0; i<sel.length; i++) {
			all_outlines[sel[i]].tint = '0xffff00';
			all_outlines[sel[i]].selected = true;
			all_outlines[sel[i]].alpha=all_nodes[sel[i]].alpha;
		}
		update_selected_count();
		count_clusters();
	}
	
	function clear_options() {
		left_dropdown.selectAll('option').remove();
		left_dropdown.append('option').text('Current selection');
		right_dropdown.selectAll('option').remove();
		right_dropdown.append('option').text('Current selection');
		selection_data = {};
	}
		
	function add_selection() {
		var name = $('#selection_logic_input').val();
		$('#selection_logic_input').val('');
		left_dropdown.append('option').text(name).attr('selected','selected');
		right_dropdown.append('option').text(name).attr('selected','selected');
		selection_data[name] = get_selected_cells();
		
	}
	
	function get_selected_cells() {
		var sel = [];
		for (i=0; i<all_outlines.length; i++) {
			if (all_outlines[i].selected) {
				sel.push(i)
			}
		}
		return sel;
	}


	function selection_logic_popup_dragstarted() {
		d3.event.sourceEvent.stopPropagation();
	}
	function selection_logic_popup_dragged() {
		var cx = parseFloat(d3.select("#selection_logic_popup").style("left").split("px")[0])
		var cy = parseFloat(d3.select("#selection_logic_popup").style("top").split("px")[0])
		d3.select("#selection_logic_popup").style("left",(cx + d3.event.dx).toString()+"px");
		d3.select("#selection_logic_popup").style("top",(cy + d3.event.dy).toString()+"px");
	}
	function selection_logic_popup_dragended() { }
	
	d3.select("#selection_logic_popup")
		.call(d3.behavior.drag()
			.on("dragstart", selection_logic_popup_dragstarted)
			.on("drag", selection_logic_popup_dragged)
			.on("dragend", selection_logic_popup_dragended));



}


function show_selection_logic_popup() {
	var mywidth = parseInt(d3.select("#selection_logic_popup").style("width").split("px")[0])
	var svg_width = parseInt(d3.select("svg").style("width").split("px")[0])
	d3.select("#selection_logic_popup")
		.style("left",(svg_width/2-mywidth/2).toString()+"px")
		.style("top","220px").style('visibility','visible');
}


function hide_selection_logic_popup() {
	d3.select('#selection_logic_popup').style('visibility','hidden');
}
