function make_new_SPRINGplot_setup() {
	console.log('here');
	MAXHEIGHT = 772;
	var popup = d3.select('#force_layout').append('div')
		.attr('id','make_new_SPRINGplot_popup');

	var button_bar = popup.append('div')
		.attr('id','make_new_SPRINGplot_button_bar')
		.style('width','100%')

	button_bar.append('text')
		.text('Make new SPRING plot from selection');

	var close_button = button_bar.append('button')
		.text('Close')
		.on('mousedown',hide_make_new_SPRINGplot_popup);

	
	popup.append('div').attr('class','make_new_SPRINGplot_input_div')
		.append('label').text('Name of plot')
		.append('input').attr('type','text')
		.attr('id','input_new_dir')
		.attr('value','E.g. "My_favorite_cells"')
		.style('width','220px');

	popup.append('div').attr('class','make_new_SPRINGplot_input_div')
		.append('label').text('Email address')
		.append('input').attr('type','text')
		.attr('id','input_email')
		.style('width','220px');

	popup.append('div').attr('class','make_new_SPRINGplot_input_div')
		.attr('id','newSPRING_description_box')
		.append('label').text('Description')
		.append('textarea')
		.attr('id','input_description')
		.style('width','217px')
		.style('height','22px')
		.on('keydown', function() {
			setTimeout(function() {
				var o = d3.select('#input_description');
				o.style('height','1px');
 				o.style('height',(o[0][0].scrollHeight).toString()+"px");
 				if ( d3.select('#make_new_SPRINGplot_message_div').style('visibility')=='hidden') {	
 					popup.style('height',(d3.min([$('#newSPRING_description_box').height() + 597.223,MAXHEIGHT])).toString()+'px');	
 				} else {
 					popup.style('height',(d3.min([$('#newSPRING_description_box').height() + 745,MAXHEIGHT])).toString()+'px');	
 				}			
 			}, 0);
 		});
 	

	var batch_correction_blurb = popup.append('div')
		.attr('class','make_new_SPRINGplot_input_div')
		.attr('id','batch_correction_blurb')
		.style('width','320px').style('margin-top','25px')
		
	batch_correction_blurb.append('text').text('Use cell projection to avoid batch effects. ').style('color','rgb(220,220,220)');
	batch_correction_blurb.append('text').text('Negatively selected ').style('color','blue').style('font-weight','900');
	batch_correction_blurb.append('text').text('cells will be projected onto ').style('color','rgb(220,220,220)');
	batch_correction_blurb.append('text').text('positively selected ').style('color','yellow').style('font-weight','900');
	batch_correction_blurb.append('text').text('cells.').style('color','white');
	
	var optional_params = popup.append('div')
		.attr('class','make_new_SPRINGplot_input_div')
		.attr('id','make_new_SPRINGplot_optional_params');

	optional_params.append('hr').style('float','left');
	optional_params.append('text').text('Optional parameters');
	optional_params.append('hr').style('float','right');

	popup.append('div').attr('class','make_new_SPRINGplot_input_div')
		.append('label').text('Min expressing cells (gene filtering)')
		.append('input').attr('type','text')
		.attr('id','input_minCells')
		.attr('value','3')

	popup.append('div').attr('class','make_new_SPRINGplot_input_div')
		.append('label').text('Min number of UMIs (gene filtering)')
		.append('input').attr('type','text')
		.attr('id','input_minCounts')
		.attr('value','3')

	popup.append('div').attr('class','make_new_SPRINGplot_input_div')
		.append('label').text('Gene variability %ile (gene filtering)')
		.append('input').attr('type','text')
		.attr('id','input_pctl')
		.attr('value','90')

	popup.append('div').attr('class','make_new_SPRINGplot_input_div')
		.append('label').text('Number of principal components')
		.append('input').attr('type','text')
		.attr('id','input_numPC')
		.attr('value','20')

	popup.append('div').attr('class','make_new_SPRINGplot_input_div')
		.append('label').text('Number of nearest neighbors')
		.append('input').attr('type','text')
		.attr('id','input_kneigh')
		.attr('value','3')

	popup.append('div').attr('class','make_new_SPRINGplot_input_div')
		.append('label').text('Number of force layout iterations')
		.append('input').attr('type','text')
		.attr('id','input_nIter')
		.attr('value','500')
		
	popup.append('div').attr('class','make_new_SPRINGplot_input_div')
		.append('label').text('Save force layout animation')
		.append('button').text('No')
		.attr('id','input_animation')
		.on('click', function() {
			if (d3.select(this).text()=='Yes') { d3.select(this).text('No'); }
			else { d3.select(this).text('Yes'); }
		});

	popup.append('div')
		.attr('id','make_new_SPRINGplot_submission_div')
		.attr('class','make_new_SPRINGplot_input_div')
		.append('button').text('Submit')
		.on('click',submit_new_SPRINGplot)

	// popup.append('div')
	// 	.attr('id','make_new_SPRINGplot_submission_div')
	// 	.attr('class','make_new_SPRINGplot_input_div')
	// 	.append('button').text('Reset')
	// 	.on('click',restore_defaults)


	popup.append('div')
		.attr('id','make_new_SPRINGplot_message_div')
		.on('mousedown',function() { d3.event.stopPropagation(); })
		.style('overflow', 'scroll')
		.append('text');

	d3.selectAll('.make_new_SPRINGplot_input_div').on('mousedown',function() {
		d3.event.stopPropagation();
	});


	function make_new_SPRINGplot_popup_dragstarted() {
		d3.event.sourceEvent.stopPropagation();
	}
	function make_new_SPRINGplot_popup_dragged() {
		var cx = parseFloat(d3.select("#make_new_SPRINGplot_popup").style("left").split("px")[0])
		var cy = parseFloat(d3.select("#make_new_SPRINGplot_popup").style("top").split("px")[0])
		d3.select("#make_new_SPRINGplot_popup").style("left",(cx + d3.event.dx).toString()+"px");
		d3.select("#make_new_SPRINGplot_popup").style("top",(cy + d3.event.dy).toString()+"px");
	}
	function make_new_SPRINGplot_popup_dragended() { }

	d3.select("#make_new_SPRINGplot_popup")
		.call(d3.behavior.drag()
			.on("dragstart", make_new_SPRINGplot_popup_dragstarted)
			.on("drag", make_new_SPRINGplot_popup_dragged)
			.on("dragend", make_new_SPRINGplot_popup_dragended));

}


