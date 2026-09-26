// Client minimal pour l'API Gemini (Google AI Studio), texte + vision.
// Clé attendue dans la variable d'environnement GOOGLE_API_KEY (serveur uniquement).

const GEMINI_MODEL = 'gemini-2.5-flash';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

async function callGemini(parts: GeminiPart[], systemInstruction: string) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Clé API Google manquante : configure GOOGLE_API_KEY dans les variables d'environnement."
    );
  }

  const res = await fetch(`${API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: 0.4, responseMimeType: 'application/json' },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erreur Gemini (${res.status}) : ${text}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Réponse Gemini vide ou inattendue.");
  return text as string;
}

const CHAT_SYSTEM_PROMPT = `Tu es l'assistant aquariophile intégré à AquaTrack AI. Tu réponds en français,
de façon concise et concrète. Tu t'appuies sur le contexte du bac fourni (volume, type d'eau,
peuplement, derniers paramètres mesurés) pour personnaliser tes réponses plutôt que de donner des
conseils génériques. Si une question touche à un problème de santé grave ou qui s'aggrave, rappelle
clairement qu'un avis vétérinaire ou d'un spécialiste aquariophile reste nécessaire. Réponds
uniquement avec un objet JSON de la forme {"reply": "..."}.`;

export async function chatWithAssistant(message: string, tankContext: string, history: string) {
  const prompt = `Contexte du bac :\n${tankContext}\n\nHistorique récent :\n${history}\n\nQuestion de l'utilisateur : ${message}`;
  const text = await callGemini([{ text: prompt }], CHAT_SYSTEM_PROMPT);
  const parsed = JSON.parse(text);
  return parsed.reply as string;
}

const DIAGNOSTIC_SYSTEM_PROMPT = `Tu es un assistant de pré-diagnostic aquariophile, façon "AI Aquarium
Doctor". On te donne le contexte d'un bac et une observation (texte et/ou photo). Tu identifies la
condition la plus probable, un niveau de confiance entre 0 et 1, un niveau de gravité, une liste
d'actions recommandées concrètes, et si un avis vétérinaire ou d'un spécialiste est nécessaire.
Tu n'es jamais catégorique : pour tout signe de gravité moyenne ou plus, tu recommandes de consulter.
Réponds uniquement avec un objet JSON de la forme :
{"likely_condition": "...", "confidence": 0.0, "severity": "low|medium|high|urgent",
"recommended_actions": ["...", "..."], "vet_referral": true|false, "explanation": "..."}`;

export async function diagnoseFromInput(params: {
  tankContext: string;
  description?: string;
  imageBase64?: string;
  imageMimeType?: string;
}) {
  const parts: GeminiPart[] = [
    { text: `Contexte du bac :\n${params.tankContext}\n\nObservation : ${params.description ?? '(aucune description, se baser sur la photo)'}` },
  ];
  if (params.imageBase64 && params.imageMimeType) {
    parts.push({ inline_data: { mime_type: params.imageMimeType, data: params.imageBase64 } });
  }
  const text = await callGemini(parts, DIAGNOSTIC_SYSTEM_PROMPT);
  return JSON.parse(text) as {
    likely_condition: string;
    confidence: number;
    severity: 'low' | 'medium' | 'high' | 'urgent';
    recommended_actions: string[];
    vet_referral: boolean;
    explanation: string;
  };
}

const OCR_SYSTEM_PROMPT = `Tu lis une photo de bandelette de test d'eau d'aquarium (ou d'un
résultat de test en gouttes affiché à côté d'un nuancier). Tu identifies chaque paramètre visible et
sa valeur estimée en comparant les couleurs au nuancier si présent. Réponds uniquement avec un objet
JSON de la forme :
{"ph": null, "ammonia_ppm": null, "nitrite_ppm": null, "nitrate_ppm": null, "gh_dgh": null,
"kh_dkh": null, "temperature_c": null, "confidence_note": "..."}
Mets null pour toute valeur non lisible ou non présente sur la photo. Les valeurs numériques sont
des nombres, jamais des chaînes.`;

export async function ocrTestStrip(imageBase64: string, imageMimeType: string) {
  const parts: GeminiPart[] = [
    { text: 'Lis les valeurs de cette bandelette ou de ce test de paramètres d\'eau.' },
    { inline_data: { mime_type: imageMimeType, data: imageBase64 } },
  ];
  const text = await callGemini(parts, OCR_SYSTEM_PROMPT);
  return JSON.parse(text) as {
    ph: number | null;
    ammonia_ppm: number | null;
    nitrite_ppm: number | null;
    nitrate_ppm: number | null;
    gh_dgh: number | null;
    kh_dkh: number | null;
    temperature_c: number | null;
    confidence_note: string;
  };
}
