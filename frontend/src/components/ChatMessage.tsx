import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AlertTriangle, BookOpen, CheckCircle } from 'lucide-react';
import type { Message, BotMessage as BotMsg } from '../types';

interface Props {
  message: Message;
  isLoading?: boolean;
}

function BotAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-[#1e1f20] border border-[#333538] flex items-center justify-center shrink-0 text-base">
      💼
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center shrink-0 font-bold text-xs text-white">
      F
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-1 py-3">
      <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

function BotResponseBody({ msg }: { msg: BotMsg }) {
  if (msg.error) {
    return (
      <div className="flex items-start gap-2 text-red-400 text-sm">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
        <span>{msg.answer}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Answer — rendered as markdown */}
      {msg.answer && (
        <div className="prose prose-invert prose-sm max-w-none text-[#e3e3e3] leading-relaxed
          prose-p:my-1 prose-p:leading-7
          prose-strong:text-white prose-strong:font-semibold
          prose-code:text-blue-300 prose-code:bg-[#282a2c] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono
          prose-pre:bg-[#1a1b1d] prose-pre:border prose-pre:border-[#333538] prose-pre:rounded-xl
          prose-ul:my-2 prose-ul:pl-5 prose-li:my-0.5
          prose-ol:my-2 prose-ol:pl-5
          prose-h1:text-white prose-h2:text-white prose-h3:text-white
          prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {msg.answer}
          </ReactMarkdown>
        </div>
      )}

      {/* Steps — rendered as a numbered action list */}
      {msg.steps && msg.steps.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <CheckCircle size={13} />
            Steps
          </div>
          <ol className="flex flex-col gap-2">
            {msg.steps.map((step, i) => (
              <li key={i} className="flex gap-3 items-start bg-[#1a1b1d] border border-[#2a2b2d] rounded-xl px-4 py-3">
                <span className="shrink-0 w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="text-[14px] text-[#d1d5db] leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Source citation badge */}
      {msg.source && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-[#1a1b1d] border border-[#2a2b2d] rounded-full px-3 py-1.5">
            <BookOpen size={11} className="text-gray-500" />
            <span>{msg.source}</span>
          </div>
        </div>
      )}

      {/* Warning alert */}
      {msg.warning && (
        <div className="flex items-start gap-2.5 bg-amber-950/30 border border-amber-800/40 rounded-xl px-4 py-3">
          <AlertTriangle size={15} className="text-amber-400 mt-0.5 shrink-0" />
          <span className="text-[13px] text-amber-300/90 leading-relaxed">{msg.warning}</span>
        </div>
      )}
    </div>
  );
}

export default function ChatMessage({ message, isLoading = false }: Props) {
  if (message.role === 'user') {
    return (
      <div className="flex gap-3 flex-row-reverse group">
        <UserAvatar />
        <div className="max-w-[80%] bg-[#282a2c] rounded-3xl rounded-tr-sm px-5 py-3 text-[15px] leading-relaxed text-[#e3e3e3] whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 group">
      <BotAvatar />
      <div className="flex-1 min-w-0 pt-1">
        {isLoading ? <TypingDots /> : <BotResponseBody msg={message} />}
      </div>
    </div>
  );
}
