/**
 * ChatView - 对话界面
 * 参考 axonclaw-prototype.html 样式
 */

import React, { useState, useEffect, useRef } from 'react';
import { useChatStore } from '@/stores/chat';
import { useGatewayStore } from '@/stores/gateway';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronRight, Send, Paperclip, Bot, Wrench, Lightbulb } from 'lucide-react';

// 可折叠组件
const CollapsibleBlock: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ icon, label, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  
  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-[#0a0a0a] hover:bg-[#111] transition-colors text-xs"
      >
        {isOpen ? (
          <ChevronDown className="w-3 h-3 text-white/60" />
        ) : (
          <ChevronRight className="w-3 h-3 text-white/60" />
        )}
        {icon}
        <span className="text-white/60">{label}</span>
      </button>
      {isOpen && (
        <div className="px-3 py-2 bg-[#0f0f0f] text-xs text-white/80 whitespace-pre-wrap">
          {children}
        </div>
      )}
    </div>
  );
};

// 对话数据类型
interface Conversation {
  id: string;
  title: string;
  lastMessage?: string;
  timestamp: number;
  unread?: number;
}

// 模拟对话数据（从 ClawX store 获取后会替换）
const mockConversations: Conversation[] = [
  { id: '1', title: 'Anthropic API 配置问题', lastMessage: '配置完成', timestamp: Date.now() - 3600000 },
  { id: '2', title: 'Python 异步爬虫设计', lastMessage: '代码已生成', timestamp: Date.now() - 7200000, unread: 2 },
  { id: '3', title: 'Git rebase 冲突解决', lastMessage: '已解决', timestamp: Date.now() - 86400000 },
  { id: '4', title: 'React Hooks 最佳实践', lastMessage: '文档已整理', timestamp: Date.now() - 172800000 },
  { id: '5', title: '数据库索引优化', lastMessage: '优化完成', timestamp: Date.now() - 259200000 },
  { id: '6', title: 'Docker 多阶段构建', lastMessage: '已完成', timestamp: Date.now() - 345600000 },
  { id: '7', title: 'TypeScript 泛型进阶', lastMessage: '已学习', timestamp: Date.now() - 432000000 },
];

