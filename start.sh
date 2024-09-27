#!/bin/bash

cd /home/pi/raspberryOS/
git pull
tsc
python3 app.py & sleep 10
chromium-browser --noerrdialogs --disable-infobars --kiosk http://localhost:5000