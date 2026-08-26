import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ImageAnalysisMetrics, 
  PipelineSettings, 
  PresetId, 
  ViewMode, 
  GpuCapabilities, 
  ProcessingProgress,
  HistoryEntry,
  BatchQueueItem,
  BatchSettings
} from './types';
import { ImageAnalyzer } from './services/imageAnalyzer';
import { ProcessingPipeline } from './services/processingPipeline';
import { GpuManager } from './services/gpuManager';
import { SampleImageMeta, SampleImageService } from './services/sampleImages';
import { HistoryHelper } from './services/historyHelper';
import { BatchProcessorService } from './services/batchProcessor';
import { Header } from './components/Header';
import { ImageViewer } from './components/ImageViewer';
import { ControlsSidebar } from './components/ControlsSidebar';
import { AnalysisPanel } from './components/AnalysisPanel';
import { ExportModal } from './components/ExportModal';
import { SampleModal } from './components/SampleModal';
import { AiAdvisorModal } from './components/AiAdvisorModal';
import { BatchQueueModal } from './components/BatchQueueModal';
import { BatchFilmstrip } from './components/BatchFilmstrip';
import { BarChart3, Sliders, Sparkles, History, Layers } from 'lucide-react';

const DEFAULT_SETTINGS: PipelineSettings = {
  autoOptimized: true,
  deblur: {
    amount: 35,
    radius: 1.4,
    iterations: 4,
    mode: 'focus',
    angle: 0,
  },
  denoise: {
    amount: 25,
    luminanceStrength: 50,
    chrominanceStrength: 75,
    jpegDeblock: 30,
    preserveGrain: 65,
  },
  sharpen: {
    amount: 40,
    radius: 1.2,
    threshold: 3,
    antiHalo: 85,
    luminanceOnly: true,
  },
  detailRecovery: {
    microContrast: 35,
    textureSynthesis: 25,
    clarity: 20,
    shadowRecovery: 20,
    highlightProtection: 20,
  },
  faceRestore: {
    enabled: true,
    strength: 35,
    skinSmoothing: 25,
    eyeClarification: 40,
    preserveIdentity: 95,
  },
  colorContrast: {
    claheStrength: 25,
    autoExposure: 0,
    saturation: 0,
    temperature: 0,
  },
  upscale: {
    scale: 1,
    method: 'edge-directed',
    tileProcessing: true,
  },
  rasterPrint: {
    enabled: false,
    targetDpi: 300,
    paperProfile: 'standard',
    halftoneMode: 'none',
    dotGainCompensation: 25,
    printSharpenBoost: 40,
    blackPointBoost: 20,
    cmykGamutWarning: false,
  },
  safety: {
    preventOversharpen: true,
    preventWaxySkin: true,
    strictOriginalPreservation: true,
  },
};