function hide_make_new_SPRINGplot_popup() {
	d3.select("#make_new_SPRINGplot_popup").style("visibility","hidden")

}

function show_make_new_SPRINGplot_popup() {
	var mywidth = parseInt(d3.select("#make_new_SPRINGplot_popup").style("width").split("px")[0])
	var svg_width = parseInt(d3.select("svg").style("width").split("px")[0])
	d3.select('#input_description').style('height','22px');
	d3.select('#make_new_SPRINGplot_message_div')
		.style('visibility','hidden')
		.style('height','0px');
	d3.select('#input_description')[0][0].value = '';
	d3.select("#make_new_SPRINGplot_popup")
		.style("left",(svg_width/2-mywidth/2).toString()+"px")
		.style("top","10px").style('padding-bottom','0px')
		.style('visibility','visible').style('height','620px');

}

// function restore_defaults() {
// 	$("#input_new_dir").attr('value', "")
// }

function submit_new_SPRINGplot() {
	
	//
	// Do cgi stuff to check for valid input
	// When finished...
  var sel2text = "";
  for (i=0; i<all_outlines.length; i++) {
    if (all_outlines[i].selected) {
			sel2text = sel2text + "," + i.toString();
    }
  }
  sel2text = sel2text.slice(1, sel2text.length);
	var new_dir = $("#input_new_dir").val();
	var email = $("#input_email").val();
	var description = $("#input_description").val();
	var minCells = $("#input_minCells").val();
	var minCounts = $("#input_minCounts").val();
	var varPctl = $("#input_pctl").val();
	var kneigh = $("#input_kneigh").val();
	var numPC = $("#input_numPC").val();
	var nIter = $("#input_nIter").val();
	var animate = d3.select('#input_animation').text();
    var this_url = window.location.href;
    
	var output_message = "Checking input..."

	var MAXHEIGHT = 772;
	
	d3.select('#make_new_SPRINGplot_popup')
		.transition().duration(200)
		.style('height',(d3.min([$('#newSPRING_description_box').height() + 745,MAXHEIGHT])).toString()+'px');

	d3.select('#make_new_SPRINGplot_message_div')
		.transition().duration(200)
		.style('height','120px')
		.each('end',function() { 
			d3.select('#make_new_SPRINGplot_message_div')
				.style('visibility','inherit');
			d3.select('#make_new_SPRINGplot_message_div')
				.select('text').text(output_message);
		});

  $.ajax({
		url: "cgi-bin/spring_from_selection2.py",
    type: "POST",
    data: {base_dir:graph_directory, current_dir:sub_directory, new_dir:new_dir, selected_cells:sel2text, minCells:minCells, minCounts:minCounts, varPctl:varPctl, kneigh:kneigh, numPC:numPC, nIter:nIter, this_url:this_url, description:description, email:email, animate:animate},
		success: function(output_message) {
			var orig_message = output_message;
			d3.select('#make_new_SPRINGplot_message_div')
				.select('text').html(orig_message);

			function checkLog(){
				jQuery.get(graph_directory + "/" + new_dir + "/lognewspring2.txt", function(logdata) {
					var logdata_split = logdata.split('\n');
					var display_message = orig_message + "<br>" + logdata_split[logdata_split.length-2];
					d3.select('#make_new_SPRINGplot_message_div')
						.select('text').html(display_message);
					if (!display_message.endsWith("</a><br>")) {
						setTimeout(checkLog, 500);
					}
				});
			}
			console.log(orig_message);
			if (orig_message.endsWith("minutes.<br>\n") || orig_message.endsWith("email.<br>\n")) {
				setTimeout(checkLog, 500);
    	}
		}
  });
  

	// Insert your own text here
	// var output_message = 'Your SPRING plot is processing. A link will be emailed to you within a few minutes.';

}
