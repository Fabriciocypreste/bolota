import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Server-side Gemini AI Vision Image Analyzer endpoint
app.post("/api/ai-analyze", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        available: false,
        message: "Chave GEMINI_API_KEY não configurada. Utilizando o motor de análise local de alta precisão.",
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    
    // Clean base64 string
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `Você é um especialista em restauração e otimização fotográfica de nível de estúdio profissional.
Analise a imagem fornecida minuciosamente e retorne um diagnóstico técnico estruturado em JSON com o seguinte formato exato:
{
  "summary": "Resumo técnico de 2 frases sobre a qualidade e problemas da imagem",
  "blurType": "Nenhum | Foco suave | Motion blur leve | Desfoque óptico | Difuso",
  "blurSeverity": "Baixa | Média | Alta",
  "noiseLevel": "Baixo | Médio | Alto | Ruído cromático presente",
  "compressionLevel": "Baixa | Média | Alta (artefatos 8x8)",
  "facialDetails": "Rostos detectados com necessidade de micro-definição | Sem rostos | Rostos nítidos",
  "recommendedSettings": {
    "deblur": 0 a 100,
    "sharpen": 0 a 100,
    "denoise": 0 a 100,
    "detailRecovery": 0 a 100,
    "faceRestore": 0 a 100,
    "claheContrast": 0 a 100,
    "antiHalo": 0 a 100
  },
  "technicalTips": [
    "Dica técnica 1 para preservação de textura",
    "Dica técnica 2 para evitar artefatos"
  ]
}
IMPORTANTE: Seja conservador com sharpen para evitar halos. Preservar estritamente a identidade e granulação natural da imagem.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    let rawText = response.text || "{}";
    rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    let analysisResult;
    try {
      analysisResult = JSON.parse(rawText);
    } catch {
      analysisResult = {
        summary: rawText,
        recommendedSettings: {
          deblur: 35,
          sharpen: 40,
          denoise: 25,
          detailRecovery: 45,
          faceRestore: 30,
          claheContrast: 20,
          antiHalo: 80,
        },
      };
    }

    return res.json({
      available: true,
      analysis: analysisResult,
    });
  } catch (error: any) {
    console.error("AI Analysis error:", error);
    return res.status(500).json({
      error: "Erro ao processar diagnóstico de IA",
      details: error.message,
    });
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "OptiFocus Pro Engine",
    time: new Date().toISOString(),
    geminiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`OptiFocus Pro server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
