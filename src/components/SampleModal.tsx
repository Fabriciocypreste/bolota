import React from 'react';
import { X, Image as ImageIcon, Sparkles, Check } from 'lucide-react';
import { SampleImageService, SampleImageMeta } from '../services/sampleImages';

interface SampleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSample: (sample: SampleImageMeta) => void;
}

export const SampleModal: React.FC<SampleModalProps> = ({
  isOpen,
  onClose,
  onSelectSample,
}) => {
  if (!isOpen) return null;

  const samples = SampleImageService.getSamples();

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-100">Galeria de Fotografias de Teste</h3>
              <p className="text-[11px] text-slate-400">Selecione uma imagem com defeito real para avaliar o motor de restauração</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Grid */}
        <div className="p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 custom-scrollbar">
          {samples.map((sample) => (
            <div
              key={sample.id}
              onClick={() => {
                onSelectSample(sample);
                onClose();
              }}
              className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/80 hover:bg-slate-900/90 transition shadow-sm cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded">
                    {sample.category}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">{sample.width}×{sample.height}</span>
                </div>

                <h4 className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition">
                  {sample.name}
                </h4>

                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  {sample.description}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-amber-400/90">
                <span className="truncate pr-2">⚠️ {sample.defectType}</span>
                <span className="font-semibold text-cyan-400 group-hover:translate-x-0.5 transition shrink-0">Carregar →</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
