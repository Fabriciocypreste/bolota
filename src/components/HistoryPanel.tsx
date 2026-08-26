import React, { useState } from 'react';
import { 
  History, 
  RotateCcw, 
  RotateCw, 
  Bookmark, 
  BookmarkCheck, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Sliders, 
  Sparkles, 
  ArrowRight,
  Plus,
  Layers,
  ChevronRight,
  AlertCircle,
  Eye
} from 'lucide-react';
import { HistoryEntry, PipelineSettings } from '../types';

interface HistoryPanelProps {
  history: HistoryEntry[];
  currentHistoryId: string | null;
  onSelectVersion: (entry: HistoryEntry) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onSaveBookmark: (customName: string) => void;
  onDeleteEntry: (id: string) => void;
  onClearHistory: () => void;
  onRevertToOriginal: () => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  currentHistoryId,
  onSelectVersion,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onSaveBookmark,
  onDeleteEntry,
  onClearHistory,
  onRevertToOriginal,
}) => {
  const [isAddingBookmark, setIsAddingBookmark] = useState(false);
  const [bookmarkName, setBookmarkName] = useState('');

  const handleCreateBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookmarkName.trim()) return;
    onSaveBookmark(bookmarkName.trim());
    setBookmarkName('');
    setIsAddingBookmark(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 select-none">
      {/* Header & Quick Undo/Redo Bar */}
      <div className="p-3.5 bg-slate-850 border-b border-slate-800 shrink-0 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Histórico de Alterações
            </h2>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-cyan-400 border border-slate-800">
            {history.length} {history.length === 1 ? 'versão' : 'versões'}
          </span>
        </div>

        {/* Undo / Redo / Bookmark Controls */}
        <div className="grid grid-cols-3 gap-1.5 pt-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            id="btn-history-undo"
            className="py-1.5 px-2 rounded-lg bg-slate-950 hover:bg-slate-800 disabled:opacity-35 disabled:hover:bg-slate-950 text-slate-300 disabled:text-slate-600 border border-slate-800 text-[11px] font-medium flex items-center justify-center gap-1.5 transition cursor-pointer disabled:cursor-not-allowed"
            title="Desfazer última alteração (Ctrl + Z)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Desfazer</span>
          </button>

          <button
            onClick={onRedo}
            disabled={!canRedo}
            id="btn-history-redo"
            className="py-1.5 px-2 rounded-lg bg-slate-950 hover:bg-slate-800 disabled:opacity-35 disabled:hover:bg-slate-950 text-slate-300 disabled:text-slate-600 border border-slate-800 text-[11px] font-medium flex items-center justify-center gap-1.5 transition cursor-pointer disabled:cursor-not-allowed"
            title="Refazer alteração (Ctrl + Y)"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Refazer</span>
          </button>

          <button
            onClick={() => setIsAddingBookmark(!isAddingBookmark)}
            id="btn-history-add-bookmark"
            className={`py-1.5 px-2 rounded-lg border text-[11px] font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
              isAddingBookmark
                ? 'bg-amber-950/60 border-amber-500 text-amber-300'
                : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
            }`}
            title="Salvar a versão atual com nome personalizado"
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            <span>Salvar Marco</span>
          </button>
        </div>

        {/* Inline Bookmark Creation Form */}
        {isAddingBookmark && (
          <form
            onSubmit={handleCreateBookmark}
            className="p-2.5 rounded-lg bg-slate-950 border border-amber-700/50 space-y-2 animate-in fade-in zoom-in-95 duration-100"
          >
            <label className="text-[10px] text-amber-300 font-semibold block">
              Nome do Marco / Ponto de Restauração:
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={bookmarkName}
                onChange={(e) => setBookmarkName(e.target.value)}
                placeholder="Ex: Nitidez Perfeita para Web"
                autoFocus
                className="flex-1 px-2.5 py-1 text-xs bg-slate-900 border border-slate-700 rounded text-slate-100 focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                disabled={!bookmarkName.trim()}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-slate-950 font-bold rounded text-xs transition cursor-pointer"
              >
                Salvar
              </button>
            </div>
          </form>
        )}
      </div>

      {/* History Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
        {history.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 space-y-2">
            <Clock className="w-8 h-8 mx-auto text-slate-700" />
            <p>Nenhuma versão registrada ainda.</p>
            <p className="text-[11px] text-slate-600">
              Ao ajustar controles ou aplicar presets, as versões serão salvas automaticamente aqui.
            </p>
          </div>
        ) : (
          history.map((entry, index) => {
            const isActive = entry.id === currentHistoryId;
            const isInitial = index === history.length - 1;

            return (
              <div
                key={entry.id}
                onClick={() => onSelectVersion(entry)}
                id={`history-entry-${entry.id}`}
                className={`group relative rounded-xl p-3 transition border text-xs cursor-pointer ${
                  isActive
                    ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950/50 ring-1 ring-cyan-500/50'
                    : 'bg-slate-950/70 hover:bg-slate-900 border-slate-800/90 hover:border-slate-700'
                }`}
              >
                {/* Active Version Ribbon / Bookmark Tag */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    {entry.isPinned ? (
                      <BookmarkCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : isActive ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    )}
                    <h3 className={`font-semibold truncate text-[11px] ${isActive ? 'text-cyan-300 font-bold' : 'text-slate-200'}`}>
                      {entry.label}
                    </h3>
                  </div>

                  <span className="text-[10px] font-mono text-slate-500 shrink-0">
                    {entry.timeFormatted}
                  </span>
                </div>

                {/* Body: Thumbnail + Info */}
                <div className="flex gap-2.5 items-center">
                  {entry.thumbnailUrl ? (
                    <div className="w-14 h-11 rounded-lg overflow-hidden bg-slate-900 border border-slate-800 shrink-0 relative">
                      <img
                        src={entry.thumbnailUrl}
                        alt={entry.label}
                        className="w-full h-full object-cover"
                      />
                      {isActive && (
                        <div className="absolute inset-0 border border-cyan-400/80 rounded-lg pointer-events-none" />
                      )}
                    </div>
                  ) : (
                    <div className="w-14 h-11 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                      <Layers className="w-4 h-4 text-slate-600" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 space-y-1">
                    {/* Preset & Mode Badges */}
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                        {entry.preset}
                      </span>
                      {entry.settings.upscale.scale > 1 && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-800/80 text-purple-300">
                          {entry.settings.upscale.scale}x
                        </span>
                      )}
                      {isActive && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500 text-slate-950">
                          VERSÃO ATIVA
                        </span>
                      )}
                    </div>

                    {/* Changes Summary Pills */}
                    <div className="text-[10px] text-slate-400 truncate flex flex-wrap gap-1">
                      {entry.changesSummary.slice(0, 3).map((badge, bIdx) => (
                        <span key={bIdx} className="text-slate-400">
                          • {badge}
                        </span>
                      ))}
                      {entry.changesSummary.length > 3 && (
                        <span className="text-slate-500">+{entry.changesSummary.length - 3}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Hover / Actions Bottom Bar */}
                <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1">
                    {isActive ? (
                      <span className="text-cyan-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Configuração Atual
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectVersion(entry);
                        }}
                        className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 group-hover:underline cursor-pointer"
                      >
                        <span>Restaurar Esta Versão</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {!isInitial && history.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteEntry(entry.id);
                      }}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded transition cursor-pointer"
                      title="Excluir este snapshot do histórico"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Actions: Revert to Original & Clear History */}
      <div className="p-3 bg-slate-850 border-t border-slate-800 shrink-0 flex items-center justify-between text-xs">
        <button
          onClick={onRevertToOriginal}
          id="btn-revert-original-history"
          className="text-[11px] text-slate-400 hover:text-cyan-300 flex items-center gap-1.5 transition cursor-pointer"
          title="Reverter todos os parâmetros para o estado original da imagem"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Voltar ao Original</span>
        </button>

        {history.length > 1 && (
          <button
            onClick={onClearHistory}
            id="btn-clear-history-all"
            className="text-[11px] text-slate-500 hover:text-rose-400 transition cursor-pointer"
            title="Limpa histórico mantendo apenas a versão atual e original"
          >
            Limpar Histórico
          </button>
        )}
      </div>
    </div>
  );
};
