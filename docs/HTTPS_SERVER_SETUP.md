# 服务器端 HTTPS 配置方案

## 概述

本方案通过 **Nginx 反向代理** 在服务器端实现 HTTPS，无需修改应用代码。应用继续在内部端口运行 HTTP，Nginx 负责：
- 处理 HTTPS/SSL 终止
- 域名绑定
- 反向代理到后端应用
- 提供静态文件服务

---

## 架构图

```
客户端 (HTTPS)
    ↓
Nginx (443端口) ← SSL证书
    ↓ (HTTP)
Node.js 应用 (3351端口)
    ↓
SQLite 数据库
```

---

## 前置要求

### 1. 域名准备
- 已购买并配置的域名（例如：`yourdomain.com`）
- DNS 已解析到服务器 IP：`182.92.92.43`
- 确保域名可以正常访问服务器

### 2. 服务器环境
- 已安装 Nginx
- 服务器开放 80 和 443 端口
- 防火墙允许 HTTPS 流量

---

## 方案步骤

### 步骤 1: 安装 Nginx（如果未安装）

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx -y

# CentOS/RHEL
sudo yum install nginx -y

# 启动并设置开机自启
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 步骤 2: 安装 Certbot（用于获取 Let's Encrypt 证书）

```bash
# Ubuntu/Debian
sudo apt install certbot python3-certbot-nginx -y

# CentOS/RHEL
sudo yum install certbot python3-certbot-nginx -y
```

### 步骤 3: 配置 Nginx 反向代理（HTTP 阶段）

在获取 SSL 证书之前，先配置基础的 Nginx 反向代理：

创建配置文件：`/etc/nginx/sites-available/aggregation`（Ubuntu/Debian）
或 `/etc/nginx/conf.d/aggregation.conf`（CentOS/RHEL）

**配置文件内容：**

```nginx
# 上游服务器配置
upstream aggregation_backend {
    server 127.0.0.1:3351;
    keepalive 64;
}

# HTTP 服务器配置（用于证书验证和重定向到 HTTPS）
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Let's Encrypt 证书验证路径
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # 其他请求重定向到 HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS 服务器配置
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL 证书配置（将在步骤 4 中自动配置）
    # ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL 安全配置（推荐）
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # 安全头部
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 日志配置
    access_log /var/log/nginx/aggregation_access.log;
    error_log /var/log/nginx/aggregation_error.log;

    # 客户端最大上传大小（根据需求调整）
    client_max_body_size 50M;

    # 代理配置
    location / {
        proxy_pass http://aggregation_backend;
        proxy_http_version 1.1;
        
        # 代理头部
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # WebSocket 支持（如果需要）
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # 缓冲设置
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }

    # 静态文件缓存（如果需要 Nginx 直接服务静态文件）
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://aggregation_backend;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

**重要说明：**
- 将 `yourdomain.com` 替换为您的实际域名
- 如果只有单个域名，可以删除 `www.yourdomain.com`

**启用配置：**

```bash
# Ubuntu/Debian
sudo ln -s /etc/nginx/sites-available/aggregation /etc/nginx/sites-enabled/
sudo nginx -t  # 测试配置
sudo systemctl reload nginx

# CentOS/RHEL（配置文件已在 conf.d 目录，直接测试并重载）
sudo nginx -t
sudo systemctl reload nginx
```

### 步骤 4: 获取 SSL 证书

使用 Certbot 自动获取并配置 Let's Encrypt 证书：

```bash
# 自动获取证书并配置 Nginx（推荐）
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 或者只获取证书，手动配置
# sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com
```

**Certbot 会提示：**
1. 输入邮箱（用于证书到期提醒）
2. 同意服务条款
3. 选择是否分享邮箱（可选）
4. Certbot 会自动修改 Nginx 配置文件，添加 SSL 证书路径

### 步骤 5: 验证配置

1. **测试 Nginx 配置：**
```bash
sudo nginx -t
```

2. **重载 Nginx：**
```bash
sudo systemctl reload nginx
```

3. **测试 HTTPS 访问：**
```bash
# 在浏览器访问
https://yourdomain.com

# 或使用 curl 测试
curl -I https://yourdomain.com
```

4. **验证证书自动续期：**
```bash
# 测试证书续期（不会实际续期）
sudo certbot renew --dry-run

