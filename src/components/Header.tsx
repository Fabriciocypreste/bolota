import React from 'react';
import { 
  Sparkles, 
  Upload, 
  Download, 
  Cpu, 
  RotateCcw, 
  RotateCw,
  SlidersHorizontal,
  Bot,
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  History
} from 'lucide-react';
import { GpuCapabilities } from '../types';

interface HeaderProps {
  onOpenFile: () => void;
  onExport: () => void;
  onAutoOptimize: () => void;
  onReset: () => void;
  onOpenAiAdvisor: () => void;
  onSelectSample: () => void;
  hasImage: boolean;
  isProcessing: boolean;
  gpuCaps: GpuCapabilities | null;
  autoOptimized: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  historyCount?: number;
  activeSidebarTab?: 'settings' | 'history';
  onToggleHistory?: () => void;
  onOpenBatchQueue?: () => void;
  batchQueueCount?: number;
  isBatchProcessing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenFile,
  onExport,
  onAutoOptimize,
  onReset,
  onOpenAiAdvisor,
  onSelectSample,
  hasImage,
  isProcessing,
  gpuCaps,
  autoOptimized,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  historyCount = 0,
  activeSidebarTab,
  onToggleHistory,
  onOpenBatchQueue,
  batchQueueCount = 0,
  isBatchProcessing = false,
}) => {
  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between select-none z-30 shrink-0">
      {/* Brand & App Name */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-gradient-to-tr from-cyan-600 to-blue-600 p-1.5 rounded-lg shadow-md shadow-cyan-900/30">
          <Sparkles className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold tracking-wide text-slate-100 flex items-center gap-1.5">
              Magic Bolota <span className="text-cyan-400 font-extrabold text-xs px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/60 uppercase">Studio</span>
            </h1>
            <span className="hidden md:inline-block text-[11px] text-slate-400 border-l border-slate-700 pl-2">
              Restauração & Nitidez Inteligente
            </span>
          </div>
        </div>
      </div>

      {/* Center Actions: File Open, Samples, Batch Queue, Auto, Undo/Redo */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenFile}
          id="btn-open-file"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition shadow-sm cursor-pointer"
          title="Importar imagem (PNG, JPG, WEBP, TIFF)"
        >
          <Upload className="w-3.5 h-3.5 text-cyan-400" />
          <span>Abrir Imagens</span>
        </button>

        {/* Batch Processing Queue Button */}
        {onOpenBatchQueue && (
          <button
            onClick={onOpenBatchQueue}
            id="btn-open-batch-queue-header"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold border transition cursor-pointer ${
              batchQueueCount > 0
                ? 'bg-cyan-950/90 text-cyan-300 border-cyan-600/80 shadow-md shadow-cyan-950/50'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700/80'
            }`}
            title="Abrir Fila de Processamento em Lote"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Fila / Lote</span>
            {batchQueueCount > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-cyan-500 text-slate-950 font-extrabold animate-pulse">
                {batchQueueCount}
              </span>
            )}
          </button>
        )}

        <button
          onClick={onSelectSample}
          id="btn-sample-images"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition cursor-pointer"
          title="Carregar fotos de teste com defeitos reais de foco e ruído"
        >
          <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Fotos de Teste</span>
        </button>

        {hasImage && (
          <button
            onClick={onAutoOptimize}
            id="btn-auto-optimize-header"
            disabled={isProcessing}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition shadow-sm cursor-pointer ${
              autoOptimized
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-950/50'
            }`}
            title="Diagnostica defeitos da imagem e calcula intensidade ideal sem artefatos"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
            <span>AUTO REPAIR</span>
            {autoOptimized && <CheckCircle2 className="w-3 h-3 text-cyan-400" />}
          </button>
        )}

        {/* Undo & Redo Quick Buttons in Header */}
        {hasImage && onUndo && onRedo && (
          <div className="hidden sm:flex items-center bg-slate-950/80 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              id="header-btn-undo"
              className="p-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-400 transition rounded cursor-pointer disabled:cursor-not-allowed"
              title="Desfazer versão anterior (Ctrl+Z)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-3.5 bg-slate-800" />
            <button
              onClick={onRedo}
              disabled={!canRedo}
              id="header-btn-redo"
              className="p-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-400 transition rounded cursor-pointer disabled:cursor-not-allowed"
              title="Refazer versão seguinte (Ctrl+Y)"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {hasImage && onToggleHistory && (
          <button
            onClick={onToggleHistory}
            id="btn-toggle-history-header"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition cursor-pointer ${
              activeSidebarTab === 'history'
                ? 'bg-cyan-950/80 border-cyan-500/80 text-cyan-300'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700/80'
            }`}
            title="Abrir painel de Histórico de Alterações"
          >
            <History className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Histórico</span>
            {historyCount > 0 && (
              <span className="text-[10px] font-mono px-1 rounded bg-slate-950 text-cyan-400 border border-slate-800">
                {historyCount}
              </span>
            )}
          </button>
        )}

        {hasImage && (
          <button
            onClick={onOpenAiAdvisor}
            id="btn-ai-advisor-header"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-200 border border-indigo-700/50 transition cursor-pointer"
            title="Diagnóstico avançado com Gemini Vision AI"
          >
            <Bot className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden lg:inline">Diagnóstico IA</span>
          </button>
        )}
      </div>

      {/* Right Controls: Hardware Info, Reset & Export */}
      <div className="flex items-center gap-2.5">
        {/* GPU Status Indicator */}
        <div 
          className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300"
          title={`Motor de Aceleração: ${gpuCaps?.vendorName || 'Detectando...'} | Threads: ${gpuCaps?.threadsAvailable || 4}`}
        >
          <Cpu className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-mono text-[10px] text-emerald-300 font-semibold">
            {gpuCaps?.tier.includes('Discrete') ? 'GPU ACCELERATED' : 'HARDWARE ACCEL'}
          </span>
        </div>

        {hasImage && (
          <button
            onClick={onReset}
            id="btn-reset-pipeline"
            disabled={isProcessing}
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            title="Restaurar valores padrão"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={onExport}
          id="btn-export-image"
          disabled={!hasImage || isProcessing}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-md shadow-emerald-950/50 transition cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar</span>
        </button>
      </div>
    </header>
  );
};
