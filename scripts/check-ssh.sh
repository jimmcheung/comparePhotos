#!/bin/bash

# Check SSH directory permissions
echo "Checking /root/.ssh directory..."
if [ ! -d "/root/.ssh" ]; then
    echo "Creating /root/.ssh directory..."
    mkdir -p /root/.ssh
fi
chmod 700 /root/.ssh

# Check authorized_keys file
echo "Checking authorized_keys file..."
if [ ! -f "/root/.ssh/authorized_keys" ]; then
    echo "authorized_keys file does not exist!"
    echo "Please create it with your public key"
else
    echo "Setting correct permissions on authorized_keys..."
    chmod 600 /root/.ssh/authorized_keys
fi

# Display current permissions
echo -e "\nCurrent permissions:"
ls -la /root/.ssh/

# Check if key is in authorized_keys
echo -e "\nNumber of keys in authorized_keys:"
wc -l /root/.ssh/authorized_keys 