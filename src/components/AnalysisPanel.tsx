import React from 'react';
import { 
  BarChart2, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Focus, 
  Volume2, 
  Grid, 
  User, 
  Sun, 
  Layers,
  ArrowRight,
  Printer
} from 'lucide-react';
import { ImageAnalysisMetrics } from '../types';

interface AnalysisPanelProps {
  metrics: ImageAnalysisMetrics | null;
  onApplyAutoSettings: () => void;
  isAutoApplied: boolean;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  metrics,
  onApplyAutoSettings,
  isAutoApplied,
}) => {
  if (!metrics) {
    return (
      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 text-center text-xs text-slate-400">
        Carregue uma imagem para ver o diagnóstico óptico inteligente.
      </div>
    );
  }

  const getMetricColor = (score: number, invert: boolean = false) => {
    const val = invert ? 100 - score : score;
    if (val < 30) return 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60';
    if (val < 65) return 'text-amber-400 bg-amber-950/60 border-amber-800/60';
    return 'text-rose-400 bg-rose-950/60 border-rose-800/60';
  };

  const getProgressBarColor = (score: number) => {
    if (score < 30) return 'bg-emerald-500';
    if (score < 65) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Diagnóstico Óptico Automático
          </h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
          {metrics.width}×{metrics.height} ({metrics.megapixels} MP)
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Dominant Diagnosis Summary */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/90 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Diagnóstico do Sistema
            </span>
            <span className="text-[11px] text-cyan-400 font-mono">
              Preset sugerido: <strong className="uppercase">{metrics.recommendedPreset}</strong>
            </span>
          </div>

          <div className="space-y-1">
            {metrics.dominantIssues.length > 0 ? (
              metrics.dominantIssues.map((issue, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>{issue}</span>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Excelente nitidez e relação sinal/ruído.</span>
              </div>
            )}
          </div>
        </div>

        {/* Metric Gauges Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* 1. Defocus / Blur */}
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="flex items-center gap-1">
                <Focus className="w-3 h-3 text-cyan-400" />
                Nível de Blur
              </span>
              <span className="font-mono font-bold text-slate-200">{metrics.blurScore}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${getProgressBarColor(metrics.blurScore)}`}
                style={{ width: `${metrics.blurScore}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
              <span>Foco Ótimo</span>
              <span>{metrics.blurScore > 50 ? 'Desfocada' : 'Aceitável'}</span>
            </div>
          </div>

          {/* 2. Noise Level */}
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="flex items-center gap-1">
                <Volume2 className="w-3 h-3 text-amber-400" />
                Ruído ISO
              </span>
              <span className="font-mono font-bold text-slate-200">{metrics.noiseLevel}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${getProgressBarColor(metrics.noiseLevel)}`}
                style={{ width: `${metrics.noiseLevel}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
              <span>Limpo</span>
              <span>{metrics.noiseLevel > 40 ? 'Granulado' : 'Baixo'}</span>
            </div>
          </div>

          {/* 3. JPEG Compression */}
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="flex items-center gap-1">
                <Grid className="w-3 h-3 text-indigo-400" />
                Blocos JPEG
              </span>
              <span className="font-mono font-bold text-slate-200">{metrics.compressionArtifacts}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${getProgressBarColor(metrics.compressionArtifacts)}`}
                style={{ width: `${metrics.compressionArtifacts}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
              <span>Sem blocos</span>
              <span>{metrics.compressionArtifacts > 40 ? 'Comprimido' : 'Suave'}</span>
            </div>
          </div>

          {/* 4. Lost Micro-Details */}
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="flex items-center gap-1">
                <Layers className="w-3 h-3 text-emerald-400" />
                Perda Detalhe
              </span>
              <span className="font-mono font-bold text-slate-200">{metrics.lostDetailsScore}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${getProgressBarColor(metrics.lostDetailsScore)}`}
                style={{ width: `${metrics.lostDetailsScore}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
              <span>Rico</span>
              <span>{metrics.lostDetailsScore > 50 ? 'Atenuado' : 'Bom'}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Details: Face presence & Dynamic range */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <User className="w-4 h-4 text-pink-400" />
            <span>Presença Facial:</span>
            <span className={`font-semibold ${metrics.faceDetected ? 'text-pink-300' : 'text-slate-500'}`}>
              {metrics.faceDetected ? 'Detectado (Proteção Ativa)' : 'Não detectado'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400">
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>Contraste: {metrics.contrastScore}%</span>
          </div>
        </div>

        {/* Print Diagnostic & Physical Sizing Card */}
        {metrics.printMetrics && (
          <div className="p-3 rounded-lg bg-slate-950/90 border border-emerald-900/40 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-300 flex items-center gap-1.5 text-[11px]">
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                Diagnóstico de Impressão (300 DPI)
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/80">
                {metrics.printMetrics.dpiAtA4} DPI em A4
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Tamanho Máx 300 DPI</span>
                <span className="font-mono font-bold text-slate-200">
                  {metrics.printMetrics.maxPrintCm300Dpi.width} × {metrics.printMetrics.maxPrintCm300Dpi.height} cm
                </span>
              </div>

              <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Formatos Prontos</span>
                <span className="font-mono font-bold text-emerald-400 truncate block">
                  {metrics.printMetrics.suitableFormats[0] || '10×15 cm Foto'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-900">
              <span>Estimativa Cobertura CMYK:</span>
              <span className="font-mono text-slate-300">
                C:{metrics.printMetrics.cmykCoverageEstimate.c}% M:{metrics.printMetrics.cmykCoverageEstimate.m}% Y:{metrics.printMetrics.cmykCoverageEstimate.y}% K:{metrics.printMetrics.cmykCoverageEstimate.k}% (TAC {metrics.printMetrics.cmykCoverageEstimate.totalInk}%)
              </span>
            </div>
          </div>
        )}

        {/* Auto Apply Button */}
        <button
          onClick={onApplyAutoSettings}
          id="btn-apply-analysis-auto"
          className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-950/50 flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-cyan-200" />
          <span>Aplicar Correção Inteligente (AUTO)</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
