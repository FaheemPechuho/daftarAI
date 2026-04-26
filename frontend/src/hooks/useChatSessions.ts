import { useState, useCallback } from 'react';
import type { ChatSession, Message } from '../types';

const STORAGE_KEY = 'daftar_sessions';
const MAX_TITLE_LENGTH = 42;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ChatSession[];
  } catch {
    return [];
  }
}

function saveSessions(sessions: ChatSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Storage quota exceeded — silently ignore
  }
}

function makeTitle(content: string): string {
  const trimmed = content.trim();
  return trimmed.length > MAX_TITLE_LENGTH
    ? trimmed.slice(0, MAX_TITLE_LENGTH).trimEnd() + '…'
    : trimmed;
}

export function useChatSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>(loadSessions);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    const saved = loadSessions();
    return saved.length > 0 ? saved[0].id : null;
  });

  const currentSession = sessions.find(s => s.id === currentSessionId) ?? null;

  const persistAndSet = useCallback((next: ChatSession[]) => {
    setSessions(next);
    saveSessions(next);
  }, []);

  const createSession = useCallback(() => {
    const newSession: ChatSession = {
      id: generateId(),
      title: 'New chat',
      messages: [],
      createdAt: Date.now(),
    };
    const next = [newSession, ...sessions];
    persistAndSet(next);
    setCurrentSessionId(newSession.id);
    return newSession;
  }, [sessions, persistAndSet]);

  const selectSession = useCallback((id: string) => {
    setCurrentSessionId(id);
  }, []);

  const deleteSession = useCallback((id: string) => {
    const next = sessions.filter(s => s.id !== id);
    persistAndSet(next);
    if (currentSessionId === id) {
      setCurrentSessionId(next.length > 0 ? next[0].id : null);
    }
  }, [sessions, currentSessionId, persistAndSet]);

  const addMessage = useCallback((message: Message) => {
    setSessions(prev => {
      const next = prev.map(s => {
        if (s.id !== currentSessionId) return s;
        const isFirstUserMsg = s.messages.length === 0 && message.role === 'user';
        return {
          ...s,
          title: isFirstUserMsg
            ? makeTitle((message as { role: 'user'; content: string }).content)
            : s.title,
          messages: [...s.messages, message],
        };
      });
      saveSessions(next);
      return next;
    });
  }, [currentSessionId]);

  // Replace the last message in current session (used to update loading placeholder → real response)
  const updateLastBotMessage = useCallback((patch: Partial<Message>) => {
    setSessions(prev => {
      const next = prev.map(s => {
        if (s.id !== currentSessionId) return s;
        const msgs = [...s.messages];
        if (msgs.length === 0) return s;
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], ...patch } as Message;
        return { ...s, messages: msgs };
      });
      saveSessions(next);
      return next;
    });
  }, [currentSessionId]);

  return {
    sessions,
    currentSession,
    currentSessionId,
    createSession,
    selectSession,
    deleteSession,
    addMessage,
    updateLastBotMessage,
  };
}
