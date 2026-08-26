import { PipelineSettings } from '../types';

export class SharpenEngine {
  /**
   * Anti-Halo Edge-Adaptive Sharpening Engine
   * Enforces strict anti-oversharpening guards and prevents white/black border halos.
   */
  public static process(
    input: ImageData,
    settings: PipelineSettings['sharpen']
  ): ImageData {
    const { amount, radius, threshold, antiHalo, luminanceOnly } = settings;
    if (amount <= 0) return input;

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

    // 1. Generate Gaussian Blurred baseline of Luminance
    const blurredY = this.gaussianBlur(Y, width, height, radius);

    // 2. Unsharp Masking with Thresholding & Anti-Halo Control
    const sharpenFactor = (amount / 100) * 1.5;
    const haloDampener = 1.0 - (antiHalo / 100) * 0.75; // Clamps peak white excursions
    const darkHaloDampener = 1.0 - (antiHalo / 100) * 0.45;

    for (let i = 0; i < totalPixels; i++) {
      const original = Y[i];
      const blur = blurredY[i];
      const diff = original - blur;

      // Threshold check: ignore micro noise fluctuations below threshold
      if (Math.abs(diff) > threshold) {
        // Sign-dependent halo suppression (human eye notices light halos much more than dark edges)
        let boost = diff * sharpenFactor;
        if (boost > 0) {
          boost *= haloDampener;
          // Asymmetric clamp on white edges
          if (boost > 30) boost = 30 + (boost - 30) * 0.3;
        } else {
          boost *= darkHaloDampener;
          if (boost < -35) boost = -35 + (boost + 35) * 0.4;
        }

        Y[i] = Math.min(255, Math.max(0, original + boost));
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
   * Fast separable Gaussian blur on 1D float array
   */
  private static gaussianBlur(
    src: Float32Array,
    width: number,
    height: number,
    radius: number
  ): Float32Array {
    const kRadius = Math.max(1, Math.min(4, Math.round(radius)));
    const sigma = Math.max(0.5, radius / 1.5);
    const kernelSize = kRadius * 2 + 1;
    const kernel = new Float32Array(kernelSize);
    let sum = 0;

    for (let i = -kRadius; i <= kRadius; i++) {
      const v = Math.exp(-(i * i) / (2 * sigma * sigma));
      kernel[i + kRadius] = v;
      sum += v;
    }
    for (let i = 0; i < kernelSize; i++) kernel[i] /= sum;

    const temp = new Float32Array(width * height);
    const dst = new Float32Array(width * height);

    // Horizontal Pass
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        let acc = 0;
        for (let k = -kRadius; k <= kRadius; k++) {
          const sx = Math.min(width - 1, Math.max(0, x + k));
          acc += src[row + sx] * kernel[k + kRadius];
        }
        temp[row + x] = acc;
      }
    }

    // Vertical Pass
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let acc = 0;
        for (let k = -kRadius; k <= kRadius; k++) {
          const sy = Math.min(height - 1, Math.max(0, y + k));
          acc += temp[sy * width + x] * kernel[k + kRadius];
        }
        dst[y * width + x] = acc;
      }
    }

    return dst;
  }
}
