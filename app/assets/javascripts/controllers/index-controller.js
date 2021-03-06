var $ = require('qwery'),
    _ = require('underscore'),
    async = require('async'),
    events = require('bean'),
    dom = require('bonzo'),
    $$ = function(selector, parent) { return dom($(selector, parent)); },
    morpheus = require('morpheus'),
    Cm1Route = require('cm1-route').Cm1Route,
    Google = require('../lib/google');

var FlightPath = require('../models/flight-path'),
    HootBarController = require('./hoot-bar-controller'),
    MapView = require('../views/map-view');
    RouteView = require('../views/route-view');
    SPI = require('../lib/spi');

var IndexController = module.exports = function(mapId) {
  this.mapView = new MapView(mapId);
  this.directionsDisplay = new Google.maps.DirectionsRenderer();
  this.directions = {};
  this.routeViews = {};
  _.each(IndexController.modes, function(mode) {
    mode = mode.toLowerCase();
    this.routeViews[mode] = new RouteView(this, mode);
  }, this);
  this.hootBarController = new HootBarController(this);

  return true;
}

IndexController.modes = ['DRIVING','WALKING','BICYCLING','PUBLICTRANSIT','FLYING'];

IndexController.prototype.init = function() {
  //CM1.key = 'fd881ce1f975ac07b5c396591bd6978a';
  this.mapView.resize();
  this.mapView.googleMap;
  this.spi = SPI.current();

  events.add($('#go')[0], 'click', IndexController.events.routeButtonClick(this));
  var controller = this;
  _.each($('input[type=text]'), function(input) {
    events.add(input, 'keyup', IndexController.events.originDestinationInputKeyup(controller));
  });
  dom($('#when')[0]).val('Today');
  events.add($('#example')[0], 'click', IndexController.events.onExampleClick(this));
  this.hootBarController.init();
  _.each(this.routeViews, function(routeView) {
    routeView.enable();
  });

  if(this.spi.origin) $$('#origin').val(this.spi.origin);
  if(this.spi.destination) $$('#destination').val(this.spi.destination);
  if(this.spi.origin && this.spi.destination) {
    this.routeButtonClick();
  } else {
    this.fadeInSearch();
    $$('#nav').hide();
    $$('#modes').hide();
  }
};

IndexController.prototype.fadeIn = function(selector) {
  fadeIn = {
    opacity: '+=1',

    duration: 700,
    easing: morpheus.easings.easeIn
  }
  var element = $$(selector);
  element.show();
  if(element.css('opacity') <= 0) morpheus($(selector)[0], fadeIn);
};

IndexController.prototype.fadeOut = function(selector) {
  fadeOut = {
    opacity: '-=1',

    duration: 700,
    easing: morpheus.easings.easeOut,
    complete: function() { $$(selector).hide(); }
  }
  var element = $$(selector);
  if(element.css('opacity') > 0) morpheus($(selector)[0], fadeOut);
};

IndexController.prototype.fadeInSearch = function() {
  this.fadeIn('#search-panel');
};

IndexController.prototype.fadeOutSearch = function() {
  this.fadeOut('#search-panel');
};

IndexController.prototype.fadeInNav = function() {
  this.fadeIn('#nav');
};

IndexController.prototype.fadeOutNav = function() {
  this.fadeOut('#nav');
};

IndexController.prototype.fadeInModes = function() {
  this.fadeIn('#modes');
};

IndexController.prototype.fadeOutModes = function() {
  this.fadeOut('#modes');
};

IndexController.prototype.getEmissions = function(directions) {
  directions.getEmissions(
    IndexController.events.directionsGetEmissionsCallback(this),
    IndexController.events.segmentGetEmissionsCallback(this, directions));
};

IndexController.prototype.getDirections = function() {
  this.directionsDisplay.setMap(null); 
  this.directionsDisplay.setMap(this.mapView.googleMap);

  var controller = this;
  var directions = [];
  _.each(this.directions, function(direction) {
    directions.push(direction);
    direction.route(IndexController.events.
      directionsRouteCallback(controller));
  });
};

IndexController.prototype.currentUrl = function() {
  return SPI.generate($$('#origin').val(), $$('#destination').val()).urlString;
};

IndexController.prototype.currentRoute = function() {
  return this.routeViewFor($$('#modes .selected').attr('id'));
};

IndexController.prototype.displayDirectionsFor = function(directions) {
  if(directions.mode == 'FLYING') { 
    this.flightPath().display();
  } else {
    this.directionsDisplay.setOptions({ preserveViewport: true });
    this.directionsDisplay.setDirections(directions.directionsResult);
    this.directionsDisplay.setMap(this.mapView.googleMap);
  }
};

IndexController.prototype.hideDirectionsFor = function(directions) {
  if(directions.mode == 'FLYING') { 
    this.flightPath().hide();
  } else {
    this.directionsDisplay.setMap(null);
  }
};

IndexController.prototype.flightPath = function() {
  if(!this._flightPath && this.directions.flying) {
    this._flightPath = new FlightPath(this, this.directions.flying); 
  }
  return this._flightPath;
};

IndexController.prototype.clearFlightPath = function() {
  this._flightPath = null;
};

