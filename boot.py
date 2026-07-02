# ESP very basic thermostat control
# uses external sensor via requests/GET

from machine import RTC
import time
import network
import config
import ntptime
import urequests

ssid = config.ssid
password = config.password
station = network.WLAN(network.STA_IF)
station.active(True)
station.connect(ssid, password)

# connect to wifi
while not station.isconnected():
    print('Connecting....')
    pass

print('Connected to Wi-Fi:', station.ifconfig())
myIP = station.ipconfig("addr4")[0]

# set the RTC via NTP for logging etc

try:
    ntptime.settime()  # Syncs the ESP32's internal clock
    print("Time synchronized successfully!")
except Exception as e:
    print("Failed to sync time:", e)
