import { useState } from 'react';
import { Menu, Plus, MessageSquare, Trash2, Settings } from 'lucide-react';
import type { ChatSession } from '../types';

interface Props {
  open: boolean;
  onToggle: () => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
}

function groupSessionsByDate(sessions: ChatSession[]): { label: string; items: ChatSession[] }[] {
  const now = Date.now();
  const DAY = 86_400_000;

  const today: ChatSession[] = [];
  const yesterday: ChatSession[] = [];
  const older: ChatSession[] = [];

  for (const s of sessions) {
    const age = now - s.createdAt;
    if (age < DAY) today.push(s);
    else if (age < 2 * DAY) yesterday.push(s);
    else older.push(s);
  }

  const groups: { label: string; items: ChatSession[] }[] = [];
  if (today.length > 0) groups.push({ label: 'Today', items: today });
  if (yesterday.length > 0) groups.push({ label: 'Yesterday', items: yesterday });
  if (older.length > 0) groups.push({ label: 'Older', items: older });
  return groups;
}

export default function Sidebar({
  open,
  onToggle,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
}: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const groups = groupSessionsByDate(sessions);

  return (
    <div
      className={`${open ? 'w-[272px]' : 'w-0'} transition-all duration-300 flex flex-col bg-[#1e1f20] overflow-hidden flex-shrink-0 border-r border-[#2a2b2d]`}
    >
      {/* Top bar */}
      <div className="h-[64px] flex items-center px-3 gap-2 shrink-0">
        <button
          onClick={onToggle}
          className="p-2 hover:bg-[#333538] rounded-full transition-colors text-gray-400 hover:text-white"
          title="Close sidebar"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* New Chat button */}
      <div className="px-3 mb-2">
        <button
          onClick={onNewChat}
          className="flex items-center gap-3 w-full bg-[#131314] hover:bg-[#282a2c] text-sm py-3 px-4 rounded-full transition-colors text-gray-200"
        >
          <Plus size={16} className="text-gray-400" />
          <span className="font-medium">New chat</span>
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-3 mt-4">
        {sessions.length === 0 ? (
          <p className="text-xs text-gray-500 px-2 text-center mt-8 leading-relaxed">
            No chats yet.
            <br />Start a conversation!
          </p>
        ) : (
          groups.map(group => (
            <div key={group.label} className="mb-4">
              <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5 px-2">
                {group.label}
              </h3>
              <div className="flex flex-col gap-0.5">
                {group.items.map(session => {
                  const isActive = session.id === currentSessionId;
                  const isHovered = hoveredId === session.id;
                  return (
                    <div
                      key={session.id}
                      className={`relative flex items-center rounded-lg transition-colors cursor-pointer
                        ${isActive ? 'bg-[#282a2c]' : 'hover:bg-[#25272a]'}`}
                      onMouseEnter={() => setHoveredId(session.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={() => onSelectSession(session.id)}
                    >
                      <div className="flex items-center gap-2.5 w-full py-2 px-2 pr-8 min-w-0">
                        <MessageSquare
                          size={14}
                          className={`shrink-0 ${isActive ? 'text-blue-400' : 'text-gray-500'}`}
                        />
                        <span
                          className={`text-sm truncate ${isActive ? 'text-white' : 'text-gray-300'}`}
                        >
                          {session.title}
                        </span>
                      </div>
                      {/* Delete button — shown on hover */}
                      {isHovered && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onDeleteSession(session.id);
                          }}
                          className="absolute right-2 p-1 rounded hover:bg-[#3a3b3d] text-gray-500 hover:text-red-400 transition-colors"
                          title="Delete chat"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-3 pb-4 pt-2 border-t border-[#2a2b2d] shrink-0">
        <button className="flex items-center gap-3 w-full text-left text-sm py-2 px-2 hover:bg-[#282a2c] rounded-lg transition-colors text-gray-400 hover:text-gray-200">
          <Settings size={16} />
          <span>Settings &amp; help</span>
        </button>
      </div>
    </div>
  );
}
