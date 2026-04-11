import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AICoachPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [view, setView] = useState('chat'); // chat | report
  const [reports, setReports] = useState([]);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (view === 'report') loadReports();
  }, [view]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  async function loadHistory() {
    try {
      const data = await api.getChatHistory();
      if (data.length === 0) {
        setMessages([{
          role: 'assistant',
          content: '你好，我是你的专属成长教练。我已经了解了你当前的生命状态，有什么想聊的？',
          created_at: new Date().toISOString(),
        }]);
      } else {
        setMessages(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function loadReports() {
    try {
      const data = await api.getWeeklyReports();
      setReports(data);
    } catch (e) {
      console.error(e);
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.chat(text);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.message,
        created_at: new Date().toISOString(),
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: e.message || '抱歉，暂时无法连接AI教练，请稍后再试。',
        created_at: new Date().toISOString(),
        isError: true,
      }]);
    } finally {
      setLoading(false);
    }
  }

  async function generateReport() {
    setGeneratingReport(true);
    try {
      const res = await api.generateWeeklyReport();
      await loadReports();
      setSelectedReport({ report_content: res.report, week_start: res.weekStart });
    } catch (e) {
      alert(e.message || '生成周报失败');
    } finally {
      setGeneratingReport(false);
    }
  }

  async function clearHistory() {
    if (!confirm('确认清除所有对话记录？')) return;
    await api.clearChatHistory();
    setMessages([{
      role: 'assistant',
      content: '对话记录已清除。有什么新的话题想聊吗？',
      created_at: new Date().toISOString(),
    }]);
  }

  const QUICK_PROMPTS = [
    '帮我分析一下最近的状态',
    '给我一个本周的重点建议',
    '我感觉有点低落，怎么办？',
    '我想改善睡眠质量',
  ];

  if (historyLoading) return <div className="page-container"><LoadingSpinner text="连接AI教练..." /></div>;

  return (
    <div className="page-container flex flex-col" style={{ height: '100vh', paddingBottom: '80px' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-serif text-gold text-xl glow-text">AI 教练</h1>
        <div className="flex gap-2">
          <button
            className={`text-sm px-3 py-1.5 rounded-lg transition-all ${view === 'chat' ? 'bg-gold text-bg' : 'text-textMuted bg-surfaceHover border border-border'}`}
            onClick={() => setView('chat')}
          >对话</button>
          <button
            className={`text-sm px-3 py-1.5 rounded-lg transition-all ${view === 'report' ? 'bg-gold text-bg' : 'text-textMuted bg-surfaceHover border border-border'}`}
            onClick={() => setView('report')}
          >周报</button>
        </div>
      </div>

      {view === 'chat' ? (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 pb-4">
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            {loading && (
              <div className="flex gap-2 items-start">
                <div className="w-7 h-7 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0 text-sm">🌟</div>
                <div className="bg-surface rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
                  <ThinkingDots />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompts */}
          {messages.length <= 1 && (
            <div className="mb-3">
              <p className="text-textMuted text-xs mb-2">快速开始：</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPTS.map(prompt => (
                  <button
                    key={prompt}
                    className="text-xs px-3 py-1.5 rounded-full border border-gold/30 text-gold/70 bg-gold/5 active:bg-gold/10"
                    onClick={() => { setInput(prompt); }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2 items-end">
            <textarea
              className="input-field resize-none flex-1 text-sm leading-relaxed"
              style={{ minHeight: '44px', maxHeight: '120px' }}
              placeholder="和教练聊聊..."
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(120, e.target.scrollHeight) + 'px';
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <button
              className="flex-shrink-0 w-11 h-11 rounded-lg bg-gold text-bg flex items-center justify-center active:opacity-80 disabled:opacity-40"
              onClick={sendMessage}
              disabled={!input.trim() || loading}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>

          {messages.length > 2 && (
            <button className="text-xs text-textMuted mt-2 text-center w-full active:text-gold" onClick={clearHistory}>
              清除对话记录
            </button>
          )}
        </>
      ) : (
        <ReportView
          reports={reports}
          selectedReport={selectedReport}
          onSelectReport={setSelectedReport}
          onGenerate={generateReport}
          generating={generatingReport}
        />
      )}
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-2 items-start ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0 text-sm">🌟</div>
      )}
      <div
        className={`max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-gold/20 text-gold rounded-tr-sm'
            : message.isError
            ? 'bg-red-900/30 text-red-300 rounded-tl-sm'
            : 'bg-surface text-text rounded-tl-sm'
        }`}
      >
        {message.content.split('\n').map((line, i, arr) => (
          <span key={i}>
            {line}
            {i < arr.length - 1 && <br />}
          </span>
        ))}
      </div>
    </div>
  );
}

function ThinkingDots() {
  return (
    <div className="flex gap-1 items-center py-1">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-gold/40"
          style={{
            animation: 'bounce 1.4s ease-in-out infinite',
            animationDelay: `${i * 0.16}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.4; }
          40% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function ReportView({ reports, selectedReport, onSelectReport, onGenerate, generating }) {
  if (selectedReport) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center gap-3 mb-4">
          <button className="text-textMuted active:text-gold" onClick={() => onSelectReport(null)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="text-gold font-medium">
            周报 · {new Date(selectedReport.week_start).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })} 起
          </span>
        </div>
        <div className="card">
          <div className="text-sm text-text leading-relaxed whitespace-pre-wrap">
            {selectedReport.report_content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="card mb-4 text-center border border-gold/20">
        <div className="text-3xl mb-2">📊</div>
        <p className="text-sm text-text mb-1">生成本周周报</p>
        <p className="text-xs text-textMuted mb-4">AI将分析你本周的日记和项目数据，生成个性化总结与建议</p>
        <button
          className="btn-primary w-full"
          onClick={onGenerate}
          disabled={generating}
        >
          {generating ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-bg/30 border-t-bg animate-spin" />
              生成中...
            </span>
          ) : '生成本周周报'}
        </button>
      </div>

      {reports.length > 0 && (
        <div>
          <h3 className="section-title text-base mb-3">历史周报</h3>
          {reports.map(r => (
            <div
              key={r.id}
              className="card mb-2 cursor-pointer active:bg-surfaceHover"
              onClick={() => onSelectReport(r)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text">
                    周报 · {new Date(r.week_start).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })} 起
                  </p>
                  <p className="text-xs text-textMuted mt-0.5 line-clamp-1">{r.report_content.slice(0, 50)}...</p>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-textMuted flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
