# esp32ermostat

Excuse the cheesy name.

Simple Micropython setup for an ESP32 to act as a thermostat to control your home heating.

Uses the 2-line LCD requires machine_i2c_lcd.py and lcd_api.py from https://github.com/dhylands/python_lcd which will need to be in the root path on the device.

Kaluma code for the Pi Pico W / Pico 2 W is in the sensor directory

Features:
* Web interface to set the target temp which is used to turn the boiler on and off
* Ability to manually turn on boiler with auto turn off in 20 mins (this can be changed in main.py)
* Likewise, ability to manually turn off before the 20 mins

I'm happy to accept changes! Especially looking for anyone with some other temp sensors to write a routine to get the temp for these.

To Do / Ideas:
* Nicer looking web interface
* Support for OLED display or possibly e-ink (also to show current ambient temp)
* Push-button control for when you don't feel like loading up the web interface
* Audible on/off feedback (like a beep when it turns on and double when turns off)
* Play music when the boiler is on (KIDDING!)
