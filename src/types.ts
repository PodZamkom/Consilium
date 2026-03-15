export type Mode = 'normal' | 'debate' | 'research';

export interface BaseMessage {
  id: string;
  originalPrompt?: string;
}

export interface StandardMessage extends BaseMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface DebateMessage extends BaseMessage {
  role: 'debate';
  status: 'initial' | 'review' | 'summarizing' | 'done' | 'error';
  opponents: [string, string, string, string];
  summary: string;
}

export type Message = StandardMessage | DebateMessage;

export interface SelectedModels {
  opponent1: string;
  opponent2: string;
  opponent3: string;
  opponent4: string;
  summarizer: string;
}

export interface Project {
  id: string;
  title: string;
  messages: Message[];
  mode: Mode;
  updatedAt: number;
}

