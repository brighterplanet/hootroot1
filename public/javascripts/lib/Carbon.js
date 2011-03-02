Carbon = function() {
  this.attribute_map = {}
}

Carbon.emitter = function(klass, definition) {
  klass.carbon = new Carbon()
  klass.carbon.define(definition)
  klass.prototype.emissionEstimate = new EmissionEstimate()
  klass.prototype.emissionEstimator = function() {
    if(!this._emissionEstimator) {
      this._emissionEstimator = new EmissionEstimator(this, klass.carbon)
    }

    return this._emissionEstimator
  }
  klass.prototype.getEmissionEstimate = function(onSuccess, onError) {
    return this.emissionEstimator().getEmissionEstimate(onSuccess, onError)
  }
}

Carbon.prototype.define = function(lambda) {
  lambda(this)
}

Carbon.prototype.emitAs = function(emitter_name) {
  this.emitter_name = emitter_name
}

Carbon.prototype.provide = function(attribute, options) {
  var actual_field
  if(options && options.as) {
    actual_field = options.as
  } else {
    actual_field = attribute
  }

  this.attribute_map[attribute] = actual_field
}



EmissionEstimator = function(emitter, carbon) {
  this.emitter = emitter
  this.carbon = carbon
}

EmissionEstimator.prototype.url = function() {
  return 'http://carbon.brighterplanet.com/' + this.carbon.emitter_name.pluralize() + '.json'
}

EmissionEstimator.prototype.params = function() {
  var params = {}
  for(var characteristic in this.carbon.attribute_map) {
    var emitter_field = this.carbon.attribute_map[characteristic]
    var value = this.emitter[emitter_field]
    if(value) {
      params[characteristic] = this.emitter[emitter_field]
    }
  }

  return params
}

EmissionEstimator.prototype.getEmissionEstimate = function(onSuccess, onError) {
  $.ajax({
    url: this.url(),
    data: this.params(),
    dataType: 'json',
    success: this.onEstimateSuccess(onSuccess),
    error: onError
  })
}

// Events

EmissionEstimator.prototype.onEstimateSuccess = function(onSuccess) {
  return $.proxy(function(result) {
    this.emitter.emissionEstimate.data = result
    onSuccess(this.emitter.emissionEstimate)
  }, this)
}



EmissionEstimate = function() {}

EmissionEstimate.prototype.value = function() {
  if(this.data) {
    return this.data.emission
  } else {
    return 'No data'
  }
}

EmissionEstimate.prototype.methodology = function() {
  if(this.data) {
    return this.data.methodology
  } else {
    return 'No data'
  }
}

EmissionEstimate.prototype.toString = function() {
  return this.value().toString()
}