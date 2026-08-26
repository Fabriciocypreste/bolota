import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Layers, 
  Play, 
  Pause, 
  Trash2, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileImage, 
  Plus, 
  Sparkles, 
  Printer, 
  Archive, 
  Sliders, 
  Eye, 
  ChevronRight,
  RefreshCw,
  Zap,
  FolderArchive
} from 'lucide-react';
import { BatchQueueItem, BatchSettings, PipelineSettings, PresetId } from '../types';
import { BatchProcessorService } from '../services/batchProcessor';

interface BatchQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  queue: BatchQueueItem[];
  setQueue: React.Dispatch<React.SetStateAction<BatchQueueItem[]>>;
  currentSettings: PipelineSettings;
  activePreset: PresetId;
  onSelectImageForViewer: (item: BatchQueueItem) => void;
  onAddFilesToQueue: (files: FileList | File[]) => void;
}

export const BatchQueueModal: React.FC<BatchQueueModalProps> = ({
  isOpen,
  onClose,
  queue,
  setQueue,
  currentSettings,
  activePreset,
  onSelectImageForViewer,
  onAddFilesToQueue,
}) => {
  const [isProcessingAll, setIsProcessingAll] = useState<boolean>(false);
  const [currentProcessingId, setCurrentProcessingId] = useState<string | null>(null);
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);
  const [zipProgress, setZipProgress] = useState<number>(0);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelRequestedRef = useRef<boolean>(false);

  // Global batch settings
  const [batchSettings, setBatchSettings] = useState<BatchSettings>({
    targetPreset: activePreset || 'auto',
    useCurrentSettings: true,
    autoStart: true,
    exportFormat: 'image/png',
    exportQuality: 95,
    downloadAsZip: true,
  });

  const completedCount = queue.filter((q) => q.status === 'completed').length;
  const pendingCount = queue.filter((q) => q.status === 'idle' || q.status === 'queued').length;
  const totalCount = queue.length;
  const overallPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Process the queue sequentially
  const startBatchProcessing = async () => {
    if (isProcessingAll) return;
    setIsProcessingAll(true);
    cancelRequestedRef.current = false;

    // Find all items that need processing
    const itemsToProcess = queue.filter((item) => item.status !== 'completed');

    for (let i = 0; i < queue.length; i++) {
      if (cancelRequestedRef.current) break;

      const currentItem = queue[i];
      if (currentItem.status === 'completed') continue;

      setCurrentProcessingId(currentItem.id);

      // Set item to processing state
      setQueue((prev) =>
        prev.map((it) =>
          it.id === currentItem.id
            ? { ...it, status: 'processing', progress: 0, stage: 'Iniciando...' }
            : it
        )
      );

      try {
        const updatedItem = await BatchProcessorService.processItem(
          currentItem,
          batchSettings,
          currentSettings,
          (percent, stage) => {
            setQueue((prev) =>
              prev.map((it) =>
                it.id === currentItem.id ? { ...it, progress: percent, stage } : it
              )
            );
          }
        );

        setQueue((prev) =>
          prev.map((it) => (it.id === currentItem.id ? updatedItem : it))
        );
      } catch (err: any) {
        setQueue((prev) =>
          prev.map((it) =>
            it.id === currentItem.id
              ? {
                  ...it,
                  status: 'error',
                  stage: 'Erro no processamento',
                  error: err.message || 'Falha',
                }
              : it
          )
        );
      }
    }

    setCurrentProcessingId(null);
    setIsProcessingAll(false);
  };

  const handleCancelBatch = () => {
    cancelRequestedRef.current = true;
    BatchProcessorService.cancel();
    setIsProcessingAll(false);
    setCurrentProcessingId(null);
    setQueue((prev) =>
      prev.map((it) =>
        it.status === 'processing'
          ? { ...it, status: 'idle', stage: 'Interrompido', progress: 0 }
          : it
      )
    );
  };

  const handleClearCompleted = () => {
    setQueue((prev) => prev.filter((it) => it.status !== 'completed'));
  };

  const handleClearAll = () => {
    if (isProcessingAll) handleCancelBatch();
    setQueue([]);
  };

  const handleRemoveItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setQueue((prev) => prev.filter((it) => it.id !== id));
  };

  // Download complete ZIP
  const handleDownloadAllZip = async () => {
    if (completedCount === 0) return;
    setIsExportingZip(true);
    setZipProgress(10);
    try {
      const zipBlob = await BatchProcessorService.exportBatchToZip(
        queue,
        batchSettings,
        (percent) => setZipProgress(percent)
      );

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `magic_bolota_lote_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Erro ao gerar arquivo ZIP: ${err.message}`);
    } finally {
      setIsExportingZip(false);
      setZipProgress(0);
    }
  };

  // Download single item
  const handleDownloadSingleItem = async (item: BatchQueueItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.processedImage) return;

    try {
      const blob = await BatchProcessorService.imageDataToBlob(
        item.processedImage,
        batchSettings.exportFormat,
        batchSettings.exportQuality
      );
      const url = URL.createObjectURL(blob);
      const ext = batchSettings.exportFormat === 'image/jpeg' ? 'jpg' : batchSettings.exportFormat === 'image/webp' ? 'webp' : 'png';
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item.name.replace(/\.[^/.]+$/, '')}_hd.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Falha ao baixar imagem: ${err.message}`);
    }
  };

  // Change preset for a specific item in queue
  const handleItemPresetChange = (id: string, preset: PresetId) => {
    setQueue((prev) =>
      prev.map((it) =>
        it.id === id
          ? {
              ...it,
              appliedPreset: preset,
              status: it.status === 'completed' ? 'idle' : it.status,
            }
          : it
      )
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800/80 flex items-center justify-center text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-100">
                  Processamento em Lote & Fila de Imagens
                </h3>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {totalCount} {totalCount === 1 ? 'imagem' : 'imagens'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Arraste múltiplas fotos, configure o preset desejado e processe tudo em alta velocidade.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Batch Toolbar & Controls */}
        <div className="p-3 sm:p-4 bg-slate-950/70 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          {/* Preset Selector & Recipe mode */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400 pl-2 text-[11px]">Preset Global:</span>
              <select
                value={batchSettings.targetPreset}
                onChange={(e) => {
                  const newPreset = e.target.value as PresetId;
                  setBatchSettings({ ...batchSettings, targetPreset: newPreset });
                  // Optionally update all pending items in queue
                  setQueue((prev) =>
                    prev.map((it) =>
                      it.status !== 'completed' ? { ...it, appliedPreset: newPreset } : it
                    )
                  );
                }}
                className="bg-slate-950 border border-slate-700 text-slate-200 text-xs font-medium rounded-lg px-2.5 py-1 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="auto">✨ Automático (Diagnóstico por Foto)</option>
                <option value="print">🖨️ Impressão Gráfica 300DPI</option>
                <option value="photo">📷 Foto Geral</option>
                <option value="face">👤 Rosto / Retrato</option>
                <option value="blurred">🎯 Recuperar Foco Desfocado</option>
                <option value="vintage">📜 Foto Antiga / Vintage</option>
                <option value="compressed">🧱 Reduzir Artefatos JPEG</option>
                <option value="lowres">🔍 Upscale Super-Res</option>
              </select>
            </div>

            {/* Use current manual adjustments toggle */}
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 cursor-pointer hover:bg-slate-850 transition">
              <input
                type="checkbox"
                checked={batchSettings.useCurrentSettings}
                onChange={(e) =>
                  setBatchSettings({ ...batchSettings, useCurrentSettings: e.target.checked })
                }
                className="w-3.5 h-3.5 accent-cyan-500 rounded cursor-pointer"
              />
              <span className="text-[11px]">Usar Ajustes do Painel Atual</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Add More Files */}
            <button
              onClick={() => fileInputRef.current?.click()}
              id="btn-batch-add-files"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              <span>Adicionar Fotos</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files && onAddFilesToQueue(e.target.files)}
            />

            {/* Clear options */}
            {completedCount > 0 && (
              <button
                onClick={handleClearCompleted}
                className="px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs transition cursor-pointer"
                title="Remover apenas as imagens já concluídas da lista"
              >
                Limpar Concluídas
              </button>
            )}

            {totalCount > 0 && (
              <button
                onClick={handleClearAll}
                className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                title="Limpar toda a fila"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Overall Batch Progress Header if active */}
        {totalCount > 0 && (
          <div className="px-4 py-2 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-200">
                Progresso Geral do Lote:
              </span>
              <span className="font-mono text-cyan-400 font-bold">
                {completedCount} de {totalCount} concluídas ({overallPercent}%)
              </span>
            </div>

            <div className="w-48 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${overallPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Main Queue List */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              onAddFilesToQueue(e.dataTransfer.files);
            }
          }}
          className={`p-4 overflow-y-auto flex-1 space-y-2.5 custom-scrollbar relative ${
            dragOver ? 'bg-cyan-950/40 border-2 border-dashed border-cyan-400' : ''
          }`}
        >
          {queue.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-800 rounded-2xl">
              <div className="w-14 h-14 rounded-2xl bg-cyan-950/50 border border-cyan-800/60 flex items-center justify-center text-cyan-400 mb-3">
                <FileImage className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-200">
                A fila de processamento está vazia
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Arraste várias imagens de uma vez para esta janela ou clique no botão abaixo para selecionar seus arquivos.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-cyan-950/60 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Selecionar Múltiplas Imagens</span>
              </button>
            </div>
          ) : (
            queue.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => item.processedImage && onSelectImageForViewer(item)}
                className={`p-3 rounded-xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  item.status === 'processing'
                    ? 'bg-slate-900 border-cyan-500 shadow-md shadow-cyan-950/40'
                    : item.status === 'completed'
                    ? 'bg-slate-950/80 border-emerald-900/50 hover:border-emerald-700/80 cursor-pointer'
                    : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Left: Thumbnail & Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="relative w-14 h-14 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
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
                        className="w-full h-full object-cover opacity-80"
                      />
                    ) : (
                      <FileImage className="w-6 h-6 text-slate-600" />
                    )}

                    {/* Status badge on thumb */}
                    {item.status === 'completed' && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 shadow">
                        <CheckCircle2 className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  {/* Name & Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200 truncate">
                        {idx + 1}. {item.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">
                        {item.sizeFormatted}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-400">
                      {item.originalDimensions && (
                        <span className="font-mono">
                          {item.originalDimensions.width}×{item.originalDimensions.height} px
                        </span>
                      )}

                      {item.processedDimensions && (
                        <span className="font-mono text-emerald-400 font-semibold flex items-center gap-1">
                          <ChevronRight className="w-3 h-3 text-slate-600" />
                          {item.processedDimensions.width}×{item.processedDimensions.height} px
                        </span>
                      )}

                      {item.processingTimeMs && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          ({(item.processingTimeMs / 1000).toFixed(1)}s)
                        </span>
                      )}
                    </div>

                    {/* Stage / Error state text */}
                    {item.status === 'processing' && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cyan-400 transition-all duration-150"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-cyan-300 font-medium truncate">
                          {item.stage} ({item.progress}%)
                        </span>
                      </div>
                    )}

                    {item.status === 'error' && (
                      <span className="text-[10px] text-rose-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3" />
                        {item.error || 'Falha ao processar'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Preset Selector & Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {/* Per-item Preset selector if not processing */}
                  {item.status !== 'processing' && (
                    <select
                      value={item.appliedPreset}
                      onChange={(e) =>
                        handleItemPresetChange(item.id, e.target.value as PresetId)
                      }
                      className="bg-slate-900 border border-slate-800 text-slate-300 text-[11px] rounded-lg px-2 py-1 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="auto">✨ Auto</option>
                      <option value="print">🖨️ 300 DPI</option>
                      <option value="photo">📷 Foto</option>
                      <option value="face">👤 Retrato</option>
                      <option value="blurred">🎯 Foco</option>
                      <option value="vintage">📜 Vintage</option>
                    </select>
                  )}

                  {/* View in full Before/After viewer */}
                  {item.status === 'completed' && (
                    <button
                      onClick={() => onSelectImageForViewer(item)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                      title="Abrir no comparador Antes e Depois"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Comparar</span>
                    </button>
                  )}

                  {/* Single Download button */}
                  {item.status === 'completed' && (
                    <button
                      onClick={(e) => handleDownloadSingleItem(item, e)}
                      className="p-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 transition cursor-pointer"
                      title="Baixar imagem individualmente"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Remove from queue */}
                  {item.status !== 'processing' && (
                    <button
                      onClick={(e) => handleRemoveItem(item.id, e)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                      title="Remover da fila"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer & Global Execution */}
        <div className="p-4 bg-slate-850 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          
          {/* Summary / Status */}
          <div className="text-xs text-slate-400 text-center sm:text-left">
            {isProcessingAll ? (
              <span className="text-cyan-300 font-medium flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                Processando fila de imagens em alta definição...
              </span>
            ) : completedCount > 0 ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {completedCount} {completedCount === 1 ? 'imagem pronta' : 'imagens prontas'} para download.
              </span>
            ) : (
              <span>Selecione as imagens e clique em Iniciar Processamento.</span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            
            {/* Export all as ZIP button */}
            {completedCount > 0 && (
              <button
                onClick={handleDownloadAllZip}
                id="btn-batch-download-zip"
                disabled={isExportingZip}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/60 transition cursor-pointer disabled:opacity-50"
              >
                <FolderArchive className="w-4 h-4" />
                <span>
                  {isExportingZip ? `Compactando ZIP (${zipProgress}%)...` : `Baixar Todas (.ZIP)`}
                </span>
              </button>
            )}

            {/* Start / Cancel processing button */}
            {isProcessingAll ? (
              <button
                onClick={handleCancelBatch}
                id="btn-batch-cancel"
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer"
              >
                <Pause className="w-4 h-4" />
                <span>Pausar Fila</span>
              </button>
            ) : (
              <button
                onClick={startBatchProcessing}
                id="btn-batch-start"
                disabled={queue.length === 0 || pendingCount === 0}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-950/60 transition cursor-pointer disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {completedCount > 0 && pendingCount > 0
                    ? `Processar Restantes (${pendingCount})`
                    : `Processar Todas (${totalCount})`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
