import { ImageAnalysisMetrics, PipelineSettings, PresetId } from '../types';

export class ImageAnalyzer {
  /**
   * Performs an exhaustive multi-metric scan of the image to diagnose
   * optical blur, noise, compression artifacts, contrast, and facial presence.
   */
  public static analyze(imageData: ImageData): ImageAnalysisMetrics {
    const { width, height, data } = imageData;
    const totalPixels = width * height;
    const megapixels = Number((totalPixels / 1_000_000).toFixed(2));

    // 1. Grayscale luminance buffer & Histograms
    const luma = new Float32Array(totalPixels);
    const histR = new Array(256).fill(0);
    const histG = new Array(256).fill(0);
    const histB = new Array(256).fill(0);
    const histLuma = new Array(256).fill(0);

    let lumaSum = 0;
    let lumaSqSum = 0;
    let shadowClipCount = 0;
    let highlightClipCount = 0;

    // Face / skin detection candidates
    const skinMap = new Uint8Array(totalPixels);
    let skinPixelCount = 0;

    // Sample step for very large images to keep UI ultra responsive
    const sampleStep = totalPixels > 2_000_000 ? 2 : 1;

    for (let i = 0; i < totalPixels; i += sampleStep) {
      const idx = i * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // ITU-R BT.709 Luminance
      const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      luma[i] = y;

      const yInt = Math.min(255, Math.max(0, Math.round(y)));
      histR[r]++;
      histG[g]++;
      histB[b]++;
      histLuma[yInt]++;

      lumaSum += y;
      lumaSqSum += y * y;

      if (y < 8) shadowClipCount++;
      if (y > 248) highlightClipCount++;

      // Skin tone detector in YCbCr space
      // Cb = 128 - 0.168736*R - 0.331264*G + 0.5*B
      // Cr = 128 + 0.5*R - 0.418688*G - 0.081312*B
      const cb = 128 - 0.1687 * r - 0.3313 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.4187 * g - 0.0813 * b;

      // Typical human skin range
      if (cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173 && y > 40 && y < 230) {
        // Additional check: R > G and G > B
        if (r > g && g > b) {
          skinMap[i] = 1;
          skinPixelCount++;
        }
      }
    }

    const sampledCount = Math.ceil(totalPixels / sampleStep);
    const meanLuma = lumaSum / sampledCount;
    const varianceLuma = Math.max(0, lumaSqSum / sampledCount - meanLuma * meanLuma);
    const stdDevLuma = Math.sqrt(varianceLuma);

    // 2. Focus & Blur Analysis (Laplacian 3x3 Operator & Tenengrad Gradient)
    let laplacianVarSum = 0;
    let laplacianSum = 0;
    let edgeEnergySum = 0;
    let validLaplacianPoints = 0;

    // 3. Noise Analysis (High-frequency residue in flat regions)
    let noiseResidueSum = 0;
    let noiseSampleCount = 0;

    // 4. JPEG Blocking Analysis (8x8 grid boundary variance vs internal variance)
    let blockBoundaryDiffSum = 0;
    let blockInternalDiffSum = 0;
    let blockBoundaryCount = 0;
    let blockInternalCount = 0;

    const step = Math.max(1, Math.floor(Math.sqrt(totalPixels) / 400));

    for (let y = 2; y < height - 2; y += step) {
      const rowOffset = y * width;
      const isBlockRowBoundary = y % 8 === 0;

      for (let x = 2; x < width - 2; x += step) {
        const idx = rowOffset + x;
        const isBlockColBoundary = x % 8 === 0;

        // Laplacian 3x3:
        // [ 0,  1,  0 ]
        // [ 1, -4,  1 ]
        // [ 0,  1,  0 ]
        const center = luma[idx];
        const up = luma[idx - width];
        const down = luma[idx + width];
        const left = luma[idx - 1];
        const right = luma[idx + 1];

        const lap = Math.abs(up + down + left + right - 4 * center);
        laplacianSum += lap;
        laplacianVarSum += lap * lap;
        validLaplacianPoints++;

        // Sobel gradient (Tenengrad)
        const gx = right - left;
        const gy = down - up;
        const gradMag = Math.sqrt(gx * gx + gy * gy);
        edgeEnergySum += gradMag;

        // Noise estimation in low-gradient (flat) regions
        if (gradMag < 12) {
          // Difference between center and average of 4 neighbors
          const localAvg = (up + down + left + right) * 0.25;
          const residue = Math.abs(center - localAvg);
          noiseResidueSum += residue;
          noiseSampleCount++;
        }

        // JPEG 8x8 block edge step
        const horizontalDiff = Math.abs(luma[idx] - luma[idx + 1]);
        if (isBlockColBoundary) {
          blockBoundaryDiffSum += horizontalDiff;
          blockBoundaryCount++;
        } else {
          blockInternalDiffSum += horizontalDiff;
          blockInternalCount++;
        }
      }
    }

    // Laplacian Variance Focus Metric
    const meanLap = validLaplacianPoints > 0 ? laplacianSum / validLaplacianPoints : 0;
    const lapVar = validLaplacianPoints > 0 ? (laplacianVarSum / validLaplacianPoints) - (meanLap * meanLap) : 0;
    
    // Convert to normalized scores (0-100)
    // A crisp, sharp photo typically has lapVar > 300; soft photo ~ 50-150; blurry photo < 40
    const focusMetric = Math.min(1000, Math.max(0, Math.round(lapVar)));
    let blurScore = 0;
    if (focusMetric < 40) {
      blurScore = Math.round(100 - (focusMetric / 40) * 40); // 60 - 100
    } else if (focusMetric < 200) {
      blurScore = Math.round(60 - ((focusMetric - 40) / 160) * 40); // 20 - 60
    } else {
      blurScore = Math.round(Math.max(0, 20 - ((focusMetric - 200) / 400) * 20)); // 0 - 20
    }

    // Noise estimation score (0 - 100)
    const avgNoiseResidue = noiseSampleCount > 0 ? noiseResidueSum / noiseSampleCount : 0;
    const noiseLevel = Math.min(100, Math.max(0, Math.round(avgNoiseResidue * 22)));

    // JPEG Blockiness Score
    const avgBoundary = blockBoundaryCount > 0 ? blockBoundaryDiffSum / blockBoundaryCount : 1;
    const avgInternal = blockInternalCount > 0 ? blockInternalDiffSum / blockInternalCount : 1;
    const blockRatio = avgBoundary / (avgInternal + 0.001);
    const compressionArtifacts = Math.min(100, Math.max(0, Math.round(Math.max(0, blockRatio - 1.05) * 180)));

    // Contrast & Exposure
    const contrastScore = Math.min(100, Math.max(0, Math.round((stdDevLuma / 75) * 100)));
    const exposureScore = Math.round(((meanLuma - 128) / 128) * 50);

    // Lost details estimation (based on high-frequency energy ratio)
    const avgEdgeEnergy = validLaplacianPoints > 0 ? edgeEnergySum / validLaplacianPoints : 0;
    const lostDetailsScore = Math.min(100, Math.max(0, Math.round(Math.max(0, 45 - avgEdgeEnergy) * 2.2)));

    // Face / Skin Region Detection
    const skinRatio = skinPixelCount / (totalPixels / sampleStep);
    const faceDetected = skinRatio > 0.02 && skinRatio < 0.65;
    const faceCount = faceDetected ? (skinRatio > 0.25 ? 2 : 1) : 0;

    // Resolution classification
    let resolutionCategory: 'low' | 'medium' | 'high' | 'ultra' = 'medium';
    if (megapixels < 0.6) resolutionCategory = 'low';
    else if (megapixels < 2.5) resolutionCategory = 'medium';
    else if (megapixels < 8.0) resolutionCategory = 'high';
    else resolutionCategory = 'ultra';

    // Dominant issues identification
    const dominantIssues: string[] = [];
    if (blurScore >= 45) dominantIssues.push(`Desfoque Óptico / Falta de Foco (Score ${blurScore}%)`);
    if (noiseLevel >= 35) dominantIssues.push(`Ruído Digital / Granulação em Altas ISO (${noiseLevel}%)`);
    if (compressionArtifacts >= 35) dominantIssues.push(`Artefatos de Compressão JPEG (${compressionArtifacts}%)`);
    if (lostDetailsScore >= 40) dominantIssues.push(`Perda de Microdetalhes e Textura (${lostDetailsScore}%)`);
    if (resolutionCategory === 'low') dominantIssues.push(`Resolução Baixa (${width}x${height} px)`);
    if (contrastScore < 35) dominantIssues.push(`Faixa Dinâmica / Contraste Reduzido (${contrastScore}%)`);
    if (faceDetected) dominantIssues.push(`Elementos Faciais Detectados (${(skinRatio * 100).toFixed(1)}% área)`);

    // Determine recommended preset
    let recommendedPreset: PresetId = 'auto';
    if (resolutionCategory === 'low') recommendedPreset = 'lowres';
    else if (blurScore >= 55) recommendedPreset = 'blurred';
    else if (compressionArtifacts >= 40) recommendedPreset = 'compressed';
    else if (faceDetected && skinRatio > 0.15) recommendedPreset = 'face';
    else if (noiseLevel >= 45) recommendedPreset = 'vintage';
    else recommendedPreset = 'photo';

    // 5. Print Diagnostics & Physical Sizing Analysis
    // 300 DPI: 1 inch = 2.54 cm = 300 px -> 1 cm = 118.11 px
    // 150 DPI: 1 inch = 2.54 cm = 150 px -> 1 cm = 59.05 px
    const printW300 = Number(((width / 300) * 2.54).toFixed(1));
    const printH300 = Number(((height / 300) * 2.54).toFixed(1));
    const printW150 = Number(((width / 150) * 2.54).toFixed(1));
    const printH150 = Number(((height / 150) * 2.54).toFixed(1));

    const suitableFormats: string[] = [];
    if (printW300 >= 29.7 || printH300 >= 42.0) suitableFormats.push('A3 (300 DPI)');
    if (printW300 >= 21.0 || printH300 >= 29.7) suitableFormats.push('A4 (300 DPI)');
    if (printW300 >= 14.8 || printH300 >= 21.0) suitableFormats.push('A5 (300 DPI)');
    if (printW300 >= 10.0 || printH300 >= 15.0) suitableFormats.push('10×15 cm Foto');
    if (suitableFormats.length === 0) suitableFormats.push('Miniatura / 9×13 cm');

    // A4 (210 x 297 mm) standard pixel dimensions at 300 DPI: ~2480 x 3508 px
    const longSide = Math.max(width, height);
    let recommendedUpscaleForA4: 1 | 2 | 4 = 1;
    if (longSide < 1800) recommendedUpscaleForA4 = 2;
    if (longSide < 900) recommendedUpscaleForA4 = 4;

    const dpiAtA4 = Math.round((longSide / 297) * 25.4);

    // Approximate CMYK ink coverage
    const avgR = histR.reduce((acc, count, val) => acc + count * val, 0) / (totalPixels * 255);
    const avgG = histG.reduce((acc, count, val) => acc + count * val, 0) / (totalPixels * 255);
    const avgB = histB.reduce((acc, count, val) => acc + count * val, 0) / (totalPixels * 255);
    const cEst = Math.round((1 - avgR) * 100);
    const mEst = Math.round((1 - avgG) * 100);
    const yEst = Math.round((1 - avgB) * 100);
    const kEst = Math.round(Math.min(cEst, Math.min(mEst, yEst)) * 0.7);
    const totalInk = cEst + mEst + yEst + kEst;

    return {
      width,
      height,
      megapixels,
      blurScore,
      focusMetric,
      noiseLevel,
      compressionArtifacts,
      contrastScore,
      exposureScore,
      lostDetailsScore,
      faceDetected,
      faceCount,
      resolutionCategory,
      histogram: {
        r: histR,
        g: histG,
        b: histB,
        luma: histLuma,
      },
      dominantIssues,
      recommendedPreset,
      printMetrics: {
        maxPrintCm300Dpi: { width: printW300, height: printH300 },
        maxPrintCm150Dpi: { width: printW150, height: printH150 },
        suitableFormats,
        recommendedUpscaleForA4,
        dpiAtA4,
        cmykCoverageEstimate: { c: cEst, m: mEst, y: yEst, k: kEst, totalInk },
      },
    };
  }

