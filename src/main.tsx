// AxonClaw - Main Entry Point
import React from 'react';
import ReactDOM from 'react-dom/client';
import './renderer/i18n';
import App from './App';
import './renderer/styles/design-system.css';
import { ErrorBoundary } from './renderer/components/common/ErrorBoundary';

function showFatalOverlay(title: string, detail: string): void {
  try {
    const root = document.getElementById('root');
    if (root) {
      root.innerHTML = `
        <div style="min-height:100vh;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;padding:24px;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <div style="max-width:900px;width:100%;border:1px solid rgba(251,113,133,.45);background:rgba(244,63,94,.12);border-radius:12px;padding:16px 18px;">
            <div style="font-size:14px;font-weight:700;color:#fecdd3;margin-bottom:8px;">${title}</div>
            <pre style="white-space:pre-wrap;word-break:break-word;margin:0;font-size:12px;line-height:1.5;color:#ffe4e6;">${detail}</pre>
          </div>
        </div>
      `;
      return;
    }
    document.body.innerHTML = `<pre style="padding:20px;color:#ef4444;background:#0f172a;">${title}\n\n${detail}</pre>`;
  } catch {
    // ignore overlay fallback errors
  }
}

// 捕获未处理异常/Promise 拒绝，避免白屏无信息
window.addEventListener('error', (e) => {
  const msg = e.error?.stack || e.message || 'Unknown renderer error';
  console.error('[Renderer] Unhandled error:', msg);
  showFatalOverlay('Renderer Error', String(msg));
});

window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason instanceof Error ? (e.reason.stack || e.reason.message) : String(e.reason);
  console.error('[Renderer] Unhandled rejection:', reason);
  showFatalOverlay('Unhandled Promise Rejection', reason);
});

const root = document.getElementById('root');
if (!root) {
  document.body.innerHTML = '<div style="padding:20px;color:red;font-family:system-ui">#root not found</div>';
} else {
  root.style.minHeight = '100vh';
  try {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
  } catch (err) {
    const detail = err instanceof Error ? (err.stack || err.message) : String(err);
    console.error('[Renderer] Fatal render bootstrap error:', detail);
    showFatalOverlay('Renderer Bootstrap Error', detail);
  }
}
