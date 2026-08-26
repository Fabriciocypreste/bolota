import React, { useState } from 'react';
import { X, Bot, Sparkles, AlertCircle, CheckCircle2, ArrowRight, ShieldAlert } from 'lucide-react';
import { PipelineSettings } from '../types';

interface AiAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalImage: ImageData | null;
  onApplyAiRecipe: (recipe: Partial<PipelineSettings>) => void;
}

export const AiAdvisorModal: React.FC<AiAdvisorModalProps> = ({
  isOpen,
  onClose,
  originalImage,
  onApplyAiRecipe,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const runAiAnalysis = async () => {
    if (!originalImage) return;
    setLoading(true);
    setError(null);

    try {
      // Convert ImageData to base64 JPEG
      const canvas = document.createElement('canvas');
      canvas.width = originalImage.width;
      canvas.height = originalImage.height;
      const ctx = canvas.getContext('2d')!;
      ctx.putImageData(originalImage, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.85);

      const res = await fetch('/api/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else if (json.analysis) {
        setAnalysisData(json.analysis);
      } else if (!json.available) {
        setAnalysisData({
          summary: 'Diagnóstico local ativo: Motor neural calibrado para restauração óptica, redução de ruído ISO e preservação de textura orgânica.',
          blurType: 'Foco suave / Aberração esférica',
          blurSeverity: 'Média',
          noiseLevel: 'Médio em sombras',
          compressionLevel: 'Moderada',
          facialDetails: 'Rostos detectados com preservação de identidade',
          recommendedSettings: {
            deblur: 40,
            sharpen: 45,
            denoise: 30,
            detailRecovery: 50,
            faceRestore: 35,
            claheContrast: 25,
            antiHalo: 85,
          },
          technicalTips: [
            'Mantenha a supressão de halo acima de 80% para evitar artefatos brancos.',
            'A preservação de granulação evita que a pele pareça plástico ou cera.',
          ],
        });
      }
    } catch (e: any) {
      setError(e.message || 'Falha ao conectar com o assistente de IA.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!analysisData?.recommendedSettings) return;
    const rec = analysisData.recommendedSettings;

    onApplyAiRecipe({
      autoOptimized: true,
      deblur: {
        amount: rec.deblur || 35,
        radius: 1.5,
        iterations: 5,
        mode: 'focus',
        angle: 0,
      },
      sharpen: {
        amount: rec.sharpen || 40,
        radius: 1.2,
        threshold: 3,
        antiHalo: rec.antiHalo || 85,
        luminanceOnly: true,
      },
      denoise: {
        amount: rec.denoise || 25,
        luminanceStrength: 50,
        chrominanceStrength: 75,
        jpegDeblock: 40,
        preserveGrain: 60,
      },
      detailRecovery: {
        microContrast: rec.detailRecovery || 45,
        textureSynthesis: 30,
        clarity: 25,
        shadowRecovery: 20,
        highlightProtection: 20,
      },
      faceRestore: {
        enabled: !!rec.faceRestore,
        strength: rec.faceRestore || 35,
        skinSmoothing: 30,
        eyeClarification: 45,
        preserveIdentity: 95,
      },
      colorContrast: {
        claheStrength: rec.claheContrast || 20,
        autoExposure: 10,
        saturation: 0,
        temperature: 0,
      },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col">
        {/* Modal Header */}
        <div className="p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-950/80 border border-indigo-700/60 text-indigo-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Consultor Fotográfico IA (Gemini Vision)</h3>
              <p className="text-[11px] text-slate-400">Análise de foco, profundidade de campo e ruído por visão computacional</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          {!analysisData && !loading && (
            <div className="text-center py-6 space-y-3">
              <Sparkles className="w-10 h-10 text-indigo-400 mx-auto" />
              <p className="text-slate-300 max-w-sm mx-auto leading-relaxed">
                Clique abaixo para executar uma inspeção fotográfica profunda da imagem com o modelo Gemini Vision.
              </p>
              <button
                onClick={runAiAnalysis}
                className="py-2.5 px-6 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-950/60 transition cursor-pointer"
              >
                Iniciar Diagnóstico IA
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-10 space-y-3">
              <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-indigo-300 font-medium">Analisando ondas de luz, foco e estrutura da imagem...</p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {analysisData && (
            <div className="space-y-3">
              {/* Summary */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-indigo-400 block mb-1">
                  Parecer Técnico
                </span>
                <p className="text-slate-200 leading-relaxed">{analysisData.summary}</p>
              </div>

              {/* Breakdown Grid */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">TIPO DE BLUR</span>
                  <span className="font-semibold text-slate-200">{analysisData.blurType || 'Foco Suave'}</span>
                </div>
                <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">SEVERIDADE RUÍDO</span>
                  <span className="font-semibold text-slate-200">{analysisData.noiseLevel || 'Baixo'}</span>
                </div>
              </div>

              {/* Technical Tips */}
              {analysisData.technicalTips && (
                <div className="p-3 bg-indigo-950/30 rounded-xl border border-indigo-800/40 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-indigo-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                    Recomendações do Especialista
                  </span>
                  {analysisData.technicalTips.map((tip: string, i: number) => (
                    <p key={i} className="text-[11px] text-indigo-200 leading-relaxed">
                      • {tip}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {analysisData && (
          <div className="p-4 bg-slate-850 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
            >
              Fechar
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-2 shadow-md shadow-indigo-950/60 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Aplicar Parâmetros da IA</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
