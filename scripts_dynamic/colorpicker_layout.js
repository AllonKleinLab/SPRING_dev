
tmp_cat_coloring = null;

(function($){
	var initLayout = function() {
		var hash = window.location.hash.replace('#', '');
		$('#colorpickerHolder').ColorPicker({ flat: true });

	};
	EYE.register(initLayout, 'init');
	
})(jQuery)


function colorpicker_submit(hex) {
	console.log(hex);

}

function colorpicker_setup() {

	var popup = d3.select('#colorpicker_popup');
	popup.attr('current_color','');
	popup.attr('current_nodes','');
	popup.attr('current_label','');
	popup.attr('current_track','');
	popup.on('mouseup',colorpicker_update)
	popup.on('mousemove',colorpicker_update)
	popup.call(d3.behavior.drag()
		.on("dragstart", colorpicker_popup_dragstarted)
		.on("drag", colorpicker_popup_dragged)
		.on("dragend", colorpicker_popup_dragended));

	
	button_bar = d3.select('#colorpicker_button_bar');
	button_bar.append('button').text('Close')
		.on('click',close_colorpicker_popup);
			
	button_bar.append('button').text('Save')
		.on('click',save_colorpicker_colors);
	
	button_bar.append('button').text('Restore')
		.on('click',restore_colorpicker);
	
	d3.select('#colorpickerHolder').on('mousedown',function() {
		d3.event.stopPropagation();
		colorpicker_update();
	});
	
	popup.append('div').attr('id','colorpicker_save_check')
		
	

	function colorpicker_popup_dragstarted() {
		d3.event.sourceEvent.stopPropagation();
	}
	function colorpicker_popup_dragged() {
		var cx = parseFloat(d3.select("#colorpicker_popup").style("left").split("px")[0])
		var cy = parseFloat(d3.select("#colorpicker_popup").style("top").split("px")[0])
		d3.select("#colorpicker_popup").style("left",(cx + d3.event.dx).toString()+"px");
		d3.select("#colorpicker_popup").style("top",(cy + d3.event.dy).toString()+"px");
	}
	function colorpicker_popup_dragended() { }

}

function restore_colorpicker() {
	setNodeColors();
	var current_label = d3.select('#colorpicker_popup').attr('current_label');
	if (current_label != '') {
		var current_track = d3.select('#colorpicker_popup').attr('current_track');
		tmp_cat_coloring = Object.assign({},categorical_coloring_data[current_track]['label_colors']);
		var current_color = categorical_coloring_data[current_track]["label_colors"][current_label].replace('#','0x');
		$('#colorpickerHolder').ColorPickerSetColor(current_color);
	
		d3.selectAll('.legend_row').each(function(d) {
			if (d == current_label) {
				d3.select(this).select('div').style('background-color',current_color.replace('0x','#'));
			}
		});
	}
}


function show_colorpicker_popup(label) {
	if (mutable) {
		var current_track = document.getElementById('labels_menu').value;
		var current_color = categorical_coloring_data[current_track]["label_colors"][label].replace('#','0x');	
		var nodes = [];
		categorical_coloring_data[current_track]['label_list'].forEach(function(l,i) {
			if (label == l) { nodes.push(i); }
		});
		
		d3.select('#colorpicker_popup').attr('current_nodes',nodes.join(','));
		d3.select('#colorpicker_popup').attr('current_label',label);
		d3.select('#colorpicker_popup').attr('current_color',current_color);
		d3.select('#colorpicker_popup').attr('current_track',current_track);
			
		$('#colorpickerHolder').ColorPickerSetColor(current_color);
		tmp_cat_coloring = Object.assign({},categorical_coloring_data[current_track]['label_colors']);

		var top = parseFloat(d3.select('body').style('height').replace('px','')) - 216;
		var left = parseFloat(d3.select('body').style('width').replace('px','')) - 480;
		d3.select('#colorpicker_popup').style('top', top.toString()+'px');
		d3.select('#colorpicker_popup').style('left', left.toString()+'px');
		d3.select('#colorpicker_popup').style('visibility','visible');
	}
		
}


function close_colorpicker_popup() {
	d3.select('#colorpicker_popup').style('visibility','hidden');
	d3.select('#colorpicker_popup').attr('current_nodes','');
	d3.select('#colorpicker_popup').attr('current_label','');
	d3.select('#colorpicker_popup').attr('current_color','');
	d3.select('#colorpicker_popup').attr('current_track','');
	tmp_cat_coloring = null;
}

function colorpicker_update() {
	var rgb = d3.select('.colorpicker_new_color').style('background-color')
	rgb = rgb.replace('rgb(','').replace(')','').replace(',','').replace(',','').split(' ')
	var current_color = rgbToHex(parseInt(rgb[0]),parseInt(rgb[1]),parseInt(rgb[2]));
	
	if (current_color != d3.select('#colorpicker_popup').attr('current_color')) {
		d3.select('#colorpicker_popup').attr('current_nodes').split(',').forEach(function(i) { 
			all_nodes[i].tint = current_color;
		});
	}
	
	var current_label = d3.select('#colorpicker_popup').attr('current_label');
	if (current_label != '') {
		tmp_cat_coloring[current_label] = current_color.replace('0x','#');
	
		d3.selectAll('.legend_row').each(function(d) {
			if (d == current_label) {
				d3.select(this).select('div').style('background-color',current_color.replace('0x','#'));
			}
		});
	}
}

function save_colorpicker_colors() {
	var current_track = document.getElementById('labels_menu').value;
	if (current_track == d3.select('#colorpicker_popup').attr('current_track')) {
		if (tmp_cat_coloring != null) {
			categorical_coloring_data[current_track]['label_colors'] = tmp_cat_coloring;
			var text = JSON.stringify(categorical_coloring_data);
			var name = window.location.search;
			var path = name.slice(1,name.length) + "/categorical_coloring_data.json";
			console.log('gothere');
			$.ajax({
			  url: "cgi-bin/save_data.py",
			  type: "POST",
			  data: {path:path, content:text},
			  success: function() {
			  	d3.select('#colorpicker_save_check').style('opacity','1');
			  	setTimeout(function() { 
			  		d3.select('#colorpicker_save_check').transition().duration(600).style('opacity','0');
			  	}, 250);
			  }
			});
	
		}
	}
}

