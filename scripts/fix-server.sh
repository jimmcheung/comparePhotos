#!/bin/bash

echo "=== 1. 检查并启动 Nginx ==="
systemctl status nginx
if ! systemctl is-active --quiet nginx; then
    echo "Nginx 未运行，正在启动..."
    systemctl start nginx
fi

echo -e "\n=== 2. 检查防火墙规则 ==="
if command -v ufw &> /dev/null; then
    ufw status
    echo "确保 80 和 443 端口开放..."
    ufw allow 80/tcp
    ufw allow 443/tcp
fi

echo -e "\n=== 3. 检查网站目录权限 ==="
if [ ! -d "/var/www/comparePhotos/dist" ]; then
    echo "创建网站目录..."
    mkdir -p /var/www/comparePhotos/dist
fi
chown -R www-data:www-data /var/www/comparePhotos
chmod -R 755 /var/www/comparePhotos

echo -e "\n=== 4. 检查 Nginx 配置 ==="
echo "检查配置文件是否存在..."
if [ ! -f "/etc/nginx/conf.d/cp.jimplay.cn.conf" ]; then
    echo "配置文件不存在，正在创建软链接..."
    ln -s /var/www/comparePhotos/deploy/nginx/cp.jimplay.cn.conf /etc/nginx/conf.d/
fi

echo "验证 Nginx 配置..."
nginx -t

echo -e "\n=== 5. 检查日志文件权限 ==="
touch /var/log/nginx/cp.jimplay.cn_error.log
touch /var/log/nginx/cp.jimplay.cn_access.log
chown www-data:adm /var/log/nginx/cp.jimplay.cn_*.log
chmod 640 /var/log/nginx/cp.jimplay.cn_*.log

echo -e "\n=== 6. 重新加载 Nginx 配置 ==="
systemctl reload nginx

echo -e "\n=== 7. 显示最新的错误日志 ==="
tail -n 50 /var/log/nginx/cp.jimplay.cn_error.log

echo -e "\n=== 8. 测试网站访问 ==="
curl -I http://localhost:80 -H "Host: cp.jimplay.cn" 