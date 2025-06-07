#!/bin/bash

echo "=== Checking Nginx Status ==="
systemctl status nginx

echo -e "\n=== Checking Site Directory ==="
ls -la /var/www/comparePhotos/dist

echo -e "\n=== Checking Nginx Configuration ==="
nginx -t

echo -e "\n=== Checking Site Logs ==="
echo "Error Log:"
tail -n 20 /var/log/nginx/cp.jimplay.cn_error.log
echo -e "\nAccess Log:"
tail -n 20 /var/log/nginx/cp.jimplay.cn_access.log

echo -e "\n=== Checking Nginx Configuration Files ==="
ls -la /etc/nginx/conf.d/

echo -e "\n=== Checking DNS Resolution ==="
nslookup cp.jimplay.cn

echo -e "\n=== Checking Firewall Status ==="
ufw status 