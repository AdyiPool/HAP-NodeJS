var Accessory = require('../').Accessory;
var Service = require('../').Service;
var Characteristic = require('../').Characteristic;
var uuid = require('../').uuid;
var ws281x = require('rpi-ws281x-native');
var color = require('./color.js');
var refreshIntervalId;
var refreshIntervalId2;

var r=0, g=0, b=0;


var NUM_LEDS = 8,
pixelData = new Uint32Array(NUM_LEDS);


ws281x.init(NUM_LEDS);

// ---- trap the SIGINT and reset before exit
process.on('SIGINT', function () {
  ws281x.reset();
  process.nextTick(function () { process.exit(0); });
});

// ---- animation-loop
var offset = 0;

// rainbow-colors, taken from http://goo.gl/Cs3H0v
function colorwheel(pos) {
  pos = 255 - pos;
  if (pos < 85) { return rgb2Int(255 - pos * 3, 0, pos * 3); }
  else if (pos < 170) { pos -= 85; return rgb2Int(0, pos * 3, 255 - pos * 3); }
  else { pos -= 170; return rgb2Int(pos * 3, 255 - pos * 3, 0); }
}

function rgb2Int(r, g, b) {
  return ((r & 0xff) << 16) + ((g & 0xff) << 8) + (b & 0xff);
}


// here's a fake hardware device that we'll expose to HomeKit
var FAKE_LIGHT = {
  powerOn: false,
  brightness: 100, // percentage
  animationOn: false,
  hue: 0,
  saturation: 0,
  
  setPowerOn: function(on) { 
    console.log("Turning the swimming pool lights 🏊 %s!", on ? "on" : "off");
    FAKE_LIGHT.powerOn = on;
  },
  setAnimation1On: function(on) { 
    console.log("Turning the swimming pool light show ✨ 1️⃣  %s!", on ? "on" : "off");
    FAKE_LIGHT.animationOn = on;
    if (on) {
      // start animation-loop
      refreshIntervalId = setInterval(function () {
        for (var i = 0; i < NUM_LEDS; i++) {
          pixelData[i] = colorwheel((offset + i) % 256);
        }

        offset = (offset + 1) % 256;
        ws281x.render(pixelData);
      }, 1000 / 30);
    }
    else {
      // stop animation-loop
      clearInterval(refreshIntervalId);
    }
  },
  setAnimation2On: function(on) { 
    console.log("Turning the swimming pool light show ✨ 2️⃣  %s!", on ? "on" : "off");
    FAKE_LIGHT.animationOn = on;
    if (on) {
      // start animation-loop
      var offset = 0;
      refreshIntervalId2 = setInterval(function () {
        var i=NUM_LEDS;
        while(i--) {
          pixelData[i] = 0;
        }
        pixelData[offset] = 0xffffff;

        offset = (offset + 1) % NUM_LEDS;
        ws281x.render(pixelData);
      }, 100);
    } 
    else {
      // stop animation-loop
      clearInterval(refreshIntervalId2);
    }
  },
  setBrightness: function(brightness) {
    console.log("Setting swimming pool light brightness ☀️ to %s", brightness);
    var rgb = color.hsvToRgb(FAKE_LIGHT.hue/360,FAKE_LIGHT.saturation/100,brightness/100);
    console.log("rgb: ",rgb); 
    FAKE_LIGHT.brightness = brightness;
  },
  setHue: function(hue){
    console.log("Setting swimming pool light Hue to %s", hue);
    var rgb = color.hsvToRgb(hue/360,FAKE_LIGHT.saturation/100,FAKE_LIGHT.brightness/100);
    console.log("rgb: ",rgb); 
    FAKE_LIGHT.hue = hue;
  },
  setSaturation: function(saturation){
    console.log("Setting swimming pool light Saturation 💥 to %s", saturation);
    var rgb = color.hsvToRgb(FAKE_LIGHT.hue/360,saturation/100,FAKE_LIGHT.brightness/100);
    console.log("rgb: ",rgb); 
    FAKE_LIGHT.saturation = saturation;
  },
  identify: function() {
    console.log("Identify the swimming pool light!");
  }
}

