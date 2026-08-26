import { PipelineSettings } from '../types';

export class DenoiseEngine {
  /**
   * Applies advanced multi-stage noise reduction:
   * 1. JPEG 8x8 grid deblocking filter
   * 2. Separable Bilateral spatial & radiometric filtering
   * 3. Aggressive chrominance noise suppression in YCbCr color space
   * 4. Organic texture / grain preservation
   */
  public static process(
    input: ImageData,
    settings: PipelineSettings['denoise']
  ): ImageData {
    const { amount, luminanceStrength, chrominanceStrength, jpegDeblock, preserveGrain } = settings;
    if (amount <= 0 && jpegDeblock <= 0) {
      return input;
    }

    const width = input.width;
    const height = input.height;
    const src = input.data;
    const output = new ImageData(new Uint8ClampedArray(src), width, height);
    const dst = output.data;

    // 1. JPEG Deblocking Filter if requested
    if (jpegDeblock > 5) {
      this.applyJpegDeblock(dst, width, height, jpegDeblock / 100);
    }

    if (amount <= 0) return output;

    // Convert to YCbCr buffers for decoupled luminance/chrominance treatment
    const totalPixels = width * height;
    const Y = new Float32Array(totalPixels);
    const Cb = new Float32Array(totalPixels);
    const Cr = new Float32Array(totalPixels);

    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const r = dst[idx];
      const g = dst[idx + 1];
      const b = dst[idx + 2];

      Y[i] = 0.299 * r + 0.587 * g + 0.114 * b;
      Cb[i] = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      Cr[i] = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    }

    // 2. Chrominance Noise Filtering (Denoise Cb & Cr aggressively because human eye is less sensitive to chroma resolution)
    const chromaFactor = (amount / 100) * (chrominanceStrength / 100);
    if (chromaFactor > 0.05) {
      const filteredCb = new Float32Array(totalPixels);
      const filteredCr = new Float32Array(totalPixels);
      const cRadius = chromaFactor > 0.5 ? 2 : 1;
      const sigmaColor = 18 + chromaFactor * 35;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const centerIdx = y * width + x;
          const centerCb = Cb[centerIdx];
          const centerCr = Cr[centerIdx];

          let weightSumCb = 0;
          let sumCb = 0;
          let weightSumCr = 0;
          let sumCr = 0;

          for (let dy = -cRadius; dy <= cRadius; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= height) continue;
            for (let dx = -cRadius; dx <= cRadius; dx++) {
              const nx = x + dx;
              if (nx < 0 || nx >= width) continue;

              const nIdx = ny * width + nx;
              const dCb = Cb[nIdx] - centerCb;
              const dCr = Cr[nIdx] - centerCr;

              // Spatial + Color range weights
              const spatialDistSq = dx * dx + dy * dy;
              const wCb = Math.exp(-spatialDistSq / 4 - (dCb * dCb) / (2 * sigmaColor * sigmaColor));
              const wCr = Math.exp(-spatialDistSq / 4 - (dCr * dCr) / (2 * sigmaColor * sigmaColor));

              sumCb += Cb[nIdx] * wCb;
              weightSumCb += wCb;

              sumCr += Cr[nIdx] * wCr;
              weightSumCr += wCr;
            }
          }

          filteredCb[centerIdx] = sumCb / weightSumCb;
          filteredCr[centerIdx] = sumCr / weightSumCr;
        }
      }

      // Blend filtered chroma
      for (let i = 0; i < totalPixels; i++) {
        Cb[i] = Cb[i] * (1 - chromaFactor) + filteredCb[i] * chromaFactor;
        Cr[i] = Cr[i] * (1 - chromaFactor) + filteredCr[i] * chromaFactor;
      }
    }

    // 3. Luminance Bilateral Filter (Preserves sharp edges while smoothing flat noisy patches)
    const lumaFactor = (amount / 100) * (luminanceStrength / 100);
    if (lumaFactor > 0.05) {
      const filteredY = new Float32Array(totalPixels);
      const lRadius = lumaFactor > 0.6 ? 2 : 1;
      const sigmaColorLuma = 10 + lumaFactor * 22;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const centerIdx = y * width + x;
          const centerY = Y[centerIdx];

          let weightSum = 0;
          let sumY = 0;

          for (let dy = -lRadius; dy <= lRadius; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= height) continue;
            for (let dx = -lRadius; dx <= lRadius; dx++) {
              const nx = x + dx;
              if (nx < 0 || nx >= width) continue;

              const nIdx = ny * width + nx;
              const dY = Y[nIdx] - centerY;

              const spatialDistSq = dx * dx + dy * dy;
              const w = Math.exp(-spatialDistSq / 3.5 - (dY * dY) / (2 * sigmaColorLuma * sigmaColorLuma));

              sumY += Y[nIdx] * w;
              weightSum += w;
            }
          }

          filteredY[centerIdx] = sumY / weightSum;
        }
      }

      // Blend with grain preservation factor
      const grainFactor = (preserveGrain / 100) * 0.35;
      const effectiveLumaBlend = lumaFactor * (1 - grainFactor);

      for (let i = 0; i < totalPixels; i++) {
        Y[i] = Y[i] * (1 - effectiveLumaBlend) + filteredY[i] * effectiveLumaBlend;
      }
    }

    // Convert back from YCbCr to RGB
    for (let i = 0; i < totalPixels; i++) {
      const yVal = Y[i];
      const cbVal = Cb[i] - 128;
      const crVal = Cr[i] - 128;

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
   * Smooths discontinuous 8x8 block boundary seams characteristic of JPEG compression
   */
  private static applyJpegDeblock(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    strength: number
  ) {
    const threshold = 18 * strength;

    // Horizontal block boundary smoothing (x = 8, 16, 24...)
    for (let x = 8; x < width - 1; x += 8) {
      for (let y = 0; y < height; y++) {
        const leftIdx = (y * width + (x - 1)) * 4;
        const rightIdx = (y * width + x) * 4;

        for (let c = 0; c < 3; c++) {
          const diff = data[rightIdx + c] - data[leftIdx + c];
          if (Math.abs(diff) < threshold) {
            const delta = (diff / 2) * strength;
            data[leftIdx + c] = Math.min(255, Math.max(0, data[leftIdx + c] + delta));
            data[rightIdx + c] = Math.min(255, Math.max(0, data[rightIdx + c] - delta));
          }
        }
      }
    }

    // Vertical block boundary smoothing (y = 8, 16, 24...)
    for (let y = 8; y < height - 1; y += 8) {
      for (let x = 0; x < width; x++) {
        const topIdx = ((y - 1) * width + x) * 4;
        const bottomIdx = (y * width + x) * 4;

        for (let c = 0; c < 3; c++) {
          const diff = data[bottomIdx + c] - data[topIdx + c];
          if (Math.abs(diff) < threshold) {
            const delta = (diff / 2) * strength;
            data[topIdx + c] = Math.min(255, Math.max(0, data[topIdx + c] + delta));
            data[bottomIdx + c] = Math.min(255, Math.max(0, data[bottomIdx + c] - delta));
          }
        }
      }
    }
  }
}
