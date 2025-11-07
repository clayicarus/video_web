## 在线网盘（纯静态前端）

功能：
- 浏览服务器指定目录（依赖 Nginx autoindex）
- 进入子目录与面包屑导航
- 选择文件播放视频（mp4/webm/ogg/HLS m3u8），或新窗口打开/下载其他文件
- 云端下载功能（依赖 Aria2 RPC）：添加下载链接，自动下载到网盘服务器

### 目录结构

```
index.html
assets/
  style.css
  app.js
```

### 前端浏览根路径

通过 `index.html` 中的内联配置设置浏览根路径（默认 `/files/`）：

```html
<script>
  window.APP_CONFIG = { BROWSE_ROOT: '/files/' };
<\/script>
```

页面使用 `location.hash` 维护相对 `BROWSE_ROOT` 的路径（例如 `#/电影/动作/`），不会改变浏览器真实 URL 路径。

### Nginx 配置示例

假设：
- 站点静态文件部署在 `/var/www/netdisk/`（即本仓库构建结果）
- 要浏览与播放的文件目录在服务器 `/data/videos/`
- 以 `https://example.com/` 访问本站点

示例配置：

```nginx
server {
  listen 80;
  server_name example.com;

  # 站点静态资源
  root /var/www/netdisk;
  index index.html;

  # 确保首页可直接访问
  location = / {
    try_files $uri /index.html;
  }

  # 前端静态资源
  location /assets/ {
    try_files $uri =404;
  }

  # 浏览根：/files/ 指向服务器真实目录 /data/videos/
  location /files/ {
    alias /data/videos/;

    # 开启目录索引（供前端解析）
    autoindex on;
    autoindex_exact_size off;     # 可选：人类可读大小
    autoindex_localtime on;       # 可选：本地时间

    # 允许跨域访问（若站点与文件同域可省略）
    add_header Access-Control-Allow-Origin "*" always;

    # 视频与 HLS 相关 MIME 类型（通常已内置，但可显式声明）
    types {
      application/vnd.apple.mpegurl m3u8;
      video/mp2t ts;
    }

    # 对常见视频类型开启范围请求，便于拖动进度
    types { }
    default_type application/octet-stream;
  }
}
```

注意：
- `location /files/ { alias /data/videos/; }` 使用 `alias` 而不是 `root`，更直观地映射浏览根；路径末尾保留 `/`。
- 必须开启 `autoindex on;` 才能让前端解析目录。
- 若前后端不同域，请根据需要调整 `Access-Control-Allow-Origin`。

### 部署步骤

1. 将本目录拷贝至服务器，例如 `/var/www/netdisk/`
2. 修改 `index.html` 中的 `BROWSE_ROOT`，与 Nginx `location` 一致（例如 `/files/`）
3. 配置并重载 Nginx：

```bash
sudo nginx -t && sudo nginx -s reload
```

打开 `https://example.com/#/` 即可浏览 `/data/videos/` 下的内容。

### Aria2 云端下载配置

本应用支持通过 Aria2 RPC 将文件下载到网盘服务器。需要在 `assets/aria2.js` 中配置：

```javascript
const ARIA2_CONFIG = {
  url: 'http://localhost:6800/jsonrpc',  // Aria2 RPC 地址
  secret: '',  // Aria2 密钥（如果启用了 rpc-secret）
};
```

**重要说明：**
- `downloadRoot` 必须指向服务器文件系统的真实路径，与 Nginx 中 `alias` 配置的路径一致
- 用户在添加下载任务时输入的路径是相对于 `downloadRoot` 的相对路径
- 例如：如果 `downloadRoot` 是 `/data/videos/`，用户输入 `movies/2024`，文件将保存到 `/data/videos/movies/2024/`

**Aria2 安装与启动：**

```bash
# 安装 Aria2
sudo apt install aria2  # Ubuntu/Debian
brew install aria2      # macOS

# 启动 Aria2 RPC 服务
aria2c --enable-rpc --rpc-listen-all --rpc-allow-origin-all
```

### 使用说明

- 右侧为目录/文件列表，支持搜索过滤
- 点击目录进入，点击视频文件在左侧播放器播放
- HLS `.m3u8` 将优先通过 hls.js 播放，iOS Safari 可原生播放
- 右上角"下载"链接可直接下载当前播放文件
- 点击"🔗 测试连接"按钮测试 Aria2 RPC 连接状态
- 点击"+ 添加下载"按钮添加云端下载任务，文件将下载到网盘服务器
- `.aria2` 临时文件会自动隐藏，不会显示在文件列表中

### 常见问题

- 无法列出目录：确认 Nginx 对应目录开启 `autoindex on;`，且 `location /files/` 映射正确。
- 不能播放视频：检查浏览器是否支持该编码；HLS 需 `.m3u8` 与分片 `.ts` 可访问。
- 跨域问题：若站点与文件不在同一域名，需在文件服务端添加 `Access-Control-Allow-Origin` 头。



