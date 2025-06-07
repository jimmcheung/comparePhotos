# 部署说明

## 环境要求
- Node.js >= 16
- Nginx >= 1.18
- 支持 SSL 证书（推荐）

## 部署步骤

### 1. 准备工作
```bash
# 克隆代码
git clone https://github.com/jimmcheung/comparePhotos.git
cd comparePhotos

# 切换到部署分支
git checkout cp-jimplay

# 安装依赖
npm install
```

### 2. 构建项目
```bash
# 构建生产环境代码
npm run build
```

### 3. 服务器配置

#### Nginx 配置
1. 将 `nginx.conf` 文件中的配置复制到你的 Nginx 配置文件中
2. 修改以下配置项：
   - `server_name`: 改为你的域名
   - `root`: 改为你的实际部署路径
   - SSL 证书路径（如果启用 HTTPS）

#### SSL 证书（推荐）
1. 使用 Let's Encrypt 申请免费证书：
```bash
sudo certbot --nginx -d your-domain.com
```
2. 或手动配置已有的 SSL 证书：
   - 取消注释 nginx.conf 中的 HTTPS 配置部分
   - 更新证书路径

### 4. 文件部署
```bash
# 创建部署目录
sudo mkdir -p /var/www/comparePhotos

# 复制构建文件
sudo cp -r dist/* /var/www/comparePhotos/

# 设置权限
sudo chown -R www-data:www-data /var/www/comparePhotos
sudo chmod -R 755 /var/www/comparePhotos
```

### 5. 启动服务
```bash
# 检查 Nginx 配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

## 更新部署

### 1. 拉取最新代码
```bash
git pull origin cp-jimplay
```

### 2. 重新构建
```bash
npm install
npm run build
```

### 3. 更新文件
```bash
sudo cp -r dist/* /var/www/comparePhotos/
```

## 故障排查

### 1. 页面无法访问
- 检查 Nginx 错误日志: `sudo tail -f /var/log/nginx/error.log`
- 确认防火墙配置: `sudo ufw status`
- 验证域名解析: `ping your-domain.com`

### 2. 静态资源加载失败
- 检查文件权限
- 验证 Nginx 配置中的 root 路径
- 检查浏览器控制台错误

### 3. 路由问题
- 确认 Nginx 配置中的 try_files 指令
- 检查是否所有路由都正确重定向到 index.html

## 安全建议

1. 始终使用 HTTPS
2. 定期更新依赖包
3. 配置适当的 CSP 策略
4. 启用防火墙
5. 定期备份

## 性能优化

1. 启用 Gzip 压缩
2. 配置浏览器缓存
3. 使用 CDN 加速
4. 优化图片加载
5. 监控服务器资源使用 