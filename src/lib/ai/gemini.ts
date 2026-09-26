// Client minimal pour l'API Gemini (Google AI Studio), texte + vision.
// Clé attendue dans la variable d'environnement GOOGLE_API_KEY (serveur uniquement).

const GEMINI_MODEL = 'gemini-3.8-flash';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Codes transitoires côté Google (surcharge du modèle, quota momentané) :
// on retente automatiquement quelques fois avant d'abandonner, plutôt que de
// remonter une erreur technique dès le premier essai.
const RETRYABLE_STATUSES = new Set([429, 500, 503]);
const MAX_ATTEMPTS = 3;

async function callGemini(parts: GeminiPart[], systemInstruction: string) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Clé API Google manquante : configure GOOGLE_API_KEY dans les variables d'environnement."
    );
  }

  let lastStatus: number | null = null;
  let lastBody = '';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetch(`${API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts }],
        generationConfig: { temperature: 0.4, responseMimeType: 'application/json' },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Réponse Gemini vide ou inattendue.");
      return text as string;
    }

    lastStatus = res.status;
    lastBody = await res.text();

    if (RETRYABLE_STATUSES.has(res.status) && attempt < MAX_ATTEMPTS) {
      await sleep(attempt * 1200); // 1.2s puis 2.4s avant de retenter
      continue;
    }
    break;
  }

  if (lastStatus !== null && RETRYABLE_STATUSES.has(lastStatus)) {
    throw new Error(
      "Le service IA de Google est momentanément surchargé (forte demande). Réessaie dans une minute ou deux — ce n'est pas un problème de ton côté."
    );
  }
  throw new Error(`Erreur Gemini (${lastStatus}) : ${lastBody}`);
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

const IDENTIFY_SYSTEM_PROMPT = `Tu es un identificateur d'espèces aquariophiles (poissons, invertébrés, plantes
aquatiques, coraux) à partir d'une photo. Tu proposes jusqu'à 3 hypothèses classées par
vraisemblance, avec un nom commun en français, le nom scientifique le plus probable, la
catégorie ("fish", "invertebrate", "plant" ou "coral"), un niveau de confiance entre 0 et 1, et
une courte note d'entretien (besoins de base : lumière, difficulté, comportement). Si l'image ne
permet pas d'identifier une espèce aquariophile, renvoie une liste vide. Réponds uniquement avec un
objet JSON de la forme :
{"candidates": [{"common_name": "...", "scientific_name": "...", "category": "fish|invertebrate|plant|coral",
"confidence": 0.0, "care_note": "..."}]}`;

export async function identifySpeciesFromPhoto(imageBase64: string, imageMimeType: string) {
  const parts: GeminiPart[] = [
    { text: "Identifie l'espèce aquariophile (poisson, invertébré, plante ou corail) sur cette photo." },
    { inline_data: { mime_type: imageMimeType, data: imageBase64 } },
  ];
  const text = await callGemini(parts, IDENTIFY_SYSTEM_PROMPT);
  return JSON.parse(text) as {
    candidates: {
      common_name: string;
      scientific_name: string;
      category: 'fish' | 'invertebrate' | 'plant' | 'coral';
      confidence: number;
      care_note: string;
    }[];
  };
}

const ITEM_SYSTEM_PROMPTS: Record<'equipment' | 'inventory', string> = {
  equipment: `Tu identifies du matériel d'aquariophilie (filtre, chauffage, éclairage, pompe,
osmoseur, écumeur...) à partir d'une photo. Tu proposes la marque et le modèle les plus probables
si visibles ou déductibles, la catégorie de matériel, et une courte note d'entretien ou d'usage
(fréquence de nettoyage, consommables, points de vigilance). Si rien n'est identifiable, renvoie des
champs vides. Réponds uniquement avec un objet JSON de la forme :
{"name": "...", "brand_model": "...", "category": "...", "note": "..."}`,
  inventory: `Tu identifies un produit d'aquariophilie (nourriture, engrais, conditionneur d'eau,