export default function App() {
  // Core Image State
  const [originalImage, setOriginalImage] = useState<ImageData | null>(null);
  const [processedImage, setProcessedImage] = useState<ImageData | null>(null);
  const [imageFileName, setImageFileName] = useState<string>('imagem_fotografica.png');

  // Diagnostics & Pipeline State
  const [metrics, setMetrics] = useState<ImageAnalysisMetrics | null>(null);
  const [settings, setSettings] = useState<PipelineSettings>(DEFAULT_SETTINGS);
  const [activePreset, setActivePreset] = useState<PresetId>('auto');

  // History & Versioning State
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState<number>(-1);
  const [sidebarTab, setSidebarTab] = useState<'settings' | 'history'>('settings');

  // UI Views & Modals
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showSampleModal, setShowSampleModal] = useState<boolean>(false);
  const [showAiAdvisorModal, setShowAiAdvisorModal] = useState<boolean>(false);
  const [showAnalysisDrawer, setShowAnalysisDrawer] = useState<boolean>(true);
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);

  // Batch Queue State
  const [batchQueue, setBatchQueue] = useState<BatchQueueItem[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);

  // Hardware & Progress
  const [gpuCaps, setGpuCaps] = useState<GpuCapabilities | null>(null);
  const [progress, setProgress] = useState<ProcessingProgress>({
    stage: 'Pronto',
    stageIndex: 0,
    totalStages: 8,
    percent: 0,
    isProcessing: false,
  });

  const processDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastProcessedSettingsRef = useRef<string>('');
  const isRestoringHistoryRef = useRef<boolean>(false);

  // 1. Initial Hardware Acceleration Detection
  useEffect(() => {
    GpuManager.detectCapabilities().then(setGpuCaps);
  }, []);

  // 2. Load Initial Sample on first visit for immediate interactive experience
  useEffect(() => {
    const samples = SampleImageService.getSamples();
    if (samples.length > 0 && !originalImage) {
      loadSample(samples[0]);
    }
  }, []);

  // Helper to record history entry
  const recordHistoryCheckpoint = useCallback((
    resultImg: ImageData,
    appliedSettings: PipelineSettings,
    preset: PresetId,
    customLabel?: string,
    isBookmark: boolean = false
  ) => {
    const settingsSerialized = JSON.stringify(appliedSettings);
    if (!isBookmark && settingsSerialized === lastProcessedSettingsRef.current) {
      return;
    }
    lastProcessedSettingsRef.current = settingsSerialized;

    const thumbnail = HistoryHelper.createThumbnail(resultImg);
    const timeFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const summary = HistoryHelper.generateChangesSummary(appliedSettings);

    let label = customLabel;
    if (!label) {
      if (appliedSettings.autoOptimized) {
        label = 'Auto Repair Otimizado';
      } else if (preset && preset !== 'auto') {
        const presetNames: Record<PresetId, string> = {
          auto: 'Automático',
          photo: 'Preset Foto Geral',
          face: 'Preset Retrato / Rosto',
          blurred: 'Preset Desfocada',
          vintage: 'Preset Imagem Antiga',
          compressed: 'Preset Comprimida',
          lowres: 'Preset Baixa Resolução',
          document: 'Preset Documento',
          product: 'Preset Produto',
          print: 'Preset Impressão Gráfica 300DPI',
        };
        label = presetNames[preset] || `Modo ${preset}`;
      } else if (appliedSettings.upscale.scale > 1) {
        label = `Upscale ${appliedSettings.upscale.scale}x Super-Res`;
      } else {
        label = `Ajuste Manual (${summary[0] || 'Parâmetros'})`;
      }
    }

    const newEntry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now(),
      timeFormatted,
      label,
      preset,
      settings: JSON.parse(JSON.stringify(appliedSettings)),
      thumbnailUrl: thumbnail,
      isPinned: isBookmark,
      changesSummary: summary,
    };

    setHistory((prev) => {
      // If we were in the middle of history and made a new change, slice forward history
      const baseHistory = currentHistoryIndex >= 0 ? prev.slice(0, currentHistoryIndex + 1) : prev;
      const updated = [newEntry, ...baseHistory];
      // Keep up to 25 recent versions
      return updated.slice(0, 25);
    });

    setCurrentHistoryIndex(0);
  }, [currentHistoryIndex]);

  // 3. Image Processing Orchestrator
  const triggerProcessing = useCallback((
    srcImg: ImageData, 
    currentSettings: PipelineSettings,
    preset: PresetId = activePreset,
    overrideLabel?: string
  ) => {
    if (processDebounceTimer.current) {
      clearTimeout(processDebounceTimer.current);
    }

    processDebounceTimer.current = setTimeout(async () => {
      try {
        const result = await ProcessingPipeline.execute(srcImg, currentSettings, (prog) => {
          setProgress(prog);
        });
        setProcessedImage(result);

        // Record history snapshot unless we are actively navigating/restoring an existing history version
        if (!isRestoringHistoryRef.current) {
          recordHistoryCheckpoint(result, currentSettings, preset, overrideLabel);
        }
        isRestoringHistoryRef.current = false;
      } catch (err: any) {
        console.warn('Processing pipeline status:', err.message);
      }
    }, 120);
  }, [activePreset, recordHistoryCheckpoint]);

  // Re-process when settings change
  const handleSettingsChange = (newSettings: PipelineSettings, customLabel?: string) => {
    setSettings(newSettings);
    if (originalImage) {
      triggerProcessing(originalImage, newSettings, activePreset, customLabel);
    }
  };

  // 4. Load Image from ImageData (analyzes & sets auto configuration)
  const handleLoadImageData = (imgData: ImageData, fileName: string = 'fotografia.png') => {
    setOriginalImage(imgData);
    setImageFileName(fileName);
    lastProcessedSettingsRef.current = '';

    // Run deep statistical analysis
    const diagMetrics = ImageAnalyzer.analyze(imgData);
    setMetrics(diagMetrics);

    // Calculate auto repair parameters
    const autoRecipe = ImageAnalyzer.calculateAutoSettings(diagMetrics);
    setSettings(autoRecipe);
    const recPreset = diagMetrics.recommendedPreset || 'auto';
    setActivePreset(recPreset);

    // Create Initial "Original" history baseline
    const initialThumb = HistoryHelper.createThumbnail(imgData);
    const initialEntry: HistoryEntry = {
      id: `initial-${Date.now()}`,
      timestamp: Date.now(),
      timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      label: 'Imagem Original (Importada)',
      preset: 'auto',
      settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
      thumbnailUrl: initialThumb,
      changesSummary: ['Estado Original não modificado'],
    };
    setHistory([initialEntry]);
    setCurrentHistoryIndex(0);

    // Trigger initial pipeline
    triggerProcessing(imgData, autoRecipe, recPreset, 'Auto Repair Inicial');
  };

  // 5. Load Image(s) from File(s) - Supports Single or Multiple Batch Files
  const handleFileDrop = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    if (fileList.length > 1) {
      // Multiple files dragged / selected
      const newItems: BatchQueueItem[] = fileList.map((f) =>
        BatchProcessorService.createQueueItem(f, activePreset)
      );

      setBatchQueue((prev) => {
        const existingNames = new Set(prev.map((p) => p.name));
        const filtered = newItems.filter((item) => !existingNames.has(item.name));
        return [...prev, ...filtered];
      });

      // Automatically open the batch manager modal so the user can review and trigger
      setShowBatchModal(true);

      // Also load the first image directly into the main workspace for immediate preview
      try {
        const firstFile = fileList[0];
        const loaded = await BatchProcessorService.fileToImageData(firstFile);
        handleLoadImageData(loaded.imageData, firstFile.name);
      } catch (e) {
        console.error('Error loading first batch image:', e);
      }
    } else {
      // Single file loaded
      try {
        const singleFile = fileList[0];
        const loaded = await BatchProcessorService.fileToImageData(singleFile);
        handleLoadImageData(loaded.imageData, singleFile.name);

        // Also add to batch queue
        const queueItem: BatchQueueItem = {
          id: `batch-${Date.now()}`,
          file: singleFile,
          name: singleFile.name,
          sizeFormatted: BatchProcessorService.formatFileSize(singleFile.size),
          originalImage: loaded.imageData,
          processedImage: null,
          status: 'idle',
          progress: 0,
          stage: 'Carregada',
          thumbnailUrl: loaded.thumbnailUrl,
          originalDimensions: { width: loaded.width, height: loaded.height },
          appliedPreset: activePreset,
        };

        setBatchQueue((prev) => {
          const exists = prev.some((p) => p.name === singleFile.name);
          return exists ? prev : [queueItem, ...prev];
        });
      } catch (err: any) {
        console.error('Error reading file:', err);
      }
    }
  };

  // Add more files to queue explicitly
  const handleAddFilesToQueue = (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    const newItems: BatchQueueItem[] = fileList.map((f) =>
      BatchProcessorService.createQueueItem(f, activePreset)
    );

    setBatchQueue((prev) => {
      const existingNames = new Set(prev.map((p) => p.name));
      const filtered = newItems.filter((item) => !existingNames.has(item.name));
      return [...prev, ...filtered];
    });
  };

  // Select a batch queue item to inspect in the main workspace viewer
  const handleSelectBatchItem = (item: BatchQueueItem) => {
    if (item.originalImage) {
      setOriginalImage(item.originalImage);
      setImageFileName(item.name);

      const diagMetrics = ImageAnalyzer.analyze(item.originalImage);
      setMetrics(diagMetrics);

      if (item.processedImage) {
        setProcessedImage(item.processedImage);
        if (item.customSettings) {
          setSettings(item.customSettings);
        }
      } else {
        const autoRecipe = ImageAnalyzer.calculateAutoSettings(diagMetrics);
        setSettings(autoRecipe);
        triggerProcessing(item.originalImage, autoRecipe, item.appliedPreset);
      }
    }
  };

  // Quick process batch queue from filmstrip
  const handleStartBatchFromFilmstrip = async () => {
    if (isBatchProcessing) return;
    setIsBatchProcessing(true);

    const batchSettings: BatchSettings = {
      targetPreset: activePreset,
      useCurrentSettings: true,
      autoStart: true,
      exportFormat: 'image/png',
      exportQuality: 95,
      downloadAsZip: true,
    };

    for (let i = 0; i < batchQueue.length; i++) {
      const item = batchQueue[i];
      if (item.status === 'completed') continue;

      setBatchQueue((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? { ...it, status: 'processing', progress: 0, stage: 'Processando...' }
            : it
        )
      );

      try {
        const processed = await BatchProcessorService.processItem(
          item,
          batchSettings,
          settings,
          (percent, stage) => {
            setBatchQueue((prev) =>
              prev.map((it) =>
                it.id === item.id ? { ...it, progress: percent, stage } : it
              )
            );
          }
        );

        setBatchQueue((prev) =>
          prev.map((it) => (it.id === item.id ? processed : it))
        );

        // If this is the current active image, update the viewer live!
        if (item.name === imageFileName && processed.processedImage) {
          setProcessedImage(processed.processedImage);
        }
      } catch (err: any) {
        setBatchQueue((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? { ...it, status: 'error', error: err.message || 'Falha' }
              : it
          )
        );
      }
    }

    setIsBatchProcessing(false);
  };

  // 6. Load Sample Image
  const loadSample = (sample: SampleImageMeta) => {
    const imgData = sample.generate();
    handleLoadImageData(imgData, `${sample.id}.png`);
  };

  // 7. Preset Selection Handler
  const handleSelectPreset = (preset: PresetId) => {
    setActivePreset(preset);
    if (!metrics) return;

    let newSettings: PipelineSettings;

    switch (preset) {
      case 'auto':
        newSettings = ImageAnalyzer.calculateAutoSettings(metrics);
        break;

      case 'photo':
        newSettings = {
          ...settings,
          autoOptimized: true,
          deblur: { amount: 25, radius: 1.2, iterations: 3, mode: 'focus', angle: 0 },
          denoise: { amount: 20, luminanceStrength: 40, chrominanceStrength: 60, jpegDeblock: 20, preserveGrain: 75 },
          sharpen: { amount: 35, radius: 1.0, threshold: 2, antiHalo: 85, luminanceOnly: true },
          detailRecovery: { microContrast: 35, textureSynthesis: 20, clarity: 15, shadowRecovery: 15, highlightProtection: 15 },
          faceRestore: { enabled: metrics.faceDetected, strength: 30, skinSmoothing: 20, eyeClarification: 35, preserveIdentity: 95 },
          upscale: { scale: 1, method: 'edge-directed', tileProcessing: true },
        };
        break;

      case 'face':
        newSettings = {
          ...settings,
          autoOptimized: true,
          deblur: { amount: 20, radius: 1.0, iterations: 3, mode: 'focus', angle: 0 },
          denoise: { amount: 25, luminanceStrength: 35, chrominanceStrength: 70, jpegDeblock: 30, preserveGrain: 65 },
          sharpen: { amount: 30, radius: 1.0, threshold: 3, antiHalo: 90, luminanceOnly: true },
          detailRecovery: { microContrast: 25, textureSynthesis: 20, clarity: 15, shadowRecovery: 20, highlightProtection: 20 },
          faceRestore: { enabled: true, strength: 60, skinSmoothing: 45, eyeClarification: 55, preserveIdentity: 95 },
          upscale: { scale: 1, method: 'edge-directed', tileProcessing: true },
        };
        break;

      case 'blurred':
        newSettings = {
          ...settings,
          autoOptimized: true,
          deblur: { amount: 75, radius: 2.2, iterations: 7, mode: 'focus', angle: 0 },
          denoise: { amount: 20, luminanceStrength: 30, chrominanceStrength: 50, jpegDeblock: 20, preserveGrain: 60 },
          sharpen: { amount: 65, radius: 1.4, threshold: 2, antiHalo: 85, luminanceOnly: true },
          detailRecovery: { microContrast: 60, textureSynthesis: 45, clarity: 30, shadowRecovery: 15, highlightProtection: 15 },
          faceRestore: { enabled: metrics.faceDetected, strength: 40, skinSmoothing: 25, eyeClarification: 50, preserveIdentity: 95 },
          upscale: { scale: 1, method: 'edge-directed', tileProcessing: true },
        };
        break;

      case 'vintage':
        newSettings = {
          ...settings,
          autoOptimized: true,
          deblur: { amount: 35, radius: 1.4, iterations: 4, mode: 'focus', angle: 0 },
          denoise: { amount: 60, luminanceStrength: 65, chrominanceStrength: 85, jpegDeblock: 50, preserveGrain: 45 },
          sharpen: { amount: 45, radius: 1.2, threshold: 5, antiHalo: 80, luminanceOnly: true },
          detailRecovery: { microContrast: 45, textureSynthesis: 35, clarity: 35, shadowRecovery: 35, highlightProtection: 25 },
          faceRestore: { enabled: metrics.faceDetected, strength: 50, skinSmoothing: 35, eyeClarification: 45, preserveIdentity: 95 },
          upscale: { scale: 1, method: 'edge-directed', tileProcessing: true },
        };
        break;

      case 'compressed':
        newSettings = {
          ...settings,
          autoOptimized: true,
          deblur: { amount: 30, radius: 1.2, iterations: 3, mode: 'focus', angle: 0 },
          denoise: { amount: 55, luminanceStrength: 60, chrominanceStrength: 90, jpegDeblock: 85, preserveGrain: 50 },
          sharpen: { amount: 35, radius: 1.0, threshold: 4, antiHalo: 85, luminanceOnly: true },
          detailRecovery: { microContrast: 35, textureSynthesis: 30, clarity: 20, shadowRecovery: 15, highlightProtection: 15 },
          faceRestore: { enabled: metrics.faceDetected, strength: 35, skinSmoothing: 30, eyeClarification: 40, preserveIdentity: 95 },
          upscale: { scale: 1, method: 'edge-directed', tileProcessing: true },
        };
        break;

      case 'lowres':
        newSettings = {
          ...settings,
          autoOptimized: true,
          deblur: { amount: 35, radius: 1.2, iterations: 4, mode: 'focus', angle: 0 },
          denoise: { amount: 25, luminanceStrength: 45, chrominanceStrength: 65, jpegDeblock: 40, preserveGrain: 65 },
          sharpen: { amount: 45, radius: 1.1, threshold: 2, antiHalo: 85, luminanceOnly: true },
          detailRecovery: { microContrast: 45, textureSynthesis: 40, clarity: 25, shadowRecovery: 15, highlightProtection: 15 },
          faceRestore: { enabled: metrics.faceDetected, strength: 40, skinSmoothing: 25, eyeClarification: 45, preserveIdentity: 95 },
          upscale: { scale: 2, method: 'edge-directed', tileProcessing: true },
        };
        break;

      case 'document':
        newSettings = {
          ...settings,
          autoOptimized: true,
          deblur: { amount: 65, radius: 2.0, iterations: 6, mode: 'motion', angle: 0 },
          denoise: { amount: 30, luminanceStrength: 50, chrominanceStrength: 90, jpegDeblock: 40, preserveGrain: 20 },
          sharpen: { amount: 75, radius: 1.5, threshold: 1, antiHalo: 70, luminanceOnly: true },
          detailRecovery: { microContrast: 70, textureSynthesis: 10, clarity: 50, shadowRecovery: 40, highlightProtection: 40 },
          faceRestore: { enabled: false, strength: 0, skinSmoothing: 0, eyeClarification: 0, preserveIdentity: 95 },
          upscale: { scale: 2, method: 'edge-directed', tileProcessing: true },
        };
        break;

      case 'product':
        newSettings = {
          ...settings,
          autoOptimized: true,
          deblur: { amount: 40, radius: 1.4, iterations: 4, mode: 'focus', angle: 0 },
          denoise: { amount: 20, luminanceStrength: 40, chrominanceStrength: 50, jpegDeblock: 20, preserveGrain: 80 },
          sharpen: { amount: 55, radius: 1.2, threshold: 2, antiHalo: 90, luminanceOnly: true },
          detailRecovery: { microContrast: 65, textureSynthesis: 45, clarity: 30, shadowRecovery: 20, highlightProtection: 20 },
          faceRestore: { enabled: false, strength: 0, skinSmoothing: 0, eyeClarification: 0, preserveIdentity: 95 },
          upscale: { scale: 1, method: 'edge-directed', tileProcessing: true },
        };
        break;

      case 'print':
        newSettings = {
          ...settings,
          autoOptimized: true,
          deblur: { amount: 35, radius: 1.2, iterations: 4, mode: 'focus', angle: 0 },
          denoise: { amount: 20, luminanceStrength: 35, chrominanceStrength: 50, jpegDeblock: 30, preserveGrain: 80 },
          sharpen: { amount: 60, radius: 1.3, threshold: 2, antiHalo: 85, luminanceOnly: true },
          detailRecovery: { microContrast: 60, textureSynthesis: 45, clarity: 35, shadowRecovery: 25, highlightProtection: 25 },
          faceRestore: { enabled: metrics.faceDetected, strength: 35, skinSmoothing: 25, eyeClarification: 40, preserveIdentity: 95 },
          upscale: { scale: metrics.width < 2000 ? 2 : 1, method: 'edge-directed', tileProcessing: true },
          rasterPrint: {
            enabled: true,
            targetDpi: 300,
            paperProfile: 'coated-glossy',
            halftoneMode: 'none',
            dotGainCompensation: 35,
            printSharpenBoost: 60,
            blackPointBoost: 40,
            cmykGamutWarning: false,
          },
        };
        break;

      default:
        newSettings = DEFAULT_SETTINGS;
    }

    handleSettingsChange(newSettings, `Preset: ${preset.toUpperCase()}`);
  };

  // 8. Auto Optimize Trigger
  const handleAutoOptimize = () => {
    if (!metrics) return;
    const autoSettings = ImageAnalyzer.calculateAutoSettings(metrics);
    setActivePreset(metrics.recommendedPreset || 'auto');
    handleSettingsChange(autoSettings, 'Auto Repair Inteligente');
  };

  // 9. Reset Trigger
  const handleReset = () => {
    if (originalImage) {
      setSettings(DEFAULT_SETTINGS);
      setActivePreset('auto');
      triggerProcessing(originalImage, DEFAULT_SETTINGS, 'auto', 'Valores Padrão Restaurados');
    }
  };

  // 10. History Actions: Select / Restore Version
  const handleSelectHistoryVersion = (entry: HistoryEntry) => {
    const idx = history.findIndex((h) => h.id === entry.id);
    if (idx !== -1) {
      setCurrentHistoryIndex(idx);
    }
    isRestoringHistoryRef.current = true;
    setSettings(entry.settings);
    setActivePreset(entry.preset);

    if (originalImage) {
      triggerProcessing(originalImage, entry.settings, entry.preset);
    }
  };

  // 11. Undo / Redo
  const canUndo = currentHistoryIndex < history.length - 1 && history.length > 1;
  const canRedo = currentHistoryIndex > 0;

  const handleUndo = useCallback(() => {
    if (canUndo) {
      const nextIndex = currentHistoryIndex + 1;
      const targetEntry = history[nextIndex];
      if (targetEntry) {
        handleSelectHistoryVersion(targetEntry);
      }
    }
  }, [canUndo, currentHistoryIndex, history]);

  const handleRedo = useCallback(() => {
    if (canRedo) {
      const prevIndex = currentHistoryIndex - 1;
      const targetEntry = history[prevIndex];
      if (targetEntry) {
        handleSelectHistoryVersion(targetEntry);
      }
    }
  }, [canRedo, currentHistoryIndex, history]);

  // 12. Save Bookmark / Custom Named Snapshot
  const handleSaveBookmark = (customName: string) => {
    if (processedImage) {
      recordHistoryCheckpoint(processedImage, settings, activePreset, customName, true);
    }
  };

  // 13. Delete History Entry
  const handleDeleteHistoryEntry = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  // 14. Clear History
  const handleClearHistory = () => {
    if (history.length > 0) {
      const current = history[currentHistoryIndex] || history[0];
      const initial = history[history.length - 1];
      if (current.id === initial.id) {
        setHistory([current]);
      } else {
        setHistory([current, initial]);
      }
      setCurrentHistoryIndex(0);
    }
  };

  // 15. Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+H)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setSidebarTab((prev) => (prev === 'history' ? 'settings' : 'history'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const currentHistoryId = history[currentHistoryIndex]?.id || null;

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* Hidden File Input (supports multiple file selection) */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files && handleFileDrop(e.target.files)}
      />

      {/* Top Studio Header */}
      <Header
        onOpenFile={() => fileInputRef.current?.click()}
        onExport={() => setShowExportModal(true)}
        onAutoOptimize={handleAutoOptimize}
        onReset={handleReset}
        onOpenAiAdvisor={() => setShowAiAdvisorModal(true)}
        onSelectSample={() => setShowSampleModal(true)}
        hasImage={!!originalImage}
        isProcessing={progress.isProcessing}
        gpuCaps={gpuCaps}
        autoOptimized={settings.autoOptimized}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        historyCount={history.length}
        activeSidebarTab={sidebarTab}
        onToggleHistory={() => setSidebarTab((prev) => (prev === 'history' ? 'settings' : 'history'))}
        onOpenBatchQueue={() => setShowBatchModal(true)}
        batchQueueCount={batchQueue.length}
        isBatchProcessing={isBatchProcessing}
      />

      {/* Main Workspace Area (Viewer + Sidebars) */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        {/* Left / Center Viewport */}
        <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-slate-950">
          <ImageViewer
            originalImage={originalImage}
            processedImage={processedImage}
            progress={progress}
            onCancelProcessing={() => ProcessingPipeline.cancel()}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onDropFiles={handleFileDrop}
            onOpenSampleModal={() => setShowSampleModal(true)}
          />

          {/* Bottom Batch Queue Filmstrip Strip */}
          {batchQueue.length > 0 && (
            <BatchFilmstrip
              queue={batchQueue}
              activeImageName={imageFileName}
              onOpenBatchModal={() => setShowBatchModal(true)}
              onSelectQueueItem={handleSelectBatchItem}
              onAddMoreFiles={() => fileInputRef.current?.click()}
              isProcessingBatch={isBatchProcessing}
              onStartBatchProcessing={handleStartBatchFromFilmstrip}
              onClearQueue={() => setBatchQueue([])}
            />
          )}

          {/* Toggleable Left Diagnostics Overlay / Drawer */}
          {originalImage && metrics && (
            <div className="absolute top-4 left-4 z-30 max-w-sm w-full">
              {showAnalysisDrawer ? (
                <div className="relative shadow-2xl animate-in fade-in slide-in-from-left duration-200">
                  <AnalysisPanel
                    metrics={metrics}
                    onApplyAutoSettings={handleAutoOptimize}
                    isAutoApplied={settings.autoOptimized}
                  />
                  <button
                    onClick={() => setShowAnalysisDrawer(false)}
                    className="absolute top-2.5 right-2.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    Ocultar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAnalysisDrawer(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700 shadow-xl backdrop-blur-md text-xs font-semibold cursor-pointer"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Ver Diagnóstico Óptico</span>
                </button>
              )}
            </div>
          )}
        </main>

        {/* Right Restoration Controls & History Sidebar */}
        <ControlsSidebar
          settings={settings}
          onChange={handleSettingsChange}
          activePreset={activePreset}
          onSelectPreset={handleSelectPreset}
          onAutoCalculate={handleAutoOptimize}
          isProcessing={progress.isProcessing}
          history={history}
          currentHistoryId={currentHistoryId}
          onSelectHistoryVersion={handleSelectHistoryVersion}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          onSaveBookmark={handleSaveBookmark}
          onDeleteHistoryEntry={handleDeleteHistoryEntry}
          onClearHistory={handleClearHistory}
          onRevertToOriginal={handleReset}
          activeTab={sidebarTab}
          onTabChange={setSidebarTab}
        />
      </div>

      {/* Modals */}
      <BatchQueueModal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        queue={batchQueue}
        setQueue={setBatchQueue}
        currentSettings={settings}
        activePreset={activePreset}
        onSelectImageForViewer={(item) => {
          handleSelectBatchItem(item);
          setShowBatchModal(false);
        }}
        onAddFilesToQueue={handleAddFilesToQueue}
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        processedImage={processedImage || originalImage}
        defaultFilename={imageFileName}
      />

      <SampleModal
        isOpen={showSampleModal}
        onClose={() => setShowSampleModal(false)}
        onSelectSample={loadSample}
      />

      <AiAdvisorModal
        isOpen={showAiAdvisorModal}
        onClose={() => setShowAiAdvisorModal(false)}
        originalImage={originalImage}
        onApplyAiRecipe={(recipe) => {
          const merged = { ...settings, ...recipe };
          setSettings(merged);
          if (originalImage) {
            triggerProcessing(originalImage, merged, activePreset, 'Receita IA Gemini');
          }
        }}
      />
    </div>
  );
}