IndexController.prototype.routeViewFor = function(directions_or_mode) {
  var mode;
  if(directions_or_mode.mode) {
    mode = directions_or_mode.mode;
  } else {
    mode = directions_or_mode;
  }
  return this.routeViews[mode.toLowerCase()];
}

IndexController.prototype.routeButtonClick = function() {
  SPI.go(this.currentUrl());
  this.fadeOutSearch();
  this.fadeInNav();
  _.each($('#modes .failed'), function(element) { $$(element).removeClass('failed'); });
  _.each(IndexController.modes, function(mode) {
    var directions = Cm1Route.DirectionsFactory.
      create($$('#origin').val(), $$('#destination').val(), mode);
    this.directions[mode.toLowerCase()] = directions;
  }, this);
  _.each(this.routeViews, function(routeView) {
    this.routeViews[i].enable().start();
  });
  this.routeViews.driving.select();
  if(this.flightPath()) {
    this.flightPath().hide();
    this.clearFlightPath();
  }
  this.fadeInModes();
  if ($.is($('#about')[0], ':visible')) {
    $$('#about').hide(); //'drop', { direction: 'up' }, 500);
  }
  this.getDirections();
};

IndexController.prototype.normalizePublicTransitDirections = function() {
  var drivingDirections = this.directions.driving.directionsResult,
      transitDirections = this.directions.publictransit.directionsResult,
      secretKey = _.first(_.difference(_.keys(drivingDirections), _.keys(transitDirections)));
  if(secretKey) {
    transitDirections[secretKey] = {
      travelMode: 'DRIVING'
    };
  }
};


// Events 

IndexController.events = {
  originDestinationInputKeyup: function(controller) {
    return function(event) {
      if(event.keyCode == 13) {
        controller.routeButtonClick();
      }
    };
  },

  routeButtonClick: function(controller) {
    return function() {
      controller.routeButtonClick();
    };
  },

  onModeClick: function(controller) {
    return function() {
      var newMode = controller.routeViewFor(this.id);

      var oldDirectionId = $$('.selected', this.parentNode).attr('id');
      var oldDirection = controller.directions[oldDirectionId];

      var newDirection = controller.directions[this.id];

      if(oldDirection.mode == newDirection.mode) {
        newMode.toggleDirections();
      } else {
        newMode.select();

        controller.hideDirectionsFor(oldDirection);
        controller.displayDirectionsFor(newDirection);

        $$('#routing div').hide();
        $$('#routing .' + this.id).show();
      }

      if($$('#routing').css('display') != 'none') {
        _.each($('li.' + this.id), function(li) {
          var liHeight = $$(li).dim().height - $$('p.emissions', li).dim().height - 20;
          var liIncrement = $$(li).dim().width;

          var instructions = $$('p.instructions', li);

          while(instructions.dim().height > liHeight) {
            var width = $$(li).dim().width + liIncrement;
            $$(li).css('width', width + 'px');
          }
        });
      }

      return false;
    };
  },

  onModeHoverIn: function(controller) {
    return function() {
      var direction = controller.directions[this.id];
      var originalDirectionId = $$('.selected', this.parentNode).attr('id');
      var originalDirection = controller.directions[originalDirectionId];
      controller.hideDirectionsFor(originalDirection);
      controller.displayDirectionsFor(direction);
    };
  },

  onModeHoverOut: function(controller) {
    return function() {
      var direction = controller.directions[this.id];
      var originalDirectionId = $$('.selected', this.parentNode).attr('id');
      var originalDirection = controller.directions[originalDirectionId];
      controller.hideDirectionsFor(direction);
      controller.displayDirectionsFor(originalDirection);
    };
  },

  directionsRouteCallback: function(controller) {
    return function(err, directions) {
      var routeView = controller.routeViewFor(directions);
      if(err) {
        routeView.disable();
        if(typeof console != 'undefined')
          console.log('Failed to route ' + directions.mode);
      } else {
        routeView.updateDirections();
        controller.getEmissions(directions);
        if(directions.mode == 'DRIVING') {
          controller.directionsDisplay.setOptions({ preserveViewport: false });
          controller.directionsDisplay.setDirections(directions.directionsResult);
        } else if(directions.mode == 'PUBLICTRANSIT') {
          controller.normalizePublicTransitDirections();
        }
        $$('#' + directions.mode.toLowerCase() + ' a span.total_time').html(directions.totalTime());
      }
    };
  },

  segmentGetEmissionsCallback: function(controller, directions) {
    return function(err, emissionEstimate) {
      var segment = emissionEstimate.emitter;
      var routeView = controller.routeViewFor(directions.mode);
      if(err) {
        routeView.fail();
      } else {
        routeView.updateSegmentEmissions(emissionEstimate);
      }
    };
  },

  directionsGetEmissionsCallback: function(controller) {
    return function(err, directions) {
      var routeView = controller.routeViewFor(directions.mode);
      if(err) {
        routeView.fail();
      } else {
        routeView.updateTotalEmissions();
        routeView.finish();
      }
    };
  },

  onExampleClick: function() {
    return function() {
      $$('#origin').val('1916 Broadway, New York, NY');
      $$('#destination').val('162 Madison Ave, New York, NY');
      return false;
    };
  }
};

IndexController.prototype.events = IndexController.events;
