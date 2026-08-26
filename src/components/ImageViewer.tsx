import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Move, 
  Sliders, 
  Columns, 
  FileSearch,
  Sparkles,
  RefreshCw,
  XCircle,
  Activity,
  Play,
  Pause,
  Eye,
  EyeOff,
  Search,
  SplitSquareVertical,
  SplitSquareHorizontal,
  SlidersHorizontal,
  Zap,
  Info
} from 'lucide-react';
import { ViewMode, ProcessingProgress } from '../types';

interface ImageViewerProps {
  originalImage: ImageData | null;
  processedImage: ImageData | null;
  progress: ProcessingProgress;
  onCancelProcessing: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onDropFiles: (files: FileList) => void;
  onOpenSampleModal: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  originalImage,
  processedImage,
  progress,
  onCancelProcessing,
  viewMode,
  onViewModeChange,
  onDropFiles,
  onOpenSampleModal,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Split Slider state (0 to 1)
  const [splitPos, setSplitPos] = useState<number>(0.5);
  const [splitOrientation, setSplitOrientation] = useState<'vertical' | 'horizontal'>('vertical');
  const isDraggingSplit = useRef<boolean>(false);
  const [isHoveringHandle, setIsHoveringHandle] = useState<boolean>(false);

  // Auto-sweep animation
  const [isAutoSweeping, setIsAutoSweeping] = useState<boolean>(false);
  const sweepDirection = useRef<number>(1);

  // Hold to Compare state (Peek original)
  const [isHoldingOriginal, setIsHoldingOriginal] = useState<boolean>(false);

  // Loupe / Inspection Magnifier state
  const [showLoupe, setShowLoupe] = useState<boolean>(false);
  const [loupeZoom, setLoupeZoom] = useState<number>(2.5);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Zoom & Pan state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPanning = useRef<boolean>(false);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Drag & drop highlight
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Bitmaps for GPU rendering
  const origBitmapRef = useRef<ImageBitmap | null>(null);
  const procBitmapRef = useRef<ImageBitmap | null>(null);

  useEffect(() => {
    let active = true;
    if (originalImage) {
      createImageBitmap(originalImage).then((bmp) => {
        if (active) origBitmapRef.current = bmp;
      });
    } else {
      origBitmapRef.current = null;
    }
    return () => { active = false; };
  }, [originalImage]);

  useEffect(() => {
    let active = true;
    if (processedImage) {
      createImageBitmap(processedImage).then((bmp) => {
        if (active) procBitmapRef.current = bmp;
      });
    } else {
      procBitmapRef.current = null;
    }
    return () => { active = false; };
  }, [processedImage]);

