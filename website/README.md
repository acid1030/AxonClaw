# AxonClawX 宣传页

单文件静态站点：`index.html`，暗红主题，介绍 AxonClawX 能力与上手步骤。

## 本地预览

在项目根目录执行：

```bash
npx --yes serve website -p 3456
```

浏览器打开：<http://localhost:3456/>

或使用 Python：

```bash
cd website && python3 -m http.server 3456
```

## 部署

将 `website/` 目录（或仅 `index.html`）上传到任意静态托管（GitHub Pages、Cloudflare Pages、Vercel Static 等）。发布前请在 `index.html` 内将 OpenClaw / 本仓库等外链改为你实际使用的 URL。

## 维护

- 文案与项目 `README.md` 保持一致可减少信息偏差。
- 上游生态链接：<https://github.com/openclaw/openclaw>
- 风格参考：<https://claw-x.com/>
