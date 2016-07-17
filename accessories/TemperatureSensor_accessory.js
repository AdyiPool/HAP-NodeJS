var Accessory = require('../').Accessory;
var Service = require('../').Service;
var Characteristic = require('../').Characteristic;
var uuid = require('../').uuid;
var DS18B20sensor = require('ds18x20');

DS18B20sensor.isDriverLoaded(function (err, isLoaded) {
    console.log("DS18B20 Drive is loaded? : ", isLoaded);
});

DS18B20sensor.loadDriver(function (err) {
    if (err) console.log('something went wrong loading the driver:', err)
    else console.log('DS18B20 driver is now loaded');
});

DS18B20sensor.list(function (err, listOfDeviceIds) {
    console.log("DS18B20 found: ",listOfDeviceIds);
});

// here's a fake temperature sensor device that we'll expose to HomeKit
var FAKE_SENSOR = {
  currentTemperature: 50,
  getTemperature: function() { 
    console.log("Getting the current temperature!");
    return FAKE_SENSOR.currentTemperature;
  },

  read: function () {
        
    if(DS18B20sensor.isDriverLoaded()){
      var temp = DS18B20sensor.get('28-00043e91eeff');
      console.log(temp);
      FAKE_SENSOR.currentTemperature = temp;
      setTimeout(function () {
        FAKE_SENSOR.read();
      }, 2000);
    }
  }
}

// Generate a consistent UUID for our Temperature Sensor Accessory that will remain the same
// even when restarting our server. We use the `uuid.generate` helper function to create
// a deterministic UUID based on an arbitrary "namespace" and the string "temperature-sensor".
var sensorUUID = uuid.generate('hap-nodejs:accessories:temperature-sensor');

// This is the Accessory that we'll return to HAP-NodeJS that represents our fake lock.
var sensor = exports.accessory = new Accessory('Temperature Sensor', sensorUUID);

// Add properties for publishing (in case we're using Core.js and not BridgedCore.js)
sensor.username = "C1:5D:3A:AE:5E:FA";
sensor.pincode = "031-45-154";

// Add the actual TemperatureSensor Service.
// We can see the complete list of Services and Characteristics in `lib/gen/HomeKitTypes.js`
sensor
  .addService(Service.TemperatureSensor)
  .getCharacteristic(Characteristic.CurrentTemperature)
  .on('get', function(callback) {
    
    // return our current value
    callback(null, FAKE_SENSOR.getTemperature());
  });

// randomize our temperature reading every 3 seconds
setInterval(function() {
  
  //FAKE_SENSOR.randomizeTemperature();
  FAKE_SENSOR.read();
  
  // update the characteristic value so interested iOS devices can get notified
  sensor
    .getService(Service.TemperatureSensor)
    .setCharacteristic(Characteristic.CurrentTemperature, FAKE_SENSOR.currentTemperature);
  
}, 3000);

