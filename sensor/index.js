const { ADC } = require('adc');
const rp2 = require('rp2');
//const net = require('net');
const WiFi = require('wifi').WiFi;
const http = require('http');

function getTemp(){
    var a = new ADC(rp2.TEMPERATURE_ADC);
    var value = a.read(); // Read the ADC value at the RP2 intenal temperature ADC.
    var adc_voltage = value * 3.3;
    var tempNow = 27-(adc_voltage-0.706)/0.001721;
    var tempJSON = {"temp":tempNow};
    return tempJSON;
}

// connect to wifi and get IP address
let myWifi = new WiFi();
myWifi.connect({
    ssid: 'yourSSID',password:'yourPassword'}, (err) =>
    {
        if (err) {
            console.error(err);
        } else {
            console.log("Connected!");
        }
    }
);

//const thisConnection = new net.Socket();
//console.log(thisConnection.localAddress);


// webserver
const server = http.createServer((req, res) => {
  const thisTemp = getTemp();
  const body = JSON.stringify(thisTemp)
  res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': body.length, 'Connection': 'close' });
  res.end(body);
});

const port = 80;

server.listen(port, () => {
  console.log('HTTP server listening on port ' + port);
});


