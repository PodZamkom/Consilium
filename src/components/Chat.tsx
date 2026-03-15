import { useState, useRef, useEffect } from 'react';
import { Send, Copy, Check, Loader2, Bot, User, BrainCircuit, Paperclip, Link as LinkIcon, X } from 'lucide-react';
import { Message, Mode, StandardMessage, DebateMessage } from '../types';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { handleFileUpload, fetchUrlContent } from '../api/rag';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ChatProps {
  messages: Message[];
  onSendMessage: (msg: string) => void;
  isLoading: boolean;
  loadingStatus: string;
  mode: Mode;
}

export function Chat({ messages, onSendMessage, isLoading, loadingStatus, mode }: ChatProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // RAG Attachments State
  const [attachments, setAttachments] = useState<Array<{id: string, name: string, type: 'file' | 'url'}>>([]);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
    // Очищаем вложения после отправки (опционально, можно оставить для контекста)
    // setAttachments([]); 
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await handleFileUpload(file);
      setAttachments(prev => [...prev, { id: result.id, name: result.name, type: 'file' }]);
    } catch (err) {
      console.error(err);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddUrl = async () => {
    if (!urlValue.trim()) return;
    try {
      const result = await fetchUrlContent(urlValue);
      setAttachments(prev => [...prev, { id: result.id, name: result.url, type: 'url' }]);
      setUrlValue('');
      setShowUrlInput(false);
    } catch (err) {
      console.error(err);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="flex-1 flex flex-col bg-[#09090b] relative">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
        <div className="max-w-5xl mx-auto space-y-8 pb-32">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center mt-32 opacity-70">
              <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <Bot className="w-8 h-8 text-zinc-400" />
              </div>
              <h2 className="text-xl font-medium text-zinc-200 tracking-tight">Готов к работе</h2>
              <p className="text-sm text-zinc-500 mt-2 max-w-sm leading-relaxed">
                {mode === 'debate' 
                  ? 'Задайте сложный вопрос. Четыре нейросети проанализируют его, поспорят друг с другом и выдадут выверенный результат.'
                  : 'Введите ваш запрос для начала диалога.'}
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              msg.role === 'debate' 
                ? <DebateMessageBubble key={msg.id} message={msg as DebateMessage} /> 
                : <StandardMessageBubble key={msg.id} message={msg as StandardMessage} />
            ))
          )}
          
          {isLoading && (
            <div className="flex items-start gap-4 animate-in fade-in duration-300">
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20">
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl rounded-tl-none px-5 py-3.5 text-zinc-400 text-sm flex items-center gap-3 shadow-sm">
                {loadingStatus}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#09090b] via-[#09090b] to-transparent pt-10 pb-6 px-4 sm:px-8">
        <div className="max-w-3xl mx-auto relative">
          <form onSubmit={handleSubmit} className="relative flex flex-col gap-2 bg-zinc-900/80 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-2 shadow-2xl focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
            
            {/* RAG Toolbar for Research Mode */}
            {mode === 'research' && (
              <div className="px-2 pt-1 pb-2 border-b border-zinc-800/50 mb-1">
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {attachments.map(att => (
                      <div key={att.id} className="flex items-center gap-1.5 bg-zinc-800/80 text-zinc-300 px-2.5 py-1 rounded-md text-xs border border-zinc-700/50">
                        {att.type === 'file' ? <Paperclip className="w-3 h-3 text-indigo-400" /> : <LinkIcon className="w-3 h-3 text-emerald-400" />}
                        <span className="truncate max-w-[150px]">{att.name}</span>
                        <button type="button" onClick={() => removeAttachment(att.id)} className="text-zinc-500 hover:text-zinc-300 ml-1">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <input type="file" ref={fileInputRef} onChange={onFileChange} className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-950/50 hover:bg-zinc-800 px-3 py-1.5 rounded-md border border-zinc-800 transition-colors">
                    <Paperclip className="w-3.5 h-3.5" /> Загрузить файл
                  </button>
                  
                  {showUrlInput ? (
                    <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2 duration-200">
                      <input 
                        type="url" 
                        value={urlValue}
                        onChange={e => setUrlValue(e.target.value)}
                        placeholder="https://..."
                        className="bg-zinc-950/50 text-zinc-200 px-2.5 py-1.5 rounded-md text-xs border border-zinc-700 outline-none focus:border-indigo-500 w-48 transition-colors"
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddUrl())}
                      />
                      <button type="button" onClick={handleAddUrl} className="text-xs bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 px-2.5 py-1.5 rounded-md transition-colors font-medium">
                        Добавить
                      </button>
                      <button type="button" onClick={() => setShowUrlInput(false)} className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-md hover:bg-zinc-800 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setShowUrlInput(true)} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-950/50 hover:bg-zinc-800 px-3 py-1.5 rounded-md border border-zinc-800 transition-colors">
                      <LinkIcon className="w-3.5 h-3.5" /> Добавить URL
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-end gap-2 w-full">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder={mode === 'research' ? 'Задайте вопрос по загруженным материалам...' : 'Введите ваш запрос...'}
                disabled={isLoading}
                className="w-full max-h-64 min-h-[44px] bg-transparent border-none resize-none px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none custom-scrollbar"
                rows={1}
                style={{ height: 'auto' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${Math.min(target.scrollHeight, 256)}px`;
                }}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors shrink-0 mb-0.5 shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
          <div className="text-center mt-3">
            <span className="text-[11px] text-zinc-600 font-medium">
              НейроКонсилиум может допускать ошибки. Проверяйте важную информацию.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StandardMessageBubble({ message }: { message: StandardMessage }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!message.originalPrompt) return;
    const textToCopy = `# Запрос\n${message.originalPrompt}\n\n## Итог\n${message.content}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isSystem) {
    return (
      <div className="flex justify-center my-6">
        <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-1.5 rounded-full text-xs font-medium">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-start gap-4", isUser ? "flex-row-reverse" : "")}>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm",
        isUser 
          ? "bg-zinc-800 border-zinc-700 text-zinc-300" 
          : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
      )}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      
      <div className={cn("flex flex-col gap-2.5 max-w-[85%]", isUser ? "items-end" : "items-start")}>
        <div className={cn(
          "px-5 py-4 rounded-2xl text-sm leading-relaxed shadow-sm",
          isUser 
            ? "bg-zinc-800 text-zinc-200 rounded-tr-none" 
            : "bg-zinc-900 border border-zinc-800/50 text-zinc-300 rounded-tl-none"
        )}>
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <div className="markdown-body prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800/80">
              <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
            </div>
          )}
        </div>
        
        {!isUser && message.originalPrompt && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors px-1"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Скопировано!' : 'Copy for NotebookLM'}
          </button>
        )}
      </div>
    </div>
  );
}

