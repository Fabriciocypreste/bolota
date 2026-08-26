import { jsPDF } from 'jspdf';
import { RasterPrintSettings } from '../types';

export interface PrintDimensionsInfo {
  widthCm: number;
  heightCm: number;
  widthMm: number;
  heightMm: number;
  widthInches: number;
  heightInches: number;
  dpi: number;
  megapixels: number;
  qualityRating: 'Ótima (300+ DPI)' | 'Boa (200-300 DPI)' | 'Aceitável (150-200 DPI)' | 'Baixa (<150 DPI)';
  maxQualityPaperFormat: string;
}

export interface PrintExportOptions {
  paperSize: 'a4' | 'a3' | 'a5' | '10x15' | '15x21' | '20x30' | '30x40' | '50x70' | 'letter' | 'custom';
  customWidthMm?: number;
  customHeightMm?: number;
  dpi: 150 | 300 | 600;
  orientation: 'portrait' | 'landscape' | 'auto';
  fitMode: 'fill' | 'fit' | 'original-scale';
  includeBleed: boolean;
  bleedMm: number;
  includeCropMarks: boolean;
  paperProfile: 'standard' | 'coated-glossy' | 'matte' | 'uncoated-offset' | 'canvas';
  exportType: 'pdf' | 'png' | 'jpeg';
  cmykSimulation: boolean;
  targetQuality: number;
  filename: string;
}

export const STANDARD_PAPER_SIZES: Record<string, { label: string; widthMm: number; heightMm: number; desc: string }> = {
  'a4': { label: 'A4 (210 × 297 mm)', widthMm: 210, heightMm: 297, desc: 'Padrão Escritório / Folheto' },
  'a3': { label: 'A3 (297 × 420 mm)', widthMm: 297, heightMm: 420, desc: 'Pôster Médio / Catálogo' },
  'a5': { label: 'A5 (148 × 210 mm)', widthMm: 148, heightMm: 210, desc: 'Livreto / Flyer' },
  '10x15': { label: '10 × 15 cm (4 × 6")', widthMm: 100, heightMm: 150, desc: 'Foto Tradicional' },
  '15x21': { label: '15 × 21 cm (6 × 8")', widthMm: 150, heightMm: 210, desc: 'Foto Álbum Grande' },
  '20x30': { label: '20 × 30 cm (8 × 12")', widthMm: 200, heightMm: 300, desc: 'Quadro Fotográfico' },
  '30x40': { label: '30 × 40 cm (12 × 16")', widthMm: 300, heightMm: 400, desc: 'Quadro / Pôster Decoração' },
  '50x70': { label: '50 × 70 cm (20 × 28")', widthMm: 500, heightMm: 700, desc: 'Pôster Grande' },
  'letter': { label: 'Carta / Letter (8.5 × 11")', widthMm: 215.9, heightMm: 279.4, desc: 'Padrão US Letter' },
};

export class RasterPrintEngine {
  /**
   * Calculates physical dimensions from pixel count and target DPI
   */
  public static calculatePrintDimensions(
    pixelWidth: number,
    pixelHeight: number,
    dpi: number = 300
  ): PrintDimensionsInfo {
    const widthInches = pixelWidth / dpi;
    const heightInches = pixelHeight / dpi;
    const widthCm = Number((widthInches * 2.54).toFixed(1));
    const heightCm = Number((heightInches * 2.54).toFixed(1));
    const widthMm = Math.round(widthInches * 25.4);
    const heightMm = Math.round(heightInches * 25.4);
    const megapixels = Number(((pixelWidth * pixelHeight) / 1_000_000).toFixed(2));

    let qualityRating: PrintDimensionsInfo['qualityRating'] = 'Ótima (300+ DPI)';
    if (dpi < 150) qualityRating = 'Baixa (<150 DPI)';
    else if (dpi < 200) qualityRating = 'Aceitável (150-200 DPI)';
    else if (dpi < 300) qualityRating = 'Boa (200-300 DPI)';

    let maxQualityPaperFormat = '10 × 15 cm';
    if (widthMm >= 297 && heightMm >= 420) maxQualityPaperFormat = 'A3+';
    else if (widthMm >= 210 && heightMm >= 297) maxQualityPaperFormat = 'A4';
    else if (widthMm >= 148 && heightMm >= 210) maxQualityPaperFormat = 'A5';
    else if (widthMm >= 100 && heightMm >= 150) maxQualityPaperFormat = '10 × 15 cm';

    return {
      widthCm,
      heightCm,
      widthMm,
      heightMm,
      widthInches: Number(widthInches.toFixed(2)),
      heightInches: Number(heightInches.toFixed(2)),
      dpi,
      megapixels,
      qualityRating,
      maxQualityPaperFormat,
    };
  }

