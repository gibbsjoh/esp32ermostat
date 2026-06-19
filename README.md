# esp32ermostat

Excuse the cheesy name.

Simple Micropython setup for an ESP32 to act as a thermostat to control your home heating.

Uses the 2-line LCD requires machine_i2c_lcd.py and lcd_api.py from https://github.com/dhylands/python_lcd which will need to be in the root path on the device.

Features:
* Web interface to set the target temp which is used to turn the boiler on and off
* Ability to manually turn on boiler with auto turn off in 20 mins (this can be changed in main.py)
* Likewise, ability to manually turn off before the 20 mins
