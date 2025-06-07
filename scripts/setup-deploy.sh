#!/bin/bash

# 在服务器上运行此脚本以设置部署环境

# 创建部署用户（如果不存在）
if ! id -u "deployer" > /dev/null 2>&1; then
    sudo useradd -m -s /bin/bash deployer
    sudo usermod -aG sudo deployer
fi

# 创建项目目录
sudo mkdir -p /var/www/comparePhotos
sudo chown -R deployer:deployer /var/www/comparePhotos

# 创建 SSH 密钥
if [ ! -f /home/deployer/.ssh/id_rsa ]; then
    sudo -u deployer ssh-keygen -t rsa -b 4096 -f /home/deployer/.ssh/id_rsa -N ""
fi

# 设置权限
sudo chmod 700 /home/deployer/.ssh
sudo chmod 600 /home/deployer/.ssh/id_rsa
sudo chmod 644 /home/deployer/.ssh/id_rsa.pub

# 添加公钥到授权密钥
sudo -u deployer touch /home/deployer/.ssh/authorized_keys
sudo -u deployer cat /home/deployer/.ssh/id_rsa.pub >> /home/deployer/.ssh/authorized_keys
sudo chmod 600 /home/deployer/.ssh/authorized_keys

# 允许 deployer 用户无密码执行 nginx 重启
echo "deployer ALL=(ALL) NOPASSWD: /bin/systemctl restart nginx" | sudo EDITOR='tee -a' visudo

# 输出公钥和私钥
echo "=== 公钥 (添加到服务器的 authorized_keys) ==="
cat /home/deployer/.ssh/id_rsa.pub

echo -e "\n=== 私钥 (添加到 GitHub Secrets) ==="
cat /home/deployer/.ssh/id_rsa 