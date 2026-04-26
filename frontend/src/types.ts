export interface UserMessage {
  role: 'user';
  content: string;
}

export interface BotMessage {
  role: 'bot';
  answer: string;
  steps: string[];
  source: string;
  warning?: string | null;
  error?: boolean;
}

export type Message = UserMessage | BotMessage;

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}
