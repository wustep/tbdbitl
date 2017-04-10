/* Data */

var csv = [];
var rowNum = 1; // Last row accessed. 0 is the column headers so we don't need to re-access that
var dataset = [];
var totalInstruments = 0;

/* Adapted from animated donut chart with labels, legends and tooltips: http://bl.ocks.org/juan-cb/1984c7f2b446fffeedde */

var svg = d3.select("#instruments-pie").append("svg").append("g");
svg.append("g").attr("class", "slices");
svg.append("g").attr("class", "labelName");
svg.append("g").attr("class", "labelValue");
svg.append("g").attr("class", "lines");

var width = 700,
    height = 450,
	radius = Math.min(width, height) / 2;
	
var pie = d3.pie().sort(null)
	.value(function(d) {
		return d.value;
	});

var arc = d3.arc().outerRadius(radius * 0.8).innerRadius(radius * 0.4);
var outerArc = d3.arc().innerRadius(radius * 0.9).outerRadius(radius * 0.9);

var div = d3.select("#instruments-pie").append("div");
div.style("display", "none");
svg.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");
svg.append("text").attr("id", "row-text").attr("text-anchor", "middle");

var colorRange = d3.schemeCategory20;
var color = d3.scaleOrdinal(colorRange);

$.get( "data/instruments.csv", function( data ) {
	csv = jQuery.csv.toArrays(data);
	getNextRow(dataset, csv);
});

var tip = d3.tip().attr('class', 'd3-tip').html(function(d) { return d.data.value + " " + (d.data.label)+" ("+Math.floor((d.data.value/totalInstruments)*100)+"%)"; });

svg.call(tip);

function change(data) {
	tip.hide();
	/* ------- PIE SLICES -------*/
	var slice = svg.select(".slices").selectAll("path.slice")
        .data(pie(data), function(d){ return d.data.label });
    slice.enter()
        .insert("path")
        .style("fill", function(d) { return color(d.data.label); })
        .attr("class", "slice")
		.on('mouseover', tip.show)
		.on('mouseout', tip.hide);
    slice.transition().duration(1000).attrTween("d", function(d) {
        this._current = this._current || d;
        var interpolate = d3.interpolate(this._current, d);
        this._current = interpolate(0);
        return function(t) {
            return arc(interpolate(t));
		};
	})
    slice.exit().remove();

    /* ------- TEXT LABELS -------*/
    var text = svg.select(".labelName").selectAll("text")
        .data(pie(data), function(d){ return d.data.label });
    text.enter()
        .append("text")
        .attr("dy", ".35em")
        .text(function(d) {
            return (d.data.label+": "+d.value+"");
        });
    function midAngle(d){
        return d.startAngle + (d.endAngle - d.startAngle)/2;
    }
    text.transition().duration(1000).attrTween("transform", function(d) {
            this._current = this._current || d;
            var interpolate = d3.interpolate(this._current, d);
            this._current = interpolate(0);
            return function(t) {
                var d2 = interpolate(t);
                var pos = outerArc.centroid(d2);
                pos[0] = radius * (midAngle(d2) < Math.PI ? 1 : -1);
                return "translate("+ pos +")";
            };
        })
        .styleTween("text-anchor", function(d){
            this._current = this._current || d;
            var interpolate = d3.interpolate(this._current, d);
            this._current = interpolate(0);
            return function(t) {
                var d2 = interpolate(t);
                return midAngle(d2) < Math.PI ? "start":"end";
            };
        })
        .text(function(d) {
            return (d.data.label+": "+d.value+"");
        });
    text.exit()
        .remove();

    /* ------- SLICE TO TEXT POLYLINES -------*/
    var polyline = svg.select(".lines").selectAll("polyline")
        .data(pie(data), function(d){ return d.data.label });
    polyline.enter()
        .append("polyline");
    polyline.transition().duration(1000)
        .attrTween("points", function(d){
            this._current = this._current || d;
            var interpolate = d3.interpolate(this._current, d);
            this._current = interpolate(0);
            return function(t) {
                var d2 = interpolate(t);
                var pos = outerArc.centroid(d2);
                pos[0] = radius * 0.95 * (midAngle(d2) < Math.PI ? 1 : -1);
                return [arc.centroid(d2), outerArc.centroid(d2), pos];
            };
        });
	polyline.exit().remove();
}

/* Data manipulation functions */

$("body").keydown(function(e) {
	if (e.keyCode == 39) {
		getNextRow(dataset, csv);
	} else if (e.keyCode == 37) {
		removeLastRow(dataset, csv);
	}
});

function getNextRow(dataset, csv) { // Get next band row of instruments and add to dataset
	var row = "";
	if (rowNum < csv.length) {
		row = csv[rowNum][0];
		while (rowNum < csv.length) {
			if (csv[rowNum][0] != row) { // New row, end here.
				break;
			}
			addToDataset(dataset, csv[rowNum][1], csv[rowNum][2]);
			rowNum++;
		}
	}
	change(dataset);
	change(dataset);
	if (row != "") {
		var t = (row == "A") ? ("Row: A") : ("Rows: A-"+row);
		$('#row-text').fadeOut("fast", function(){
			$("#row-text").html('');
			d3.select("#row-text").append('tspan').attr('x',0).attr('dy',0).text(t);
			d3.select("#row-text").append('tspan').attr('x',0).attr('dy',15).text(totalInstruments+" musicians");
			$("#row-text").fadeIn("fast");
		});
	}
	return row;
}

function removeLastRow() {
	if (rowNum >= 2 && rowNum <= csv.length) {
		rowNum--;
		var row = csv[rowNum][0];
		while (rowNum >= 1) {
			if (csv[rowNum][0] != row) { // New row, end here.
				row = csv[rowNum][0];
				break;
			}
			addToDataset(dataset, csv[rowNum][1], csv[rowNum][2] * -1);
			rowNum--;
		}
		rowNum++;
		change(dataset);
		change(dataset);
		if (row != "A" && row != "") {
			var t = (row == "A") ? ("Row: A") : ("Rows: A-"+row);
			$('#row-text').fadeOut("fast", function(){
				$("#row-text").html('');
				d3.select("#row-text").append('tspan').attr('x',0).attr('dy',5).text(t);
				d3.select("#row-text").append('tspan').attr('x',0).attr('dy',20).text(totalInstruments+" musicians");
				$("#row-text").fadeIn("fast");
			});
		} else {
			$('#row-text').html('');		
		}
		return row;
	} else {
		$('#row-text').html('');
	}
}

function addToDataset(dataset, label, value) { // Add/remove instrument to dataset or increment proper category
	for (var i = 0; i < dataset.length; i++) {
		if (dataset[i]["label"] == label) {
			var newVal = parseInt(dataset[i]["value"]) + parseInt(value);
			totalInstruments += parseInt(value);
			if (newVal > 0) {
				dataset[i]["value"] = newVal;
			} else {
				dataset.splice(i, 1);
			}
			return 1;
		}
	}
	dataset.push({"label": label, "value": value});
	totalInstruments += parseInt(value);
	return 1;
}