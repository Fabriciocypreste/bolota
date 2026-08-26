export interface SampleImageMeta {
  id: string;
  name: string;
  category: string;
  description: string;
  defectType: string;
  width: number;
  height: number;
  generate: () => ImageData;
}

export class SampleImageService {
  public static getSamples(): SampleImageMeta[] {
    return [
      {
        id: 'sample-portrait',
        name: 'Retrato em Luz Natural',
        category: 'Rosto / Retrato',
        description: 'Retrato suave com leve perda de foco nos olhos e ruído fino.',
        defectType: 'Foco suave nos olhos e ruído ISO 800',
        width: 640,
        height: 640,
        generate: () => this.generatePortraitSample(),
      },
      {
        id: 'sample-defocus',
        name: 'Foto Macro Fora de Foco',
        category: 'Desfocada',
        description: 'Fotografia com desfoque óptico e falta de microdetalhes na textura.',
        defectType: 'Desfoque óptico / Defocus blur de 2.5px',
        width: 640,
        height: 640,
        generate: () => this.generateBlurredSample(),
      },
      {
        id: 'sample-noisy',
        name: 'Cena Urbana Noturna',
        category: 'Ruído & Baixa Luz',
        description: 'Imagem noturna com ruído cromático intenso e baixa relação sinal/ruído.',
        defectType: 'Ruído cromático e luminância de alta ISO',
        width: 640,
        height: 640,
        generate: () => this.generateNoisySample(),
      },
      {
        id: 'sample-compressed',
        name: 'Fotografia com Artefatos JPEG',
        category: 'Comprimida',
        description: 'Imagem com blocos 8x8 visíveis, perda de gradiente e bordas sujas.',
        defectType: 'Compressão JPEG agressiva (qualidade ~30%)',
        width: 640,
        height: 640,
        generate: () => this.generateCompressedSample(),
      },
      {
        id: 'sample-document',
        name: 'Documento & Diagrama Técnico',
        category: 'Texto / Documento',
        description: 'Documento impresso escaneado com motion blur horizontal e sombras.',
        defectType: 'Motion blur horizontal leve e baixa nitidez de texto',
        width: 640,
        height: 640,
        generate: () => this.generateDocumentSample(),
      },
      {
        id: 'sample-product',
        name: 'Embalagem de Produto / Macro',
        category: 'Produto',
        description: 'Textura de produto com perda de micro-contraste e resolução moderada.',
        defectType: 'Falta de micro-contraste e definição de contornos',
        width: 640,
        height: 640,
        generate: () => this.generateProductSample(),
      },
    ];
  }

  private static generatePortraitSample(): ImageData {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 640;
    const ctx = canvas.getContext('2d')!;

    // Background gradient (warm studio bokeh)
    const bgGrad = ctx.createRadialGradient(320, 320, 50, 320, 320, 400);
    bgGrad.addColorStop(0, '#5a463a');
    bgGrad.addColorStop(0.5, '#3b2f28');
    bgGrad.addColorStop(1, '#1e1814');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 640, 640);

