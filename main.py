# ESP very basic thermostat control
# uses external sensor via requests/GET

from machine import Pin, I2C
import time
import socket
import config
import ujson
import urequests
import asyncio
import ure
from machine_i2c_lcd import I2cLcd
import lcd_api

print("Starting main.py")

# ssid = config.ssid
# password = config.password
# station = network.WLAN(network.STA_IF)
# station.active(True)
# station.connect(ssid, password)
# 
# # connect to wifi
# while not station.isconnected():
#     print('Connecting....')
#     pass
# 
# print('Connected to Wi-Fi:', station.ifconfig())
# myIP = station.ipconfig("addr4")[0]
# 
# # set the RTC via NTP for logging etc
# try:
#     ntptime.settime()  # Syncs the ESP32's internal clock
#     print("Time synchronized successfully!")
# except Exception as e:
#     print("Failed to sync time:", e)

# set up socket for http server
thisSocket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
thisSocket.setblocking(False) # need to set non blocking so async works!
thisSocket.bind(('', 80))
thisSocket.listen(5)

# variables
forceOn = 0 # forceOn lets you turn on the boiler irrespective of temperature

relayPin = Pin(15, Pin.OUT) # pin to control the relay
# start with boiler off
relayPin.value(0)
boilerOnOff = "Off"

targetTemp = 19 # target temp for the boiler to achieve - set to something around what you'd usually have

# get the temp every 30 seconds and create a rolling average over 5 mins
# Store the last 10 readings (5 minutes at 30s intervals)
bufferSize = 10
tempBuffer = []
bufferIndex = 0
bufferFilled = False

sensorURL = "http://192.168.0.248"

# set up 2 line display on i2c
# Define the LCD I2C address and dimensions
i2cAddress = 0x27
ic2Rows = 2
i2cCols = 16

# Initialize I2C and LCD objects
i2c = I2C(1, sda=Pin(21), scl=Pin(22))
lcd = I2cLcd(i2c, i2cAddress, ic2Rows, i2cCols)

# show a welcome message
lcd.move_to(0, 0)
lcd.putstr("Welcome!")

# load the html
def web_page():
    file = open('index.html', 'r')
    html = file.read()
    file.close()
    return html

html = web_page()

def getTempFromSensor():
    # get the current temp from the pi pico
    # it'll return JSON: {"temp":12.345}
    global sensorURL
    global targetTemp
    try:
        response = urequests.get(sensorURL)
        responseDC = dechunk(response.text)
        responseJSON = ujson.loads(responseDC)
        theTempReading = responseJSON["temp"]
        returnMe = round(theTempReading,1)
    except:
        returnMe = targetTemp # if the sensor stops responding, use whatever the target was last time
    return returnMe

def dechunk(raw):
    out = ""
    while raw:
        pos = raw.find("\r\n")
        size = int(raw[:pos], 16)
        if size == 0:
            break
        start = pos + 2
        end = start + size
        out += raw[start:end]
        raw = raw[end+2:]
    return out

# function to get target temp value from the request from the setup webpage
def get_target_value(theRequest):
    reqString = theRequest.decode() # convert bytes to a string
    key = "?target=" # set what we're looking for
    idx = reqString.find(key)
    if idx == -1:
        return None # returns None if called w/out the temp setting

    start = idx + len(key)
    end = reqString.find(" ", start)  # end of URL path
    if end == -1:
        end = len(reqString)

    return reqString[start:end]
    

def addCurrentTempToBuffer():
    global bufferIndex, bufferFilled

    temp = getTempFromSensor()

    if len(tempBuffer) < bufferSize:
        tempBuffer.append(temp)
        if len(tempBuffer) == bufferSize:
            bufferFilled = True
    else:
        tempBuffer[bufferIndex] = temp
        bufferIndex = (bufferIndex + 1) % bufferSize

def getRunningAverage():
    if not tempBuffer:
        return None
    theAverageTemp = round(sum(tempBuffer) / len(tempBuffer),1)
    print("Current average:", theAverageTemp)
    return theAverageTemp

async def updateDisplay():
    # updates the status display every 25 seconds
    global targetTemp
    global boilerOnOff
    global lcd
    line1 = "Target: " + str(targetTemp)
    line2 = "Boiler is: " + boilerOnOff.upper()
    lcd.clear()
    lcd.move_to(0, 0)
    lcd.putstr(line1)
    lcd.move_to(0, 1)
    lcd.putstr(line2)
    
    await asyncio.sleep(25)

async def getTempLoop():
    while True:
        addCurrentTempToBuffer()
        await asyncio.sleep(15)   # 15‑second interval
        
async def boilerControl():
    global targetTemp
    global boilerOnOff
    # get the average temperature
    # compare it to the target temp
    # turn boiler on or off accordingly
    while True:
        print("Called boiler loop")
        currentAverage = getRunningAverage()
        if ( currentAverage > targetTemp ):
            relayPin(0)
            print("Turning boiler off")
            boilerOnOff = "Off"
        elif ( currentAverage < targetTemp ):
            relayPin(1)
            print("Turning boiler on")
            boilerOnOff = "On"
        await asyncio.sleep(20)

async def displayWebPage():
    # shows the control web page
    global targetTemp
    global html
    global boilerOnOff
    global thisSocket
    print("Webserver listening")
    while True:
        # wrap the accept() in a try statement in case this function isn't currently the current task in the async business
        try:
            conn, addr = thisSocket.accept()
        except OSError:
            await asyncio.sleep_ms(10)
            continue

        print('Got a connection from %s' % str(addr))
        conn.setblocking(False)
         # Non-blocking recv
        try:
            request = conn.recv(1024)
        except OSError:
            # No data yet → yield and retry next loop
            conn.close()
            await asyncio.sleep_ms(1)
            continue
        
        # ** get the temp value using get_target_value(theRequest)
        targetTempValue = get_target_value(request)
        if targetTempValue:
            # set the target temp variable
            print("Target set: ", targetTempValue)
            #print("Debug vartype: " , type(targetTempValue))
            targetTemp = float(targetTempValue)
        # set boiler status text
        response = (
        html.replace("{boilerStatus}", boilerOnOff)
            .replace("{targetTemp}", str(targetTemp))
            .replace("{roomTemp}", str(getRunningAverage()))
            )

        conn.send('HTTP/1.1 200 OK\n')
        conn.send('Content-Type: text/html\n')
        conn.send('Connection: close\n\n')
        conn.sendall(response)
        conn.close()
        await asyncio.sleep(1)

    
# turn on the boiler if average temp is under targetTemp for more than 30 seconds
# turn off the boiler if average temp is over targetTemp for more than 30 seconds
async def main():
    # main function to tie it all togetrher
    asyncio.create_task(getTempLoop())
    asyncio.create_task(boilerControl())
    asyncio.create_task(displayWebPage())
    asyncio.create_task(updateDisplay())

    print("running!")

    # Keep main alive so tasks can run
    while True:
        await asyncio.sleep(1)


asyncio.run(main())
    
