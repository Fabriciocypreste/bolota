import { PipelineSettings } from '../types';

export class FaceRestoreEngine {
  /**
   * Identity-Preserving Natural Face & Skin Detail Enhancer
   * Enhances skin micro-texture and eye clarity without inventing false features or plastic deformation.
   */
  public static process(
    input: ImageData,
    settings: PipelineSettings['faceRestore']
  ): ImageData {
    const { enabled, strength, skinSmoothing, eyeClarification, preserveIdentity } = settings;
    if (!enabled || strength <= 0) return input;

    const width = input.width;
    const height = input.height;
    const src = input.data;
    const output = new ImageData(new Uint8ClampedArray(src), width, height);
    const dst = output.data;

    const totalPixels = width * height;
    const isSkin = new Uint8Array(totalPixels);
    const Y = new Float32Array(totalPixels);
    const Cb = new Float32Array(totalPixels);
    const Cr = new Float32Array(totalPixels);

    // 1. Skin & Landmark Detection in YCbCr color space
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const r = src[idx];
      const g = src[idx + 1];
      const b = src[idx + 2];

      const yVal = 0.299 * r + 0.587 * g + 0.114 * b;
      const cbVal = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const crVal = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

      Y[i] = yVal;
      Cb[i] = cbVal;
      Cr[i] = crVal;

      if (cbVal >= 80 && cbVal <= 130 && crVal >= 133 && crVal <= 175 && yVal > 40 && yVal < 235) {
        if (r > g && g > b) {
          isSkin[i] = 1;
        }
      }
    }

    // 2. Pore-Preserving Skin Smoothing (Bilateral Filter restricted to skin mask)
    const smoothFactor = (skinSmoothing / 100) * (strength / 100);
    const identityFactor = preserveIdentity / 100; // 0.95 = strictly true to original
    const effectiveSmooth = smoothFactor * (1 - identityFactor * 0.4); // Cap max smoothing

    if (effectiveSmooth > 0.05) {
      const filteredY = new Float32Array(Y);
      const radius = 2;
      const sigmaColor = 12;

      for (let y = 2; y < height - 2; y++) {
        for (let x = 2; x < width - 2; x++) {
          const centerIdx = y * width + x;
          if (isSkin[centerIdx] === 0) continue;

          const centerY = Y[centerIdx];
          let weightSum = 0;
          let sum = 0;

          for (let dy = -radius; dy <= radius; dy++) {
            const ny = y + dy;
            for (let dx = -radius; dx <= radius; dx++) {
              const nx = x + dx;
              const nIdx = ny * width + nx;
              const dY = Y[nIdx] - centerY;

              // Do not smooth across strong facial edges (lips, eyes, nostrils)
              if (Math.abs(dY) > 28) continue;

              const spatialDistSq = dx * dx + dy * dy;
              const w = Math.exp(-spatialDistSq / 4 - (dY * dY) / (2 * sigmaColor * sigmaColor));

              sum += Y[nIdx] * w;
              weightSum += w;
            }
          }

          if (weightSum > 0) {
            filteredY[centerIdx] = sum / weightSum;
          }
        }
      }

      // Blend filtered skin while maintaining 30% organic micro-pore texture
      for (let i = 0; i < totalPixels; i++) {
        if (isSkin[i] === 1) {
          const smooth = filteredY[i];
          const original = Y[i];
          const microPore = original - smooth;
          Y[i] = original * (1 - effectiveSmooth) + (smooth + microPore * 0.35) * effectiveSmooth;
        }
      }
    }

    // 3. Eye & Facial Contour Clarification (Subtle local micro-contrast around non-skin facial features)
    const eyeFactor = (eyeClarification / 100) * (strength / 100) * 0.4;
    if (eyeFactor > 0.05) {
      for (let y = 2; y < height - 2; y++) {
        for (let x = 2; x < width - 2; x++) {
          const idx = y * width + x;
          // Look for transition zones (eyes, eyelashes, iris edges)
          if (isSkin[idx] === 0 && (isSkin[idx - 1] === 1 || isSkin[idx + 1] === 1 || isSkin[idx - width] === 1 || isSkin[idx + width] === 1)) {
            const center = Y[idx];
            const localMean = (Y[idx - 1] + Y[idx + 1] + Y[idx - width] + Y[idx + width]) * 0.25;
            const diff = center - localMean;
            if (Math.abs(diff) < 25) {
              Y[idx] = Math.min(255, Math.max(0, center + diff * eyeFactor));
            }
          }
        }
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
}
