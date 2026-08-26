import { PipelineSettings } from '../types';

export class DeblurEngine {
  /**
   * Richardson-Lucy Iterative Deconvolution & Focus Recovery Engine
   * Restores lost optical contours from defocus blur and motion blur.
   */
  public static process(
    input: ImageData,
    settings: PipelineSettings['deblur']
  ): ImageData {
    const { amount, radius, iterations, mode, angle } = settings;
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

    // Extract YCbCr
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const r = src[idx];
      const g = src[idx + 1];
      const b = src[idx + 2];
      Y[i] = 0.299 * r + 0.587 * g + 0.114 * b;
      Cb[i] = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      Cr[i] = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    }

    // 1. Build PSF (Point Spread Function) Kernel
    const effectiveRadius = Math.max(1, Math.min(4, Math.round(radius)));
    const kernelSize = effectiveRadius * 2 + 1;
    const kernel = this.buildPsfKernel(kernelSize, effectiveRadius, mode, angle);

    // 2. Richardson-Lucy Deconvolution Iterations on Luminance
    // u_{t+1} = u_t * ( (d / (u_t conv h)) conv h_transposed )
    let estimate = new Float32Array(Y);
    const effectiveIterations = Math.max(1, Math.min(8, Math.round(iterations * (amount / 100))));

    for (let iter = 0; iter < effectiveIterations; iter++) {
      // Step A: Convolve current estimate with PSF (forward blur)
      const reblurred = this.convolve(estimate, width, height, kernel, kernelSize);

      // Step B: Relative blur error ratio (observed / reblurred)
      const ratio = new Float32Array(totalPixels);
      for (let i = 0; i < totalPixels; i++) {
        const denom = Math.max(0.1, reblurred[i]);
        ratio[i] = Y[i] / denom;
      }

      // Step C: Convolve ratio with transposed PSF (back-projection)
      const backprojected = this.convolve(ratio, width, height, kernel, kernelSize);

      // Step D: Update estimate with ringing dampening
      for (let i = 0; i < totalPixels; i++) {
        // Dampening factor to prevent edge oscillations
        const correction = backprojected[i];
        const dampedCorrection = Math.max(0.5, Math.min(1.8, correction));
        estimate[i] = Math.max(0, Math.min(255, estimate[i] * dampedCorrection));
      }
    }

    // 3. Blend deblurred luminance according to amount (0 - 100)
    const blendFactor = (amount / 100) * 0.85; // conservative to prevent harsh edges
    for (let i = 0; i < totalPixels; i++) {
      Y[i] = Y[i] * (1 - blendFactor) + estimate[i] * blendFactor;
    }

    // Convert back to RGB
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
   * Generates normalized Point Spread Function (PSF) kernel
   */
  private static buildPsfKernel(
    size: number,
    radius: number,
    mode: 'focus' | 'motion' | 'gaussian',
    angleDeg: number
  ): Float32Array {
    const kernel = new Float32Array(size * size);
    const half = Math.floor(size / 2);
    let sum = 0;

    if (mode === 'motion') {
      const rad = (angleDeg * Math.PI) / 180;
      const cosA = Math.cos(rad);
      const sinA = Math.sin(rad);

      for (let y = -half; y <= half; y++) {
        for (let x = -half; x <= half; x++) {
          // Distance along the motion vector line
          const distAlongLine = x * cosA + y * sinA;
          const distPerp = Math.abs(-x * sinA + y * cosA);

          if (Math.abs(distAlongLine) <= radius && distPerp <= 0.75) {
            const val = 1.0 - (distPerp / 0.75) * 0.4;
            const kIdx = (y + half) * size + (x + half);
            kernel[kIdx] = val;
            sum += val;
          }
        }
      }
    } else if (mode === 'focus') {
      // Pillbox / Disc defocus kernel with smooth edge roll-off
      for (let y = -half; y <= half; y++) {
        for (let x = -half; x <= half; x++) {
          const dist = Math.sqrt(x * x + y * y);
          if (dist <= radius) {
            const val = dist < radius - 0.5 ? 1.0 : (radius + 0.5 - dist);
            const kIdx = (y + half) * size + (x + half);
            kernel[kIdx] = val;
            sum += val;
          }
        }
      }
    } else {
      // Gaussian kernel
      const sigma = radius / 2;
      for (let y = -half; y <= half; y++) {
        for (let x = -half; x <= half; x++) {
          const distSq = x * x + y * y;
          const val = Math.exp(-distSq / (2 * sigma * sigma));
          const kIdx = (y + half) * size + (x + half);
          kernel[kIdx] = val;
          sum += val;
        }
      }
    }

    // Normalize so sum equals 1.0
    if (sum > 0) {
      for (let i = 0; i < kernel.length; i++) {
        kernel[i] /= sum;
      }
    } else {
      kernel[half * size + half] = 1.0;
    }

    return kernel;
  }

  /**
   * 2D spatial convolution on float buffer with edge mirroring
   */
  private static convolve(
    src: Float32Array,
    width: number,
    height: number,
    kernel: Float32Array,
    kSize: number
  ): Float32Array {
    const dst = new Float32Array(width * height);
    const half = Math.floor(kSize / 2);

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        let acc = 0;
        let kIdx = 0;

        for (let ky = -half; ky <= half; ky++) {
          const sy = Math.min(height - 1, Math.max(0, y + ky));
          const sRow = sy * width;

          for (let kx = -half; kx <= half; kx++) {
            const sx = Math.min(width - 1, Math.max(0, x + kx));
            acc += src[sRow + sx] * kernel[kIdx++];
          }
        }

        dst[rowOffset + x] = acc;
      }
    }

    return dst;
  }
}
