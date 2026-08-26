import { GpuCapabilities } from '../types';

export class GpuManager {
  private static cachedCaps: GpuCapabilities | null = null;

  public static async detectCapabilities(): Promise<GpuCapabilities> {
    if (this.cachedCaps) return this.cachedCaps;

    let webgl2 = false;
    let webgpu = false;
    let rendererName = 'Canvas 2D Engine';
    let vendorName = 'Software / CPU';
    let maxTextureSize = 4096;
    let tier: GpuCapabilities['tier'] = 'CPU Software Fallback';

    // 1. Probe WebGL2 & Unmasked Renderer info
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (gl) {
        webgl2 = true;
        maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;

        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          rendererName = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'WebGL Accelerated Device';
          vendorName = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'Hardware Vendor';
        }

        const lowerRenderer = rendererName.toLowerCase();
        if (lowerRenderer.includes('nvidia') || lowerRenderer.includes('geforce') || lowerRenderer.includes('rtx') || lowerRenderer.includes('quadro')) {
          tier = 'NVIDIA/AMD Discrete';
          vendorName = 'NVIDIA (CUDA Accelerated)';
        } else if (lowerRenderer.includes('amd') || lowerRenderer.includes('radeon') || lowerRenderer.includes('rx')) {
          tier = 'NVIDIA/AMD Discrete';
          vendorName = 'AMD Radeon (DirectML / OpenCL)';
        } else if (lowerRenderer.includes('intel') || lowerRenderer.includes('iris') || lowerRenderer.includes('apple') || lowerRenderer.includes('m1') || lowerRenderer.includes('m2') || lowerRenderer.includes('m3') || lowerRenderer.includes('m4')) {
          tier = 'Intel/Apple Integrated';
          vendorName = 'Hardware Integrated GPU (Metal/DirectX)';
        }
      }
    } catch (e) {
      console.warn('WebGL detection error', e);
    }

    // 2. Probe WebGPU
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).gpu) {
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (adapter) {
          webgpu = true;
          if (adapter.info?.description) {
            rendererName = adapter.info.description;
          }
        }
      }
    } catch (e) {
      // WebGPU optional
    }

    const threadsAvailable = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4;

    this.cachedCaps = {
      webgl2,
      webgpu,
      rendererName,
      vendorName,
      tier,
      maxTextureSize,
      threadsAvailable,
    };

    return this.cachedCaps;
  }
}
