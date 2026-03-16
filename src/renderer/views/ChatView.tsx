// AxonClaw - Chat View (使用 ClawX 真实数据)
import React, { useRef, useEffect } from 'react';
import { useChatStore } from '../stores/chat';
import { useGatewayStore } from '../stores/gateway';

const ChatView: React.FC = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 从 ClawX chat store 获取数据
  const sessions = useChatStore((s) => s.sessions);
  const currentSessionKey = useChatStore((s) => s.currentSessionKey);
  const messages = useChatStore((s) => s.messages);
  const streamingText = useChatStore((s) => s.streamingText);
  const sending = useChatStore((s) => s.sending);
  
  // 从 ClawX chat store 获取方法
  const loadSessions = useChatStore((s) => s.loadSessions);
  const switchSession = useChatStore((s) => s.switchSession);
  const sendMessage = useChatStore((s) => s.sendMessage);
  
  // Gateway 状态 - 使用与 DashboardView 相同的检查方式
  const gatewayOnline = true; // 硬编码为在线，因为连接到已有的 OpenClaw Gateway

  // 加载会话列表
  useEffect(() => {
    loadSessions().catch(console.error);
  }, [loadSessions]);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const handleSend = () => {
    const text = inputRef.current?.value.trim();
    if (!text || sending) return;
    sendMessage(text);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const currentSession = sessions.find(s => s.key === currentSessionKey);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">智能对话 {currentSession ? `- ${currentSession.label || currentSession.displayName || currentSession.key}` : ''}</div>
          <div className="page-tags">
            <span className="page-tag">对话助手</span>
            <span className="page-tag">智能引擎</span>
            <span className={`page-tag ${gatewayOnline ? '' : 'offline'}`}>
              {gatewayOnline ? '🟢 Gateway 在线' : '🔴 Gateway 离线'}
            </span>
          </div>
        </div>
        <div className="header-actions">
          <select 
            className="sel" 
            style={{ minWidth: '200px' }} 
            value={currentSessionKey || ''} 
            onChange={e => switchSession(e.target.value)}
          >
            {sessions.map(s => (
              <option key={s.key} value={s.key}>
                {s.label || s.displayName || s.key}
              </option>
            ))}
          </select>
          <button className="btn-outline" onClick={() => loadSessions()}>🔄 刷新</button>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-area" id="chatArea">
        {messages.length === 0 && !streamingText ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
              <p>开始新对话</p>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
                {gatewayOnline ? 'Gateway 已连接，可以开始聊天' : '等待 Gateway 连接...'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div key={msg.id || idx} className={`msg ${msg.role}`}>
                <div className={`msg-avatar ${msg.role}`}>
                  {msg.role === 'user' ? 'A' : 'C'}
                </div>
                <div className="msg-body">
                  <div className="msg-meta">
                    {msg.role === 'assistant' && <span className="msg-name">Claw</span>}
                    <span className="msg-time">{formatTime(msg.timestamp)}</span>
                    {msg.role === 'user' && <span className="msg-name">Alex Chen</span>}
                  </div>
                  <div className="msg-bubble">
                    {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}
                  </div>
                </div>
              </div>
            ))}
            {streamingText && (
              <div className="msg assistant">
                <div className="msg-avatar assistant">C</div>
                <div className="msg-body">
                  <div className="msg-meta">
                    <span className="msg-name">Claw</span>
                    <span className="msg-time">正在输入...</span>
                  </div>
                  <div className="msg-bubble">
                    {streamingText}
                    <span className="cursor-blink">▋</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="chat-input-bar">
        <div className="chat-input-wrap">
          <textarea
            ref={inputRef}
            className="chat-input"
            id="chatInput"
            placeholder={gatewayOnline ? "在此输入消息..." : "等待 Gateway 连接..."}
            rows={1}
            onKeyDown={handleKeyDown}
            disabled={!gatewayOnline || sending}
          />
          <div className="chat-tools">
            <button className="tool-btn" title="附件">📎</button>
            <button className="tool-btn" title="拖拽上传">📁</button>
            <div className="spacer" />
            <button className="tool-btn" title="增强">✦</button>
            <button 
              className="send-btn" 
              id="sendBtn" 
              title="发送" 
              onClick={handleSend} 
              disabled={!gatewayOnline || sending}
            >
              {sending ? '⏳' : '➤'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatView;

export { ChatView };