  // Fit to screen helper
  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current || !originalImage) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const scaleX = (clientWidth - 64) / originalImage.width;
    const scaleY = (clientHeight - 64) / originalImage.height;
    const fitScale = Math.min(scaleX, scaleY, 1.0);
    setZoom(Math.max(0.15, fitScale));
    setPan({ x: 0, y: 0 });
  }, [originalImage]);

  useEffect(() => {
    if (originalImage) {
      handleFitToScreen();
    }
  }, [originalImage, handleFitToScreen]);

  // Keyboard shortcut: Spacebar to toggle/peek original
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && (e.target as HTMLElement).tagName !== 'INPUT') {
        e.preventDefault();
        setIsHoldingOriginal(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsHoldingOriginal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Auto sweep continuous animation loop
  useEffect(() => {
    if (!isAutoSweeping) return;
    let animId: number;
    let lastTime = performance.now();

    const sweepStep = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      const speed = 0.35; // sweep speed per second

      setSplitPos((prev) => {
        let next = prev + sweepDirection.current * speed * delta;
        if (next >= 0.95) {
          next = 0.95;
          sweepDirection.current = -1;
        } else if (next <= 0.05) {
          next = 0.05;
          sweepDirection.current = 1;
        }
        return next;
      });

      animId = requestAnimationFrame(sweepStep);
    };

    animId = requestAnimationFrame(sweepStep);
    return () => cancelAnimationFrame(animId);
  }, [isAutoSweeping]);

  // Main Render Loop for Split Slider / Single / Diff Views
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Handle high DPI retina displays
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Render checkered dark grid transparency background
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = 24;
    patternCanvas.height = 24;
    const pCtx = patternCanvas.getContext('2d')!;
    pCtx.fillStyle = '#0b1120';
    pCtx.fillRect(0, 0, 24, 24);
    pCtx.fillStyle = '#020617';
    pCtx.fillRect(0, 0, 12, 12);
    pCtx.fillRect(12, 12, 12, 12);
    const pattern = ctx.createPattern(patternCanvas, 'repeat');
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, width, height);
    }

    if (!originalImage) {
      ctx.restore();
      return;
    }

    const imgW = originalImage.width;
    const imgH = originalImage.height;

    // Center image in viewport with pan & zoom
    const centerX = width / 2 + pan.x;
    const centerY = height / 2 + pan.y;
    const drawW = imgW * zoom;
    const drawH = imgH * zoom;
    const imgX = centerX - drawW / 2;
    const imgY = centerY - drawH / 2;

    ctx.imageSmoothingEnabled = zoom < 2; // Crisp pixel fidelity at large zooms
    ctx.imageSmoothingQuality = 'high';

    const origBmp = origBitmapRef.current;
    const procBmp = procBitmapRef.current || origBmp;

    // If user is holding Spacebar to peek original
    if (isHoldingOriginal && origBmp) {
      ctx.drawImage(origBmp, imgX, imgY, drawW, drawH);
      ctx.restore();
      return;
    }

    if (viewMode === 'original' && origBmp) {
      ctx.drawImage(origBmp, imgX, imgY, drawW, drawH);
    } else if (viewMode === 'processed' && procBmp) {
      ctx.drawImage(procBmp, imgX, imgY, drawW, drawH);
    } else if (viewMode === 'diff' && originalImage && processedImage) {
      // High-frequency difference map
      ctx.drawImage(procBmp!, imgX, imgY, drawW, drawH);
      ctx.globalCompositeOperation = 'difference';
      ctx.drawImage(origBmp!, imgX, imgY, drawW, drawH);
      ctx.globalCompositeOperation = 'source-over';
    } else if (viewMode === 'split' && origBmp && procBmp) {
      // ==========================================
      // ANTES E DEPOIS - SLIDER CENTRAL DESLIZANTE
      // ==========================================

      if (splitOrientation === 'vertical') {
        // Vertical Split (Left = Antes / Right = Depois)
        const splitScreenX = width * splitPos;

        // 1. Draw Processed image on whole area (Right side visible)
        ctx.drawImage(procBmp, imgX, imgY, drawW, drawH);

        // 2. Clip and draw Original image on Left side
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, splitScreenX, height);
        ctx.clip();
        ctx.drawImage(origBmp, imgX, imgY, drawW, drawH);
        ctx.restore();

        // 3. Draw Split Dividing Line with Cyan Glow
        ctx.save();
        ctx.shadowColor = 'rgba(6, 182, 212, 0.6)';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(splitScreenX, 0);
        ctx.lineTo(splitScreenX, height);
        ctx.stroke();
        ctx.restore();

        // 4. Central Interactive Draggable Handle Knob
        const knobY = height / 2;
        const knobRadius = isHoveringHandle || isDraggingSplit.current ? 22 : 18;

        // Outer glow circle
        ctx.save();
        ctx.shadowColor = 'rgba(6, 182, 212, 0.8)';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#0891b2';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(splitScreenX, knobY, knobRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Horizontal arrows inside handle knob
        ctx.fillStyle = '#ffffff';
        // Left arrow (<)
        ctx.beginPath();
        ctx.moveTo(splitScreenX - 10, knobY);
        ctx.lineTo(splitScreenX - 4, knobY - 5);
        ctx.lineTo(splitScreenX - 4, knobY + 5);
        ctx.fill();
        // Right arrow (>)
        ctx.beginPath();
        ctx.moveTo(splitScreenX + 10, knobY);
        ctx.lineTo(splitScreenX + 4, knobY - 5);
        ctx.lineTo(splitScreenX + 4, knobY + 5);
        ctx.fill();

        // Percentage Tooltip while dragging or hovering
        if (isDraggingSplit.current || isHoveringHandle) {
          const percentText = `${Math.round(splitPos * 100)}%`;
          ctx.font = 'bold 11px monospace';
          const textMetrics = ctx.measureText(percentText);
          const pillW = textMetrics.width + 16;
          const pillH = 22;
          const pillX = splitScreenX - pillW / 2;
          const pillY = knobY - knobRadius - 26;

          ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(pillX, pillY, pillW, pillH, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#38bdf8';
          ctx.fillText(percentText, pillX + 8, pillY + 15);
        }

      } else {
        // Horizontal Split (Top = Antes / Bottom = Depois)
        const splitScreenY = height * splitPos;

        // 1. Draw Processed image
        ctx.drawImage(procBmp, imgX, imgY, drawW, drawH);

        // 2. Clip and draw Original image on Top
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, width, splitScreenY);
        ctx.clip();
        ctx.drawImage(origBmp, imgX, imgY, drawW, drawH);
        ctx.restore();

        // 3. Draw Split Dividing Horizontal Line
        ctx.save();
        ctx.shadowColor = 'rgba(6, 182, 212, 0.6)';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, splitScreenY);
        ctx.lineTo(width, splitScreenY);
        ctx.stroke();
        ctx.restore();

        // 4. Central Draggable Knob
        const knobX = width / 2;
        const knobRadius = isHoveringHandle || isDraggingSplit.current ? 22 : 18;

        ctx.save();
        ctx.shadowColor = 'rgba(6, 182, 212, 0.8)';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#0891b2';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(knobX, splitScreenY, knobRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Vertical arrows inside handle knob
        ctx.fillStyle = '#ffffff';
        // Top arrow (^)
        ctx.beginPath();
        ctx.moveTo(knobX, splitScreenY - 10);
        ctx.lineTo(knobX - 5, splitScreenY - 4);
        ctx.lineTo(knobX + 5, splitScreenY - 4);
        ctx.fill();
        // Bottom arrow (v)
        ctx.beginPath();
        ctx.moveTo(knobX, splitScreenY + 10);
        ctx.lineTo(knobX - 5, splitScreenY + 4);
        ctx.lineTo(knobX + 5, splitScreenY + 4);
        ctx.fill();
      }
    }

    // ==========================================
    // LOUPE / LUPA DE INSPEÇÃO MICROSCÓPICA
    // ==========================================
    if (showLoupe && origBmp && procBmp) {
      const loupeRadius = 65;
      const lX = mousePos.x;
      const lY = mousePos.y;

      // Calculate corresponding image coordinate under mouse
      const imgTargetX = (lX - imgX) / zoom;
      const imgTargetY = (lY - imgY) / zoom;

      ctx.save();
      // Circular clip for loupe
      ctx.beginPath();
      ctx.arc(lX, lY, loupeRadius, 0, Math.PI * 2);
      ctx.clip();

      // Clear loupe area
      ctx.fillStyle = '#0f172a';
      ctx.fill();

      // Render zoomed version of processed image inside loupe
      const loupeDrawW = imgW * zoom * loupeZoom;
      const loupeDrawH = imgH * zoom * loupeZoom;
      const loupeImgX = lX - imgTargetX * zoom * loupeZoom;
      const loupeImgY = lY - imgTargetY * zoom * loupeZoom;

      ctx.drawImage(procBmp, loupeImgX, loupeImgY, loupeDrawW, loupeDrawH);

      // Loupe internal split divider if in split mode
      if (viewMode === 'split' && splitOrientation === 'vertical') {
        const splitScreenX = width * splitPos;
        if (splitScreenX >= lX - loupeRadius && splitScreenX <= lX + loupeRadius) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(lX - loupeRadius, lY - loupeRadius, splitScreenX - (lX - loupeRadius), loupeRadius * 2);
          ctx.clip();
          ctx.drawImage(origBmp, loupeImgX, loupeImgY, loupeDrawW, loupeDrawH);
          ctx.restore();

          // Divider inside loupe
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(splitScreenX, lY - loupeRadius);
          ctx.lineTo(splitScreenX, lY + loupeRadius);
          ctx.stroke();
        }
      }

      ctx.restore();

      // Loupe metallic ring border
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.shadowColor = 'rgba(6, 182, 212, 0.7)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(lX, lY, loupeRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Loupe crosshair center mark
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lX - 6, lY); ctx.lineTo(lX + 6, lY);
      ctx.moveTo(lX, lY - 6); ctx.lineTo(lX, lY + 6);
      ctx.stroke();

      // Loupe label
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`${loupeZoom}x ZOOM`, lX - 22, lY + loupeRadius - 8);
      ctx.restore();
    }

    ctx.restore();
  }, [
    originalImage, 
    processedImage, 
    zoom, 
    pan, 
    splitPos, 
    splitOrientation, 
    viewMode, 
    isHoldingOriginal, 
    showLoupe, 
    loupeZoom, 
    mousePos, 
    isHoveringHandle
  ]);

  useEffect(() => {
    let animationFrameId: number;
    const loop = () => {
      renderCanvas();
      animationFrameId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [renderCanvas]);

  // Pointer event handlers for Split Dragging & Pan
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (viewMode === 'split') {
      if (splitOrientation === 'vertical') {
        const splitScreenX = rect.width * splitPos;
        if (Math.abs(x - splitScreenX) < 32) {
          isDraggingSplit.current = true;
          setIsAutoSweeping(false);
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          return;
        }
      } else {
        const splitScreenY = rect.height * splitPos;
        if (Math.abs(y - splitScreenY) < 32) {
          isDraggingSplit.current = true;
          setIsAutoSweeping(false);
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          return;
        }
      }
    }

    // Default to Panning canvas
    isPanning.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePos({ x, y });

    // Check hover over slider handle
    if (viewMode === 'split') {
      if (splitOrientation === 'vertical') {
        const splitScreenX = rect.width * splitPos;
        setIsHoveringHandle(Math.abs(x - splitScreenX) < 28);
      } else {
        const splitScreenY = rect.height * splitPos;
        setIsHoveringHandle(Math.abs(y - splitScreenY) < 28);
      }
    } else {
      setIsHoveringHandle(false);
    }

    if (isDraggingSplit.current) {
      if (splitOrientation === 'vertical') {
        const newPos = Math.max(0.01, Math.min(0.99, x / rect.width));
        setSplitPos(newPos);
      } else {
        const newPos = Math.max(0.01, Math.min(0.99, y / rect.height));
        setSplitPos(newPos);
      }
    } else if (isPanning.current) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingSplit.current = false;
    isPanning.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Wheel zoom handler
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setZoom((prev) => Math.max(0.1, Math.min(8.0, prev * zoomFactor)));
  };

  return (
    <div 
      ref={containerRef}
      onWheel={handleWheel}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          onDropFiles(e.dataTransfer.files);
        }
      }}
      className="relative flex-1 h-full w-full bg-slate-950 overflow-hidden select-none flex flex-col"
    >
      {/* Empty State / Drag & Drop Hero */}
      {!originalImage && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900/90 border-2 border-dashed border-slate-700 hover:border-cyan-500/80 transition shadow-2xl flex flex-col items-center gap-4 group">
            <div className="w-16 h-16 rounded-2xl bg-cyan-950/60 border border-cyan-800/80 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">
                Arraste uma ou Múltiplas Imagens Aqui
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Suporta PNG, JPG, WEBP e TIFF. Otimização profissional com IA, deblur, redução de ruído, 300 DPI e processamento em lote para várias fotos.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full mt-2">
              <label
                htmlFor="file-input-hero"
                className="w-full flex-1 py-2.5 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs text-center cursor-pointer transition shadow-md shadow-cyan-950/50"
              >
                Selecionar Imagens
              </label>
              <input
                id="file-input-hero"
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files && onDropFiles(e.target.files)}
              />

              <button
                onClick={onOpenSampleModal}
                className="w-full sm:w-auto py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition cursor-pointer"
              >
                Fotos de Teste
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Active Canvas */}
      {originalImage && viewMode !== 'side-by-side' && (
        <div className="relative w-full h-full flex-1">
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className={`w-full h-full touch-none ${
              isHoveringHandle 
                ? splitOrientation === 'vertical' ? 'cursor-ew-resize' : 'cursor-ns-resize' 
                : isPanning.current ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          />

          {/* Floating Badges for Antes (Left) & Depois (Right) */}
          {viewMode === 'split' && (
            <>
              {/* Badge ANTES */}
              <div 
                className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800 shadow-xl transition pointer-events-none"
              >
                <div className="w-2 h-2 rounded-full bg-slate-400" />
                <span className="text-xs font-extrabold tracking-wider text-slate-300">
                  ANTES
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  (ORIGINAL {originalImage.width}×{originalImage.height})
                </span>
              </div>

              {/* Badge DEPOIS */}
              <div 
                className="absolute top-4 right-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-cyan-700/80 shadow-xl shadow-cyan-950/40 transition pointer-events-none"
              >
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs font-extrabold tracking-wider text-cyan-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  DEPOIS
                </span>
                <span className="text-[10px] text-cyan-400/80 font-mono">
                  ({processedImage ? `${processedImage.width}×${processedImage.height}` : 'OTIMIZADA'})
                </span>
              </div>
            </>
          )}

          {/* Top Quick Slider Controls Bar (Preset jumps, orientation, auto-sweep, hold to peek) */}
          {viewMode === 'split' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-xl rounded-xl p-1.5 text-xs text-slate-300">
              {/* Quick Jump Positions */}
              <div className="flex items-center gap-0.5 bg-slate-950 p-0.5 rounded-lg border border-slate-800/80">
                {[
                  { pos: 0.0, label: 'Antes 100%' },
                  { pos: 0.25, label: '25%' },
                  { pos: 0.5, label: '50% (Centro)' },
                  { pos: 0.75, label: '75%' },
                  { pos: 1.0, label: 'Depois 100%' },
                ].map((item) => (
                  <button
                    key={item.pos}
                    onClick={() => { setSplitPos(item.pos); setIsAutoSweeping(false); }}
                    id={`btn-split-pos-${Math.round(item.pos * 100)}`}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                      Math.abs(splitPos - item.pos) < 0.05
                        ? 'bg-cyan-600 text-white font-bold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="h-4 w-px bg-slate-800" />

              {/* Auto-Sweep Animation Play/Pause */}
              <button
                onClick={() => setIsAutoSweeping(!isAutoSweeping)}
                id="btn-toggle-auto-sweep"
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                  isAutoSweeping
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700 shadow-sm animate-pulse'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                }`}
                title="Reproduzir varredura automática contínua"
              >
                {isAutoSweeping ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-cyan-400" />}
                <span className="hidden sm:inline">{isAutoSweeping ? 'Pausar' : 'Varredura'}</span>
              </button>

              {/* Orientation Switch (Vertical / Horizontal) */}
              <button
                onClick={() => setSplitOrientation(splitOrientation === 'vertical' ? 'horizontal' : 'vertical')}
                id="btn-toggle-split-orientation"
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                title={`Alternar orientação do corte (${splitOrientation === 'vertical' ? 'Vertical Lado a Lado' : 'Horizontal Topo/Base'})`}
              >
                {splitOrientation === 'vertical' ? (
                  <SplitSquareVertical className="w-3.5 h-3.5 text-cyan-400" />
                ) : (
                  <SplitSquareHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                )}
              </button>

              {/* Hold / Click to Peek Original */}
              <button
                onMouseDown={() => setIsHoldingOriginal(true)}
                onMouseUp={() => setIsHoldingOriginal(false)}
                onMouseLeave={() => setIsHoldingOriginal(false)}
                onTouchStart={() => setIsHoldingOriginal(true)}
                onTouchEnd={() => setIsHoldingOriginal(false)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition select-none cursor-pointer ${
                  isHoldingOriginal
                    ? 'bg-amber-950 text-amber-300 border border-amber-600'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                }`}
                title="Pressione e segure (ou segure a barra de espaço) para ver o Antes instantaneamente"
              >
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Segure p/ Original</span>
              </button>

              {/* Loupe Toggle */}
              <button
                onClick={() => setShowLoupe(!showLoupe)}
                id="btn-toggle-loupe"
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  showLoupe
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700 shadow-sm'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400'
                }`}
                title="Lupa de inspeção microscópica sincronizada"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Side-by-Side Dual Synchronized View */}
      {originalImage && viewMode === 'side-by-side' && (
        <div className="flex-1 w-full h-full flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-800 overflow-hidden">
          {/* Left: Original */}
          <div className="flex-1 relative bg-slate-950 flex flex-col items-center justify-center p-3">
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-700 text-[11px] font-bold text-slate-300 z-10 shadow-lg">
              ANTES (ORIGINAL)
            </div>
            <div className="w-full h-full flex items-center justify-center overflow-hidden">
              <img 
                src={originalImage ? canvasToDataUrl(originalImage) : ''} 
                alt="Original"
                className="max-w-full max-h-full object-contain rounded-lg border border-slate-800 shadow-xl"
              />
            </div>
          </div>

          {/* Right: Processed */}
          <div className="flex-1 relative bg-slate-950 flex flex-col items-center justify-center p-3">
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-cyan-950/90 border border-cyan-700 text-[11px] font-bold text-cyan-300 z-10 flex items-center gap-1.5 shadow-lg">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              DEPOIS (OTIMIZADA MAGIC BOLOTA)
            </div>
            <div className="w-full h-full flex items-center justify-center overflow-hidden">
              <img 
                src={processedImage ? canvasToDataUrl(processedImage) : (originalImage ? canvasToDataUrl(originalImage) : '')} 
                alt="Processed"
                className="max-w-full max-h-full object-contain rounded-lg border border-cyan-900/60 shadow-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* Drag & Drop Visual Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-cyan-950/80 backdrop-blur-sm border-4 border-dashed border-cyan-400 z-50 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <Sparkles className="w-12 h-12 text-cyan-300 mx-auto animate-bounce" />
            <h3 className="text-xl font-bold text-white mt-2">Solte a imagem para carregar</h3>
          </div>
        </div>
      )}

      {/* Processing Banner / Non-blocking Progress Bar */}
      {progress.isProcessing && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-cyan-500/50 shadow-2xl rounded-xl p-3.5 w-11/12 max-w-md backdrop-blur-md">
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-2 text-slate-200 font-medium truncate">
              <Activity className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
              <span className="truncate">{progress.stage}</span>
            </div>
            <span className="font-mono text-cyan-400 font-bold ml-2">
              {progress.percent}%
            </span>
          </div>

          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-2.5">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-150 rounded-full"
              style={{ width: `${progress.percent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Tempo: {progress.elapsedMs ? (progress.elapsedMs / 1000).toFixed(1) : '0.0'}s</span>
            <button
              onClick={onCancelProcessing}
              id="btn-cancel-processing"
              className="text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Floating Bottom Toolbar for Zoom & View Modes */}
      {originalImage && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-slate-800 shadow-xl rounded-xl px-3 py-2 flex items-center gap-3 backdrop-blur-md z-30">
          {/* View Modes */}
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => onViewModeChange('split')}
              id="btn-viewmode-split"
              className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'split' 
                  ? 'bg-cyan-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Modo Antes e Depois com Slider Central Deslizante"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Antes / Depois (Slider)</span>
            </button>

            <button
              onClick={() => onViewModeChange('side-by-side')}
              id="btn-viewmode-side"
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition cursor-pointer ${
                viewMode === 'side-by-side' 
                  ? 'bg-cyan-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Exibir lado a lado lado a lado"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Lado a Lado</span>
            </button>

            <button
              onClick={() => onViewModeChange('diff')}
              id="btn-viewmode-diff"
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition cursor-pointer ${
                viewMode === 'diff' 
                  ? 'bg-cyan-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Mapa de diferença espectral e detalhes restaurados"
            >
              <FileSearch className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mapa de Diferença</span>
            </button>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Zoom Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoom((z) => Math.max(0.1, z * 0.8))}
              className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
              title="Diminuir Zoom (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-1">
              {[0.5, 1.0, 2.0].map((zVal) => (
                <button
                  key={zVal}
                  onClick={() => { setZoom(zVal); setPan({ x: 0, y: 0 }); }}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition cursor-pointer ${
                    Math.abs(zoom - zVal) < 0.05
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {Math.round(zVal * 100)}%
                </button>
              ))}
            </div>

            <button
              onClick={() => setZoom((z) => Math.min(8.0, z * 1.25))}
              className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
              title="Aumentar Zoom (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleFitToScreen}
              className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer ml-0.5"
              title="Ajustar à Tela (Fit)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function canvasToDataUrl(imgData: ImageData): string {
  const canvas = document.createElement('canvas');
  canvas.width = imgData.width;
  canvas.height = imgData.height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL();
  }
  return '';
}
