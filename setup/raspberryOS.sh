#!/bin/bash

# System updates and basic dependencies
sudo apt update -y
sudo apt full-upgrade -y
sudo apt install -y git python3 python3-pip unclutter chromium-browser --no-install-recommends
sudo apt install -y --no-install-recommends xserver-xorg x11-xserver-utils xinit

# Remove unnecessary packages
sudo apt purge -y libreoffice* wolfram-engine sonic-pi scratch nuscratch idle3 smartsim python3-pygame
sudo apt autoremove -y

# Install Node.js and TypeScript
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g typescript

# Disable unused default services
for service in triggerhappy.service \
               avahi-daemon.service \
               bluetooth.service \
               cups.service \
               hciuart.service \
               nfs-common.service \
               rpcbind.service \
               rsyslog.service \
               apt-daily.service \
               apt-daily-upgrade.service; do
    sudo systemctl disable "$service"
done

# Create a systemd service for the Flask app
sudo tee /etc/systemd/system/flaskapp.service > /dev/null << EOF
[Unit]
Description=Flask Application
After=network.target

[Service]
User=pi
WorkingDirectory=/home/pi/raspberryOS
ExecStart=/usr/bin/python3 /home/pi/raspberryOS/app.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Create a script to start X and Chromium
sudo tee /usr/local/bin/start_chromium.sh > /dev/null << EOF
#!/bin/bash
xset s off
xset -dpms
xset s noblank
unclutter -idle 0 &
chromium-browser --noerrdialogs --disable-infobars --kiosk http://localhost:5000
EOF
sudo chmod +x /usr/local/bin/start_chromium.sh

# Create a systemd service for X and Chromium
sudo tee /etc/systemd/system/chromium.service > /dev/null << EOF
[Unit]
Description=Start X and Chromium in kiosk mode
After=network.target flaskapp.service

[Service]
User=pi
Environment=DISPLAY=:0
ExecStart=/usr/bin/startx /usr/local/bin/start_chromium.sh --
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Clone the repository
git clone https://github.com/S7eezy/raspberry-os.git /home/pi/raspberryOS
cd /home/pi/raspberryOS
pip3 install -r requirements.txt
tsc

# Enable and start the services
sudo systemctl enable flaskapp.service
sudo systemctl enable chromium.service
sudo systemctl start flaskapp.service
sudo systemctl start chromium.service

# Disable getty on tty1 to prevent login prompt
sudo systemctl disable getty@tty1.service

# Reboot the system
sudo reboot
