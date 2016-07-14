var Accessory = require('../').Accessory;
var Service = require('../').Service;
var Characteristic = require('../').Characteristic;
var uuid = require('../').uuid;
var ws281x = require('rpi-ws281x-native');
var color = require('./color.js');

// NeoPixel realted declarations and instantiations
var r=0, g=0, b=0;
var NUM_LEDS = 8,
pixelData = new Uint32Array(NUM_LEDS);
ws281x.init(NUM_LEDS);
var refreshIntervalId1;
var refreshIntervalId2;
var lastknownbrightness;

// NeoPixel realted functions
function colorwheel(pos) {
  pos = 255 - pos;
  if (pos < 85) { return rgb2Int(255 - pos * 3, 0, pos * 3); }
  else if (pos < 170) { pos -= 85; return rgb2Int(0, pos * 3, 255 - pos * 3); }
  else { pos -= 170; return rgb2Int(pos * 3, 255 - pos * 3, 0); }
}

function rgb2Int(r, g, b) {
  return ((r & 0xff) << 16) + ((g & 0xff) << 8) + (b & 0xff);
}

// Reset NeoPixels on exit
process.on('SIGINT', function () {
  ws281x.reset();
  process.nextTick(function () { process.exit(0); });
});


// here's a fake hardware device that we'll expose to HomeKit
var FAKE_LIGHT = {
  powerOn: false,
  brightness: 100, // percentage
  animationOn: false,
  hue: 0,
  saturation: 0,
  
  setPowerOn: function(on) { 
    var localbrightness = 0;
    console.log("Turning the swimming pool lights 🏊 %s!", on ? "on" : "off");
    if (on) {
      var rgb = color.hsvToRgb(FAKE_LIGHT.hue/360,FAKE_LIGHT.saturation/100,FAKE_LIGHT.brightness/100);
      for (var i = 0; i < NUM_LEDS; i++) {
        pixelData[i] = rgb2Int(rgb[0], rgb[1], rgb[2]);
      }
      ws281x.render(pixelData);
      FAKE_LIGHT.powerOn = on;
    }
    else
    {
      var rgb = color.hsvToRgb(FAKE_LIGHT.hue/360,FAKE_LIGHT.saturation/100,localbrightness/100);
      //FAKE_LIGHT.brightness = localbrightness;  
      for (var i = 0; i < NUM_LEDS; i++) {
        pixelData[i] = rgb2Int(rgb[0], rgb[1], rgb[2]);
      }
      ws281x.render(pixelData);
      FAKE_LIGHT.powerOn = on;

      // stop animation-loop
      clearInterval(refreshIntervalId1);
      clearInterval(refreshIntervalId2);      
    }
  },

  setAnimation1On: function(on) { 
    var saturation = 0;
    var hue = 0;
    console.log("Turning the swimming pool light show ✨ 1️⃣  %s!", on ? "on" : "off");
    FAKE_LIGHT.animationOn = on;
    if (on) {
      // start animation-loop
      refreshIntervalId1 = setInterval(function () {
        for (var i = 0; i < NUM_LEDS; i++) {
          hue = (hue + 1) % 360;
          saturation = 100;
          var rgb = color.hsvToRgb(hue/360,saturation/100,FAKE_LIGHT.brightness/100);
          FAKE_LIGHT.hue = hue;
          FAKE_LIGHT.saturation = saturation;
          for (var i = 0; i < NUM_LEDS; i++) {
            pixelData[i] = rgb2Int(rgb[0], rgb[1], rgb[2]);
          }
        }
        ws281x.render(pixelData);
      }, 1000 / 30);
    }
    else {
      // stop animation-loop
      clearInterval(refreshIntervalId1);
    }
  },

  setAnimation2On: function(on) { 
    var saturation = 0;
    console.log("Turning the swimming pool light show ✨ 2️⃣  %s!", on ? "on" : "off");
    FAKE_LIGHT.animationOn = on;
    if (on) {
      // start animation-loop
      refreshIntervalId2 = setInterval(function () {
        for (var i = 0; i < NUM_LEDS; i++) {
          saturation = (saturation + 1) % 100;
          var rgb = color.hsvToRgb(FAKE_LIGHT.hue/360,saturation/100,FAKE_LIGHT.brightness/100);
          FAKE_LIGHT.saturation = saturation;
          for (var i = 0; i < NUM_LEDS; i++) {
            pixelData[i] = rgb2Int(rgb[0], rgb[1], rgb[2]);
          }
        }
        ws281x.render(pixelData);
      }, 1000 / 30);
    }
    else {
      // stop animation-loop
      clearInterval(refreshIntervalId2);
    }
  },

  setBrightness: function(brightness) {
    console.log("Setting swimming pool light brightness ☀️ to %s a,d Hue: %s Saturation: %s", brightness, FAKE_LIGHT.hue, FAKE_LIGHT.saturation);
    var rgb = color.hsvToRgb(FAKE_LIGHT.hue/360,FAKE_LIGHT.saturation/100,brightness/100);
    console.log("rgb: ",rgb[0], rgb[1], rgb[2]); 
    FAKE_LIGHT.brightness = brightness;
    for (var i = 0; i < NUM_LEDS; i++) {
      pixelData[i] = rgb2Int(rgb[0], rgb[1], rgb[2]);
    }
    ws281x.render(pixelData);
  },
  setHue: function(hue){
    console.log("Setting swimming pool light Hue to %s", hue);
    var rgb = color.hsvToRgb(hue/360,FAKE_LIGHT.saturation/100,FAKE_LIGHT.brightness/100);
    console.log("rgb: ",rgb[0], rgb[1], rgb[2]); 
    FAKE_LIGHT.hue = hue;
    for (var i = 0; i < NUM_LEDS; i++) {
      pixelData[i] = rgb2Int(rgb[0], rgb[1], rgb[2]);
    }
    ws281x.render(pixelData);    
  },
  setSaturation: function(saturation){
    console.log("Setting swimming pool light Saturation 💥 to %s", saturation);
    var rgb = color.hsvToRgb(FAKE_LIGHT.hue/360,saturation/100,FAKE_LIGHT.brightness/100);
    console.log("rgb: ",rgb[0], rgb[1], rgb[2]); 
    FAKE_LIGHT.saturation = saturation;
    for (var i = 0; i < NUM_LEDS; i++) {
      pixelData[i] = rgb2Int(rgb[0], rgb[1], rgb[2]);
    }
    ws281x.render(pixelData);
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

// Light show #3
light
  .addService(Service.Lightbulb) // services exposed to the user should have "names" like "Fake Light" for us
  .getCharacteristic(Characteristic.LightShow3)
  .on('set', function(value, callback) {
    
    if (value == Characteristic.LightShow3.SHOW1) {
      //FAKE_LOCK.unlock();
      //callback(); // Our fake Lock is synchronous - this value has been successfully set
      
      // now we want to set our lock's "actual state" to be unsecured so it shows as unlocked in iOS apps
      light
        .getService(Service.Lightbulb)
        .setCharacteristic(Characteristic.On, true );
    }
    else if (value == Characteristic.LightShow3.SHOW2) {
      // FAKE_LOCK.lock();
      // callback(); // Our fake Lock is synchronous - this value has been successfully set
      
      // now we want to set our lock's "actual state" to be locked so it shows as open in iOS apps
      light
        .getService(Service.Lightbulb)
        .setCharacteristic(Characteristic.On, false);
    }
  });


// also add an "optional" Characteristic for Brightness
light
  .getService(Service.Lightbulb)
  .addCharacteristic(Characteristic.Brightness)
  .on('get', function(callback) {
    console.log("❓What's the curent Brightness?");
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
   console.log("❓What's the curent Hue?");
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
   console.log("❓What's the curent Saturation?");
   callback(null,FAKE_LIGHT.saturation);
   })
   .on('set',function(value,callback){
   FAKE_LIGHT.setSaturation(value);
   callback();   
   })