  /**
   * Main rasterization & print enhancement process for pipeline
   */
  public static process(
    sourceImage: ImageData,
    settings: RasterPrintSettings
  ): ImageData {
    if (!settings.enabled) return sourceImage;

    const { width, height } = sourceImage;
    let output = new ImageData(
      new Uint8ClampedArray(sourceImage.data),
      width,
      height
    );

    // 1. Dot Gain & Paper Tone Compensation
    if (settings.dotGainCompensation > 0 || settings.blackPointBoost > 0 || settings.paperProfile !== 'standard') {
      output = this.applyPaperToneAndDotGain(
        output,
        settings.paperProfile,
        settings.dotGainCompensation,
        settings.blackPointBoost
      );
    }

    // 2. High-Frequency Print Edge Sharpening
    if (settings.printSharpenBoost > 0) {
      output = this.applyPrintEdgeSharpen(output, settings.printSharpenBoost, settings.targetDpi);
    }

    // 3. Halftone, Dithering or CMYK Gamut Simulation
    if (settings.halftoneMode !== 'none' || settings.cmykGamutWarning) {
      output = this.applyHalftoneAndGamut(
        output,
        settings.halftoneMode,
        settings.cmykGamutWarning
      );
    }

    return output;
  }

  /**
   * Adjusts tonal curve and ink compensation for physical paper substrates
   */
  private static applyPaperToneAndDotGain(
    imgData: ImageData,
    profile: RasterPrintSettings['paperProfile'],
    dotGainAmount: number,
    blackBoost: number
  ): ImageData {
    const { width, height, data } = imgData;
    const outData = new Uint8ClampedArray(data);

    // Baseline gamma compensation factor for physical dot gain (spreading of liquid ink on paper fibers)
    // Coated papers absorb less ink, uncoated / newsprint absorb much more
    let baseGamma = 1.0;
    let contrastFactor = 1.0;
    let shadowBoost = 0;

    switch (profile) {
      case 'coated-glossy':
        baseGamma = 0.98 - (dotGainAmount * 0.001);
        contrastFactor = 1.04;
        break;
      case 'matte':
        baseGamma = 0.94 - (dotGainAmount * 0.0015);
        contrastFactor = 1.02;
        shadowBoost = 4;
        break;
      case 'uncoated-offset':
        baseGamma = 0.88 - (dotGainAmount * 0.002);
        contrastFactor = 0.98;
        shadowBoost = 8;
        break;
      case 'newsprint':
        baseGamma = 0.80 - (dotGainAmount * 0.003);
        contrastFactor = 0.92;
        shadowBoost = 14;
        break;
      case 'canvas':
        baseGamma = 0.92 - (dotGainAmount * 0.0015);
        contrastFactor = 1.06;
        break;
      default:
        baseGamma = 1.0 - (dotGainAmount * 0.0012);
        break;
    }

    // Precalculate 256 LUT for speed
    const lut = new Uint8Array(256);
    const kFactor = (blackBoost / 100) * 0.15;

    for (let i = 0; i < 256; i++) {
      let normalized = i / 255;

      // Apply dot gain inverse gamma curve
      normalized = Math.pow(normalized, baseGamma);

      // Apply paper contrast curve centered at mid-tones (0.5)
      normalized = ((normalized - 0.5) * contrastFactor) + 0.5;

      // Apply black point rich generation (deep K)
      if (normalized < 0.3) {
        normalized = normalized * (1.0 - kFactor);
      }

      let val = Math.round(normalized * 255) + shadowBoost;
      lut[i] = Math.max(0, Math.min(255, val));
    }

    for (let i = 0; i < outData.length; i += 4) {
      outData[i] = lut[outData[i]];
      outData[i + 1] = lut[outData[i + 1]];
      outData[i + 2] = lut[outData[i + 2]];
    }

    return new ImageData(outData, width, height);
  }

