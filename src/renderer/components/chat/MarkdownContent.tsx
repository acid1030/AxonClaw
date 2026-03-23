/**
 * MarkdownContent - 渲染 Markdown 文本，代码块语法高亮
 * 参考 design_v2.html 代码块样式
 */
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

const markdownComponents: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
  li: ({ children }) => <li className="ml-2">{children}</li>,
  code: ({ className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    const isBlock = !!match;
    if (isBlock) {
      const lang = match[1];
      const code = String(children).replace(/\n$/, '');
      return (
        <CodeBlock lang={lang} code={code} />
      );
    }
    return (
      <code className="bg-white/10 px-1 rounded text-xs" {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => <>{children}</>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
};

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="bg-[#0d1117] border border-[#30363d] rounded-lg mt-2 overflow-hidden">
      <div className="bg-[#161b22] px-3 py-1.5 flex justify-between items-center border-b border-[#30363d]">
        <span className="text-[11px] text-[#8b949e]">{lang}</span>
        <button
          type="button"
          onClick={copy}
          className="text-[11px] text-[#58a6ff] hover:text-[#79c0ff] bg-transparent border-none cursor-pointer"
        >
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <SyntaxHighlighter
        language={lang}
        style={dark}
        customStyle={{
          margin: 0,
          padding: '12px 16px',
          background: '#0d1117',
          fontSize: '13px',
          lineHeight: 1.5,
        }}
        codeTagProps={{ style: { fontFamily: "'SF Mono', 'Cascadia Code', Consolas, monospace" } }}
        showLineNumbers={false}
        PreTag="div"
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, className = '' }) => {
  if (!content?.trim()) return null;
  return (
    <div className={`markdown-content prose prose-invert prose-sm max-w-none ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
};