    // Warm bokeh circles in background
    ctx.fillStyle = 'rgba(210, 160, 120, 0.15)';
    ctx.beginPath(); ctx.arc(140, 180, 70, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(520, 140, 90, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(480, 460, 110, 0, Math.PI * 2); ctx.fill();

    // Portrait Face Base
    ctx.save();
    // Neck & Shoulders
    ctx.fillStyle = '#c89578';
    ctx.beginPath();
    ctx.ellipse(320, 520, 140, 120, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dark Clothing
    ctx.fillStyle = '#222831';
    ctx.beginPath();
    ctx.moveTo(160, 640);
    ctx.quadraticCurveTo(320, 480, 480, 640);
    ctx.fill();

    // Face oval
    const skinGrad = ctx.createRadialGradient(320, 290, 30, 320, 310, 160);
    skinGrad.addColorStop(0, '#f2caaf');
    skinGrad.addColorStop(0.6, '#e0b292');
    skinGrad.addColorStop(1, '#b88164');
    ctx.fillStyle = skinGrad;
    ctx.beginPath();
    ctx.ellipse(320, 300, 120, 150, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair silhouette
    ctx.fillStyle = '#2d1f19';
    ctx.beginPath();
    ctx.arc(320, 240, 135, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(270, 285, 20, 10, -0.05, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(370, 285, 20, 10, 0.05, 0, Math.PI * 2); ctx.fill();

    // Iris & Pupil (Rich Hazel / Brown)
    ctx.fillStyle = '#4a3325';
    ctx.beginPath(); ctx.arc(270, 285, 9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(370, 285, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111111';
    ctx.beginPath(); ctx.arc(270, 285, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(370, 285, 4, 0, Math.PI * 2); ctx.fill();
    // Catchlights
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(268, 283, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(368, 283, 2, 0, Math.PI * 2); ctx.fill();

    // Eyebrows
    ctx.strokeStyle = '#38261e';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(245, 268); ctx.quadraticCurveTo(270, 260, 295, 269); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(345, 269); ctx.quadraticCurveTo(370, 260, 395, 268); ctx.stroke();

    // Nose bridge and shadow
    ctx.strokeStyle = 'rgba(160, 100, 70, 0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(320, 275); ctx.lineTo(315, 325); ctx.lineTo(326, 335); ctx.stroke();

    // Lips
    ctx.fillStyle = '#b85c5c';
    ctx.beginPath(); ctx.ellipse(320, 375, 28, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9e4646';
    ctx.beginPath(); ctx.ellipse(320, 372, 26, 6, 0, 0, Math.PI * 2); ctx.fill();

    ctx.restore();

    // Apply realistic soft defocus + high ISO noise
    const imgData = ctx.getImageData(0, 0, 640, 640);
    this.addDefocusBlur(imgData, 1.8);
    this.addSensorNoise(imgData, 12);
    return imgData;
  }

  private static generateBlurredSample(): ImageData {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 640;
    const ctx = canvas.getContext('2d')!;

    // Forest green background
    const bg = ctx.createLinearGradient(0, 0, 640, 640);
    bg.addColorStop(0, '#132a13');
    bg.addColorStop(0.5, '#31572c');
    bg.addColorStop(1, '#4f772d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 640, 640);

    // Intricate botanical flower / leaf structure
    ctx.strokeStyle = '#ecf39e';
    ctx.lineWidth = 3;

    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      ctx.save();
      ctx.translate(320, 320);
      ctx.rotate(angle);

      // Petal
      const petalGrad = ctx.createRadialGradient(80, 0, 10, 80, 0, 100);
      petalGrad.addColorStop(0, '#ffb703');
      petalGrad.addColorStop(0.6, '#fb8500');
      petalGrad.addColorStop(1, '#d90429');
      ctx.fillStyle = petalGrad;

      ctx.beginPath();
      ctx.ellipse(90, 0, 80, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Petal micro-veins
      ctx.strokeStyle = 'rgba(255, 230, 180, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(30, 0); ctx.lineTo(150, 0);
      ctx.moveTo(70, -10); ctx.lineTo(110, 10);
      ctx.moveTo(70, 10); ctx.lineTo(110, -10);
      ctx.stroke();

      ctx.restore();
    }

    // Flower center
    ctx.fillStyle = '#3a0ca3';
    ctx.beginPath(); ctx.arc(320, 320, 45, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4cc9f0';
    for (let r = 0; r < 35; r += 7) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
        ctx.fillRect(320 + Math.cos(a) * r - 2, 320 + Math.sin(a) * r - 2, 4, 4);
      }
    }

    // Apply severe optical defocus
    const imgData = ctx.getImageData(0, 0, 640, 640);
    this.addDefocusBlur(imgData, 2.8);
    this.addSensorNoise(imgData, 6);
    return imgData;
  }

  private static generateNoisySample(): ImageData {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 640;
    const ctx = canvas.getContext('2d')!;

    // Dark moody skyline
    const bg = ctx.createLinearGradient(0, 0, 0, 640);
    bg.addColorStop(0, '#0b0c10');
    bg.addColorStop(0.6, '#1f2833');
    bg.addColorStop(1, '#0f172a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 640, 640);

    // City silhouettes
    ctx.fillStyle = '#12161f';
    ctx.fillRect(40, 280, 90, 360);
    ctx.fillRect(150, 220, 110, 420);
    ctx.fillRect(280, 180, 140, 460);
    ctx.fillRect(440, 250, 80, 390);
    ctx.fillRect(540, 310, 80, 330);

    // Glowing Neon signs & windows (Cyan, Amber, Magenta)
    ctx.fillStyle = '#ff007f';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('NIGHT CITY', 295, 230);

    ctx.fillStyle = '#00f0ff';
    for (let y = 260; y < 580; y += 22) {
      for (let x = 165; x < 245; x += 18) {
        if ((x + y) % 3 === 0) ctx.fillRect(x, y, 9, 13);
      }
    }

    ctx.fillStyle = '#ffbe0b';
    for (let y = 300; y < 600; y += 26) {
      for (let x = 300; x < 400; x += 22) {
        if ((x + y) % 4 === 0) ctx.fillRect(x, y, 11, 15);
      }
    }

    // Street reflection
    const road = ctx.createLinearGradient(0, 520, 0, 640);
    road.addColorStop(0, '#111');
    road.addColorStop(1, '#050505');
    ctx.fillStyle = road;
    ctx.fillRect(0, 520, 640, 120);

    const imgData = ctx.getImageData(0, 0, 640, 640);
    // Add heavy chrominance & luminance noise
    this.addSensorNoise(imgData, 28, true);
    return imgData;
  }

  private static generateCompressedSample(): ImageData {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 640;
    const ctx = canvas.getContext('2d')!;

    // Clean gradient with geometric circles
    const bg = ctx.createLinearGradient(0, 0, 640, 640);
    bg.addColorStop(0, '#2b5876');
    bg.addColorStop(1, '#4e4376');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 640, 640);

    ctx.fillStyle = '#f39c12';
    ctx.beginPath(); ctx.arc(320, 260, 120, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OPTIFOCUS HD', 320, 440);
    ctx.font = '18px sans-serif';
    ctx.fillText('8x8 BLOCK ARTIFACT REMOVAL', 320, 480);

    const imgData = ctx.getImageData(0, 0, 640, 640);
    this.addJpegBlockArtifacts(imgData, 24);
    return imgData;
  }

  private static generateDocumentSample(): ImageData {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 640;
    const ctx = canvas.getContext('2d')!;

    // Aged paper background
    ctx.fillStyle = '#f7f4ea';
    ctx.fillRect(0, 0, 640, 640);

    ctx.fillStyle = '#1c1c1c';
    ctx.font = 'bold 22px serif';
    ctx.fillText('RELATÓRIO TÉCNICO DE ENGENHARIA', 60, 80);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#444444';
    ctx.fillText('Data: 2026-08-26  |  Sistema de Processamento Óptico v4.2', 60, 110);

    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(60, 125); ctx.lineTo(580, 125); ctx.stroke();

    // Body paragraphs
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#222222';
    const lines = [
      '1. OBJETIVO: Restauração automatizada de imagens degradadas por aberração óptica.',
      '2. ALGORITMO: Deconvolução iterativa Richardson-Lucy e filtragem bilateral seletiva.',
      '3. PRESERVAÇÃO: Proibição estrita de alucinação de feições ou perda de fidelidade.',
      '4. DESEMPENHO: Aceleração por DirectML/WebGL com particionamento em tiles.',
      '5. RESULTADOS: Recuperação de microdetalhes com relação sinal/ruído superior a 42dB.',
      '6. TABELA DE COEFICIENTES:',
    ];

    lines.forEach((line, idx) => {
      ctx.fillText(line, 60, 160 + idx * 30);
    });

    // Technical diagram box
    ctx.fillStyle = '#e8ecf2';
    ctx.fillRect(60, 360, 520, 220);
    ctx.strokeStyle = '#2b6cb0';
    ctx.strokeRect(60, 360, 520, 220);

    ctx.fillStyle = '#2b6cb0';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('DIAGRAMA DE FLUXO DE PROCESSAMENTO', 80, 390);

    // Boxes
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 1.5;
    ctx.fillRect(90, 420, 110, 50); ctx.strokeRect(90, 420, 110, 50);
    ctx.fillRect(260, 420, 120, 50); ctx.strokeRect(260, 420, 120, 50);
    ctx.fillRect(440, 420, 110, 50); ctx.strokeRect(440, 420, 110, 50);

    ctx.fillStyle = '#1a202c';
    ctx.font = '12px sans-serif';
    ctx.fillText('Análise FFT', 115, 450);
    ctx.fillText('Deconvolução', 280, 450);
    ctx.fillText('Super-Res 4x', 460, 450);

    const imgData = ctx.getImageData(0, 0, 640, 640);
    this.addMotionBlur(imgData, 3, 0); // 3px horizontal motion blur
    return imgData;
  }

  private static generateProductSample(): ImageData {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 640;
    const ctx = canvas.getContext('2d')!;

    // Clean neutral studio gradient
    const bg = ctx.createRadialGradient(320, 320, 20, 320, 320, 380);
    bg.addColorStop(0, '#f0f2f5');
    bg.addColorStop(1, '#c5cbdb');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 640, 640);

    // Product Bottle / Glass Cylinder
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 20;

    const prodGrad = ctx.createLinearGradient(200, 0, 440, 0);
    prodGrad.addColorStop(0, '#0a2342');
    prodGrad.addColorStop(0.25, '#2ca58d');
    prodGrad.addColorStop(0.6, '#0a2342');
    prodGrad.addColorStop(0.85, '#84dcc6');
    prodGrad.addColorStop(1, '#0a2342');

    ctx.fillStyle = prodGrad;
    ctx.beginPath();
    ctx.roundRect(220, 140, 200, 360, 24);
    ctx.fill();

    // Metallic Cap
    const capGrad = ctx.createLinearGradient(230, 0, 410, 0);
    capGrad.addColorStop(0, '#d8d8d8');
    capGrad.addColorStop(0.5, '#ffffff');
    capGrad.addColorStop(1, '#9b9b9b');
    ctx.fillStyle = capGrad;
    ctx.beginPath();
    ctx.roundRect(240, 90, 160, 60, 10);
    ctx.fill();

    // Knurling texture on cap
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    for (let x = 245; x < 395; x += 4) {
      ctx.beginPath(); ctx.moveTo(x, 95); ctx.lineTo(x, 145); ctx.stroke();
    }

    // Label with micro-typography
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(240, 240, 160, 180);
    ctx.fillStyle = '#0a2342';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OPTIFOCUS', 320, 280);
    ctx.font = '11px sans-serif';
    ctx.fillText('ULTRA SERUM', 320, 305);
    ctx.font = '9px sans-serif';
    ctx.fillStyle = '#666';
    ctx.fillText('50ml / 1.7 fl oz', 320, 340);
    ctx.fillText('MICRO-TEXTURE RECOVERY', 320, 360);

    ctx.restore();

    const imgData = ctx.getImageData(0, 0, 640, 640);
    this.addDefocusBlur(imgData, 1.4);
    this.addSensorNoise(imgData, 8);
    return imgData;
  }

  private static addDefocusBlur(imgData: ImageData, radius: number) {
    const { width, height, data } = imgData;
    const copy = new Uint8ClampedArray(data);
    const r = Math.round(radius);

    for (let y = r; y < height - r; y++) {
      for (let x = r; x < width - r; x++) {
        let rSum = 0, gSum = 0, bSum = 0, count = 0;
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (dx * dx + dy * dy <= radius * radius) {
              const idx = ((y + dy) * width + (x + dx)) * 4;
              rSum += copy[idx];
              gSum += copy[idx + 1];
              bSum += copy[idx + 2];
              count++;
            }
          }
        }
        const outIdx = (y * width + x) * 4;
        data[outIdx] = rSum / count;
        data[outIdx + 1] = gSum / count;
        data[outIdx + 2] = bSum / count;
      }
    }
  }

  private static addMotionBlur(imgData: ImageData, length: number, angleDeg: number) {
    const { width, height, data } = imgData;
    const copy = new Uint8ClampedArray(data);
    const len = Math.round(length);

    for (let y = 0; y < height; y++) {
      for (let x = len; x < width - len; x++) {
        let rSum = 0, gSum = 0, bSum = 0;
        for (let k = -len; k <= len; k++) {
          const idx = (y * width + (x + k)) * 4;
          rSum += copy[idx];
          gSum += copy[idx + 1];
          bSum += copy[idx + 2];
        }
        const divisor = len * 2 + 1;
        const outIdx = (y * width + x) * 4;
        data[outIdx] = rSum / divisor;
        data[outIdx + 1] = gSum / divisor;
        data[outIdx + 2] = bSum / divisor;
      }
    }
  }

  private static addSensorNoise(imgData: ImageData, intensity: number, colored: boolean = false) {
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (colored) {
        const nr = (Math.random() - 0.5) * intensity * 2;
        const ng = (Math.random() - 0.5) * intensity * 1.5;
        const nb = (Math.random() - 0.5) * intensity * 2.8;
        data[i] = Math.min(255, Math.max(0, data[i] + nr));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + ng));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + nb));
      } else {
        const n = (Math.random() - 0.5) * intensity * 2;
        data[i] = Math.min(255, Math.max(0, data[i] + n));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
      }
    }
  }

  private static addJpegBlockArtifacts(imgData: ImageData, intensity: number) {
    const { width, height, data } = imgData;
    // Quantize 8x8 blocks
    for (let by = 0; by < height; by += 8) {
      for (let bx = 0; bx < width; bx += 8) {
        let rSum = 0, gSum = 0, bSum = 0, count = 0;
        for (let y = 0; y < 8 && by + y < height; y++) {
          for (let x = 0; x < 8 && bx + x < width; x++) {
            const idx = ((by + y) * width + (bx + x)) * 4;
            rSum += data[idx];
            gSum += data[idx + 1];
            bSum += data[idx + 2];
            count++;
          }
        }
        const rAvg = rSum / count;
        const gAvg = gSum / count;
        const bAvg = bSum / count;

        const factor = intensity / 100;
        for (let y = 0; y < 8 && by + y < height; y++) {
          for (let x = 0; x < 8 && bx + x < width; x++) {
            const idx = ((by + y) * width + (bx + x)) * 4;
            data[idx] = data[idx] * (1 - factor) + rAvg * factor;
            data[idx + 1] = data[idx + 1] * (1 - factor) + gAvg * factor;
            data[idx + 2] = data[idx + 2] * (1 - factor) + bAvg * factor;
          }
        }
      }
    }
  }
}
