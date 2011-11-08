var $ = require('jquery');

var MapView = module.exports = function(mapId) {
  this.mapId = mapId;
  var ll = new google.maps.LatLng(39.57, -97.82);
  this.options = {
    zoom: 4,
    center: ll,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };

  this.canvas = $(this.mapId);

  return true;
}

MapView.prototype.googleMap = function () {
  if(this.google_map == null) {
    this.google_map = new google.maps.Map(this.canvas.get(0), this.options);
  }
  return this.google_map;
}

MapView.prototype.resize = function() {
  this.canvas.width('100%');
  this.canvas.height('100%');
}