// Generate a consistent UUID for our light Accessory that will remain the same even when
// restarting our server. We use the `uuid.generate` helper function to create a deterministic
// UUID based on an arbitrary "namespace" and the word "light".
var lightUUID = uuid.generate('hap-nodejs:accessories:SwimmingPoolLight');

// This is the Accessory that we'll return to HAP-NodeJS that represents our fake light.
var light = exports.accessory = new Accessory('Light', lightUUID);

// Add properties for publishing (in case we're using Core.js and not BridgedCore.js)
light.username = "1A:2B:3C:4D:5E:FE";
light.pincode = "031-45-154";

// set some basic properties (these values are arbitrary and setting them is optional)
light
  .getService(Service.AccessoryInformation)
  .setCharacteristic(Characteristic.Manufacturer, "iPool")
  .setCharacteristic(Characteristic.Model, "Rev-1")
  .setCharacteristic(Characteristic.SerialNumber, "A1S2NASF88EW");

// listen for the "identify" event for this Accessory
light.on('identify', function(paired, callback) {
  FAKE_LIGHT.identify();
  callback(); // success
});

// Add the actual Lightbulb Service and listen for change events from iOS.
// We can see the complete list of Services and Characteristics in `lib/gen/HomeKitTypes.js`
light
  .addService(Service.Lightbulb, "Swimming Pool Light") // services exposed to the user should have "names" like "Fake Light" for us
  .getCharacteristic(Characteristic.On)
  .on('set', function(value, callback) {
    FAKE_LIGHT.setPowerOn(value);
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
    
    if (FAKE_LIGHT.powerOn) {
      console.log("Is swimming pool light on? Yes.");
      callback(err, true);
    }
    else {
      console.log("Is swimming pool light on? No.");
      callback(err, false);
    }
  });

// Light show #1

light
  .getService(Service.Lightbulb)
  .getCharacteristic(Characteristic.LightShow1)
  .on('set', function(value, callback) {
    FAKE_LIGHT.setAnimation1On(value);
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
    
    if (FAKE_LIGHT.animationOn) {
      console.log("Is swimming pool light show #1 on? Yes.");
      callback(err, true);
    }
    else {
      console.log("Is swimming pool light show #1 on? No.");
      callback(err, false);
    }
  });


// Light show #2

light
  .getService(Service.Lightbulb)
  .getCharacteristic(Characteristic.LightShow2)
  .on('set', function(value, callback) {
    FAKE_LIGHT.setAnimation2On(value);
    callback(); // Our fake Light is synchronous - this value has been successfully set
  });

light
  .getService(Service.Lightbulb)
  .getCharacteristic(Characteristic.LightShow2)
  .on('get', function(callback) {
    
    // this event is emitted when you ask Siri directly whether your light is on or not. you might query
    // the light hardware itself to find this out, then call the callback. But if you take longer than a
    // few seconds to respond, Siri will give up.
    
    var err = null; // in case there were any problems
    
    if (FAKE_LIGHT.animationOn) {
      console.log("Is swimming pool light show #2 on? Yes.");
      callback(err, true);
    }
    else {
      console.log("Is swimming pool light show #2 on? No.");
      callback(err, false);
    }
  });


// also add an "optional" Characteristic for Brightness
light
  .getService(Service.Lightbulb)
  .addCharacteristic(Characteristic.Brightness)
  .on('get', function(callback) {
    callback(null, FAKE_LIGHT.brightness);
  })
  .on('set', function(value, callback) {
    FAKE_LIGHT.setBrightness(value);
    callback();
  })

  light
  .getService(Service.Lightbulb)
  .addCharacteristic(Characteristic.Hue)
  .on('get',function(callback){
   callback(null,FAKE_LIGHT.hue);
   })
   .on('set',function(value,callback){
   FAKE_LIGHT.setHue(value);
   callback();   
   })

light
  .getService(Service.Lightbulb)
  .addCharacteristic(Characteristic.Saturation)
  .on('get',function(callback){
   callback(null,FAKE_LIGHT.saturation);
   })
   .on('set',function(value,callback){
   FAKE_LIGHT.setSaturation(value);
   callback();   
   })


