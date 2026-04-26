import { useState, useRef, useEffect, useCallback } from 'react';
import { Menu, Building2, FileText, GitCompare, Receipt } from 'lucide-react';

import Sidebar from './components/Sidebar';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import { useChatSessions } from './hooks/useChatSessions';
import type { BotMessage, UserMessage } from './types';

const SUGGESTION_CARDS = [
  {
    icon: <Building2 size={18} className="text-blue-400" />,
    label: 'Register a Business',
    desc: 'Walk me through SECP registration step by step.',
    query: 'How do I register a private limited company with SECP in Pakistan?',
  },
  {
    icon: <Receipt size={18} className="text-green-400" />,
    label: 'Get an NTN Number',
    desc: 'What do I need to register with FBR?',
    query: 'What documents and steps are required to get an NTN number in Pakistan?',
  },
  {
    icon: <GitCompare size={18} className="text-purple-400" />,
    label: 'Compare Structures',
    desc: 'SMC vs Pvt Ltd vs Sole Proprietor — which fits me?',
    query: 'What is the difference between SMC, Pvt Ltd, and Sole Proprietorship in Pakistan?',
  },
  {
    icon: <FileText size={18} className="text-amber-400" />,
    label: 'Compliance Checklist',
    desc: 'What are my annual compliance deadlines?',
    query: 'What are the annual compliance requirements and deadlines for a Pakistani company?',
  },
];

export default function App() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    sessions,
    currentSession,
    currentSessionId,
    createSession,
    selectSession,
    deleteSession,
    addMessage,
    updateLastBotMessage,
  } = useChatSessions();

  const messages = currentSession?.messages ?? [];
  const isInitialState = messages.length === 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const ensureSession = useCallback(() => {
    if (!currentSessionId) return createSession();
    return currentSession!;
  }, [currentSessionId, currentSession, createSession]);

  const handleSend = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    ensureSession();

    const userMsg: UserMessage = { role: 'user', content: trimmed };
    addMessage(userMsg);
    setInput('');
    setIsLoading(true);

    const placeholderBot: BotMessage = { role: 'bot', answer: '', steps: [], source: '' };
    addMessage(placeholderBot);

    const apiBase = import.meta.env.VITE_API_URL ?? '';
    try {
      const response = await fetch(`${apiBase}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Something went wrong');

      updateLastBotMessage({
        role: 'bot',
        answer: data.answer ?? '',
        steps: Array.isArray(data.steps) ? data.steps : [],
        source: data.source ?? '',
        warning: data.warning ?? null,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      updateLastBotMessage({ role: 'bot', answer: `Error: ${msg}`, steps: [], source: '', error: true });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, ensureSession, addMessage, updateLastBotMessage]);

  const handleNewChat = () => {
    createSession();
    setInput('');
  };

  return (
    <div className="flex h-screen w-full bg-[#131314] text-[#e3e3e3] overflow-hidden font-sans">

      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(o => !o)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={selectSession}
        onNewChat={handleNewChat}
        onDeleteSession={deleteSession}
      />

      {/* Main panel */}
      <div className="flex-1 flex flex-col h-full min-w-0">

        {/* Header */}
        <header className="h-[60px] flex items-center px-4 shrink-0 border-b border-[#1e1f20]">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-[#282a2c] rounded-full transition-colors mr-1 text-gray-400 hover:text-white"
            >
              <Menu size={20} />
            </button>
          )}
          {/* Brand: small wordmark */}
          <div className="flex items-center gap-2 ml-1">
            <span className="text-lg">🏛️</span>
            <span className="text-[16px] font-bold tracking-tight text-white">Daftar</span>
            <span className="hidden sm:inline text-[11px] text-gray-600 font-normal ml-0.5 mt-0.5">
              دفتر — Your Office. Your Doorstep.
            </span>
          </div>
          <div className="ml-auto">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center font-bold text-sm text-white">
              F
            </div>
          </div>
        </header>

        {/* Chat / welcome area */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          {isInitialState ? (
            /* ── Welcome state ── */
            <div className="flex-1 flex flex-col items-center justify-center w-full px-4 py-10">
              <div className="w-full max-w-[640px] flex flex-col gap-8">

                {/* Greeting */}
                <div className="text-center">
                  <p className="text-[13px] font-medium text-blue-400 tracking-widest uppercase mb-3">
                    دفتر · Your Legal Office
                  </p>
                  <h2 className="text-[36px] leading-[1.15] font-bold mb-3 bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 text-transparent bg-clip-text">
                    Your office,<br />at your doorstep.
                  </h2>
                  <p className="text-[#8a8f98] text-[15px] leading-relaxed max-w-md mx-auto">
                    Business registration, FBR taxes, and compliance — explained in plain language.
                    No lawyers, no offices, no waiting rooms.
                  </p>
                </div>

                {/* Suggestion cards — 2×2 grid, placed ABOVE input */}
                <div className="grid grid-cols-2 gap-3">
                  {SUGGESTION_CARDS.map(card => (
                    <button
                      key={card.label}
                      onClick={() => handleSend(card.query)}
                      disabled={isLoading}
                      className="flex flex-col items-start gap-2 text-left px-4 py-3.5 bg-[#1a1b1d] hover:bg-[#222326] border border-[#2a2b2d] hover:border-[#3a3b3d] rounded-2xl transition-all duration-150 group disabled:opacity-50"
                    >
                      <div className="p-1.5 bg-[#111213] rounded-lg border border-[#2a2b2d] group-hover:border-[#3a3b3d] transition-colors">
                        {card.icon}
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-gray-100 leading-tight mb-0.5">
                          {card.label}
                        </p>
                        <p className="text-[12px] text-gray-500 leading-snug">
                          {card.desc}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Input — below the cards */}
                <ChatInput
                  value={input}
                  onChange={setInput}
                  onSend={handleSend}
                  disabled={isLoading}
                />

                <p className="text-center text-[11px] text-gray-700 -mt-4">
                  Covers SECP · FBR · NTN · STRN · Company Structures · Annual Compliance
                </p>
              </div>
            </div>
          ) : (
            /* ── Active chat ── */
            <div className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 flex flex-col gap-8">
              {messages.map((msg, idx) => {
                const isLastMsg = idx === messages.length - 1;
                const showLoading = isLoading && isLastMsg && msg.role === 'bot';
                return (
                  <ChatMessage key={idx} message={msg} isLoading={showLoading} />
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {/* Docked bottom input — active chat only */}
        {!isInitialState && (
          <div className="w-full max-w-3xl mx-auto px-4 pb-5 pt-2 shrink-0">
            <ChatInput
              value={input}
              onChange={setInput}
              onSend={handleSend}
              disabled={isLoading}
            />
            <p className="text-center mt-2 text-[11px] text-gray-700">
              Always verify at fbr.gov.pk or secp.gov.pk — Daftar is a guide, not a lawyer.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
