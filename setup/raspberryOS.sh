#!/bin/bash

# System updates and basic dependencies
sudo apt update -y
sudo apt full-upgrade -y

# Remove default apps
sudo apt purge -y libreoffice* wolfram-engine sonic-pi scratch nuscratch idle3 smartsim python3-pygame
sudo apt autoremove -y

# Install dependencies
sudo apt install -y --no-install-recommends git python3 python3-pip unclutter
sudo apt install -y --no-install-recommends xserver-xorg x11-xserver-utils xinit chromium-browser

# Install Node.js and TypeScript
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y --no-install-recommends nodejs
sudo npm install -g typescript

# Disable unused default services
for service in \
    triggerhappy.service \
    avahi-daemon.service \
    bluetooth.service \
    cups.service \
    hciuart.service \
    nfs-common.service \
    rpcbind.service \
    rsyslog.service \
    apt-daily.service \
    apt-daily-upgrade.service \
    ModemManager.service \
    alsa-restore.service \
    alsa-state.service \
    speech-dispatcher.service; do
    sudo systemctl disable "$service"
done

# Boot without windows manager
sudo systemctl set-default multi-user.target
sudo bash -c 'echo "allowed_users=anybody" > /etc/X11/Xwrapper.config'

# Create a script to start the Flask app with git pull and TypeScript compilation
sudo tee /home/pi/raspberryOS/start_flask_app.sh > /dev/null << EOF
#!/bin/bash
cd /home/pi/raspberryOS
git pull
tsc
exec python3 /home/pi/raspberryOS/app.py
EOF
sudo chmod +x /home/pi/raspberryOS/start_flask_app.sh

# Create a systemd service for the Flask app
sudo tee /etc/systemd/system/flaskapp.service > /dev/null << EOF
[Unit]
Description=Flask Application
After=network.target

[Service]
User=pi
WorkingDirectory=/home/pi/raspberryOS
ExecStart=/home/pi/raspberryOS/start_flask_app.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Create a script to start Chromium in kiosk mode with optimized flags
sudo tee /usr/local/bin/start_chromium.sh > /dev/null << EOF
#!/bin/bash
xset s off       # Disable screen saver
xset -dpms       # Disable power management
xset s noblank   # Prevent screen blanking
unclutter -idle 0 &
exec chromium-browser --noerrdialogs --disable-infobars --kiosk http://localhost:5000 \
--disable-translate \
--disable-features=TranslateUI \
--disable-sync \
--disable-background-networking \
--disable-default-apps \
--no-first-run \
--fast \
--fast-start \
--disable-extensions \
--disable-component-update \
--disable-background-timer-throttling \
--disable-client-side-phishing-detection \
--disable-hang-monitor \
--disable-popup-blocking \
--disable-prompt-on-repost \
--disable-session-crashed-bubble \
--disable-renderer-backgrounding \
--disable-cloud-import \
--password-store=basic \
--use-mock-keychain
EOF
sudo chmod +x /usr/local/bin/start_chromium.sh

# Create a systemd service to start X and Chromium without 'startx'
sudo tee /etc/systemd/system/chromium.service > /dev/null << EOF
[Unit]
Description=Start X and Chromium in kiosk mode
After=network.target flaskapp.service

[Service]
User=pi
Environment=DISPLAY=:0
ExecStart=/usr/bin/xinit /usr/local/bin/start_chromium.sh -- :0 -nolisten tcp vt1
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Clone the repository
git clone https://github.com/S7eezy/raspberry-os.git /home/pi/raspberryOS
cd /home/pi/raspberryOS
pip3 install -r requirements.txt
tsc

# Disable getty on tty1 to prevent login prompt interference
sudo systemctl disable getty@tty1.service

# Reload systemd daemons and enable services
sudo systemctl daemon-reload
sudo systemctl enable flaskapp.service
sudo systemctl enable chromium.service

#echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
#sudo sed -i '/^gpu_mem=/d' /boot/config.txt
#echo 'gpu_mem=128' | sudo tee -a /boot/config.txt

# Reboot the system
sudo reboot
