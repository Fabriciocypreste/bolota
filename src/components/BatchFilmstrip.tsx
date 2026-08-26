import React from 'react';
import { 
  Layers, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  FolderArchive, 
  ChevronUp, 
  Sparkles,
  RefreshCw,
  X
} from 'lucide-react';
import { BatchQueueItem, PresetId } from '../types';

interface BatchFilmstripProps {
  queue: BatchQueueItem[];
  activeImageName?: string;
  onOpenBatchModal: () => void;
  onSelectQueueItem: (item: BatchQueueItem) => void;
  onAddMoreFiles: () => void;
  isProcessingBatch: boolean;
  onStartBatchProcessing: () => void;
  onClearQueue: () => void;
}

export const BatchFilmstrip: React.FC<BatchFilmstripProps> = ({
  queue,
  activeImageName,
  onOpenBatchModal,
  onSelectQueueItem,
  onAddMoreFiles,
  isProcessingBatch,
  onStartBatchProcessing,
  onClearQueue,
}) => {
  if (queue.length === 0) return null;

  const completedCount = queue.filter((q) => q.status === 'completed').length;
  const totalCount = queue.length;
  const pendingCount = totalCount - completedCount;

  return (
    <div className="bg-slate-900/95 border-t border-slate-800 px-4 py-2 flex items-center justify-between gap-3 shrink-0 backdrop-blur-md z-20 shadow-2xl">
      {/* Left info & modal trigger */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenBatchModal}
          id="btn-open-batch-filmstrip"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-950/80 border border-cyan-800/80 text-cyan-300 hover:bg-cyan-900/90 text-xs font-bold transition cursor-pointer shadow-sm"
          title="Abrir Gerenciador Completo de Fila em Lote"
        >
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>Fila de Imagens ({completedCount}/{totalCount})</span>
          <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
        </button>

        {pendingCount > 0 && !isProcessingBatch && (
          <button
            onClick={onStartBatchProcessing}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-950/50 transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Processar Fila ({pendingCount})</span>
          </button>
        )}

        {isProcessingBatch && (
          <div className="flex items-center gap-2 text-xs text-cyan-300 font-medium animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            <span>Processando lote...</span>
          </div>
        )}
      </div>

      {/* Center: Horizontal Scrollable Filmstrip of Thumbnails */}
      <div className="flex-1 flex items-center gap-2 overflow-x-auto py-0.5 custom-scrollbar px-2 max-w-2xl">
        {queue.map((item, idx) => {
          const isActive = activeImageName === item.name;
          return (
            <button
              key={item.id}
              onClick={() => onSelectQueueItem(item)}
              className={`relative group shrink-0 w-12 h-12 rounded-lg border overflow-hidden transition cursor-pointer ${
                isActive
                  ? 'border-cyan-400 ring-2 ring-cyan-500/50 scale-105 shadow-md'
                  : item.status === 'completed'
                  ? 'border-emerald-800/80 opacity-90 hover:opacity-100'
                  : 'border-slate-800 opacity-60 hover:opacity-100'
              }`}
              title={`${idx + 1}. ${item.name} (${item.status === 'completed' ? 'Concluída' : item.stage || 'Pendente'})`}
            >
              {item.processedThumbnailUrl ? (
                <img
                  src={item.processedThumbnailUrl}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : item.thumbnailUrl ? (
                <img
                  src={item.thumbnailUrl}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-slate-950 flex items-center justify-center text-[10px] text-slate-500 font-mono">
                  {idx + 1}
                </div>
              )}

              {/* Status Badge Indicator */}
              {item.status === 'completed' && (
                <div className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-emerald-500 flex items-center justify-center text-[8px] text-slate-950 font-bold shadow">
                  ✓
                </div>
              )}

              {item.status === 'processing' && (
                <div className="absolute inset-0 bg-cyan-950/70 flex items-center justify-center">
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                </div>
              )}

              {item.status === 'error' && (
                <div className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-rose-500 flex items-center justify-center text-[8px] text-white">
                  !
                </div>
              )}
            </button>
          );
        })}

        {/* Add more button */}
        <button
          onClick={onAddMoreFiles}
          className="shrink-0 w-12 h-12 rounded-lg border border-dashed border-slate-700 hover:border-cyan-500 bg-slate-950/50 flex flex-col items-center justify-center text-slate-400 hover:text-cyan-300 transition cursor-pointer"
          title="Adicionar mais imagens à fila"
        >
          <Plus className="w-4 h-4" />
          <span className="text-[9px] font-bold mt-0.5">+ Foto</span>
        </button>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onClearQueue}
          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
          title="Fechar e limpar fila"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
