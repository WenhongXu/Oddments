# 守明 · Mac mini 部署手册

> 适用场景：家庭/办公室 Mac mini，通过 Tailscale 供1-2人从手机访问
> 预计耗时：30-45 分钟

---

## 准备工作

**硬件要求**
- Mac mini（任意型号，M1/M2/Intel 均可）
- 内存 ≥ 8GB，磁盘剩余 ≥ 2GB
- 保持开机并联网（建议关闭自动睡眠）

**账号准备**
- Apple ID（已登录）
- Tailscale 账号（免费，用于手机远程访问）
- AI API Key（DeepSeek / 通义千问 / Anthropic 任选一）

---

## 第一步：安装基础环境

打开「终端」（Terminal），逐行执行：

```bash
# 1. 安装 Homebrew（如已安装可跳过）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装完成后，按提示执行 eval 那行命令（M系列芯片需要）

# 2. 安装 Node.js
brew install node

# 验证安装
node --version   # 应显示 v18 以上
npm --version    # 应显示版本号

# 3. 安装 PM2（进程守护）和 serve（前端静态服务）
npm install -g pm2 serve
```

---

## 第二步：获取代码

```bash
# 进入用户目录
cd ~

# 克隆仓库
git clone https://github.com/WenhongXu/Oddments.git shoumingapp

cd shoumingapp

# 安装后端依赖
npm install --prefix backend

# 安装前端依赖
npm install --prefix frontend
```

---

## 第三步：配置环境变量

```bash
# 复制配置模板
cp backend/.env.example backend/.env

# 生成随机会话密钥
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
# 复制输出的那一整行（SESSION_SECRET=xxxxxx）

# 编辑配置文件
nano backend/.env
```

在 nano 编辑器中修改以下内容：

```bash
# 将 SESSION_SECRET 替换为刚才生成的值
SESSION_SECRET=你刚才生成的随机字符串

# 选择 AI 提供商（取消注释其中一组，注释掉其他组）
# 推荐 DeepSeek（境内直接访问）：
AI_PROVIDER=deepseek
AI_API_KEY=sk-你的DeepSeek密钥
AI_MODEL=deepseek-chat

# 保持其余默认值，修改完成后：
# Ctrl+O 保存，回车确认，Ctrl+X 退出
```

---

## 第四步：初始化数据库

```bash
cd ~/shoumingapp

# 初始化问题库（只需执行一次）
node backend/db/seed.js

# 验证数据库已创建
ls backend/data/
# 应看到 shoumingapp.db 文件
```

---

## 第五步：构建前端

```bash
cd ~/shoumingapp

npm run build --prefix frontend

# 验证构建成功
ls frontend/dist/
# 应看到 index.html 和 assets/ 目录
```

---

## 第六步：用 PM2 启动服务

```bash
cd ~/shoumingapp

# 启动后端 API 服务（端口 3001）
pm2 start backend/server.js --name shoumingapp-api

# 启动前端静态服务（端口 4000）
pm2 start "serve frontend/dist -p 4000 -s" --name shoumingapp-web

# 查看运行状态（两个服务都应显示 online）
pm2 status

# 保存进程列表
pm2 save
```

**设置开机自动启动：**

```bash
pm2 startup
# 命令会输出一行 sudo env PATH=... 的命令
# 复制那行命令，粘贴执行
```

---

## 第七步：安装 Tailscale（手机远程访问）

**Mac mini 上：**
```bash
brew install tailscale
```
安装后在菜单栏点击 Tailscale 图标 → 登录你的账号 → 等待出现 IP 地址（格式：100.x.x.x）

**记下 Mac mini 的 Tailscale IP。**

**手机上：**
1. App Store 搜索「Tailscale」并安装
2. 登录**同一个** Tailscale 账号
3. 打开 Safari，访问 `http://100.x.x.x:4000`（替换为实际 IP）
4. 确认可以打开守明登录页

---

## 第八步：创建第一个账户

1. 浏览器打开 `http://100.x.x.x:4000`
2. 点击「首次使用？创建账户」
3. 填写名字、用户名、PIN码（4-6位数字）
4. 登录成功即完成部署

---

## 第九步：添加到手机主屏幕（PWA）

**iPhone：**
Safari 打开守明 → 点击底部「分享」按钮 → 「添加到主屏幕」→ 完成

**Android：**
Chrome 打开守明 → 菜单 → 「添加到主屏幕」→ 完成

之后从主屏幕打开，体验与原生 App 相同（全屏、无地址栏）。

---

## 第十步：关闭 Mac mini 自动睡眠

系统设置 → 电池（或节能）→ 将「防止 Mac 自动进入睡眠」打开，
或设置睡眠时间为「从不」。

---

## 日常维护

```bash
# 查看运行状态
pm2 status

# 查看日志（排查问题用）
pm2 logs shoumingapp-api --lines 50

# 更新代码后重新部署
cd ~/shoumingapp
git pull
npm run build --prefix frontend
pm2 restart all

# 备份数据（只需备份这一个文件）
cp backend/data/shoumingapp.db ~/Desktop/守明备份_$(date +%Y%m%d).db
```

---

## 常见问题

**手机访问不了？**
1. 检查 Mac mini 和手机是否都在 Tailscale 且状态为已连接
2. `pm2 status` 确认两个服务都是 online
3. 确认访问的是 4000 端口（不是 3001）

**AI 教练没有回应？**
1. 检查 `backend/.env` 中 `AI_API_KEY` 是否正确
2. `pm2 logs shoumingapp-api` 查看具体错误信息

**重启 Mac 后服务没有自动启动？**
重新执行 `pm2 startup` 输出的那行 sudo 命令。
