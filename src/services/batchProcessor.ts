import JSZip from 'jszip';
import { BatchQueueItem, BatchSettings, PipelineSettings, PresetId } from '../types';
import { ProcessingPipeline } from './processingPipeline';
import { ImageAnalyzer } from './imageAnalyzer';
import { HistoryHelper } from './historyHelper';

export class BatchProcessorService {
  private static isCancelled = false;

  public static cancel() {
    this.isCancelled = true;
    ProcessingPipeline.cancel();
  }

  /**
   * Converts a user File into an ImageData object with dimension metadata
   */
  public static async fileToImageData(file: File): Promise<{
    imageData: ImageData;
    thumbnailUrl: string;
    width: number;
    height: number;
  }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Formato de imagem inválido'));
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Contexto 2D indisponível'));
              return;
            }
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, img.width, img.height);
            const thumbnailUrl = HistoryHelper.createThumbnail(imageData, 120);
            resolve({
              imageData,
              thumbnailUrl,
              width: img.width,
              height: img.height,
            });
          } catch (err: any) {
            reject(err);
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Formats file size in bytes to KB / MB
   */
  public static formatFileSize(bytes?: number): string {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * Creates initial BatchQueueItem from a File
   */
  public static createQueueItem(file: File, defaultPreset: PresetId = 'auto'): BatchQueueItem {
    return {
      id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      file,
      name: file.name,
      sizeFormatted: this.formatFileSize(file.size),
      originalImage: null,
      processedImage: null,
      status: 'idle',
      progress: 0,
      stage: 'Aguardando',
      appliedPreset: defaultPreset,
    };
  }

  /**
   * Processes a single item in the queue with given or auto-calculated settings
   */
  public static async processItem(
    item: BatchQueueItem,
    batchSettings: BatchSettings,
    currentGlobalSettings: PipelineSettings,
    onProgress?: (progressPercent: number, stage: string) => void
  ): Promise<BatchQueueItem> {
    const startTime = performance.now();
    let srcImg = item.originalImage;

    // Load image data from File if not loaded already
    if (!srcImg && item.file) {
      onProgress?.(5, 'Carregando pixels...');
      const loaded = await this.fileToImageData(item.file);
      srcImg = loaded.imageData;
      item.originalImage = loaded.imageData;
      item.thumbnailUrl = loaded.thumbnailUrl;
      item.originalDimensions = { width: loaded.width, height: loaded.height };
    }

    if (!srcImg) {
      throw new Error('Imagem fonte vazia');
    }

    // Determine settings to apply
    let pipelineSettingsToApply: PipelineSettings;

    if (batchSettings.useCurrentSettings && currentGlobalSettings) {
      pipelineSettingsToApply = JSON.parse(JSON.stringify(currentGlobalSettings));
    } else {
      const diagMetrics = ImageAnalyzer.analyze(srcImg);
      if (item.appliedPreset === 'auto') {
        pipelineSettingsToApply = ImageAnalyzer.calculateAutoSettings(diagMetrics);
      } else {
        // Base preset settings
        pipelineSettingsToApply = ImageAnalyzer.calculateAutoSettings(diagMetrics);
        // Preset customizations
        if (item.appliedPreset === 'print') {
          pipelineSettingsToApply.rasterPrint = {
            enabled: true,
            targetDpi: 300,
            paperProfile: 'coated-glossy',
            halftoneMode: 'none',
            dotGainCompensation: 35,
            printSharpenBoost: 60,
            blackPointBoost: 40,
            cmykGamutWarning: false,
          };
          pipelineSettingsToApply.sharpen.amount = 60;
        } else if (item.appliedPreset === 'face') {
          pipelineSettingsToApply.faceRestore.enabled = true;
          pipelineSettingsToApply.faceRestore.strength = 60;
        } else if (item.appliedPreset === 'blurred') {
          pipelineSettingsToApply.deblur.amount = 65;
          pipelineSettingsToApply.deblur.iterations = 5;
        } else if (item.appliedPreset === 'vintage') {
          pipelineSettingsToApply.denoise.amount = 50;
          pipelineSettingsToApply.detailRecovery.microContrast = 45;
        }
      }
    }

    // Execute pipeline
    const processedImg = await ProcessingPipeline.execute(srcImg, pipelineSettingsToApply, (p) => {
      onProgress?.(p.percent, p.stage);
    });

    const elapsed = Math.round(performance.now() - startTime);
    const processedThumbnail = HistoryHelper.createThumbnail(processedImg, 120);

    return {
      ...item,
      originalImage: srcImg,
      processedImage: processedImg,
      status: 'completed',
      progress: 100,
      stage: 'Concluído',
      processedThumbnailUrl: processedThumbnail,
      processedDimensions: { width: processedImg.width, height: processedImg.height },
      processingTimeMs: elapsed,
      customSettings: pipelineSettingsToApply,
    };
  }

  /**
   * Exports an ImageData to a data URL
   */
  public static imageDataToBlob(
    imgData: ImageData,
    format: 'image/png' | 'image/jpeg' | 'image/webp' = 'image/png',
    quality: number = 95
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = imgData.width;
      canvas.height = imgData.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context failure'));
        return;
      }
      ctx.putImageData(imgData, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Falha ao gerar blob de imagem'));
        },
        format,
        quality / 100
      );
    });
  }

  /**
   * Bundles all completed queue items into a single .ZIP archive
   */
  public static async exportBatchToZip(
    items: BatchQueueItem[],
    batchSettings: BatchSettings,
    onZipProgress?: (percent: number) => void
  ): Promise<Blob> {
    const zip = new JSZip();
    const completedItems = items.filter((it) => it.status === 'completed' && it.processedImage);

    if (completedItems.length === 0) {
      throw new Error('Nenhuma imagem processada na fila para exportar');
    }

    const folder = zip.folder('magic_bolota_otimizadas') || zip;
    const format = batchSettings.exportFormat || 'image/png';
    const ext = format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png';

    for (let i = 0; i < completedItems.length; i++) {
      const item = completedItems[i];
      if (!item.processedImage) continue;

      const blob = await this.imageDataToBlob(item.processedImage, format, batchSettings.exportQuality);
      const cleanName = item.name.replace(/\.[^/.]+$/, '');
      const filename = `${cleanName}_magic_hd_${item.appliedPreset}.${ext}`;
      folder.file(filename, blob);

      onZipProgress?.(Math.round(((i + 1) / completedItems.length) * 50));
    }

    // Generate zip blob with compression
    const zipBlob = await zip.generateAsync(
      {
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      },
      (metadata) => {
        onZipProgress?.(50 + Math.round(metadata.percent / 2));
      }
    );

    return zipBlob;
  }
}
