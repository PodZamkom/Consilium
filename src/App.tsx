/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Chat } from './components/Chat';
import { Login } from './components/Login';
import { Mode, Message, SelectedModels, StandardMessage, DebateMessage, Project } from './types';
import { fetchModels, OpenRouterModel, sendMessage } from './api/openrouter';
import { processRAG } from './api/rag';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('consilium_auth') === 'true');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openrouter_key') || '');
  
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem('neuro_projects');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(() => {
    return localStorage.getItem('neuro_current_project') || null;
  });

  const [mode, setMode] = useState<Mode>('debate');
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [selectedModels, setSelectedModels] = useState<SelectedModels>({
    opponent1: 'openai/gpt-5.4',
    opponent2: 'anthropic/claude-sonnet-4.6',
    opponent3: 'deepseek/deepseek-v3.2-exp',
    opponent4: 'google/gemini-3-flash-preview',
    summarizer: 'google/gemini-3-flash-preview',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');

  // Initialize projects if empty
  useEffect(() => {
    if (projects.length === 0) {
      handleNewProject();
    } else if (!currentProjectId && projects.length > 0) {
      setCurrentProjectId(projects[0].id);
      setMode(projects[0].mode);
    } else if (currentProjectId) {
      const proj = projects.find(p => p.id === currentProjectId);
      if (proj) setMode(proj.mode);
    }
  }, []);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('openrouter_key', apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('neuro_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    if (currentProjectId) {
      localStorage.setItem('neuro_current_project', currentProjectId);
    }
  }, [currentProjectId]);

  useEffect(() => {
    fetchModels().then(data => {
      setModels(data);
    }).catch(console.error);
  }, []);

  const handleNewProject = () => {
    const newProj: Project = {
      id: Date.now().toString(),
      title: 'Новое исследование',
      messages: [],
      mode: 'debate',
      updatedAt: Date.now()
    };
    setProjects(prev => [newProj, ...prev]);
    setCurrentProjectId(newProj.id);
    setMode('debate');
  };

  const handleSelectProject = (id: string) => {
    setCurrentProjectId(id);
    const proj = projects.find(p => p.id === id);
    if (proj) setMode(proj.mode);
  };

  const handleDeleteProject = (id: string) => {
    setProjects(prev => {
      const filtered = prev.filter(p => p.id !== id);
      if (filtered.length === 0) {
        const newProj: Project = { id: Date.now().toString(), title: 'Новое исследование', messages: [], mode: 'debate', updatedAt: Date.now() };
        setCurrentProjectId(newProj.id);
        setMode('debate');
        return [newProj];
      } else if (id === currentProjectId) {
        setCurrentProjectId(filtered[0].id);
        setMode(filtered[0].mode);
      }
      return filtered;
    });
  };

  const handleRenameProject = (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    setProjects(prev => prev.map(p => p.id === id ? { ...p, title: newTitle.trim(), updatedAt: Date.now() } : p));
  };

  const handleSetMode = (newMode: Mode) => {
    setMode(newMode);
    setProjects(prev => prev.map(p => p.id === currentProjectId ? { ...p, mode: newMode } : p));
  };

  const updateMessages = (updater: (prev: Message[]) => Message[]) => {
    setProjects(prev => prev.map(p => {
      if (p.id === currentProjectId) {
        const newMessages = updater(p.messages);
        let newTitle = p.title;
        if (p.messages.length === 0 && newMessages.length > 0 && newMessages[0].role === 'user') {
          newTitle = newMessages[0].content.slice(0, 30) + (newMessages[0].content.length > 30 ? '...' : '');
        }
        return { ...p, messages: newMessages, title: newTitle, updatedAt: Date.now() };
      }
      return p;
    }));
  };

  const currentProject = projects.find(p => p.id === currentProjectId);
  const messages = currentProject ? currentProject.messages : [];

  const handleSendMessage = async (content: string) => {
    if (!apiKey) {
      updateMessages(prev => [...prev, { id: Date.now().toString(), role: 'system', content: 'Пожалуйста, укажите API-ключ OpenRouter в настройках.' } as StandardMessage]);
      return;
    }

    const newUserMsg: StandardMessage = { id: Date.now().toString(), role: 'user', content, originalPrompt: content };
    updateMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      if (mode === 'normal') {
        setLoadingStatus('Ожидание ответа...');
        const reply = await sendMessage(content, selectedModels.opponent1, apiKey);
        updateMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: reply, originalPrompt: content } as StandardMessage]);
      } else if (mode === 'debate') {
        const debateMsgId = (Date.now() + 1).toString();
        const initialDebateMsg: DebateMessage = {
          id: debateMsgId,
          role: 'debate',
          originalPrompt: content,
          status: 'initial',
          opponents: ['', '', '', ''],
          summary: ''
        };
        updateMessages(prev => [...prev, initialDebateMsg]);

        const updateDebateMsg = (updates: Partial<DebateMessage>) => {
          updateMessages(prev => prev.map(m => m.id === debateMsgId ? { ...m, ...updates } as DebateMessage : m));
        };

        setLoadingStatus('Сбор первичных мнений (1/3)...');
        const initialResponses = await Promise.all([
          sendMessage(content, selectedModels.opponent1, apiKey),
          sendMessage(content, selectedModels.opponent2, apiKey),
          sendMessage(content, selectedModels.opponent3, apiKey),
          sendMessage(content, selectedModels.opponent4, apiKey)
        ]);

        updateDebateMsg({ opponents: initialResponses as [string, string, string, string], status: 'review' });

        const combinedInitial = `Ответ 1:\n${initialResponses[0]}\n\nОтвет 2:\n${initialResponses[1]}\n\nОтвет 3:\n${initialResponses[2]}\n\nОтвет 4:\n${initialResponses[3]}`;
        const debatePrompt = `Проверь ответы других ИИ. Что оспаривает твой ответ, а что дополняет? Найди истину, исправь ошибки и перепиши ответ с учетом мнений коллег.\n\nКонтекст (все ответы):\n${combinedInitial}\n\nТвой первоначальный запрос был: ${content}`;

        setLoadingStatus('Анализ и кросс-ревью (2/3)...');
        const reviewResponses = await Promise.all([
          sendMessage(debatePrompt, selectedModels.opponent1, apiKey),
          sendMessage(debatePrompt, selectedModels.opponent2, apiKey),
          sendMessage(debatePrompt, selectedModels.opponent3, apiKey),
          sendMessage(debatePrompt, selectedModels.opponent4, apiKey)
        ]);

        updateDebateMsg({ opponents: reviewResponses as [string, string, string, string], status: 'summarizing' });

        const combinedDebate = `Мнение 1:\n${reviewResponses[0]}\n\nМнение 2:\n${reviewResponses[1]}\n\nМнение 3:\n${reviewResponses[2]}\n\nМнение 4:\n${reviewResponses[3]}`;
        const summarizePrompt = `Собери ответы, вычлени истину и сделай сухую выжимку.\n\nМатериалы для анализа:\n${combinedDebate}\n\nИсходный вопрос пользователя: ${content}`;

        setLoadingStatus('Формирование итогового вывода (3/3)...');
        const finalResponse = await sendMessage(summarizePrompt, selectedModels.summarizer, apiKey);

        updateDebateMsg({ summary: finalResponse, status: 'done' });
      } else if (mode === 'research') {
        setLoadingStatus('Анализ источников и поиск (RAG)...');
        // В будущем здесь будут передаваться ID прикрепленных файлов/ссылок из состояния Chat.tsx
        const ragResult = await processRAG(content, []); 
        updateMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: ragResult.answer, originalPrompt: content } as StandardMessage]);
      }
    } catch (error: any) {
      updateMessages(prev => [...prev, { id: Date.now().toString(), role: 'system', content: `Ошибка: ${error.message}` } as StandardMessage]);
    } finally {
      setIsLoading(false);
      setLoadingStatus('');
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 font-sans overflow-hidden">
      <Sidebar 
        apiKey={apiKey} 
        setApiKey={setApiKey} 
        mode={mode} 
        setMode={handleSetMode}
        models={models}
        selectedModels={selectedModels}
        setSelectedModels={setSelectedModels}
        projects={projects}
        currentProjectId={currentProjectId}
        onSelectProject={handleSelectProject}
        onNewProject={handleNewProject}
        onDeleteProject={handleDeleteProject}
        onRenameProject={handleRenameProject}
      />
      <Chat 
        messages={messages} 
        onSendMessage={handleSendMessage} 
        isLoading={isLoading} 
        loadingStatus={loadingStatus}
        mode={mode}
      />
    </div>
  );
}