masse filtrante, media, test kit, accessoire...) à partir d'une photo, souvent de son emballage. Tu
proposes le nom du produit, la marque, la catégorie, et une courte note d'usage (dosage typique,
fréquence, précaution). Si rien n'est identifiable, renvoie des champs vides. Réponds uniquement
avec un objet JSON de la forme :
{"name": "...", "brand_model": "...", "category": "...", "note": "..."}`,
};

export async function identifyItemFromPhoto(
  imageBase64: string,
  imageMimeType: string,
  kind: 'equipment' | 'inventory'
) {
  const prompt =
    kind === 'equipment'
      ? "Identifie ce matériel d'aquariophilie sur cette photo."
      : "Identifie ce produit d'aquariophilie sur cette photo (nourriture, engrais, conditionneur, media filtrant...).";
  const parts: GeminiPart[] = [
    { text: prompt },
    { inline_data: { mime_type: imageMimeType, data: imageBase64 } },
  ];
  const text = await callGemini(parts, ITEM_SYSTEM_PROMPTS[kind]);
  return JSON.parse(text) as {
    name: string;
    brand_model: string;
    category: string;
    note: string;
  };
}

const PRODUCT_SYSTEM_PROMPT = `Tu es un expert produits d'aquariophilie. On te donne le nom (et parfois
la marque) d'un produit du commerce (conditionneur d'eau, engrais, nourriture, media filtrant, test
kit...). À partir de tes connaissances générales sur ce type de produit, tu donnes une fiche
synthétique : sa catégorie la plus probable, son usage/dosage typique en une phrase, et si c'est un
conditionneur d'eau (déchlorinant), une estimation du dosage usuel en mL pour 100 L d'eau neuve
(beaucoup de conditionneurs se dosent autour de 5 mL/100L, mais certains sont plus concentrés —
indique ta meilleure estimation, ou null si tu ne peux pas l'estimer raisonnablement). Donne aussi
une estimation de la durée de conservation typique de ce type de produit UNE FOIS OUVERT, en jours
(par exemple environ 60 jours pour de la nourriture en flocons ouverte, 365 jours ou plus pour un
conditionneur d'eau ou un engrais liquide bien fermé, null si vraiment impossible à estimer). Précise
aussi un point de vigilance si pertinent (dosage à ne pas dépasser, incompatibilité, conditions de
conservation, etc). Tu n'as pas accès à internet : si tu ne reconnais pas ce produit précis,
base-toi sur les produits similaires de sa catégorie et dis-le clairement dans la note. Réponds
uniquement avec un objet JSON de la forme :
{"category": "conditioner|fertilizer|food|filter_media|test_kit|other", "dose_info": "...",
"dose_ml_per_100l": 0.0, "shelf_life_days_after_opening": 0, "note": "..."}`;

export async function researchProduct(name: string) {
  const prompt = `Donne-moi une fiche sur ce produit d'aquariophilie : "${name}".`;
  const text = await callGemini([{ text: prompt }], PRODUCT_SYSTEM_PROMPT);
  return JSON.parse(text) as {
    category: 'conditioner' | 'fertilizer' | 'food' | 'filter_media' | 'test_kit' | 'other';
    dose_info: string;
    dose_ml_per_100l: number | null;
    shelf_life_days_after_opening: number | null;
    note: string;
  };
}

const SPECIES_RESEARCH_SYSTEM_PROMPT = `Tu es un expert aquariophile. On te donne un nom (commun ou
scientifique) d'une espèce (poisson, invertébré, plante aquatique ou corail) absente du catalogue
local de l'application. À partir de tes connaissances générales, tu donnes une fiche synthétique pour
aider à compléter son suivi : nom commun retenu, nom scientifique le plus probable, catégorie
("fish", "invertebrate", "plant" ou "coral"), tempérament/comportement en quelques mots, taille
adulte typique en cm, volume de bac minimal conseillé en litres, un facteur de charge biologique
relatif (échelle où 1.0 = petit poisson paisible type néon d'environ 4 cm ; 0 pour une plante), la
zone de nage principale ("top", "mid" ou "bottom" — mets "bottom" pour une plante), si l'espèce est
plutôt solitaire (à ne pas maintenir en groupe ou avec ses congénères), et une courte note
d'entretien. Si le nom ne correspond à rien de connu en aquariophilie, mets les champs numériques à
null et dis-le clairement dans la note. Réponds uniquement avec un objet JSON de la forme :
{"common_name": "...", "scientific_name": "...", "category": "fish|invertebrate|plant|coral",
"temperament": "...", "adult_size_cm": 0.0, "min_tank_liters": 0, "bioload_factor": 0.0,
"swim_zone": "top|mid|bottom", "solitary": false, "care_note": "..."}`;

export async function researchSpecies(name: string) {
  const prompt = `Fiche pour cette espèce d'aquariophilie, absente du catalogue local : "${name}".`;
  const text = await callGemini([{ text: prompt }], SPECIES_RESEARCH_SYSTEM_PROMPT);
  return JSON.parse(text) as {
    common_name: string;
    scientific_name: string;
    category: 'fish' | 'invertebrate' | 'plant' | 'coral';
    temperament: string | null;
    adult_size_cm: number | null;
    min_tank_liters: number | null;
    bioload_factor: number | null;
    swim_zone: 'top' | 'mid' | 'bottom';
    solitary: boolean;
    care_note: string;
  };
}

const HARDSCAPE_RESEARCH_SYSTEM_PROMPT = `Tu es un expert en décors d'aquarium (roches, bois et
racines). On te donne le nom d'un matériau. Tu donnes une fiche synthétique : son effet éventuel sur
le pH ou la dureté de l'eau (ex. matériau calcaire qui durcit et alcalinise l'eau, bois qui l'acidifie
et la teinte via les tanins), la préparation nécessaire avant utilisation le cas échéant (faire
bouillir, faire tremper plusieurs jours, brosser), et un point de vigilance si pertinent. Si le nom ne
correspond à rien de connu, dis-le clairement. Réponds uniquement avec un objet JSON de la forme :
{"water_effect": "...", "preparation": "...", "note": "..."}`;

export async function researchHardscape(name: string) {
  const prompt = `Fiche sur ce matériau de décor d'aquarium : "${name}".`;
  const text = await callGemini([{ text: prompt }], HARDSCAPE_RESEARCH_SYSTEM_PROMPT);
  return JSON.parse(text) as { water_effect: string; preparation: string; note: string };
}

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
