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

# Set default target to multi-user to save energy
sudo systemctl set-default multi-user.target

# Allow 'pi' user to start X
sudo bash -c 'echo "allowed_users=anybody" > /etc/X11/Xwrapper.config'

# Create a script to start the Flask app with git pull and TypeScript compilation
sudo tee /home/pi/raspberryOS/start_flask_app.sh > /dev/null << 'EOF'
#!/bin/bash
cd /home/pi/raspberryOS
git pull
tsc
exec python3 /home/pi/raspberryOS/app.py
EOF
sudo chmod +x /home/pi/raspberryOS/start_flask_app.sh

# Create a systemd service for the Flask app
sudo tee /etc/systemd/system/flaskapp.service > /dev/null << 'EOF'
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
sudo tee /usr/local/bin/start_chromium.sh > /dev/null << 'EOF'
#!/bin/bash
export DISPLAY=:0
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

# Re-enable getty on tty1
sudo systemctl enable getty@tty1.service

# Configure autologin on tty1
sudo mkdir -p /etc/systemd/system/getty@tty1.service.d
sudo tee /etc/systemd/system/getty@tty1.service.d/override.conf > /dev/null << 'EOF'
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin pi --noclear %I $TERM
EOF

# Reload systemd daemon and restart getty service
sudo systemctl daemon-reload
sudo systemctl restart getty@tty1.service

# Create .xinitrc to start Chromium
sudo -u pi tee /home/pi/.xinitrc > /dev/null << 'EOF'
#!/bin/sh
exec /usr/local/bin/start_chromium.sh
EOF
sudo chmod +x /home/pi/.xinitrc

# Update .bash_profile to start X on tty1
sudo -u pi tee -a /home/pi/.bash_profile > /dev/null << 'EOF'

if [ -z "\$DISPLAY" ] && [ "\$(tty)" = "/dev/tty1" ]; then
  startx -- -nocursor
fi
EOF

# Clone the repository
sudo -u pi git clone https://github.com/S7eezy/raspberry-os.git /home/pi/raspberryOS
cd /home/pi/raspberryOS
sudo -u pi pip3 install -r requirements.txt
sudo -u pi tsc

# Enable and start flaskapp.service
sudo systemctl daemon-reload
sudo systemctl enable flaskapp.service
sudo systemctl start flaskapp.service

# Reboot the system
sudo reboot
