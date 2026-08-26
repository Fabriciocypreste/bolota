import React, { useState } from 'react';
import { 
  Sparkles, 
  Focus, 
  Volume2, 
  Sliders, 
  Layers, 
  User, 
  Maximize, 
  Sun, 
  ShieldCheck, 
  ChevronDown, 
  ChevronRight,
  RotateCcw,
  Zap,
  Info,
  Flame,
  History,
  Printer
} from 'lucide-react';
import { PipelineSettings, PresetId, HistoryEntry } from '../types';
import { HistoryPanel } from './HistoryPanel';

interface ControlsSidebarProps {
  settings: PipelineSettings;
  onChange: (newSettings: PipelineSettings) => void;
  activePreset: PresetId;
  onSelectPreset: (preset: PresetId) => void;
  onAutoCalculate: () => void;
  isProcessing: boolean;
  history: HistoryEntry[];
  currentHistoryId: string | null;
  onSelectHistoryVersion: (entry: HistoryEntry) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onSaveBookmark: (customName: string) => void;
  onDeleteHistoryEntry: (id: string) => void;
  onClearHistory: () => void;
  onRevertToOriginal: () => void;
  activeTab: 'settings' | 'history';
  onTabChange: (tab: 'settings' | 'history') => void;
}

export const ControlsSidebar: React.FC<ControlsSidebarProps> = ({
  settings,
  onChange,
  activePreset,
  onSelectPreset,
  onAutoCalculate,
  isProcessing,
  history,
  currentHistoryId,
  onSelectHistoryVersion,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onSaveBookmark,
  onDeleteHistoryEntry,
  onClearHistory,
  onRevertToOriginal,
  activeTab,
  onTabChange,
}) => {
  // Accordion state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    presets: true,
    rasterPrint: true,
    deblur: true,
    sharpen: true,
    denoise: false,
    detail: false,
    face: false,
    upscale: false,
    color: false,
    safety: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const presetsList: Array<{ id: PresetId; label: string; icon: string }> = [
    { id: 'auto', label: 'Automático', icon: '✨' },
    { id: 'print', label: 'Impressão 300DPI', icon: '🖨️' },
    { id: 'photo', label: 'Foto Geral', icon: '📷' },
    { id: 'face', label: 'Rosto / Retrato', icon: '👤' },
    { id: 'blurred', label: 'Desfocada', icon: '🎯' },
    { id: 'vintage', label: 'Imagem Antiga', icon: '🎞️' },
    { id: 'compressed', label: 'Comprimida', icon: '📦' },
    { id: 'lowres', label: 'Baixa Resolução', icon: '🔍' },
    { id: 'document', label: 'Texto / Doc', icon: '📄' },
    { id: 'product', label: 'Produto', icon: '🏷️' },
  ];

  const updateSetting = <K extends keyof PipelineSettings>(
    category: K,
    key: keyof PipelineSettings[K],
    value: any
  ) => {
    onChange({
      ...settings,
      autoOptimized: false,
      [category]: {
        ...(settings[category] as any),
        [key]: value,
      },
    });
  };

  return (
    <aside className="w-80 sm:w-88 bg-slate-900 border-l border-slate-800 flex flex-col h-full overflow-hidden select-none shrink-0 z-20">
      {/* Top Sidebar Tab Selector */}
      <div className="flex border-b border-slate-800 bg-slate-950/80 p-1 gap-1 shrink-0">
        <button
          onClick={() => onTabChange('settings')}
          id="tab-btn-settings"
          className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span>Ajustes</span>
        </button>

        <button
          onClick={() => onTabChange('history')}
          id="tab-btn-history"
          className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer relative ${
            activeTab === 'history'
              ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <History className="w-3.5 h-3.5 text-cyan-400" />
          <span>Histórico</span>
          {history.length > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
              {history.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'history' ? (
        <HistoryPanel
          history={history}
          currentHistoryId={currentHistoryId}
          onSelectVersion={onSelectHistoryVersion}
          onUndo={onUndo}
          onRedo={onRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          onSaveBookmark={onSaveBookmark}
          onDeleteEntry={onDeleteHistoryEntry}
          onClearHistory={onClearHistory}
          onRevertToOriginal={onRevertToOriginal}
        />
      ) : (
        <>
          {/* Sidebar Header & Auto Repair CTA */}
          <div className="p-3.5 bg-slate-850 border-b border-slate-800 shrink-0 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-cyan-400" />
                Parâmetros de Restauração
              </h2>
              <span className="text-[10px] text-slate-400 font-mono">v4.2 PRO</span>
            </div>

            {/* Master AUTO Optimization Button */}
            <button
              onClick={onAutoCalculate}
              id="btn-auto-calc-sidebar"
              disabled={isProcessing}
              className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-cyan-950/60 transition cursor-pointer"
              title="Calcula automaticamente valores adequados com base no diagnóstico da imagem"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
              <span>AUTO (Ajuste Ideal Inteligente)</span>
            </button>
          </div>

          {/* Scrollable Control Accordions */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
            {/* 1. Presets Horizontal Grid */}
            <div className="bg-slate-950/80 rounded-xl border border-slate-800/80 p-2.5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Modos / Presets</span>
                <span className="text-[10px] text-cyan-400 lowercase">{activePreset}</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {presetsList.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onSelectPreset(p.id)}
                    id={`preset-${p.id}`}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium flex flex-col items-center gap-1 transition cursor-pointer ${
                      activePreset === p.id
                        ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500 shadow-sm'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800/80'
                    }`}
                  >
                    <span className="text-sm">{p.icon}</span>
                    <span className="truncate w-full text-center text-[10px]">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Print & Rasterization Engine */}
            <div className="bg-slate-950/80 rounded-xl border border-slate-800/80 overflow-hidden">
              <button
                onClick={() => toggleSection('rasterPrint')}
                id="btn-accordion-raster-print"
                className="w-full px-3 py-2.5 bg-slate-900/60 hover:bg-slate-850 text-left flex items-center justify-between transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-200">Rasteirização & Impressão (300 DPI)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    settings.rasterPrint?.enabled 
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                      : 'text-slate-500'
                  }`}>
                    {settings.rasterPrint?.enabled ? `${settings.rasterPrint.targetDpi} DPI` : 'Desativado'}
                  </span>
                  {openSections.rasterPrint ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {openSections.rasterPrint && (
                <div className="p-3 space-y-3 border-t border-slate-800/60">
                  {/* Enable Switch */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                    <div>
                      <span className="text-xs font-semibold text-slate-200 block">Modo Otimização Gráfica</span>
                      <span className="text-[10px] text-slate-400">Compensa ganho de ponto e prepara para tinta física</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.rasterPrint?.enabled ?? false}
                      onChange={(e) => updateSetting('rasterPrint', 'enabled', e.target.checked)}
                      className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                    />
                  </div>

                  {settings.rasterPrint?.enabled && (
                    <>
                      {/* Target DPI */}
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400">Resolução Alvo (Densidade)</label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {([150, 300, 600] as const).map((dpi) => (
                            <button
                              key={dpi}
                              onClick={() => updateSetting('rasterPrint', 'targetDpi', dpi)}
                              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer flex flex-col items-center ${
                                settings.rasterPrint.targetDpi === dpi
                                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500'
                                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                              }`}
                            >
                              <span>{dpi} DPI</span>
                              <span className="text-[9px] font-normal text-slate-500">
                                {dpi === 150 ? 'Banner' : dpi === 300 ? 'Gráfica Padrão' : 'Fine Art'}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Paper Profile */}
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400">Perfil de Papel / Substrato</label>
                        <select
                          value={settings.rasterPrint.paperProfile}
                          onChange={(e) => updateSetting('rasterPrint', 'paperProfile', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="standard">Padrão Digital / Prova de Cor</option>
                          <option value="coated-glossy">Papel Couché Brilho / Foto Glossy</option>
                          <option value="matte">Papel Fosco / Matte Art</option>
                          <option value="uncoated-offset">Papel Offset / Sulfite (Maior absorção)</option>
                          <option value="newsprint">Papel Jornal / Riso (Forte Ganho de Ponto)</option>
                          <option value="canvas">Canvas / Tecido Texturizado</option>
                        </select>
                      </div>

                      {/* Halftone / Reticulagem Mode */}
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400">Reticulagem & Simulação de Meio-Tom</label>
                        <select
                          value={settings.rasterPrint.halftoneMode}
                          onChange={(e) => updateSetting('rasterPrint', 'halftoneMode', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="none">Tons Contínuos HQ (Impressão Fotográfica / Offset 300DPI)</option>
                          <option value="cmyk-simulation">Simulação CMYK (Cores Subtrativas de Impressão)</option>
                          <option value="dot-halftone">Retícula Meio-Tom Gráfica (Pontos Offset)</option>
                          <option value="dither-floyd">Dithering Floyd-Steinberg (Difusão de Erro)</option>
                          <option value="bayer-matrix">Dithering Matriz Bayer 4x4</option>
                        </select>
                      </div>

                      {/* Dot Gain Compensation */}
                      <SliderControl
                        label="Compensação Ganho de Ponto (Dot Gain)"
                        value={settings.rasterPrint.dotGainCompensation}
                        min={0}
                        max={100}
                        unit="%"
                        onChange={(v) => updateSetting('rasterPrint', 'dotGainCompensation', v)}
                        hint="Evita que sombras fiquem empastadas e escuras pela absorção da tinta"
                      />

                      {/* Print Sharpen Boost */}
                      <SliderControl
                        label="Nitidez Específica para Impressão"
                        value={settings.rasterPrint.printSharpenBoost}
                        min={0}
                        max={100}
                        unit="%"
                        onChange={(v) => updateSetting('rasterPrint', 'printSharpenBoost', v)}
                        hint="Compensa a perda natural de micro-detalhes na retícula física"
                      />

                      {/* Black Point Generation */}
                      <SliderControl
                        label="Preto Puro / Geração Canal K"
                        value={settings.rasterPrint.blackPointBoost}
                        min={0}
                        max={100}
                        unit="%"
                        onChange={(v) => updateSetting('rasterPrint', 'blackPointBoost', v)}
                        hint="Aprofunda sombras densas para evitar pretos acinzentados na impressão"
                      />

                      {/* CMYK Gamut Warning */}
                      <div className="flex items-center justify-between text-xs text-slate-300 pt-1 border-t border-slate-800/80">
                        <div>
                          <span className="block font-medium">Alerta Gamut CMYK</span>
                          <span className="text-[10px] text-slate-500">Destaca cores fora do alcance da gráfica</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.rasterPrint.cmykGamutWarning}
                          onChange={(e) => updateSetting('rasterPrint', 'cmykGamutWarning', e.target.checked)}
                          className="w-4 h-4 accent-pink-500 rounded cursor-pointer"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

        {/* 2. Deblur & Focus Engine */}
        <div className="bg-slate-950/80 rounded-xl border border-slate-800/80 overflow-hidden">
          <button
            onClick={() => toggleSection('deblur')}
            className="w-full px-3 py-2.5 bg-slate-900/60 hover:bg-slate-850 text-left flex items-center justify-between transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Focus className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-slate-200">Deblur & Recuperação de Foco</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-cyan-400">{settings.deblur.amount}%</span>
              {openSections.deblur ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </div>
          </button>

          {openSections.deblur && (
            <div className="p-3 space-y-3 border-t border-slate-800/60">
              {/* Deblur Amount Slider */}
              <SliderControl
                label="Intensidade de Deblur"
                value={settings.deblur.amount}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => updateSetting('deblur', 'amount', v)}
              />

              {/* Deblur Mode Selection */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 flex justify-between">
                  <span>Modo de Defeito</span>
                  <span className="font-mono text-cyan-400 capitalize">{settings.deblur.mode}</span>
                </label>
                <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                  {(['focus', 'motion', 'gaussian'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => updateSetting('deblur', 'mode', mode)}
                      className={`py-1 text-[10px] font-medium rounded transition cursor-pointer ${
                        settings.deblur.mode === mode
                          ? 'bg-cyan-600 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {mode === 'focus' ? 'Foco Óptico' : mode === 'motion' ? 'Movimento' : 'Gaussiano'}
                    </button>
                  ))}
                </div>
              </div>

              {settings.deblur.mode === 'motion' && (
                <SliderControl
                  label="Ângulo do Movimento"
                  value={settings.deblur.angle}
                  min={0}
                  max={180}
                  unit="°"
                  onChange={(v) => updateSetting('deblur', 'angle', v)}
                />
              )}

              <SliderControl
                label="Raio do Blur (PSF)"
                value={settings.deblur.radius}
                min={0.8}
                max={4.0}
                step={0.1}
                unit="px"
                onChange={(v) => updateSetting('deblur', 'radius', v)}
              />

              <SliderControl
                label="Iterações Richardson-Lucy"
                value={settings.deblur.iterations}
                min={1}
                max={10}
                unit=" iters"
                onChange={(v) => updateSetting('deblur', 'iterations', v)}
              />
            </div>
          )}
        </div>

        {/* 3. Sharpen & Anti-Halo Engine */}
        <div className="bg-slate-950/80 rounded-xl border border-slate-800/80 overflow-hidden">
          <button
            onClick={() => toggleSection('sharpen')}
            className="w-full px-3 py-2.5 bg-slate-900/60 hover:bg-slate-850 text-left flex items-center justify-between transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-slate-200">Nitidez & Anti-Halo</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-400">{settings.sharpen.amount}%</span>
              {openSections.sharpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </div>
          </button>

          {openSections.sharpen && (
            <div className="p-3 space-y-3 border-t border-slate-800/60">
              <SliderControl
                label="Nitidez (Luminance USM)"
                value={settings.sharpen.amount}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => updateSetting('sharpen', 'amount', v)}
              />

              <SliderControl
                label="Supressão de Halos (Anti-Halo)"
                value={settings.sharpen.antiHalo}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => updateSetting('sharpen', 'antiHalo', v)}
                hint="Evita linhas brancas artificiais nas bordas de alto contraste"
              />

              <SliderControl
                label="Limiar de Borda (Threshold)"
                value={settings.sharpen.threshold}
                min={0}
                max={20}
                unit=" lvls"
                onChange={(v) => updateSetting('sharpen', 'threshold', v)}
                hint="Ignora ruído de fundo para não afiar grãos indesejados"
              />

              <SliderControl
                label="Raio de Nitidez"
                value={settings.sharpen.radius}
                min={0.5}
                max={3.0}
                step={0.1}
                unit="px"
                onChange={(v) => updateSetting('sharpen', 'radius', v)}
              />
            </div>
          )}
        </div>

        {/* 4. Denoise & JPEG Engine */}
        <div className="bg-slate-950/80 rounded-xl border border-slate-800/80 overflow-hidden">
          <button
            onClick={() => toggleSection('denoise')}
            className="w-full px-3 py-2.5 bg-slate-900/60 hover:bg-slate-850 text-left flex items-center justify-between transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-slate-200">Redução de Ruído & JPEG</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-blue-400">{settings.denoise.amount}%</span>
              {openSections.denoise ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </div>
          </button>

          {openSections.denoise && (
            <div className="p-3 space-y-3 border-t border-slate-800/60">
              <SliderControl
                label="Redução de Ruído Geral"
                value={settings.denoise.amount}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => updateSetting('denoise', 'amount', v)}
              />

              <SliderControl
                label="Remoção de Blocos JPEG (8x8)"
                value={settings.denoise.jpegDeblock}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => updateSetting('denoise', 'jpegDeblock', v)}
              />

              <SliderControl
                label="Ruído Cromático (Cores)"
                value={settings.denoise.chrominanceStrength}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => updateSetting('denoise', 'chrominanceStrength', v)}
              />

              <SliderControl
                label="Preservar Textura / Grão Natural"
                value={settings.denoise.preserveGrain}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => updateSetting('denoise', 'preserveGrain', v)}
                hint="Evita visual de cera / plástico na fotografia"
              />
            </div>
          )}
        </div>

        {/* 5. Detail & Micro-contrast */}
        <div className="bg-slate-950/80 rounded-xl border border-slate-800/80 overflow-hidden">
          <button
            onClick={() => toggleSection('detail')}
            className="w-full px-3 py-2.5 bg-slate-900/60 hover:bg-slate-850 text-left flex items-center justify-between transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-200">Recuperação de Detalhes & CLAHE</span>
            </div>
            {openSections.detail ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          </button>

          {openSections.detail && (
            <div className="p-3 space-y-3 border-t border-slate-800/60">
              <SliderControl
                label="Micro-Contraste de Textura"
                value={settings.detailRecovery.microContrast}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => updateSetting('detailRecovery', 'microContrast', v)}
              />

              <SliderControl
                label="CLAHE (Contraste Local Adaptativo)"
                value={settings.colorContrast.claheStrength}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => updateSetting('colorContrast', 'claheStrength', v)}
              />

              <SliderControl
                label="Recuperação de Sombras"
                value={settings.detailRecovery.shadowRecovery}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => updateSetting('detailRecovery', 'shadowRecovery', v)}
              />

              <SliderControl
                label="Proteção de Realces / Altas Luzes"
                value={settings.detailRecovery.highlightProtection}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => updateSetting('detailRecovery', 'highlightProtection', v)}
              />
            </div>
          )}
        </div>

        {/* 6. Face Restoration (Natural & Identity Preserved) */}
        <div className="bg-slate-950/80 rounded-xl border border-slate-800/80 overflow-hidden">
          <button
            onClick={() => toggleSection('face')}
            className="w-full px-3 py-2.5 bg-slate-900/60 hover:bg-slate-850 text-left flex items-center justify-between transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-pink-400" />
              <span className="text-xs font-bold text-slate-200">Recuperação Facial Natural</span>
            </div>
            {openSections.face ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          </button>

          {openSections.face && (
            <div className="p-3 space-y-3 border-t border-slate-800/60">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs text-slate-300 font-medium">Habilitar Módulo Facial</span>
                <input
                  type="checkbox"
                  checked={settings.faceRestore.enabled}
                  onChange={(e) => updateSetting('faceRestore', 'enabled', e.target.checked)}
                  className="w-4 h-4 accent-pink-500 rounded cursor-pointer"
                />
              </div>

              {settings.faceRestore.enabled && (
                <>
                  <SliderControl
                    label="Intensidade Facial"
                    value={settings.faceRestore.strength}
                    min={0}
                    max={100}
                    unit="%"
                    onChange={(v) => updateSetting('faceRestore', 'strength', v)}
                  />

                  <SliderControl
                    label="Clarificação dos Olhos & Contornos"
                    value={settings.faceRestore.eyeClarification}
                    min={0}
                    max={100}
                    unit="%"
                    onChange={(v) => updateSetting('faceRestore', 'eyeClarification', v)}
                  />

                  <SliderControl
                    label="Suavização de Pele (Poro Natural)"
                    value={settings.faceRestore.skinSmoothing}
                    min={0}
                    max={100}
                    unit="%"
                    onChange={(v) => updateSetting('faceRestore', 'skinSmoothing', v)}
                  />

                  <div className="p-2 rounded bg-pink-950/30 border border-pink-800/40 text-[10px] text-pink-300 flex items-start gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-pink-400 shrink-0 mt-0.5" />
                    <span>Preservação de identidade ativa. Não alucina dentes ou olhos falsos.</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* 7. Upscale Super-Resolution */}
        <div className="bg-slate-950/80 rounded-xl border border-slate-800/80 overflow-hidden">
          <button
            onClick={() => toggleSection('upscale')}
            className="w-full px-3 py-2.5 bg-slate-900/60 hover:bg-slate-850 text-left flex items-center justify-between transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Maximize className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold text-slate-200">Upscale Super-Resolution</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-purple-400">{settings.upscale.scale}x</span>
              {openSections.upscale ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </div>
          </button>

          {openSections.upscale && (
            <div className="p-3 space-y-3 border-t border-slate-800/60">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Fator de Ampliação</label>
                <div className="grid grid-cols-3 gap-2">
                  {([1, 2, 4] as const).map((sc) => (
                    <button
                      key={sc}
                      onClick={() => updateSetting('upscale', 'scale', sc)}
                      className={`py-2 rounded-lg font-mono text-xs font-bold transition cursor-pointer ${
                        settings.upscale.scale === sc
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-950/50'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {sc}x {sc > 1 ? 'Super-Res' : 'Original'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Algoritmo de Interpolação</label>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[10px]">
                  <button
                    onClick={() => updateSetting('upscale', 'method', 'edge-directed')}
                    className={`py-1 rounded font-medium transition cursor-pointer ${
                      settings.upscale.method === 'edge-directed'
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Edge-Directed (NEDI)
                  </button>
                  <button
                    onClick={() => updateSetting('upscale', 'method', 'lanczos3')}
                    className={`py-1 rounded font-medium transition cursor-pointer ${
                      settings.upscale.method === 'lanczos3'
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Lanczos-3 Sinc
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
                <span>Processamento em Tiles (Proteção VRAM)</span>
                <input
                  type="checkbox"
                  checked={settings.upscale.tileProcessing}
                  onChange={(e) => updateSetting('upscale', 'tileProcessing', e.target.checked)}
                  className="w-4 h-4 accent-purple-500 rounded cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </aside>
  );
};

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (val: number) => void;
  hint?: string;
}

const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
  hint,
}) => {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-300 font-medium">{label}</span>
        <span className="font-mono text-cyan-400 font-bold text-[11px]">
          {value}
          {unit}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 focus:outline-none"
      />

      {hint && <p className="text-[10px] text-slate-500 leading-tight">{hint}</p>}
    </div>
  );
};
