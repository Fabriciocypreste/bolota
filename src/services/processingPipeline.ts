import { PipelineSettings, ProcessingProgress } from '../types';
import { DenoiseEngine } from './denoiseEngine';
import { DeblurEngine } from './deblurEngine';
import { SharpenEngine } from './sharpenEngine';
import { DetailRecoveryEngine } from './detailRecoveryEngine';
import { FaceRestoreEngine } from './faceRestoreEngine';
import { UpscaleEngine } from './upscaleEngine';
import { RasterPrintEngine } from './rasterPrintEngine';

export class ProcessingPipeline {
  private static isCancelled = false;

  public static cancel() {
    this.isCancelled = true;
  }

  /**
   * Executes the complete modular processing pipeline in technically optimal order:
   * 1. Denoise & JPEG Deblocking (removes high-frequency noise before sharpening)
   * 2. Deblur / Focus Deconvolution (restores blurred optical waveforms)
   * 3. Micro-Detail & CLAHE Local Contrast (restores micro-texture and shadow/highlight range)
   * 4. Sharpen (Luminance anti-halo definition)
   * 5. Super-Resolution Upscaling (1x, 2x, 4x)
   * 6. Face Micro-Texture Refinement (identity-preserving skin/eye enhancement)
   * 7. Print Rasterization & Paper Calibration (300 DPI dot gain, CMYK & Halftoning)
   * 8. Final Validation & Output
   */
  public static async execute(
    sourceImage: ImageData,
    settings: PipelineSettings,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<ImageData> {
    this.isCancelled = false;
    const startTime = performance.now();

    const stages = [
      'Inicializando pipeline...',
      'Reduzindo ruído e compressão JPEG...',
      'Recuperando foco e deconvolução óptica...',
      'Sintetizando micro-detalhes e CLAHE...',
      'Aplicando nitidez anti-halo...',
      'Processando Super-Resolution / Upscale...',
      'Refinando textura facial e identidade...',
      'Otimizando rasteirização e perfil de impressão...',
      'Validação final e ajuste de saída...',
    ];

    const reportProgress = (stageIndex: number) => {
      if (onProgress) {
        const percent = Math.round((stageIndex / (stages.length - 1)) * 100);
        const elapsedMs = Math.round(performance.now() - startTime);
        onProgress({
          stage: stages[stageIndex],
          stageIndex,
          totalStages: stages.length,
          percent,
          isProcessing: true,
          startTime,
          elapsedMs,
        });
      }
    };

    // Yield control to event loop so UI stays snappy and updates progress
    const yieldThread = () => new Promise((resolve) => setTimeout(resolve, 8));

    try {
      reportProgress(0);
      await yieldThread();
      if (this.isCancelled) throw new Error('Processamento cancelado pelo usuário');

      // Create mutable copy
      let current = new ImageData(
        new Uint8ClampedArray(sourceImage.data),
        sourceImage.width,
        sourceImage.height
      );

      // Stage 1: Denoise & JPEG Deblock
      reportProgress(1);
      await yieldThread();
      if (this.isCancelled) throw new Error('Processamento cancelado pelo usuário');
      current = DenoiseEngine.process(current, settings.denoise);

      // Stage 2: Deblur / Focus Recovery
      reportProgress(2);
      await yieldThread();
      if (this.isCancelled) throw new Error('Processamento cancelado pelo usuário');
      current = DeblurEngine.process(current, settings.deblur);

      // Stage 3: Detail Recovery & CLAHE Contrast
      reportProgress(3);
      await yieldThread();
      if (this.isCancelled) throw new Error('Processamento cancelado pelo usuário');
      current = DetailRecoveryEngine.process(current, settings.detailRecovery, settings.colorContrast);

      // Stage 4: Sharpening (Anti-Halo USM)
      reportProgress(4);
      await yieldThread();
      if (this.isCancelled) throw new Error('Processamento cancelado pelo usuário');
      current = SharpenEngine.process(current, settings.sharpen);

      // Stage 5: Upscale Super-Resolution
      reportProgress(5);
      await yieldThread();
      if (this.isCancelled) throw new Error('Processamento cancelado pelo usuário');
      if (settings.upscale.scale > 1) {
        current = UpscaleEngine.process(current, settings.upscale);
      }

      // Stage 6: Face Micro-Texture Refinement
      reportProgress(6);
      await yieldThread();
      if (this.isCancelled) throw new Error('Processamento cancelado pelo usuário');
      if (settings.faceRestore.enabled && settings.faceRestore.strength > 0) {
        current = FaceRestoreEngine.process(current, settings.faceRestore);
      }

      // Stage 7: Print Rasterization & Paper Calibration
      reportProgress(7);
      await yieldThread();
      if (this.isCancelled) throw new Error('Processamento cancelado pelo usuário');
      if (settings.rasterPrint && settings.rasterPrint.enabled) {
        current = RasterPrintEngine.process(current, settings.rasterPrint);
      }

      // Stage 8: Final Validation
      reportProgress(8);
      await yieldThread();

      if (onProgress) {
        const elapsedMs = Math.round(performance.now() - startTime);
        onProgress({
          stage: 'Concluído com sucesso',
          stageIndex: stages.length - 1,
          totalStages: stages.length,
          percent: 100,
          isProcessing: false,
          startTime,
          elapsedMs,
        });
      }

      return current;
    } catch (err: any) {
      if (onProgress) {
        onProgress({
          stage: err.message || 'Processamento interrompido',
          stageIndex: 0,
          totalStages: stages.length,
          percent: 0,
          isProcessing: false,
        });
      }
      throw err;
    }
  }
}
