export type PresetId =
  | 'auto'
  | 'photo'
  | 'face'
  | 'vintage'
  | 'blurred'
  | 'compressed'
  | 'lowres'
  | 'document'
  | 'product'
  | 'print';

export interface ImageAnalysisMetrics {
  width: number;
  height: number;
  megapixels: number;
  blurScore: number; // 0 (crisp) to 100 (heavily blurred)
  focusMetric: number; // Laplacian variance / sharpness metric
  noiseLevel: number; // 0 to 100 estimated noise
  compressionArtifacts: number; // 0 to 100 JPEG 8x8 blockiness
  contrastScore: number; // 0 to 100 dynamic range
  exposureScore: number; // -50 (underexposed) to +50 (overexposed)
  lostDetailsScore: number; // 0 to 100 micro-detail deficit
  faceDetected: boolean;
  faceCount: number;
  faceRegions?: Array<{ x: number; y: number; width: number; height: number }>;
  resolutionCategory: 'low' | 'medium' | 'high' | 'ultra';
  histogram: {
    r: number[];
    g: number[];
    b: number[];
    luma: number[];
  };
  dominantIssues: string[];
  recommendedPreset: PresetId;
  printMetrics?: {
    maxPrintCm300Dpi: { width: number; height: number };
    maxPrintCm150Dpi: { width: number; height: number };
    suitableFormats: string[];
    recommendedUpscaleForA4: 1 | 2 | 4;
    dpiAtA4: number;
    cmykCoverageEstimate: { c: number; m: number; y: number; k: number; totalInk: number };
  };
}

export interface RasterPrintSettings {
  enabled: boolean;
  targetDpi: 150 | 300 | 600;
  paperProfile: 'standard' | 'coated-glossy' | 'matte' | 'uncoated-offset' | 'newsprint' | 'canvas';
  halftoneMode: 'none' | 'cmyk-simulation' | 'dot-halftone' | 'dither-floyd' | 'bayer-matrix';
  dotGainCompensation: number; // 0 - 100 (compensates for ink absorption)
  printSharpenBoost: number; // 0 - 100 (high-frequency edge compensation for physical ink)
  blackPointBoost: number; // 0 - 100 (rich blacks / deep K channel)
  cmykGamutWarning: boolean; // highlights out-of-gamut RGB colors
}

export interface PipelineSettings {
  // Master switch / auto mode
  autoOptimized: boolean;
  
  // Deblur & Focus
  deblur: {
    amount: number; // 0 - 100
    radius: number; // 1 - 5 px
    iterations: number; // 1 - 15 (Richardson-Lucy style)
    mode: 'focus' | 'motion' | 'gaussian';
    angle: number; // 0 - 180 deg (for motion blur)
  };

  // Denoise & JPEG cleanup
  denoise: {
    amount: number; // 0 - 100
    luminanceStrength: number; // 0 - 100
    chrominanceStrength: number; // 0 - 100
    jpegDeblock: number; // 0 - 100
    preserveGrain: number; // 0 - 100 (keeps organic texture)
  };

  // Sharpen & Definition
  sharpen: {
    amount: number; // 0 - 100
    radius: number; // 0.5 - 4.0
    threshold: number; // 0 - 30 (edge threshold)
    antiHalo: number; // 0 - 100 (halo suppression)
    luminanceOnly: boolean;
  };

  // Detail & Micro-contrast
  detailRecovery: {
    microContrast: number; // 0 - 100
    textureSynthesis: number; // 0 - 100
    clarity: number; // 0 - 100
    shadowRecovery: number; // 0 - 100
    highlightProtection: number; // 0 - 100
  };

  // Face Restoration (Anti-Deformation, Natural)
  faceRestore: {
    enabled: boolean;
    strength: number; // 0 - 100
    skinSmoothing: number; // 0 - 100 (pore-preserving)
    eyeClarification: number; // 0 - 100
    preserveIdentity: number; // 0 - 100 (enforces zero hallucination)
  };

  // Color & Contrast (CLAHE)
  colorContrast: {
    claheStrength: number; // 0 - 100
    autoExposure: number; // 0 - 100
    saturation: number; // -50 to +50
    temperature: number; // -50 to +50
  };

  // Upscale
  upscale: {
    scale: 1 | 2 | 4;
    method: 'edge-directed' | 'lanczos3' | 'neural-patch';
    tileProcessing: boolean;
  };

  // Rasterization & Print Optimization Engine
  rasterPrint: RasterPrintSettings;

  // Safety & Artifact guard
  safety: {
    preventOversharpen: boolean;
    preventWaxySkin: boolean;
    strictOriginalPreservation: boolean;
  };
}

export type ViewMode = 'split' | 'side-by-side' | 'processed' | 'original' | 'diff';

export interface GpuCapabilities {
  webgl2: boolean;
  webgpu: boolean;
  rendererName: string;
  vendorName: string;
  tier: 'NVIDIA/AMD Discrete' | 'Intel/Apple Integrated' | 'CPU Software Fallback';
  maxTextureSize: number;
  threadsAvailable: number;
}

export interface ProcessingProgress {
  stage: string;
  stageIndex: number;
  totalStages: number;
  percent: number;
  isProcessing: boolean;
  startTime?: number;
  elapsedMs?: number;
}

export interface ExportConfig {
  format: 'image/png' | 'image/jpeg' | 'image/webp';
  quality: number; // 1 - 100
  scale: 1 | 2 | 4;
  customWidth?: number;
  customHeight?: number;
  filename: string;
  preserveMetadata: boolean;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  timeFormatted: string;
  label: string;
  description?: string;
  preset: PresetId;
  settings: PipelineSettings;
  thumbnailUrl?: string;
  imageData?: ImageData;
  isPinned?: boolean;
  changesSummary: string[];
}

export interface BatchQueueItem {
  id: string;
  file?: File;
  name: string;
  sizeFormatted: string;
  originalImage: ImageData | null;
  processedImage: ImageData | null;
  status: 'idle' | 'queued' | 'processing' | 'completed' | 'error';
  progress: number; // 0 - 100
  stage: string;
  thumbnailUrl?: string;
  processedThumbnailUrl?: string;
  originalDimensions?: { width: number; height: number };
  processedDimensions?: { width: number; height: number };
  appliedPreset: PresetId;
  customSettings?: PipelineSettings;
  processingTimeMs?: number;
  error?: string;
}

export interface BatchSettings {
  targetPreset: PresetId;
  useCurrentSettings: boolean;
  autoStart: boolean;
  exportFormat: 'image/png' | 'image/jpeg' | 'image/webp';
  exportQuality: number;
  downloadAsZip: boolean;
}

