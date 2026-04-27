# 前端说明

这是菜单推荐助手的 `Vite + React` 前端工程。

开发模式下，Vite 会把 `/api` 请求代理到后端：

```text
http://127.0.0.1:8000
```

## 本地开发

先在项目根目录启动后端：

```powershell
python web_server.py
```

再在另一个终端启动前端开发服务器：

```powershell
cd frontend
npm install
npm run dev
```

浏览器访问：

```text
http://127.0.0.1:5173
```

## 构建

```powershell
cd frontend
npm install
npm run build
```

构建完成后，在项目根目录启动：

```powershell
python web_server.py
```

后端会直接提供 `frontend/dist`，访问：

```text
http://127.0.0.1:8000
```

## 源码结构

前端组件、hooks 和工具函数的拆分说明见 [src/README.md](./src/README.md)。
