// AxonClaw - Main Entry Point
import React from 'react';
import ReactDOM from 'react-dom/client';
import './renderer/i18n';
import App from './App';
import './renderer/styles/design-system.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
