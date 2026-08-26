import { PipelineSettings } from '../types';

export class DetailRecoveryEngine {
  /**
   * Micro-Detail Synthesis, CLAHE Local Contrast & Dynamic Range Restoration
   */
  public static process(
    input: ImageData,
    detailSettings: PipelineSettings['detailRecovery'],
    contrastSettings: PipelineSettings['colorContrast']
  ): ImageData {
    const { microContrast, textureSynthesis, clarity, shadowRecovery, highlightProtection } = detailSettings;
    const { claheStrength, autoExposure, saturation, temperature } = contrastSettings;

    const width = input.width;
    const height = input.height;
    const src = input.data;
    const output = new ImageData(new Uint8ClampedArray(src), width, height);
    const dst = output.data;

    const totalPixels = width * height;
    const Y = new Float32Array(totalPixels);
    const Cb = new Float32Array(totalPixels);
    const Cr = new Float32Array(totalPixels);

    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const r = src[idx];
      const g = src[idx + 1];
      const b = src[idx + 2];

      Y[i] = 0.299 * r + 0.587 * g + 0.114 * b;
      Cb[i] = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      Cr[i] = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    }

    // 1. High-Pass Micro-Texture Extraction
    if (microContrast > 0 || textureSynthesis > 0) {
      const microFactor = (microContrast / 100) * 0.8;
      const synthFactor = (textureSynthesis / 100) * 0.5;

      for (let y = 1; y < height - 1; y++) {
        const row = y * width;
        for (let x = 1; x < width - 1; x++) {
          const idx = row + x;
          const center = Y[idx];
          const localMean = (Y[idx - 1] + Y[idx + 1] + Y[idx - width] + Y[idx + width]) * 0.25;
          const highPass = center - localMean;

          // Boost high-frequency micro texture gently
          if (Math.abs(highPass) < 18) {
            const textureBoost = highPass * (microFactor + synthFactor);
            Y[idx] = Math.min(255, Math.max(0, center + textureBoost));
          }
        }
      }
    }

    // 2. CLAHE (Contrast-Limited Adaptive Histogram Equalization) on Luminance
    if (claheStrength > 0) {
      this.applyClahe(Y, width, height, claheStrength / 100);
    }

    // 3. Shadow & Highlight Recovery
    if (shadowRecovery > 0 || highlightProtection > 0 || clarity > 0) {
      const sFactor = (shadowRecovery / 100) * 45;
      const hFactor = (highlightProtection / 100) * 35;
      const cFactor = (clarity / 100) * 0.3;

      for (let i = 0; i < totalPixels; i++) {
        let val = Y[i];

        // Lift deep shadows
        if (val < 120 && sFactor > 0) {
          const weight = Math.pow(1 - val / 120, 1.8);
          val += weight * sFactor;
        }

        // Compress blown highlights
        if (val > 180 && hFactor > 0) {
          const weight = Math.pow((val - 180) / 75, 1.5);
          val -= weight * hFactor;
        }

        // Midtone clarity S-curve
        if (cFactor > 0) {
          const norm = (val - 128) / 128;
          const sCurve = norm * (1 + (1 - Math.abs(norm)) * cFactor);
          val = 128 + sCurve * 128;
        }

        Y[i] = Math.min(255, Math.max(0, val));
      }
    }

    // 4. Color adjustments (Saturation & Temperature)
    const satMultiplier = 1 + saturation / 100;
    const tempShift = temperature * 0.5;

    for (let i = 0; i < totalPixels; i++) {
      const yVal = Y[i];
      let cbVal = (Cb[i] - 128) * satMultiplier - tempShift * 0.3;
      let crVal = (Cr[i] - 128) * satMultiplier + tempShift * 0.4;

      const r = yVal + 1.402 * crVal;
      const g = yVal - 0.344136 * cbVal - 0.714136 * crVal;
      const b = yVal + 1.772 * cbVal;

      const idx = i * 4;
      dst[idx] = Math.min(255, Math.max(0, Math.round(r)));
      dst[idx + 1] = Math.min(255, Math.max(0, Math.round(g)));
      dst[idx + 2] = Math.min(255, Math.max(0, Math.round(b)));
    }

    return output;
  }

  /**
   * Fast 8x8 Grid CLAHE implementation for balanced local contrast
   */
  private static applyClahe(
    Y: Float32Array,
    width: number,
    height: number,
    strength: number
  ) {
    const gridX = 8;
    const gridY = 8;
    const tileW = width / gridX;
    const tileH = height / gridY;

    // Calculate CDF for each tile
    const cdfs: Float32Array[] = [];
    const clipLimit = 2.5 + strength * 2.0;

    for (let gy = 0; gy < gridY; gy++) {
      for (let gx = 0; gx < gridX; gx++) {
        const hist = new Float32Array(256);
        const startX = Math.floor(gx * tileW);
        const endX = Math.floor((gx + 1) * tileW);
        const startY = Math.floor(gy * tileH);
        const endY = Math.floor((gy + 1) * tileH);
        const tilePixels = (endX - startX) * (endY - startY);

        for (let y = startY; y < endY; y++) {
          const row = y * width;
          for (let x = startX; x < endX; x++) {
            const v = Math.min(255, Math.max(0, Math.round(Y[row + x])));
            hist[v]++;
          }
        }

        // Clip histogram
        const clipThreshold = (clipLimit * tilePixels) / 256;
        let excess = 0;
        for (let i = 0; i < 256; i++) {
          if (hist[i] > clipThreshold) {
            excess += hist[i] - clipThreshold;
            hist[i] = clipThreshold;
          }
        }
        const bonus = excess / 256;
        for (let i = 0; i < 256; i++) hist[i] += bonus;

        // Compute CDF
        const cdf = new Float32Array(256);
        let acc = 0;
        for (let i = 0; i < 256; i++) {
          acc += hist[i];
          cdf[i] = (acc / tilePixels) * 255;
        }
        cdfs.push(cdf);
      }
    }

    // Bilinear interpolation between tile CDFs
    for (let y = 0; y < height; y++) {
      const row = y * width;
      const ty = (y / tileH) - 0.5;
      const gy1 = Math.max(0, Math.min(gridY - 1, Math.floor(ty)));
      const gy2 = Math.min(gridY - 1, gy1 + 1);
      const fracY = Math.max(0, Math.min(1, ty - gy1));

      for (let x = 0; x < width; x++) {
        const tx = (x / tileW) - 0.5;
        const gx1 = Math.max(0, Math.min(gridX - 1, Math.floor(tx)));
        const gx2 = Math.min(gridX - 1, gx1 + 1);
        const fracX = Math.max(0, Math.min(1, tx - gx1));

        const original = Y[row + x];
        const val = Math.min(255, Math.max(0, Math.round(original)));

        const cdf00 = cdfs[gy1 * gridX + gx1][val];
        const cdf10 = cdfs[gy1 * gridX + gx2][val];
        const cdf01 = cdfs[gy2 * gridX + gx1][val];
        const cdf11 = cdfs[gy2 * gridX + gx2][val];

        const top = cdf00 * (1 - fracX) + cdf10 * fracX;
        const bot = cdf01 * (1 - fracX) + cdf11 * fracX;
        const equalized = top * (1 - fracY) + bot * fracY;

        Y[row + x] = original * (1 - strength * 0.4) + equalized * (strength * 0.4);
      }
    }
  }
}