export const ChatView: React.FC = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeConversation, setActiveConversation] = useState('Anthropic API 配置问题');
  const [input, setInput] = useState('');
  
  // 使用 ClawX stores
  const { status: gatewayStatus } = useGatewayStore();
  const { 
    messages, 
    sending, 
    sendMessage, 
    sessions,
    currentSessionKey,
    switchSession,
    loadSessions,
    loadHistory
  } = useChatStore();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 判断连接状态
  const isConnected = gatewayStatus.state === 'running';

  // 初始化加载会话和历史
  useEffect(() => {
    if (isConnected) {
      loadSessions();
      loadHistory();
    }
  }, [isConnected, loadSessions, loadHistory]);

  // 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 发送消息
  const handleSend = async () => {
    if (!input.trim() || sending) return;
    
    try {
      await sendMessage(input);
      setInput('');
    } catch (error) {
      console.error('发送消息失败:', error);
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.altKey) {
      // Alt+Enter 换行
      const textarea = e.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      setInput(value.substring(0, start) + '\n' + value.substring(end));
      e.preventDefault();
    } else if (e.key === 'Enter' && !e.altKey && !e.shiftKey) {
      // Enter 发送
      e.preventDefault();
      handleSend();
    }
  };

  // 渲染消息内容
  const renderMessageContent = (content: unknown): string => {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content
        .filter((b: { type?: string; text?: string }) => b.type === 'text' && b.text)
        .map((b: { type?: string; text?: string }) => b.text)
        .join('\n');
    }
    return '';
  };

  // 提取 thinking 内容
  const extractThinking = (content: unknown): string | null => {
    if (!Array.isArray(content)) return null;
    const thinkingBlock = content.find((b: { type?: string }) => b.type === 'thinking');
    return thinkingBlock?.thinking || null;
  };

  // 提取 tool use 内容
  const extractToolUse = (content: unknown): string | null => {
    if (!Array.isArray(content)) return null;
    const toolBlock = content.find((b: { type?: string }) => b.type === 'tool_use' || b.type === 'toolCall');
    if (toolBlock) {
      return `${toolBlock.name || 'tool'}(${JSON.stringify(toolBlock.input || toolBlock.arguments || {})})`;
    }
    return null;
  };

  return (
    <div className="h-full flex flex-col bg-[#0f172a]">
      {/* 顶部栏 */}
      <div className="h-14 border-b border-white/10 flex items-center px-4 gap-3 flex-shrink-0">
        {/* 连接状态指示器 */}
        <div className={`w-1.5 h-1.5 rounded-full ${
          isConnected ? 'bg-green-400' : 
          gatewayStatus.state === 'starting' ? 'bg-yellow-400' :
          gatewayStatus.state === 'reconnecting' ? 'bg-orange-400' :
          'bg-red-400'
        }`} />
        
        {/* 对话下拉菜单 */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm hover:bg-white/10 transition-colors min-w-[200px]"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span>{activeConversation}</span>
            <ChevronDown className="w-3 h-3 text-white/40 ml-auto" />
          </button>

          {/* 下拉菜单 */}
          {dropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-full left-0 mt-1 w-80 max-h-96 overflow-y-auto bg-[#1e293b] border border-white/10 rounded-lg shadow-xl z-50"
            >
              {sessions.length > 0 ? (
                <>
                  <div className="px-3 py-2 text-xs text-white/40 uppercase">当前会话</div>
                  {sessions.map((session) => (
                    <div
                      key={session.key}
                      onClick={() => {
                        setActiveConversation(session.displayName || session.label || session.key);
                        switchSession(session.key);
                        setDropdownOpen(false);
                        loadHistory();
                      }}
                      className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer text-sm border-b border-white/5 ${
                        session.key === currentSessionKey 
                          ? 'bg-blue-500/20 text-blue-400' 
                          : 'text-white/70 hover:bg-white/5'
                      }`}
                    >
                      💬 {session.displayName || session.label || session.key}
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="px-3 py-2 text-xs text-white/40 uppercase">最近</div>
                  {mockConversations.slice(0, 5).map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setActiveConversation(conv.title);
                        setDropdownOpen(false);
                      }}
                      className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer text-sm border-b border-white/5 ${
                        conv.title === activeConversation 
                          ? 'bg-blue-500/20 text-blue-400' 
                          : 'text-white/70 hover:bg-white/5'
                      }`}
                    >
                      💬 {conv.title}
                      {conv.unread && (
                        <span className="ml-auto px-2 py-0.5 rounded-full bg-white/10 text-white/60 text-xs">
                          {conv.unread}
                        </span>
                      )}
                    </div>
                  ))}
                  <div className="px-3 py-2 text-xs text-white/40 uppercase">更早</div>
                  {mockConversations.slice(5).map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setActiveConversation(conv.title);
                        setDropdownOpen(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2.5 cursor-pointer text-sm text-white/70 hover:bg-white/5 border-b border-white/5"
                    >
                      💬 {conv.title}
                    </div>
                  ))}
                </>
              )}
            </motion.div>
          )}
        </div>

        {/* 搜索框 */}
        <input
          type="text"
          placeholder="搜索对话…"
          className="w-44 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
        />

        {/* 新建按钮 */}
        <button className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm hover:bg-white/10 transition-colors">
          ＋ 新建
        </button>

        <div className="flex-1" />

        {/* 操作按钮 */}
        <button className="w-8 h-8 rounded-lg hover:bg-white/10 text-white/40 transition-colors">🔍</button>
        <button className="w-8 h-8 rounded-lg hover:bg-white/10 text-white/40 transition-colors">⬇</button>
        <button className="w-8 h-8 rounded-lg hover:bg-white/10 text-white/40 transition-colors">⚙</button>
      </div>

      {/* 消息区域 - 可滚动 */}
      <div className="flex-1 overflow-y-auto py-5">
        <div className="max-w-5xl mx-auto px-6 space-y-4">
          {messages.length > 0 ? (
            messages.map((message, index) => {
              const content = renderMessageContent(message.content);
              const thinking = extractThinking(message.content);
              const toolUse = extractToolUse(message.content);
              const timestamp = message.timestamp 
                ? new Date(message.timestamp < 1e12 ? message.timestamp * 1000 : message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
                : '';
              
              // 系统消息
              if (message.role === 'system') {
                return (
                  <div key={message.id || index} className="text-center text-white/40 text-xs py-1">
                    {content}
                  </div>
                );
              }

              // 用户消息
              if (message.role === 'user') {
                return (
                  <motion.div
                    key={message.id || index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-end gap-2 flex-row-reverse"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      T
                    </div>
                    <div className="max-w-[70%]">
                      <div className="bg-blue-500 text-white px-4 py-2.5 rounded-2xl rounded-br-sm text-sm leading-relaxed">
                        {content}
                      </div>
                      {timestamp && <div className="text-white/30 text-xs mt-1 text-right">{timestamp}</div>}
                    </div>
                  </motion.div>
                );
              }

              // AI 消息
              if (message.role === 'assistant') {
                return (
                  <motion.div
                    key={message.id || index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-end gap-2"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="max-w-[70%]">
                      <div className="bg-[#1e293b] border border-white/10 text-white px-4 py-2.5 rounded-2xl rounded-bl-sm text-sm leading-relaxed space-y-2">
                        {/* Thinking 折叠 */}
                        {thinking && (
                          <CollapsibleBlock 
                            icon={<Lightbulb className="w-3 h-3" />}
                            label="Thinking"
                          >
                            {thinking}
                          </CollapsibleBlock>
                        )}
                        
                        {/* Tool Use 折叠 */}
                        {toolUse && (
                          <CollapsibleBlock 
                            icon={<Wrench className="w-3 h-3" />}
                            label="Tool Use"
                          >
                            {toolUse}
                          </CollapsibleBlock>
                        )}
                        
                        {/* 主要内容 */}
                        {content && (
                          <div className="whitespace-pre-wrap">
                            {content}
                          </div>
                        )}
                      </div>
                      {timestamp && <div className="text-white/30 text-xs mt-1">{timestamp}</div>}
                    </div>
                  </motion.div>
                );
              }

              return null;
            })
          ) : (
            // 空状态提示
            <div className="text-center text-white/40 py-20">
              <div className="text-4xl mb-4">💬</div>
              <div>开始新对话</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 输入区域 - 固定底部 */}
      <div className="p-3 border-t border-white/10 flex-shrink-0">
        <div className="max-w-5xl mx-auto bg-white/5 border border-white/10 rounded-xl">
          {/* 输入框 + 附件按钮 + 发送按钮 */}
          <div className="flex items-end">
            <button className="p-3 text-white/50 hover:text-white/70 transition-colors flex-shrink-0">
              <Paperclip className="w-4 h-4" />
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={sending ? "发送中..." : "发消息…"}
              disabled={sending}
              className="flex-1 bg-transparent border-none outline-none resize-none px-2 py-3 text-white text-sm leading-6 placeholder-white/40 disabled:opacity-50"
              style={{ 
                minHeight: '48px',
                height: 'auto',
                overflow: 'hidden'
              }}
              rows={1}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 192) + 'px';
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className={`w-9 h-9 rounded-lg m-1.5 flex items-center justify-center transition-colors flex-shrink-0 ${
                input.trim() && !sending
                  ? 'bg-blue-500 hover:bg-blue-600 cursor-pointer'
                  : 'bg-white/10 cursor-not-allowed'
              }`}
            >
              <Send className={`w-4 h-4 text-white ${sending ? 'animate-pulse' : ''}`} />
            </button>
          </div>

          {/* 快捷键提示 */}
          <div className="px-3 pb-2 text-center">
            <span className="text-white/30 text-xs">
              ↩ 发送 · Alt+↩ 换行
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
