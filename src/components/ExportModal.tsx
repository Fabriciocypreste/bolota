import React, { useState } from 'react';
import { 
  X, 
  Download, 
  FileImage, 
  ShieldCheck, 
  Printer, 
  Sparkles, 
  Layers, 
  Crop, 
  FileText, 
  CheckCircle2, 
  Sliders
} from 'lucide-react';
import { ExportConfig } from '../types';
import { 
  RasterPrintEngine, 
  STANDARD_PAPER_SIZES, 
  PrintExportOptions 
} from '../services/rasterPrintEngine';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  processedImage: ImageData | null;
  defaultFilename: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  processedImage,
  defaultFilename,
}) => {
  const [activeTab, setActiveTab] = useState<'standard' | 'print'>('print');

  // Standard Web Config
  const [config, setConfig] = useState<ExportConfig>({
    format: 'image/png',
    quality: 95,
    scale: 1,
    filename: defaultFilename.replace(/\.[^/.]+$/, '') + '_magic_bolota_hd',
    preserveMetadata: true,
  });

  // Print Mode Config
  const [printOptions, setPrintOptions] = useState<PrintExportOptions>({
    paperSize: 'a4',
    dpi: 300,
    orientation: 'auto',
    fitMode: 'fill',
    includeBleed: true,
    bleedMm: 3,
    includeCropMarks: true,
    paperProfile: 'coated-glossy',
    exportType: 'pdf',
    cmykSimulation: true,
    targetQuality: 98,
    filename: defaultFilename.replace(/\.[^/.]+$/, '') + '_print_300dpi',
  });

  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen || !processedImage) return null;

  // Standard calculation
  const currentW = processedImage.width * config.scale;
  const currentH = processedImage.height * config.scale;
  const megapixels = ((currentW * currentH) / 1_000_000).toFixed(2);

  // Print calculation
  const targetPaper = STANDARD_PAPER_SIZES[printOptions.paperSize] || STANDARD_PAPER_SIZES['a4'];
  const paperWMm = targetPaper.widthMm;
  const paperHMm = targetPaper.heightMm;
  const bleedMm = printOptions.includeBleed ? printOptions.bleedMm : 0;
  const printPixelsW = Math.round(((paperWMm + bleedMm * 2) / 25.4) * printOptions.dpi);
  const printPixelsH = Math.round(((paperHMm + bleedMm * 2) / 25.4) * printOptions.dpi);
  const printMegapixels = ((printPixelsW * printPixelsH) / 1_000_000).toFixed(2);

  // Handle standard download
  const handleStandardDownload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = currentW;
    canvas.height = currentH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (config.scale === 1) {
      ctx.putImageData(processedImage, 0, 0);
    } else {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = processedImage.width;
      tempCanvas.height = processedImage.height;
      const tCtx = tempCanvas.getContext('2d')!;
      tCtx.putImageData(processedImage, 0, 0);

      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(tempCanvas, 0, 0, currentW, currentH);
    }

    const ext = config.format === 'image/png' ? 'png' : config.format === 'image/jpeg' ? 'jpg' : 'webp';
    const mime = config.format;
    const dataUrl = canvas.toDataURL(mime, config.quality / 100);

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${config.filename}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onClose();
  };

  // Handle print export (PDF or High-res PNG/JPG)
  const handlePrintDownload = async () => {
    setIsExporting(true);
    try {
      // Yield to allow UI spinner
      await new Promise((r) => setTimeout(r, 40));

      const { canvas, finalWidthMm, finalHeightMm } = RasterPrintEngine.createPrintReadyCanvas(
        processedImage,
        printOptions
      );

      if (printOptions.exportType === 'pdf') {
        RasterPrintEngine.exportToPdf(
          canvas,
          finalWidthMm,
          finalHeightMm,
          printOptions.filename
        );
      } else {
        const ext = printOptions.exportType === 'png' ? 'png' : 'jpg';
        const mime = printOptions.exportType === 'png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mime, 0.98);

        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${printOptions.filename}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      onClose();
    } catch (err: any) {
      alert(`Erro na exportação para impressão: ${err?.message || 'Falha inesperada'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {activeTab === 'print' ? (
              <Printer className="w-5 h-5 text-emerald-400" />
            ) : (
              <FileImage className="w-5 h-5 text-cyan-400" />
            )}
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                {activeTab === 'print' ? 'Exportar Imagem para Impressão (300 DPI)' : 'Exportar Imagem Digital'}
              </h3>
              <p className="text-[10px] text-slate-400">
                {activeTab === 'print' 
                  ? 'Gera arquivo rasterizado com calibração física de DPI, sangria e marcas de corte' 
                  : 'Salva imagem para uso em telas, web e redes sociais'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switch Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1 gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('print')}
            id="tab-export-print"
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'print'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Pronto para Impressão (300 DPI / PDF)</span>
          </button>

          <button
            onClick={() => setActiveTab('standard')}
            id="tab-export-standard"
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'standard'
                ? 'bg-slate-800 text-cyan-300 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <FileImage className="w-4 h-4 text-cyan-400" />
            <span>Digital / Web (PNG, JPG)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto custom-scrollbar flex-1">
          {activeTab === 'print' ? (
            /* PRINT MODE OPTIONS */
            <div className="space-y-4">
              {/* Paper Format Selection */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-200 flex items-center justify-between">
                  <span>1. Formato Físico do Papel</span>
                  <span className="text-[11px] font-mono text-emerald-400 font-normal">
                    {targetPaper.widthMm} × {targetPaper.heightMm} mm
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(STANDARD_PAPER_SIZES).map(([key, item]) => (
                    <button
                      key={key}
                      onClick={() => setPrintOptions({ ...printOptions, paperSize: key as any })}
                      className={`p-2 rounded-xl border flex flex-col items-center text-center gap-0.5 transition cursor-pointer ${
                        printOptions.paperSize === key
                          ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-xs font-bold">{key.toUpperCase()}</span>
                      <span className="text-[9px] text-slate-500 truncate w-full">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target DPI and Bleed */}
              <div className="grid grid-cols-2 gap-3">
                {/* Target DPI */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200">2. Densidade / Resolução</label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    {([150, 300, 600] as const).map((dpi) => (
                      <button
                        key={dpi}
                        onClick={() => setPrintOptions({ ...printOptions, dpi })}
                        className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          printOptions.dpi === dpi
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {dpi} DPI
                      </button>
                    ))}
                  </div>
                </div>

                {/* Export Format */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200">3. Tipo de Arquivo</label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    {[
                      { id: 'pdf', label: 'PDF Gráfico' },
                      { id: 'png', label: 'PNG HD' },
                      { id: 'jpeg', label: 'JPG 300DPI' },
                    ].map((fmt) => (
                      <button
                        key={fmt.id}
                        onClick={() => setPrintOptions({ ...printOptions, exportType: fmt.id as any })}
                        className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          printOptions.exportType === fmt.id
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {fmt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Print Bleed & Crop Marks Toggles */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Opções de Acabamento Gráfico
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-200 font-semibold block">Sangria de Segurança (Bleed 3mm)</span>
                    <span className="text-[10px] text-slate-400">Evita bordas brancas indesejadas no refile</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={printOptions.includeBleed}
                    onChange={(e) => setPrintOptions({ ...printOptions, includeBleed: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-900">
                  <div>
                    <span className="text-slate-200 font-semibold block">Marcas de Corte (Crop Marks)</span>
                    <span className="text-[10px] text-slate-400">Gera guias de corte e identificação técnica</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={printOptions.includeCropMarks}
                    onChange={(e) => setPrintOptions({ ...printOptions, includeCropMarks: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* File Name */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-200">Nome do Arquivo</label>
                <input
                  type="text"
                  value={printOptions.filename}
                  onChange={(e) => setPrintOptions({ ...printOptions, filename: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-xs"
                />
              </div>

              {/* Print Summary Specs Card */}
              <div className="p-3.5 bg-gradient-to-br from-slate-950 to-emerald-950/30 rounded-xl border border-emerald-800/40 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ESPECIFICAÇÃO DE IMPRESSÃO GERADA
                  </span>
                  <span className="text-emerald-300 font-bold">{printOptions.dpi} DPI REAL</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-slate-300 pt-1 border-t border-slate-800/80">
                  <div>
                    <span className="text-slate-500 block text-[9px]">TAMANHO FÍSICO</span>
                    <span className="font-bold text-slate-200">{(paperWMm / 10).toFixed(1)} × {(paperHMm / 10).toFixed(1)} cm</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">RASTERIZAÇÃO</span>
                    <span className="font-bold text-slate-200">{printPixelsW} × {printPixelsH} px</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">MEGAPIXELS</span>
                    <span className="font-bold text-emerald-400">{printMegapixels} MP</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* STANDARD DIGITAL MODE */
            <div className="space-y-4">
              {/* Format Selector */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Formato de Saída</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { fmt: 'image/png' as const, label: 'PNG', note: 'Sem Perdas (Lossless)' },
                    { fmt: 'image/jpeg' as const, label: 'JPG', note: 'Fotográfico Padrão' },
                    { fmt: 'image/webp' as const, label: 'WEBP', note: 'Alta Eficiência Web' },
                  ].map((item) => (
                    <button
                      key={item.fmt}
                      onClick={() => setConfig({ ...config, format: item.fmt })}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer ${
                        config.format === item.fmt
                          ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-sm font-bold">{item.label}</span>
                      <span className="text-[10px] text-slate-500 text-center">{item.note}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality Slider (for JPG & WEBP) */}
              {config.format !== 'image/png' && (
                <div className="space-y-1 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="flex justify-between text-slate-300">
                    <span>Qualidade de Compressão</span>
                    <span className="font-mono text-cyan-400 font-bold">{config.quality}%</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={100}
                    value={config.quality}
                    onChange={(e) => setConfig({ ...config, quality: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
              )}

              {/* File Name input */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Nome do Arquivo</label>
                <input
                  type="text"
                  value={config.filename}
                  onChange={(e) => setConfig({ ...config, filename: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-xs"
                />
              </div>

              {/* Specs Card */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-slate-400 font-mono text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px]">RESOLUÇÃO FINAL</span>
                  <span className="text-slate-200 font-bold">{currentW} × {currentH} px</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">MEGAPIXELS</span>
                  <span className="text-slate-200 font-bold">{megapixels} MP</span>
                </div>
              </div>
            </div>
          )}

          {/* Safety Notice */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-850 p-2.5 rounded-lg border border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Processamento 100% local e seguro com preservação total de qualidade.</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-850 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
          >
            Cancelar
          </button>

          {activeTab === 'print' ? (
            <button
              onClick={handlePrintDownload}
              id="btn-confirm-print-export"
              disabled={isExporting}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold flex items-center gap-2 shadow-md shadow-emerald-950/60 transition cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>{isExporting ? 'Processando Impressão...' : `Exportar ${printOptions.exportType.toUpperCase()} (300 DPI)`}</span>
            </button>
          ) : (
            <button
              onClick={handleStandardDownload}
              id="btn-confirm-export"
              className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-2 shadow-md shadow-cyan-950/60 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Salvar Imagem Digital</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
