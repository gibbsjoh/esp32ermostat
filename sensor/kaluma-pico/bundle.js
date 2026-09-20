/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((module) => {

"use strict";
module.exports = require("adc");

/***/ }),
/* 2 */
/***/ ((module) => {

"use strict";
module.exports = require("rp2");

/***/ }),
/* 3 */
/***/ ((module) => {

"use strict";
module.exports = require("wifi");

/***/ }),
/* 4 */
/***/ ((module) => {

"use strict";
module.exports = require("http");

/***/ }),
/* 5 */
/***/ ((__unused_webpack_module, exports) => {

class DHT {
  constructor(pin, type) {
    this.pin = pin;
    this.type = DHT.DHT11;
    if (type) {
      this.type = type;
    }
    this.humidity = -1;
    this.temperature = -1;
  }

  trim(bits) {
    if (bits) {
      // trim first ack signals
      while (bits[0] > 60 || bits[0] < 40) {
        bits.shift();
      }
      // trim unnecessary tail signals
      while (bits.length > 80) {
        bits.pop();
      }
    }
  }

  toBytes(bits) {
    var bytes = [0, 0, 0, 0, 0];
    for (var i = 0; i < 5; i++) {
      for (var j = 0; j < 8; j++) {
        if (bits[(i * 8 + j) * 2] > 40 && bits[(i * 8 + j) * 2] < 60) {
          if (bits[(i * 8 + j) * 2 + 1] > 50) {
            bytes[i] = bytes[i] | (1 << (7 - j));
          }
        }
      }
    }
    return bytes;
  }

  checksum(bytes) {
    return ((bytes[0] + bytes[1] + bytes[2] + bytes[3]) & 0xff) === bytes[4];
  }

  decode(bytes, type) {
    if (this.checksum(bytes) === true) {
      var data = [-1, -1];
      if (type === DHT.DHT11) {
        data[0] = bytes[0] + bytes[1] * 0.1;
        if ((bytes[3] & 0x80) === 0x80) {
          data[1] = -1 - bytes[2] + (bytes[3] & 0x0f) * 0.1;
        } else {
          data[1] = bytes[2] + (bytes[3] & 0x0f) * 0.1;
        }
      } else if (type === DHT.DHT12) {
        data[0] = bytes[0] + bytes[1] * 0.1;
        data[1] = (bytes[2] & 0x7f) + (bytes[3] & 0x0f) * 0.1;
        if ((bytes[3] & 0x80) === 0x80) {
          data[1] *= -1;
        }
      } else {
        // DHT21, DHT22
        data[0] = ((bytes[0] << 8) | bytes[1]) * 0.1;
        if ((bytes[2] & 0x80) === 0x80) {
          data[1] = (((bytes[2] & 0x7f) << 8) | bytes[3]) * -0.1;
        } else {
          data[1] = (((bytes[2] & 0x7f) << 8) | bytes[3]) * 0.1;
        }
      }
      return data;
    }
    return null;
  }

  read() {
    var bits = pulseRead(this.pin, 100, {
      timeout: 25000,
      startState: LOW,
      mode: INPUT,
      trigger: {
        startState: HIGH,
        interval: [10000, 18000],
      },
    });
    this.trim(bits);
    if (bits === null || bits.length !== 80) {
      return null;
    }
    // decodes
    var bytes = this.toBytes(bits);
    var data = this.decode(bytes, this.type);
    if (data) {
      this.humidity = data[0];
      this.temperature = data[1];
      return data;
    }
    return null;
  }
}

DHT.DHT11 = 0;
DHT.DHT12 = 1;
DHT.DHT21 = 2;
DHT.DHT22 = 3;

exports.DHT = DHT;


/***/ }),
/* 6 */
/***/ ((module) => {

"use strict";
module.exports = require("gpio");

/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	const __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		const cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		const module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
let __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
const { ADC } = __webpack_require__(1);
const rp2 = __webpack_require__(2);
//const net = require('net');
const WiFi = (__webpack_require__(3).WiFi);
const http = __webpack_require__(4);
const dhtPin = 15;
const {DHT} = __webpack_require__(5);
const dht = new DHT(dhtPin, DHT.DHT11);
const { GPIO } = __webpack_require__(6);


let result = dht.read();
var tempNow = dht.temperature;
console.log("Temp:" + tempNow);


// set up a jumper on GP14 to ground, if this is 1 then jumper is open, if 0, it's closed. use this to set payloadType or sensorType?
const jumperPin1 = new GPIO(14, INPUT_PULLUP);
var j1Value = jumperPin1.read();
const jumperPin2 = new GPIO(18, INPUT_PULLUP);
var j2Value = jumperPin2.read();

let sensorType;
let payloadType;

// sensorType is dht11 or pico
if (j1Value == 1){
    sensorType = 'dht11'; 
} else {
    sensorType = 'pico';
}
// payloadType is thermostat {"temp":nn} or templogger {"Temperature":nn,"RelativeHumidity":nn,"Location":"string","SensorType":"string"} 
if (j2Value == 1){
    payloadType = 'thermostat'; 
} else {
    payloadType = 'templogger'; 
}

const theLocation = 'Home Back Yard';
var tempJSON

function getTemp(){
    if (sensorType == 'dht11'){
        let result = dht.read();
            if (result) {
                    var tempNow = dht.temperature;
                    tempNow = tempNow.toFixed(1);
                    var rhNow = dht.humidity;
                if (payloadType == 'thermostat'){
                    tempJSON = {"temp":tempNow};
                } else if (payloadType == 'templogger'){
                    tempJSON = {"Temperature":tempNow,"RelativeHumidity":rhNow,"Location":theLocation,"SensorType":sensorType}
                }

            } else {
                console.log('Failed to read');
                var tempJSON = {"temp":26};
            }
    } else {
        console.log('getTemp() for pico called.');
        var a = new ADC(rp2.TEMPERATURE_ADC);
        var value = a.read(); // Read the ADC value at the RP2 intenal temperature ADC.
        var adc_voltage = value * 3.3;
        var tempNow = 27-(adc_voltage-0.706)/0.001721;
        tempNow = tempNow.toFixed(1);
        var tempJSON = {"temp":tempNow};
    }
    return tempJSON;
}

// connect to wifi and get IP address
let myWifi = new WiFi();
myWifi.connect({
    ssid: 'iot_wlan',password:'Motorola68040'}, (err) =>
    {
        if (err) {
            console.error(err);
        } else {
            console.log("Connected!");
        }
    }
);


// webserver
const server = http.createServer((req, res) => {
    console.log("Request received");
  let thisTemp = getTemp();
  let body = JSON.stringify(thisTemp)
  console.log(body)
  res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': body.length, 'Connection': 'close' });
  res.end(body);
});

const port = 80;

server.listen(port, () => {
    var myIPAddress = server._dev.ip;
    console.log('HTTP server listening on port ' + port);
    console.log('IP is ' + myIPAddress);
});



})();

/******/ })()
;