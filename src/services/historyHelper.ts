import { PipelineSettings, PresetId } from '../types';

export class HistoryHelper {
  /**
   * Generates a compressed base64 thumbnail string from ImageData for visual history cards
   */
  public static createThumbnail(imgData: ImageData, maxDim: number = 100): string {
    try {
      const scale = Math.min(maxDim / imgData.width, maxDim / imgData.height, 1);
      const thumbW = Math.max(1, Math.round(imgData.width * scale));
      const thumbH = Math.max(1, Math.round(imgData.height * scale));

      // Source canvas
      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = imgData.width;
      srcCanvas.height = imgData.height;
      const srcCtx = srcCanvas.getContext('2d');
      if (!srcCtx) return '';
      srcCtx.putImageData(imgData, 0, 0);

      // Target scaled thumbnail canvas
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = thumbW;
      thumbCanvas.height = thumbH;
      const thumbCtx = thumbCanvas.getContext('2d');
      if (!thumbCtx) return '';

      thumbCtx.imageSmoothingEnabled = true;
      thumbCtx.imageSmoothingQuality = 'medium';
      thumbCtx.drawImage(srcCanvas, 0, 0, thumbW, thumbH);

      return thumbCanvas.toDataURL('image/jpeg', 0.7);
    } catch {
      return '';
    }
  }

  /**
   * Produces concise, human-readable summary badges of what is configured in this version
   */
  public static generateChangesSummary(settings: PipelineSettings): string[] {
    const summary: string[] = [];

    if (settings.deblur.amount > 0) {
      summary.push(`Deblur ${settings.deblur.amount}% (${settings.deblur.mode})`);
    }

    if (settings.sharpen.amount > 0) {
      summary.push(`Nitidez ${settings.sharpen.amount}% (USM)`);
    }

    if (settings.denoise.amount > 0) {
      summary.push(`Denoise ${settings.denoise.amount}%`);
    }

    if (settings.denoise.jpegDeblock > 0) {
      summary.push(`Anti-JPEG ${settings.denoise.jpegDeblock}%`);
    }

    if (settings.detailRecovery.microContrast > 0) {
      summary.push(`Micro-Contraste ${settings.detailRecovery.microContrast}%`);
    }

    if (settings.faceRestore.enabled && settings.faceRestore.strength > 0) {
      summary.push(`Rosto ${settings.faceRestore.strength}%`);
    }

    if (settings.colorContrast.claheStrength > 0) {
      summary.push(`CLAHE ${settings.colorContrast.claheStrength}%`);
    }

    if (settings.upscale.scale > 1) {
      summary.push(`Upscale ${settings.upscale.scale}x`);
    }

    if (settings.rasterPrint && settings.rasterPrint.enabled) {
      summary.push(`Impressão ${settings.rasterPrint.targetDpi} DPI (${settings.rasterPrint.paperProfile})`);
    }

    if (summary.length === 0) {
      summary.push('Configurações Padrão');
    }

    return summary;
  }
}
