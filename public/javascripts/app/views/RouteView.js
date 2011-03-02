function RouteView() {}

RouteView.prototype.output = function(directions) {
  var html = '<div id="route"><ul>'
  directions.eachSegment(function(segment) {
    var detail = segment.instructions + '<br />Emissions: <span class="emissions"><em>Loading...</em></span>'
    html += '<li id="segment_' + segment.index + '" class="driving">' + detail + '</li>'
  })
  html += '</ul><p>Total emissions: <span id="emissions_total"><em>Loading</em></span></p></div>'
  return html
}

RouteView.prototype.update = function(directions) {
  var output = this.output(directions)
  $('#route').replaceWith(output)
}

RouteView.prototype.updateSegmentEmissions = function(index, emissionEstimate) {
  var output 
  if(emissionEstimate.methodology()) {
    output = '<a href="' + emissionEstimate.methodology() + '">' + emissionEstimate.toString() + '</a>'
  } else {
    output = emissionEstimate.toString()
  }

  $('#segment_' + index + ' .emissions').html(output)
}

RouteView.prototype.updateTotalEmissions = function(directions) {
  $('#emissions_total').html(directions.totalEmissions)
}
