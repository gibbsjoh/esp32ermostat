# tsp32ermostat sensor code for esp32 + dht11
# John G 28/06/26
# couldn't get espruino working on my ESP32 for $reasons.
# so recreating the sensor stuff in MicroPython

# imports
import network
# import config # optional, uses config.py to store ssid/password
import machine
import dht # module for sensor
from time import sleep # the dh11 can only be polled once per second so we will code a delay so we don't mess things up
import socket

# set up wifi hardware
station = network.WLAN(network.STA_IF)
station.active(True)

# set ssid/password
ssid = "iot_wlan" # hard coded
# ssid = config.ssid # from a config.py file

password = "Motorola68040" # hard coded
# ssid = config.password # from a config.py file

# connect
station.connect(ssid, password)

# connect to wifi
while not station.isconnected():
    print('Connecting....')
    pass

# show IP address
print('Connected to Wi-Fi:', station.ifconfig())
myIP = station.ipconfig("addr4")[0]

# set up sensor
theSensor = dht.DHT11(machine.Pin(14)) # on pin 14

# set up socket for listener
thisSocket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
thisSocket.bind(('', 80))
thisSocket.listen(5)


# since the DHT11 returns temp and humidity, return both
# function to query sensor
def getReadings(thisSensor):
    sleep(2)
    thisSensor.measure()
    theTemp = thisSensor.temperature()
    theRH = thisSensor.humidity()
    theResult = {"temp":theTemp,"humidity":theRH}
    return theResult

# web server goodness
# def returnSensorValues():
#     global theSensor
#     global thisSocket
print("Webserver listening")

while True:
    conn, addr = thisSocket.accept()

    request = conn.recv(1024)

    # get the sensor value and set as response
    response = getReadings(theSensor)

    conn.send('HTTP/1.1 200 OK\n')
    conn.send('Content-Type: application/json\n')
    conn.send('Connection: close\n\n')
    conn.sendall(str(response))
    conn.close()

# returnSensorValues()
