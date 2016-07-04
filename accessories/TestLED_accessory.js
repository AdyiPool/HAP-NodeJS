// // MQTT Setup
// var mqtt = require('mqtt');
// console.log("Connecting to MQTT broker...");
// var mqtt = require('mqtt');
// var options = {
//   port: 1883,
//   host: '192.168.1.21',
//   clientId: 'Test_LED'
// };
// var client = mqtt.connect(options);
// console.log("Test LED Connected to MQTT broker");


var Accessory = require('../').Accessory;
var Service = require('../').Service;
var Characteristic = require('../').Characteristic;
var uuid = require('../').uuid;
var Spinner = require('cli-spinner').Spinner;

// here's a fake hardware device that we'll expose to HomeKit
var TEST_LED = {
  powerOn: false,
  brightness: 100, // percentage
  hue: 0,
  saturation: 0,
  animationOn: false,


  setPowerOn: function(on) { 
    console.log("Turning the TestLED 🏊 %s!", on ? "on" : "off");
    TEST_LED.powerOn = on;
  },
  setAnimationOn: function(on) { 
    console.log("Turning the swimming pool light show ✨ 1️⃣  %s!", on ? "on" : "off");
    TEST_LED.animationOn = on;
    if (on) {
      var spinner = new Spinner('%s');
      spinner.setSpinnerString('|/-\\');
      spinner.start();
      setTimeout(() => {
        spinner.stop(true)
      },2000)
    }

  },
  setBrightness: function(brightness) {
    console.log("Setting light brightness to %s", brightness);
    // client.publish('TestLEDBrightness',String(brightness));
    TEST_LED.brightness = brightness;
  },
  setHue: function(hue){
    console.log("Setting light Hue to %s", hue);
    // client.publish('TestLEDHue',String(hue));
    TEST_LED.hue = hue;
  },
  setSaturation: function(saturation){
    console.log("Setting light Saturation to %s", saturation);
    // client.publish('TestLEDSaturation',String(saturation));
    TEST_LED.saturation = saturation;
  },
  identify: function() {
    console.log("Identify the light!");
  }

}

// Generate a consistent UUID for our light Accessory that will remain the same even when
// restarting our server. We use the `uuid.generate` helper function to create a deterministic
// UUID based on an arbitrary "namespace" and the word "TestLED".
var lightUUID = uuid.generate('hap-nodejs:accessories:Test_LED');

// This is the Accessory that we'll return to HAP-NodeJS that represents our fake light.
var light = exports.accessory = new Accessory('Test_LED', lightUUID);

// Add properties for publishing (in case we're using Core.js and not BridgedCore.js)
light.username = "1A:2B:3B:5D:6D:FF";
light.pincode = "031-45-154";

// set some basic properties (these values are arbitrary and setting them is optional)
light
  .getService(Service.AccessoryInformation)
  .setCharacteristic(Characteristic.Manufacturer, "iPool.io")
  .setCharacteristic(Characteristic.Model, "Rev-1")
  .setCharacteristic(Characteristic.SerialNumber, "340-1097");

// listen for the "identify" event for this Accessory
light.on('identify', function(paired, callback) {
  TEST_LED.identify();
  callback(); // success
});

// Add the actual Lightbulb Service and listen for change events from iOS.
// We can see the complete list of Services and Characteristics in `lib/gen/HomeKitTypes.js`
light
  .addService(Service.Lightbulb, "Test LED") // services exposed to the user should have "names" like "Fake Light" for us
  .getCharacteristic(Characteristic.On)
  .on('set', function(value, callback) {
    TEST_LED.setPowerOn(value);
    callback(); // Our fake Light is synchronous - this value has been successfully set
  });

// We want to intercept requests for our current power state so we can query the hardware itself instead of
// allowing HAP-NodeJS to return the cached Characteristic.value.
light
  .getService(Service.Lightbulb)
  .getCharacteristic(Characteristic.On)
  .on('get', function(callback) {
    
    // this event is emitted when you ask Siri directly whether your light is on or not. you might query
    // the light hardware itself to find this out, then call the callback. But if you take longer than a
    // few seconds to respond, Siri will give up.
    
    var err = null; // in case there were any problems
    
    if (TEST_LED.powerOn) {
      console.log("Are we on? Yes.");
      callback(err, true);
    }
    else {
      console.log("Are we on? No.");
      callback(err, false);
    }
  });
  
 //Light Show 
//****************************  
light
  .getService(Service.Lightbulb)
  .getCharacteristic(Characteristic.LightShow1)
  .on('set', function(value, callback) {
    TEST_LED.setAnimationOn(value);
    callback(); // Our fake Light is synchronous - this value has been successfully set
  });
  
light
	.getService(Service.Lightbulb)
	.getCharacteristic(Characteristic.LightShow1)
	.on('get', function(callback) {
	    
	    // this event is emitted when you ask Siri directly whether your light is on or not. you might query
	    // the light hardware itself to find this out, then call the callback. But if you take longer than a
	    // few seconds to respond, Siri will give up.
	    
	 var err = null; // in case there were any problems
	    
	 if (TEST_LED.LightShow1) {
	    console.log("Is light show on? Yes.");
	    callback(err, true);
	    }
	 else {
	    console.log("Is light show on? No.");
	   callback(err, false);
	    }
	  });   
//*******************************  

// also add an "optional" Characteristic for Brightness
light
  .getService(Service.Lightbulb)
  .addCharacteristic(Characteristic.Brightness)
  .on('get', function(callback) {
    callback(null, TEST_LED.brightness);
  })
  .on('set', function(value, callback) {
    TEST_LED.setBrightness(value);
    callback();
  })

light
  .getService(Service.Lightbulb)
  .addCharacteristic(Characteristic.Hue)
  .on('get',function(callback){
   callback(null,TEST_LED.hue);
   })
   .on('set',function(value,callback){
   TEST_LED.setHue(value);
   callback();   
   })

light
  .getService(Service.Lightbulb)
  .addCharacteristic(Characteristic.Saturation)
  .on('get',function(callback){
   callback(null,TEST_LED.saturation);
   })
   .on('set',function(value,callback){
   TEST_LED.setSaturation(value);
   callback();   
   })
   