function DebateMessageBubble({ message }: { message: DebateMessage }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!message.originalPrompt) return;
    const textToCopy = `# Запрос\n${message.originalPrompt}\n\n## Итог\n${message.summary}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full space-y-4 my-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 4 Opponents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {message.opponents.map((opp, idx) => (
          <div key={idx} className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4 flex flex-col h-72 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-zinc-800/50 shrink-0">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Bot className="w-3.5 h-3.5" />
                Оппонент {idx + 1}
              </span>
              {(message.status === 'initial' || message.status === 'review') && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500 uppercase font-medium">
                    {message.status === 'initial' ? 'Генерация' : 'Кросс-ревью'}
                  </span>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              {opp ? (
                <div className="markdown-body prose-micro prose-invert max-w-none">
                  <Markdown remarkPlugins={[remarkGfm]}>{opp}</Markdown>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-600 text-xs italic">
                  Ожидание ответа...
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summarizer Block */}
      <div className={cn(
        "rounded-2xl p-5 md:p-6 border shadow-lg transition-all duration-500",
        message.status === 'done' 
          ? "bg-indigo-950/20 border-indigo-500/30" 
          : "bg-zinc-900/50 border-zinc-800/50"
      )}>
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-800/50">
          <span className={cn(
            "text-sm font-bold uppercase tracking-wider flex items-center gap-2",
            message.status === 'done' ? "text-indigo-400" : "text-zinc-500"
          )}>
            <BrainCircuit className="w-4 h-4" />
            Суммаризатор (Итог)
          </span>
          {message.status === 'summarizing' && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-indigo-400 uppercase font-medium">Синтез</span>
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            </div>
          )}
        </div>
        
        <div className="min-h-[100px]">
          {message.summary ? (
            <div className="markdown-body prose prose-invert prose-sm md:prose-base max-w-none prose-p:leading-relaxed">
              <Markdown remarkPlugins={[remarkGfm]}>{message.summary}</Markdown>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-600 text-sm italic py-8">
              {message.status === 'done' ? 'Нет вывода.' : 'Ожидание консенсуса оппонентов...'}
            </div>
          )}
        </div>

        {message.status === 'done' && message.summary && (
          <div className="mt-6 pt-4 border-t border-zinc-800/50 flex justify-end">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-800"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Скопировано!' : 'Copy for NotebookLM'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
