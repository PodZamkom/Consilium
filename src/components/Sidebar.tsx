import { useState, useRef, useEffect } from 'react';
import { Key, Settings2, BrainCircuit, Search, MessageSquare, ChevronDown, ChevronRight, Folder, Plus, Trash2, Pencil } from 'lucide-react';
import { Mode, SelectedModels, Project } from '../types';
import { OpenRouterModel } from '../api/openrouter';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  apiKey: string;
  setApiKey: (val: string) => void;
  mode: Mode;
  setMode: (val: Mode) => void;
  models: OpenRouterModel[];
  selectedModels: SelectedModels;
  setSelectedModels: (val: SelectedModels) => void;
  projects: Project[];
  currentProjectId: string | null;
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
  onDeleteProject: (id: string) => void;
  onRenameProject: (id: string, newTitle: string) => void;
}

export function Sidebar({ 
  apiKey, setApiKey, mode, setMode, models, selectedModels, setSelectedModels,
  projects, currentProjectId, onSelectProject, onNewProject, onDeleteProject, onRenameProject
}: SidebarProps) {
  const [isProjectsOpen, setIsProjectsOpen] = useState(true);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingProjectId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingProjectId]);

  const startEditing = (project: Project) => {
    setEditingProjectId(project.id);
    setEditingTitle(project.title);
  };

  const saveEdit = (id: string) => {
    if (editingTitle.trim()) {
      onRenameProject(id, editingTitle);
    }
    setEditingProjectId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      saveEdit(id);
    } else if (e.key === 'Escape') {
      setEditingProjectId(null);
    }
  };

  return (
    <div className="w-80 bg-zinc-950 border-r border-zinc-800/50 flex flex-col h-full shrink-0">
      <div className="p-6 border-b border-zinc-800/50">
        <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2 text-zinc-100">
          <BrainCircuit className="w-5 h-5 text-indigo-500" />
          НейроКонсилиум
        </h1>
        <p className="text-xs text-zinc-500 mt-1.5 font-medium">Аналитическая платформа <span className="text-[10px] opacity-50 ml-1">v0.0.2</span></p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        
        {/* Projects */}
        <section className="space-y-3">
          <div 
            className="flex items-center justify-between cursor-pointer group"
            onClick={() => setIsProjectsOpen(!isProjectsOpen)}
          >
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2 cursor-pointer group-hover:text-zinc-400 transition-colors">
              <Folder className="w-3.5 h-3.5" />
              Проекты
            </label>
            {isProjectsOpen ? <ChevronDown className="w-3.5 h-3.5 text-zinc-600" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />}
          </div>
          
          {isProjectsOpen && (
            <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
              <button 
                onClick={onNewProject}
                className="w-full text-left px-3 py-2 rounded-lg border border-dashed border-zinc-700/50 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800/50 transition-all text-xs flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Новое исследование
              </button>
              <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                {projects.map(p => (
                  <div key={p.id} className="flex items-center gap-1 group/item">
                    {editingProjectId === p.id ? (
                      <input
                        ref={inputRef}
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={() => saveEdit(p.id)}
                        onKeyDown={(e) => handleKeyDown(e, p.id)}
                        className="flex-1 bg-zinc-900 text-zinc-200 px-3 py-1.5 rounded-lg text-xs border border-indigo-500/50 outline-none"
                      />
                    ) : (
                      <button
                        onClick={() => onSelectProject(p.id)}
                        className={cn(
                          "flex-1 text-left px-3 py-2 rounded-lg text-xs truncate transition-all",
                          p.id === currentProjectId 
                            ? "bg-indigo-500/10 text-indigo-300 font-medium border border-indigo-500/20" 
                            : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-300 border border-transparent"
                        )}
                      >
                        {p.title}
                      </button>
                    )}
                    
                    {editingProjectId !== p.id && (
                      <div className="flex items-center opacity-0 group-hover/item:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); startEditing(p); }}
                          className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors"
                          title="Переименовать"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onDeleteProject(p.id); }}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                          title="Удалить проект"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* API Key */}
        <section className="space-y-3">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
            <Key className="w-3.5 h-3.5" />
            Доступ
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-or-v1-..."
            className="w-full bg-zinc-900/50 border border-zinc-800/80 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
          />
        </section>

        {/* Mode */}
        <section className="space-y-3">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
            <Settings2 className="w-3.5 h-3.5" />
            Режим работы
          </label>
          <div className="space-y-2">
            <ModeButton 
              active={mode === 'normal'} 
              onClick={() => setMode('normal')}
              icon={<MessageSquare className="w-4 h-4" />}
              title="Базовый"
              desc="Прямой диалог с одной моделью"
            />
            <ModeButton 
              active={mode === 'debate'} 
              onClick={() => setMode('debate')}
              icon={<BrainCircuit className="w-4 h-4" />}
              title="Консилиум"
              desc="Синтез мнений трех нейросетей"
            />
            <ModeButton 
              active={mode === 'research'} 
              onClick={() => setMode('research')}
              icon={<Search className="w-4 h-4" />}
              title="Исследование"
              desc="Глубокий поиск (в разработке)"
            />
          </div>
        </section>

        {/* Models */}
        <section className="space-y-4">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
            <Settings2 className="w-3.5 h-3.5" />
            Конфигурация моделей
          </label>
          
          {mode === 'debate' ? (
            <div className="space-y-4">
              <ModelSelect 
                label="Оппонент 1" 
                value={selectedModels.opponent1}
                onChange={v => setSelectedModels({...selectedModels, opponent1: v})}
                models={models}
              />
              <ModelSelect 
                label="Оппонент 2" 
                value={selectedModels.opponent2}
                onChange={v => setSelectedModels({...selectedModels, opponent2: v})}
                models={models}
              />
              <ModelSelect 
                label="Оппонент 3" 
                value={selectedModels.opponent3}
                onChange={v => setSelectedModels({...selectedModels, opponent3: v})}
                models={models}
              />
              <ModelSelect 
                label="Оппонент 4" 
                value={selectedModels.opponent4}
                onChange={v => setSelectedModels({...selectedModels, opponent4: v})}
                models={models}
              />
              <div className="pt-2 border-t border-zinc-800/50">
                <ModelSelect 
                  label="Суммаризатор" 
                  value={selectedModels.summarizer}
                  onChange={v => setSelectedModels({...selectedModels, summarizer: v})}
                  models={models}
                />
              </div>
            </div>
          ) : (
            <ModelSelect 
              label="Рабочая модель" 
              value={selectedModels.opponent1}
              onChange={v => setSelectedModels({...selectedModels, opponent1: v})}
              models={models}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function ModeButton({ active, onClick, icon, title, desc }: { active: boolean, onClick: () => void, icon: React.ReactNode, title: string, desc: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex items-start gap-3.5",
        active 
          ? "bg-indigo-500/10 border-indigo-500/30 shadow-sm shadow-indigo-500/5" 
          : "bg-zinc-900/30 border-zinc-800/50 hover:bg-zinc-900 hover:border-zinc-700/50"
      )}
    >
      <div className={cn("mt-0.5", active ? "text-indigo-400" : "text-zinc-500")}>
        {icon}
      </div>
      <div>
        <div className={cn("text-sm font-medium", active ? "text-indigo-100" : "text-zinc-300")}>{title}</div>
        <div className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{desc}</div>
      </div>
    </button>
  );
}

function ModelSelect({ label, value, onChange, models }: { label: string, value: string, onChange: (v: string) => void, models: OpenRouterModel[] }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium text-zinc-400">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none bg-zinc-900/50 border border-zinc-800/80 rounded-lg pl-3 pr-8 py-2 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 truncate transition-colors"
        >
          {models.length === 0 && <option value={value}>{value} (Загрузка...)</option>}
          {models.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-zinc-500 pointer-events-none" />
      </div>
    </div>
  );
}
