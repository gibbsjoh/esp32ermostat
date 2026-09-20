const { ADC } = require('adc');
const rp2 = require('rp2');
//const net = require('net');
const WiFi = require('wifi').WiFi;
const http = require('http');
const dhtPin = 15;
const {DHT} = require('dht');
const dht = new DHT(dhtPin, DHT.DHT11);
const { GPIO } = require('gpio');


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