  /**
   * Generates tailored, mathematically balanced settings based strictly on the image's flaws.
   * Prevents over-processing, prevents halos, and preserves original natural texture.
   */
  public static calculateAutoSettings(metrics: ImageAnalysisMetrics): PipelineSettings {
    const isBlurry = metrics.blurScore > 35;
    const isVeryBlurry = metrics.blurScore > 65;
    const isNoisy = metrics.noiseLevel > 30;
    const isCompressed = metrics.compressionArtifacts > 30;
    const isLowRes = metrics.resolutionCategory === 'low';

    // 1. Deblur parameters (Richardson-Lucy style)
    let deblurAmount = 0;
    let deblurRadius = 1.2;
    let deblurIters = 4;
    if (isVeryBlurry) {
      deblurAmount = Math.min(85, Math.round(metrics.blurScore * 0.9));
      deblurRadius = 2.4;
      deblurIters = 8;
    } else if (isBlurry) {
      deblurAmount = Math.min(65, Math.round(metrics.blurScore * 0.75));
      deblurRadius = 1.5;
      deblurIters = 5;
    } else {
      deblurAmount = Math.min(25, Math.round(metrics.blurScore * 0.4));
      deblurRadius = 1.0;
      deblurIters = 3;
    }

    // 2. Denoise parameters (Bilateral space/range filter)
    let denoiseAmount = 0;
    let luminanceStrength = 0;
    let chrominanceStrength = 0;
    let jpegDeblock = 0;
    let preserveGrain = 65;

    if (isNoisy) {
      denoiseAmount = Math.min(80, Math.round(metrics.noiseLevel * 0.85));
      luminanceStrength = Math.round(denoiseAmount * 0.7);
      chrominanceStrength = Math.min(95, Math.round(denoiseAmount * 1.15));
      preserveGrain = 45;
    } else {
      denoiseAmount = Math.min(30, Math.round(metrics.noiseLevel * 0.5));
      luminanceStrength = Math.round(denoiseAmount * 0.5);
      chrominanceStrength = Math.round(denoiseAmount * 0.8);
      preserveGrain = 75;
    }

    if (isCompressed) {
      jpegDeblock = Math.min(85, Math.round(metrics.compressionArtifacts * 0.9));
    }

    // 3. Sharpen parameters (Anti-halo Unsharp Masking)
    // Crucial rule: If the image is noisy, we must NOT boost sharpen aggressively without threshold!
    let sharpenAmount = 0;
    let sharpenRadius = 1.2;
    let sharpenThreshold = 3;
    const antiHalo = 85; // Strong halo suppression by default

    if (isBlurry) {
      sharpenAmount = Math.min(65, Math.round(30 + metrics.blurScore * 0.4));
      sharpenRadius = 1.4;
      sharpenThreshold = isNoisy ? 6 : 2;
    } else {
      sharpenAmount = Math.min(45, Math.max(15, Math.round(metrics.lostDetailsScore * 0.5)));
      sharpenRadius = 1.0;
      sharpenThreshold = isNoisy ? 5 : 2;
    }

    // 4. Detail Recovery & Micro-contrast (CLAHE)
    const microContrast = Math.min(70, Math.max(20, Math.round(metrics.lostDetailsScore * 0.65)));
    const textureSynthesis = Math.min(60, Math.max(15, Math.round(metrics.lostDetailsScore * 0.5)));
    const clarity = Math.min(50, Math.max(10, Math.round((100 - metrics.contrastScore) * 0.4)));

    // 5. Face restore (Strict identity preservation)
    const faceRestoreEnabled = metrics.faceDetected;
    const faceStrength = metrics.faceDetected ? 45 : 0;
    const skinSmoothing = metrics.faceDetected ? (isNoisy ? 40 : 25) : 0;
    const eyeClarification = metrics.faceDetected ? 50 : 0;

    // 6. Contrast & Exposure
    const claheStrength = Math.min(50, Math.max(10, Math.round((60 - metrics.contrastScore) * 0.6)));
    const autoExposure = Math.abs(metrics.exposureScore) > 15 ? Math.round(Math.abs(metrics.exposureScore) * 0.8) : 0;

    // 7. Upscale
    const scale: 1 | 2 | 4 = isLowRes ? 2 : 1;

    return {
      autoOptimized: true,
      deblur: {
        amount: deblurAmount,
        radius: deblurRadius,
        iterations: deblurIters,
        mode: 'focus',
        angle: 0,
      },
      denoise: {
        amount: denoiseAmount,
        luminanceStrength,
        chrominanceStrength,
        jpegDeblock,
        preserveGrain,
      },
      sharpen: {
        amount: sharpenAmount,
        radius: sharpenRadius,
        threshold: sharpenThreshold,
        antiHalo,
        luminanceOnly: true,
      },
      detailRecovery: {
        microContrast,
        textureSynthesis,
        clarity,
        shadowRecovery: metrics.exposureScore < -10 ? 35 : 15,
        highlightProtection: metrics.exposureScore > 10 ? 40 : 20,
      },
      faceRestore: {
        enabled: faceRestoreEnabled,
        strength: faceStrength,
        skinSmoothing,
        eyeClarification,
        preserveIdentity: 95, // strict constraint
      },
      colorContrast: {
        claheStrength,
        autoExposure,
        saturation: 0,
        temperature: 0,
      },
      upscale: {
        scale,
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
  }
}
