# TOOLS.md - Local Notes

## 即梦 AI（Jimeng）生图服务

- **API Key**: (请在本地配置，勿提交到代码库)
- **AccessKey**: (请在本地配置，勿提交到代码库)
- **SecretKey**: (请在本地配置，勿提交到代码库)
- **用途**: AI 图片生成，优先使用此服务生图

<!-- clawx:begin -->
## ClawX Tool Notes

### uv (Python)

- `uv` is bundled with ClawX and on PATH. Do NOT use bare `python` or `pip`.
- Run scripts: `uv run python <script>` | Install packages: `uv pip install <package>`

### Browser

- `browser` tool provides full automation (scraping, form filling, testing) via an isolated managed browser.
- Flow: `action="start"` → `action="snapshot"` (see page + get element refs like `e12`) → `action="act"` (click/type using refs).
- Open new tabs: `action="open"` with `targetUrl`.
- To just open a URL for the user to view, use `shell:openExternal` instead.
<!-- clawx:end -->