  /**
   * Applies print-optimized micro-edge sharpening
   */
  private static applyPrintEdgeSharpen(
    imgData: ImageData,
    strength: number,
    dpi: number
  ): ImageData {
    const { width, height, data } = imgData;
    const outData = new Uint8ClampedArray(data);
    const sharpenFactor = (strength / 100) * (dpi >= 600 ? 1.4 : dpi >= 300 ? 1.0 : 0.7);

    // 3x3 Laplacian print-sharpen kernel
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;

        for (let c = 0; c < 3; c++) {
          const center = data[idx + c];
          const top = data[((y - 1) * width + x) * 4 + c];
          const bottom = data[((y + 1) * width + x) * 4 + c];
          const left = data[(y * width + (x - 1)) * 4 + c];
          const right = data[(y * width + (x + 1)) * 4 + c];

          const edge = (center * 4) - (top + bottom + left + right);
          const val = center + Math.round(edge * sharpenFactor * 0.4);
          outData[idx + c] = Math.max(0, Math.min(255, val));
        }
      }
    }

    return new ImageData(outData, width, height);
  }

  /**
   * Applies halftoning, dithering or CMYK Gamut check
   */
  private static applyHalftoneAndGamut(
    imgData: ImageData,
    mode: RasterPrintSettings['halftoneMode'],
    gamutWarning: boolean
  ): ImageData {
    const { width, height, data } = imgData;
    const outData = new Uint8ClampedArray(data);

    if (mode === 'cmyk-simulation') {
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i] / 255;
        const g = data[i + 1] / 255;
        const b = data[i + 2] / 255;

        // RGB to CMY
        const c = 1 - r;
        const m = 1 - g;
        const y = 1 - b;
        const k = Math.min(c, Math.min(m, y));

        // Total Ink Coverage (TAC)
        const totalInk = (c + m + y + k) * 100;

        // Out-of-gamut detection (TAC > 300% or extreme saturation in neon colors)
        const isOutOfGamut = totalInk > 310 || (r < 0.05 && (g > 0.95 || b > 0.95));

        if (gamutWarning && isOutOfGamut) {
          // Highlight out of gamut in vivid magenta warning stripe
          outData[i] = 255;
          outData[i + 1] = 0;
          outData[i + 2] = 128;
        } else {
          // Convert back with CMYK ink density subtractive simulation
          const cmykR = Math.round(255 * (1 - c) * (1 - k * 0.8));
          const cmykG = Math.round(255 * (1 - m) * (1 - k * 0.8));
          const cmykB = Math.round(255 * (1 - y) * (1 - k * 0.8));

          outData[i] = Math.max(0, Math.min(255, cmykR));
          outData[i + 1] = Math.max(0, Math.min(255, cmykG));
          outData[i + 2] = Math.max(0, Math.min(255, cmykB));
        }
      }
      return new ImageData(outData, width, height);
    }

    if (mode === 'dot-halftone') {
      const dotSize = 4;
      for (let y = 0; y < height; y += dotSize) {
        for (let x = 0; x < width; x += dotSize) {
          let sumR = 0, sumG = 0, sumB = 0, count = 0;

          // Compute average color in the dot cell
          for (let dy = 0; dy < dotSize && (y + dy) < height; dy++) {
            for (let dx = 0; dx < dotSize && (x + dx) < width; dx++) {
              const idx = ((y + dy) * width + (x + dx)) * 4;
              sumR += data[idx];
              sumG += data[idx + 1];
              sumB += data[idx + 2];
              count++;
            }
          }

          const avgLuma = ((sumR / count) * 0.299 + (sumG / count) * 0.587 + (sumB / count) * 0.114) / 255;
          const radius = (1 - avgLuma) * (dotSize * 0.7);
          const centerX = x + dotSize / 2;
          const centerY = y + dotSize / 2;

          for (let dy = 0; dy < dotSize && (y + dy) < height; dy++) {
            for (let dx = 0; dx < dotSize && (x + dx) < width; dx++) {
              const pxX = x + dx;
              const pxY = y + dy;
              const dist = Math.hypot(pxX - centerX, pxY - centerY);
              const idx = (pxY * width + pxX) * 4;

              if (dist <= radius) {
                outData[idx] = Math.round((sumR / count) * 0.4);
                outData[idx + 1] = Math.round((sumG / count) * 0.4);
                outData[idx + 2] = Math.round((sumB / count) * 0.4);
              } else {
                outData[idx] = 250;
                outData[idx + 1] = 250;
                outData[idx + 2] = 245;
              }
            }
          }
        }
      }
      return new ImageData(outData, width, height);
    }

    if (mode === 'dither-floyd') {
      // Floyd-Steinberg Error Diffusion
      const grayscale = new Float32Array(width * height);
      for (let i = 0; i < data.length; i += 4) {
        grayscale[i / 4] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      }

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          const oldVal = grayscale[idx];
          const newVal = oldVal < 128 ? 0 : 255;
          grayscale[idx] = newVal;
          const error = oldVal - newVal;

          if (x + 1 < width) grayscale[idx + 1] += error * (7 / 16);
          if (x - 1 >= 0 && y + 1 < height) grayscale[(y + 1) * width + (x - 1)] += error * (3 / 16);
          if (y + 1 < height) grayscale[(y + 1) * width + x] += error * (5 / 16);
          if (x + 1 < width && y + 1 < height) grayscale[(y + 1) * width + (x + 1)] += error * (1 / 16);
        }
      }

      for (let i = 0; i < grayscale.length; i++) {
        const val = grayscale[i];
        outData[i * 4] = val;
        outData[i * 4 + 1] = val;
        outData[i * 4 + 2] = val;
      }
      return new ImageData(outData, width, height);
    }

    if (mode === 'bayer-matrix') {
      // 4x4 Bayer Matrix
      const bayer4 = [
        [0, 8, 2, 10],
        [12, 4, 14, 6],
        [3, 11, 1, 9],
        [15, 7, 13, 5],
      ];

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const luma = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
          const threshold = (bayer4[y % 4][x % 4] / 16) * 255;
          const val = luma > threshold ? 255 : 15;

          outData[idx] = val;
          outData[idx + 1] = val;
          outData[idx + 2] = val;
        }
      }
      return new ImageData(outData, width, height);
    }

    return new ImageData(outData, width, height);
  }

  /**
   * Generates a ready-to-print high-res canvas with optional bleed & crop marks
   */
  public static createPrintReadyCanvas(
    sourceImg: ImageData,
    options: PrintExportOptions
  ): { canvas: HTMLCanvasElement; finalWidthMm: number; finalHeightMm: number } {
    let targetPaper = STANDARD_PAPER_SIZES[options.paperSize] || STANDARD_PAPER_SIZES['a4'];
    let paperWidthMm = options.paperSize === 'custom' && options.customWidthMm ? options.customWidthMm : targetPaper.widthMm;
    let paperHeightMm = options.paperSize === 'custom' && options.customHeightMm ? options.customHeightMm : targetPaper.heightMm;

    // Handle auto orientation
    if (options.orientation === 'auto') {
      const isImgLandscape = sourceImg.width > sourceImg.height;
      const isPaperLandscape = paperWidthMm > paperHeightMm;
      if (isImgLandscape !== isPaperLandscape) {
        const temp = paperWidthMm;
        paperWidthMm = paperHeightMm;
        paperHeightMm = temp;
      }
    } else if (options.orientation === 'landscape' && paperWidthMm < paperHeightMm) {
      const temp = paperWidthMm;
      paperWidthMm = paperHeightMm;
      paperHeightMm = temp;
    } else if (options.orientation === 'portrait' && paperWidthMm > paperHeightMm) {
      const temp = paperWidthMm;
      paperWidthMm = paperHeightMm;
      paperHeightMm = temp;
    }

    const bleedMm = options.includeBleed ? options.bleedMm : 0;
    const marginForMarksMm = options.includeCropMarks ? 12 : 0;

    const totalWidthMm = paperWidthMm + (bleedMm * 2) + (marginForMarksMm * 2);
    const totalHeightMm = paperHeightMm + (bleedMm * 2) + (marginForMarksMm * 2);

    const dpi = options.dpi;
    const mmToPx = (mm: number) => Math.round((mm / 25.4) * dpi);

    const canvasWidthPx = mmToPx(totalWidthMm);
    const canvasHeightPx = mmToPx(totalHeightMm);

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidthPx;
    canvas.height = canvasHeightPx;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Falha ao inicializar contexto 2D para renderização de impressão');

    // Fill background with clean paper white
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasWidthPx, canvasHeightPx);

    // Source image as temporary canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = sourceImg.width;
    tempCanvas.height = sourceImg.height;
    const tCtx = tempCanvas.getContext('2d')!;
    tCtx.putImageData(sourceImg, 0, 0);

    // Calculate printable image rect
    const printAreaX = mmToPx(marginForMarksMm);
    const printAreaY = mmToPx(marginForMarksMm);
    const printAreaW = mmToPx(paperWidthMm + (bleedMm * 2));
    const printAreaH = mmToPx(paperHeightMm + (bleedMm * 2));

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (options.fitMode === 'fill') {
      ctx.drawImage(tempCanvas, printAreaX, printAreaY, printAreaW, printAreaH);
    } else {
      // Preserve aspect ratio inside print area
      const imgAspect = sourceImg.width / sourceImg.height;
      const areaAspect = printAreaW / printAreaH;
      let drawW = printAreaW;
      let drawH = printAreaH;
      let drawX = printAreaX;
      let drawY = printAreaY;

      if (imgAspect > areaAspect) {
        drawH = printAreaW / imgAspect;
        drawY = printAreaY + (printAreaH - drawH) / 2;
      } else {
        drawW = printAreaH * imgAspect;
        drawX = printAreaX + (printAreaW - drawW) / 2;
      }
      ctx.drawImage(tempCanvas, drawX, drawY, drawW, drawH);
    }

    // Draw Professional Crop Marks (Marcas de Corte) & Registration Marks
    if (options.includeCropMarks) {
      const cutX1 = mmToPx(marginForMarksMm + bleedMm);
      const cutY1 = mmToPx(marginForMarksMm + bleedMm);
      const cutX2 = mmToPx(marginForMarksMm + bleedMm + paperWidthMm);
      const cutY2 = mmToPx(marginForMarksMm + bleedMm + paperHeightMm);
      const markLength = mmToPx(8);
      const markOffset = mmToPx(3);

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = Math.max(1, Math.round(dpi / 300));

      // Top-Left Marks
      ctx.beginPath();
      ctx.moveTo(cutX1, cutY1 - markOffset - markLength);
      ctx.lineTo(cutX1, cutY1 - markOffset);
      ctx.moveTo(cutX1 - markOffset - markLength, cutY1);
      ctx.lineTo(cutX1 - markOffset, cutY1);
      ctx.stroke();

      // Top-Right Marks
      ctx.beginPath();
      ctx.moveTo(cutX2, cutY1 - markOffset - markLength);
      ctx.lineTo(cutX2, cutY1 - markOffset);
      ctx.moveTo(cutX2 + markOffset, cutY1);
      ctx.lineTo(cutX2 + markOffset + markLength, cutY1);
      ctx.stroke();

      // Bottom-Left Marks
      ctx.beginPath();
      ctx.moveTo(cutX1, cutY2 + markOffset);
      ctx.lineTo(cutX1, cutY2 + markOffset + markLength);
      ctx.moveTo(cutX1 - markOffset - markLength, cutY2);
      ctx.lineTo(cutX1 - markOffset, cutY2);
      ctx.stroke();

      // Bottom-Right Marks
      ctx.beginPath();
      ctx.moveTo(cutX2, cutY2 + markOffset);
      ctx.lineTo(cutX2, cutY2 + markOffset + markLength);
      ctx.moveTo(cutX2 + markOffset, cutY2);
      ctx.lineTo(cutX2 + markOffset + markLength, cutY2);
      ctx.stroke();

      // Technical Header Info
      ctx.fillStyle = '#444444';
      ctx.font = `${Math.round(dpi * 0.03)}px monospace`;
      const infoText = `MAGIC BOLOTA PRO PRINT • ${paperWidthMm}x${paperHeightMm}mm @ ${dpi}DPI • Perfil: ${options.paperProfile} • Sangria: ${bleedMm}mm`;
      ctx.fillText(infoText, cutX1, cutY1 - markOffset - markLength - 6);
    }

    return { canvas, finalWidthMm: totalWidthMm, finalHeightMm: totalHeightMm };
  }

  /**
   * Generates and downloads a print-ready vector PDF document with exact physical millimetric size
   */
  public static exportToPdf(
    canvas: HTMLCanvasElement,
    totalWidthMm: number,
    totalHeightMm: number,
    filename: string
  ): void {
    const orientation = totalWidthMm > totalHeightMm ? 'landscape' : 'portrait';
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: [totalWidthMm, totalHeightMm],
      compress: true,
    });

    const imgDataUrl = canvas.toDataURL('image/jpeg', 0.98);
    pdf.addImage(imgDataUrl, 'JPEG', 0, 0, totalWidthMm, totalHeightMm, undefined, 'FAST');
    pdf.save(`${filename}.pdf`);
  }
}