# 查看证书信息
sudo certbot certificates
```

### 步骤 6: 设置证书自动续期

Let's Encrypt 证书有效期为 90 天，需要定期续期。Certbot 会自动创建 systemd timer 或 cron 任务：

```bash
# 查看自动续期任务
sudo systemctl list-timers | grep certbot
# 或
sudo crontab -l | grep certbot
```

**手动续期（测试）：**
```bash
sudo certbot renew
sudo systemctl reload nginx
```

---

## 防火墙配置

确保防火墙允许 HTTP 和 HTTPS 流量：

```bash
# UFW (Ubuntu)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload

# firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# iptables（如果使用）
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
```

---

## 应用代码无需修改的原因

1. **应用继续运行在 HTTP（3351 端口）**
   - 应用代码无需任何修改
   - 继续使用现有的 CORS 配置
   - Session cookie 保持 `secure: false`（内部通信是 HTTP）

2. **Nginx 负责 SSL 终止**
   - 所有 HTTPS 请求在 Nginx 层面解密
   - 转发到后端的是 HTTP 请求
   - 后端应用无需处理 SSL

3. **X-Forwarded-Proto 头部**
   - Nginx 自动添加 `X-Forwarded-Proto: https` 头部
   - 如果将来需要，应用可以通过此头部判断原始协议

---

## 监控和维护

### 查看 Nginx 日志

```bash
# 访问日志
sudo tail -f /var/log/nginx/aggregation_access.log

# 错误日志
sudo tail -f /var/log/nginx/aggregation_error.log

# 所有 Nginx 日志
sudo tail -f /var/log/nginx/error.log
```

### 检查证书过期时间

```bash
sudo certbot certificates
```

### 手动续期证书

```bash
sudo certbot renew
sudo systemctl reload nginx
```

---

## 常见问题

### 1. 证书获取失败

**原因：**
- 域名 DNS 未正确解析
- 80 端口被占用或防火墙阻止
- Nginx 配置错误

**解决：**
```bash
# 检查 DNS 解析
nslookup yourdomain.com

# 检查端口占用
sudo netstat -tulpn | grep :80

# 检查 Nginx 状态
sudo systemctl status nginx
```

### 2. 502 Bad Gateway

**原因：**
- 后端应用未运行
- 端口号不匹配

**解决：**
```bash
# 检查应用是否运行
pm2 status

# 检查端口是否监听
sudo netstat -tulpn | grep :3351

# 检查 Nginx 配置中的 upstream 端口
```

### 3. 重定向循环

**原因：**
- 应用代码中有强制 HTTPS 重定向
- Nginx 配置错误

**解决：**
- 检查应用代码中是否有 HTTPS 重定向逻辑（本方案中不应该有）
- 确保 Nginx `proxy_set_header X-Forwarded-Proto $scheme;` 配置正确

### 4. 静态资源加载失败

**原因：**
- 静态资源路径问题
- CORS 配置问题

**解决：**
- 检查浏览器控制台错误
- 确认 Nginx 配置中的静态文件处理是否正确

---

## 安全建议

1. **定期更新 SSL 配置**
   - 关注 SSL/TLS 最佳实践
   - 使用 TLS 1.3（如果可能）

2. **启用 HSTS**
   - 已在配置中添加 `Strict-Transport-Security` 头部

3. **限制请求大小**
   - 根据需求调整 `client_max_body_size`

4. **监控证书过期**
   - 设置邮件提醒（Certbot 自动处理）
   - 定期检查证书状态

5. **防火墙规则**
   - 只开放必要的端口（80, 443, 22）
   - 考虑使用 fail2ban 防护

---

## 总结

此方案的优势：
- ✅ **零代码修改**：应用代码完全不需要改动
- ✅ **自动证书管理**：Certbot 自动获取和续期证书
- ✅ **性能优化**：Nginx 可以缓存静态文件，减轻后端负担
- ✅ **安全性**：SSL/TLS 在 Nginx 层处理，符合最佳实践
- ✅ **易于维护**：配置集中，易于管理和调试

完成以上步骤后，您的网站将通过 HTTPS 安全访问，同时应用代码保持原样。

