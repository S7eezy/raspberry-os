#!/bin/bash

# System updates, dependencies
sudo apt update -y
sudo apt full-upgrade -y
sudo apt install -y git python3 python3-pip unclutter chromium-browser
sudo apt install --no-install-recommends xserver-xorg xinit

sudo apt purge -y libreoffice* wolfram-engine sonic-pi scratch nuscratch idle3 smartsim python3-pygame
sudo apt autoremove -y

# Disable unused default services
sudo systemctl disable triggerhappy.service
sudo systemctl disable avahi-daemon.service
sudo systemctl disable cups.service
sudo systemctl disable hciuart.service
sudo systemctl disable nmbd.service
sudo systemctl disable smbd.service
sudo systemctl disable dhcpcd.service

# Configure Xserver display
echo -e "@xset s off\n@xset -dpms\n@xset s noblank" >> /etc/xdg/lxsession/LXDE-pi/autostart
sudo raspi-config nonint do_boot_behaviour B1
if ! grep -q 'if [ -z "$DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then' ~/.bashrc; then
    echo -e '\nif [ -z "$DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then\n    startx\nfi' >> ~/.bashrc
fi

# Clone repo
git clone https://github.com/S7eezy/raspberry-os.git
mv raspberry-os raspberryOS
cd raspberryOS
pip3 install -r requirements.txt

# Configure autostart
mkdir -p ~/.config/autostart
cp setup/raspberryOS.desktop ~/.config/autostart
chmod +x start.sh

sudo reboot