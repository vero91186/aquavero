import { DISEASE_NAMES } from '@/lib/diseases';
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

async function postGemini(body: Record<string, unknown>) {
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
      body: JSON.stringify(body),
    });

    if (res.ok) return res.json();

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

async function callGemini(parts: GeminiPart[], systemInstruction: string) {
  const data = await postGemini({
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: 'user', parts }],
    generationConfig: { temperature: 0.4, responseMimeType: 'application/json' },
  });
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Réponse Gemini vide ou inattendue.");
  return text as string;
}

export interface GroundingSource {
  title: string;
  url: string;
}

// Variante avec recherche Google activée : le modèle peut lire des pages web
// (notices fabricants, fiches revendeurs) au lieu de répondre de mémoire. Le
// mode JSON strict n'est pas combinable avec les outils : on extrait donc
// l'objet JSON du texte, et on renvoie aussi les sources effectivement
// consultées (métadonnées de « grounding »).
async function callGeminiGrounded(parts: GeminiPart[], systemInstruction: string) {
  const data = await postGemini({
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: 'user', parts }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0.1 },
  });
  const candidate = data.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .map((p: GeminiPart) => p.text ?? '')
    .join('');
  if (!text) throw new Error('Réponse Gemini vide ou inattendue.');
  const chunks: { web?: { uri?: string; title?: string } }[] =
    candidate?.groundingMetadata?.groundingChunks ?? [];
  const sources: GroundingSource[] = chunks
    .filter((c) => c.web?.uri)
    .map((c) => ({ title: c.web?.title ?? '', url: c.web!.uri! }));
  return { text: text as string, sources };
}

export function extractJsonObject(text: string): unknown {
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first === -1 || last <= first) throw new Error('Réponse IA sans objet JSON exploitable.');
  return JSON.parse(text.slice(first, last + 1));
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
Quand la condition correspond à l'une de ces maladies connues, utilise exactement ce nom dans
"likely_condition" : ${DISEASE_NAMES.join(' ; ')}.
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

// Ancien prompt « de mémoire », conservé en repli si la recherche web de Gemini
// est indisponible : la fiche est alors marquée comme simple estimation.
const PRODUCT_FALLBACK_SYSTEM_PROMPT = `Tu es un expert produits d'aquariophilie. On te donne le nom (et
parfois la marque) d'un produit du commerce. Tu n'as pas accès à internet : à partir de tes seules
connaissances générales, tu donnes une fiche prudente — catégorie la plus probable, usage/dosage
typique en une phrase, estimation du dosage en mL pour 100 L d'eau neuve SEULEMENT pour un
conditionneur d'eau (null si tu ne peux pas l'estimer raisonnablement), durée de conservation typique
une fois ouvert en jours (null si impossible à estimer) et un point de vigilance. Si tu ne reconnais
pas ce produit précis, base-toi sur sa catégorie et dis-le clairement dans la note. Un produit de bactéries liquides est de catégorie "bacteria" (traitement versé dans le bac, pas
dans l'eau de remplacement). Donne aussi
"purpose" (à quoi sert ce type de produit, en une ou deux phrases) et "usage" (comment et à quelle
fréquence on l'emploie, en une ou deux phrases). Réponds uniquement avec un objet JSON de la forme :
{"category": "conditioner|bacteria|fertilizer|food|filter_media|test_kit|other", "purpose": "...",
"usage": "...", "dose_info": "...", "dose_ml_per_100l": 0.0, "shelf_life_days_after_opening": 0,
"note": "..."}`;

const PRODUCT_SYSTEM_PROMPT = `Tu es un expert produits d'aquariophilie. Utilise la recherche web pour
identifier EXACTEMENT le produit demandé (marque, gamme, contenance) et lire sa notice ou sa fiche
officielle : le site du fabricant en priorité, sinon un revendeur spécialisé sérieux. Ne te contente
pas d'un produit « similaire ».

Règles de précision :
Catégories : « conditioner » = anti-chlore / conditionneur ajouté à l'eau neuve à chaque changement
d'eau. « bacteria » = bactéries nitrifiantes en flacon liquide (ex. Seachem Stability, Tetra
SafeStart, Dennerle Bio Elixier) : ce sont des TRAITEMENTS versés directement dans le bac, jamais
un produit d'eau de remplacement ; dans "usage", donne le schéma de traitement du fabricant (par
exemple une dose par jour pendant une semaine à la mise en route, puis après un traitement
médicamenteux, un nettoyage de filtre ou un gros changement d'eau) et précise « à verser dans le
bac, pas dans l'eau de remplacement ».
- purpose : à quoi sert le produit, concrètement, en une ou deux phrases claires pour un débutant
  (ex. « Neutralise le chlore et les chloramines de l'eau du robinet et détoxifie temporairement
  l'ammoniac et les nitrites »). Appuie-toi sur ce que dit le fabricant, sans slogan marketing.
- usage : quand et comment l'employer (à chaque changement d'eau, une fois par semaine, en cas de
  problème précis...) et la fréquence, d'après la notice. Null si introuvable.
- dose_info : la consigne du fabricant reformulée fidèlement, avec les chiffres et unités d'origine
  (ex. « 1 mL pour 10 L d'eau neuve »). Rien d'inventé : si aucune consigne n'est trouvée, null.
- dose_ml_per_100l : uniquement si la dose du fabricant s'exprime en volume de produit par volume
  d'eau ; convertis-la en mL pour 100 L (« 5 mL pour 200 L » → 2.5 ; « 1 mL pour 10 L » → 10).
  Dose en bouchons, pressions, grammes, tablettes ou introuvable → null (et explique dans dose_info).
- shelf_life_days_after_opening : seulement si la fiche donne une durée après ouverture (symbole PAO,
  « à utiliser dans les X mois ») ; sinon null.
- confidence : "confirmé" si la dose et l'usage viennent d'une source fabricant ou revendeur pour ce
  produit exact ; "estimation" si tu as dû t'appuyer sur un produit voisin ou une source indirecte ;
  "inconnu" si le produit n'est pas identifiable (alors dose_ml_per_100l et shelf_life à null).
- identified_name : nom complet tel qu'inscrit sur l'emballage (marque + produit + contenance si
  connue), ou null.
- source_url : URL exacte de la page produit ou notice que tu as réellement consultée, ou null.
  N'invente jamais d'URL.
- note : points de vigilance réels (dose maximale, incompatibilités, conservation). Si
  confidence n'est pas "confirmé", dis-le clairement ici.

Réponds uniquement avec un objet JSON, sans texte autour, de la forme :
{"identified_name": "...", "category": "conditioner|bacteria|fertilizer|food|filter_media|test_kit|other",
"purpose": "...", "usage": "...", "dose_info": "...", "dose_ml_per_100l": 0.0, "shelf_life_days_after_opening": 0,
"confidence": "confirmé|estimation|inconnu", "source_url": "...", "note": "..."}`;

export type ProductConfidence = 'confirmé' | 'estimation' | 'inconnu';
type ProductCategoryId = 'conditioner' | 'bacteria' | 'fertilizer' | 'food' | 'filter_media' | 'test_kit' | 'other';

export interface ProductResearch {
  identified_name: string | null;
  category: ProductCategoryId;
  purpose: string | null; // à quoi sert le produit
  usage: string | null; // quand et comment l'employer
  dose_info: string | null;
  dose_ml_per_100l: number | null;
  shelf_life_days_after_opening: number | null;
  confidence: ProductConfidence;
  source_url: string | null;
  sources: GroundingSource[];
  note: string;
}

const PRODUCT_CATEGORIES: ProductCategoryId[] = [
  'conditioner',
  'bacteria',
  'fertilizer',
  'food',
  'filter_media',
  'test_kit',
  'other',
];

function positiveNumberOrNull(v: unknown, max: number): number | null {
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 && n <= max ? n : null;
}

function stringOrNull(v: unknown): string | null {
  return typeof v === 'string' && v.trim() && v.trim().toLowerCase() !== 'null' ? v.trim() : null;
}

function httpUrlOrNull(v: unknown): string | null {
  const s = stringOrNull(v);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

// Remet en forme et borne la réponse du modèle : catégorie connue, doses
// plausibles, URL valide, niveau de confiance cohérent avec ce qui est rempli.
export function normalizeProductResearch(
  raw: Record<string, unknown>,
  sources: GroundingSource[]
): ProductResearch {
  const category = PRODUCT_CATEGORIES.includes(raw.category as ProductCategoryId)
    ? (raw.category as ProductCategoryId)
    : 'other';
  let confidence: ProductConfidence =
    raw.confidence === 'confirmé' || raw.confidence === 'estimation' || raw.confidence === 'inconnu'
      ? raw.confidence
      : 'estimation';
  const sourceUrl = httpUrlOrNull(raw.source_url);
  // « confirmé » sans aucune source consultée n'est pas crédible.
  if (confidence === 'confirmé' && !sourceUrl && sources.length === 0) confidence = 'estimation';
  const unknown = confidence === 'inconnu';
  return {
    identified_name: stringOrNull(raw.identified_name),
    category,
    purpose: stringOrNull(raw.purpose),
    usage: stringOrNull(raw.usage),
    dose_info: stringOrNull(raw.dose_info),
    // Un dosage en mL/100 L au-delà de 500 est presque sûrement une erreur de conversion.
    dose_ml_per_100l: unknown ? null : positiveNumberOrNull(raw.dose_ml_per_100l, 500),
    shelf_life_days_after_opening: unknown ? null : positiveNumberOrNull(raw.shelf_life_days_after_opening, 3650),
    confidence,
    source_url: sourceUrl,
    sources: sources.slice(0, 5),
    note: stringOrNull(raw.note) ?? '',
  };
}

export async function researchProduct(name: string): Promise<ProductResearch> {
  const prompt = `Produit à identifier et documenter : "${name}".`;
  try {
    const { text, sources } = await callGeminiGrounded([{ text: prompt }], PRODUCT_SYSTEM_PROMPT);
    return normalizeProductResearch(extractJsonObject(text) as Record<string, unknown>, sources);
  } catch {
    // Recherche web indisponible ou réponse inexploitable : repli sur une fiche
    // de mémoire, clairement présentée comme une estimation.
    const text = await callGemini(
      [{ text: `Donne-moi une fiche sur ce produit d'aquariophilie : "${name}".` }],
      PRODUCT_FALLBACK_SYSTEM_PROMPT
    );
    const raw = JSON.parse(text) as Record<string, unknown>;
    const result = normalizeProductResearch({ ...raw, confidence: 'estimation' }, []);
    return {
      ...result,
      note: ['Fiche issue des connaissances générales de l’IA (recherche web indisponible).', result.note]
        .filter(Boolean)
        .join(' '),
    };
  }
}

const PRODUCT_PAGE_SYSTEM_PROMPT = `Utilise la recherche web pour trouver la page produit officielle
(site du fabricant en priorité, sinon un revendeur spécialisé en aquariophilie) du produit demandé,
avec une photo du produit. Donne l'URL exacte de la page que tu as réellement consultée, jamais une
URL inventée, ou null si tu ne trouves pas ce produit précis. Réponds uniquement avec un objet JSON :
{"product_page_url": "..."}`;

// Pages web candidates pour illustrer un produit : celle citée par le modèle
// d'abord, puis les sources de la recherche (URL de redirection Google, que
// fetch suit jusqu'à la vraie page).
export async function searchProductPages(name: string): Promise<string[]> {
  try {
    const { text, sources } = await callGeminiGrounded(
      [{ text: `Page produit officielle de : "${name}".` }],
      PRODUCT_PAGE_SYSTEM_PROMPT
    );
    const urls: string[] = [];
    try {
      const url = httpUrlOrNull((extractJsonObject(text) as Record<string, unknown>).product_page_url);
      if (url) urls.push(url);
    } catch {
      // Pas de JSON exploitable : les sources du grounding suffisent.
    }
    for (const src of sources) urls.push(src.url);
    return Array.from(new Set(urls)).slice(0, 5);
  } catch {
    return [];
  }
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

// Ancien prompt « de mémoire », conservé en repli si la recherche web est
// indisponible : la fiche est alors marquée comme simple estimation.
const HARDSCAPE_FALLBACK_SYSTEM_PROMPT = `Tu es un expert en décors d'aquarium (roches, bois et
racines), y compris les noms commerciaux français couramment utilisés en aquariophilie et
aquascaping, même quand ils sont une traduction ou une adaptation d'un nom anglais (ex. "racine
araignée" ou "bois araignée" = spiderwood ; "racine de tourbière"/"racine de mangrove" = bogwood/
mangrove wood ; "bois de mopani" = mopani wood). Avant de conclure que tu ne connais pas un
matériau, pense à sa traduction anglaise probable et à ses variantes de nom commercial. Tu n'as pas
accès à internet : à partir de tes seules connaissances, tu donnes une fiche prudente : ce que c'est
("material"), à quoi il sert dans un aquarium ("purpose"), son effet éventuel sur le pH ou la dureté
("water_effect"), la préparation nécessaire avant utilisation ("preparation") et un point de
vigilance ("note"). Si aucun matériau d'aquariophilie connu ne correspond, dis-le clairement plutôt
que d'inventer une fiche. Réponds uniquement avec un objet JSON de la forme :
{"material": "...", "purpose": "...", "water_effect": "...", "preparation": "...", "note": "..."}`;

const HARDSCAPE_SYSTEM_PROMPT = `Tu es un expert en décors d'aquarium (roches, bois et racines), y
compris les noms commerciaux français couramment utilisés en aquariophilie et aquascaping, même
quand ils sont une traduction d'un nom anglais (ex. « racine araignée » = spiderwood ; « racine de
tourbière » = moorwood/bogwood ; « bois de mopani » = mopani wood ; « roche dragon » = ohko/dragon
stone ; « roche de lave » = lava rock). Pense à la traduction anglaise probable et aux variantes de
nom avant de conclure que tu ne connais pas un matériau.

Utilise la recherche web pour identifier précisément le matériau demandé et lire des sources
sérieuses : fabricant ou revendeur spécialisé en aquariophilie, magasin d'aquascaping, guide
reconnu. Ne te contente pas d'un matériau « similaire ».

Règles de précision :
- identified_name : nom courant en français utilisé en aquariophilie (avec le nom anglais ou
  commercial entre parenthèses s'il aide à le reconnaître), ou null si non identifiable.
- material : ce que c'est, en une phrase (nature, origine, aspect).
- purpose : à quoi il sert dans un aquarium, concrètement (abri, surface de fixation pour plantes
  et mousses, surface pour les bactéries, structure du décor...), pour un débutant.
- water_effect : effet sur le pH, la dureté (GH/KH) et la couleur de l'eau, d'après les sources
  (matériau calcaire qui durcit et alcalinise ; bois qui libère des tanins, acidifie légèrement et
  teinte en brun ; roche inerte, etc.). Dis « aucun effet notable » si c'est le cas ; null si
  introuvable.
- preparation : la préparation nécessaire avant mise en eau (brossage, ébouillantage, trempage de
  plusieurs jours pour un bois, test à l'acide pour une roche) avec durées quand les sources en
  donnent ; null si rien n'est nécessaire ou introuvable.
- confidence : "confirmé" si ces informations viennent de sources qui décrivent ce matériau
  précis ; "estimation" si tu t'appuies sur un matériau voisin ou une source indirecte ; "inconnu"
  si le matériau n'est pas identifiable (alors les autres champs sont null).
- source_url : URL exacte d'une page réellement consultée qui décrit ce matériau, ou null.
  N'invente jamais d'URL.
- note : points de vigilance réels (flottaison, bords coupants, risque de calcaire, bois non traité,
  pesticides sur les bois ramassés dehors...). Si confidence n'est pas "confirmé", dis-le ici.

Réponds uniquement avec un objet JSON, sans texte autour, de la forme :
{"identified_name": "...", "material": "...", "purpose": "...", "water_effect": "...",
"preparation": "...", "confidence": "confirmé|estimation|inconnu", "source_url": "...",
"note": "..."}`;

export interface HardscapeResearch {
  identified_name: string | null;
  material: string | null;
  purpose: string | null;
  water_effect: string | null;
  preparation: string | null;
  confidence: ProductConfidence;
  source_url: string | null;
  sources: GroundingSource[];
  note: string;
}

export function normalizeHardscapeResearch(
  raw: Record<string, unknown>,
  sources: GroundingSource[]
): HardscapeResearch {
  let confidence: ProductConfidence =
    raw.confidence === 'confirmé' || raw.confidence === 'estimation' || raw.confidence === 'inconnu'
      ? raw.confidence
      : 'estimation';
  const sourceUrl = httpUrlOrNull(raw.source_url);
  if (confidence === 'confirmé' && !sourceUrl && sources.length === 0) confidence = 'estimation';
  const unknown = confidence === 'inconnu';
  const field = (v: unknown) => (unknown ? null : stringOrNull(v));
  return {
    identified_name: stringOrNull(raw.identified_name),
    material: field(raw.material),
    purpose: field(raw.purpose),
    water_effect: field(raw.water_effect),
    preparation: field(raw.preparation),
    confidence,
    source_url: sourceUrl,
    sources: sources.slice(0, 5),
    note: stringOrNull(raw.note) ?? '',
  };
}

export async function researchHardscape(name: string): Promise<HardscapeResearch> {
  try {
    const { text, sources } = await callGeminiGrounded(
      [{ text: `Matériau de décor d'aquarium à identifier et documenter : "${name}".` }],
      HARDSCAPE_SYSTEM_PROMPT
    );
    return normalizeHardscapeResearch(extractJsonObject(text) as Record<string, unknown>, sources);
  } catch {
    const text = await callGemini(
      [{ text: `Fiche sur ce matériau de décor d'aquarium : "${name}".` }],
      HARDSCAPE_FALLBACK_SYSTEM_PROMPT
    );
    const raw = JSON.parse(text) as Record<string, unknown>;
    const result = normalizeHardscapeResearch({ ...raw, confidence: 'estimation' }, []);
    return {
      ...result,
      note: ['Fiche issue des connaissances générales de l’IA (recherche web indisponible).', result.note]
        .filter(Boolean)
        .join(' '),
    };
  }
}

const PLANT_SCHEMA = `{"identified_name": "...", "scientific_name": "...", "origin": "...",
"placement": "avant-plan|milieu|arrière-plan|flottante|sur décor", "height_cm": 0, "width_cm": 0,
"growth": "lente|moyenne|rapide", "light": "faible|moyenne|forte", "co2": "inutile|conseillé|nécessaire",
"difficulty": "facile|moyenne|difficile", "temperature": "...", "water": "...", "planting": "...",
"care": "...", "propagation": "...", "role": "...", "confidence": "confirmé|estimation|inconnu",
"source_url": "...", "note": "..."}`;

const PLANT_SYSTEM_PROMPT = `Tu es un expert des plantes d'aquarium (aquascaping et bacs plantés), y
compris les noms français courants, les noms anglais et les variétés d'aquariophilie (cultivars comme
Taxiphyllum « Flame » ou Cryptocoryne wendtii « Green », qui n'ont pas de fiche botanique à part).
Utilise la recherche web pour identifier EXACTEMENT la plante demandée et lire des sources sérieuses :
fabricant de plantes d'aquarium (Tropica, Aquasabi...), revendeur spécialisé, base de plantes
aquatiques reconnue. Ne te contente pas d'une plante « voisine » : si une variété a des besoins
différents, donne ceux de la variété.

Règles de précision :
- identified_name : nom courant français (avec la variété), scientific_name : nom scientifique complet
  (genre, espèce, variété ou cultivar entre apostrophes si c'en est un), ou null.
- origin : région d'origine en quelques mots, ou null.
- placement : où la placer dans le bac, selon sa taille et son port.
- height_cm / width_cm : hauteur adulte typique et étalement au sol, en cm, en nombres uniques réalistes
  pour un aquarium (milieu de la fourchette donnée par les sources), null si introuvable.
- growth, light, co2, difficulty : exactement une des valeurs proposées, d'après les sources.
- temperature : plage en °C (ex. « 20 à 28 °C ») ; water : pH et dureté tolérés (ex. « pH 6 à 8, GH 2
  à 15 »), ou null.
- planting : comment l'installer (enterrer les racines sans recouvrir le rhizome, fixer sur bois ou
  roche avec du fil ou de la colle, laisser flotter...), en une ou deux phrases.
- care : entretien concret (taille, engrais liquide ou de sol, nettoyage des feuilles), fréquence quand
  les sources en donnent.
- propagation : comment elle se multiplie (stolons, rhizome, boutures), ou null.
- role : à quoi elle sert dans le bac (absorbe les nitrates, abri, ombrage, surface de ponte...).
- confidence : "confirmé" si ces informations viennent de sources décrivant cette plante précise ;
  "estimation" si tu as dû t'appuyer sur une plante voisine ou une source indirecte ; "inconnu" si la
  plante n'est pas identifiable (alors tous les autres champs sont null).
- source_url : URL exacte d'une page réellement consultée, ou null. N'invente jamais d'URL.
- note : points de vigilance réels (plante toxique pour certains animaux, envahissante, fond à
  cacher, plante qui fond à l'arrivée...). Si confidence n'est pas "confirmé", dis-le ici.

Réponds uniquement avec un objet JSON, sans texte autour, de la forme :
${PLANT_SCHEMA}`;

const PLANT_FALLBACK_SYSTEM_PROMPT = `Tu es un expert des plantes d'aquarium. Tu n'as pas accès à internet :
à partir de tes seules connaissances, tu donnes une fiche prudente de la plante demandée (nom français
ou scientifique, variétés comprises). Mêmes champs et mêmes valeurs possibles que demandé ci-dessous ;
mets null pour ce que tu ne peux pas estimer raisonnablement et dis dans "note" que c'est une
estimation. Réponds uniquement avec un objet JSON de la forme :
${PLANT_SCHEMA}`;

export interface PlantResearch {
  identified_name: string | null;
  scientific_name: string | null;
  origin: string | null;
  placement: string | null;
  height_cm: number | null;
  width_cm: number | null;
  growth: string | null;
  light: string | null;
  co2: string | null;
  difficulty: string | null;
  temperature: string | null;
  water: string | null;
  planting: string | null;
  care: string | null;
  propagation: string | null;
  role: string | null;
  confidence: ProductConfidence;
  source_url: string | null;
  sources: GroundingSource[];
  note: string;
}

function oneOf(v: unknown, allowed: string[]): string | null {
  const s = typeof v === 'string' ? v.trim().toLowerCase() : '';
  return allowed.includes(s) ? s : null;
}

export function normalizePlantResearch(raw: Record<string, unknown>, sources: GroundingSource[]): PlantResearch {
  let confidence: ProductConfidence =
    raw.confidence === 'confirmé' || raw.confidence === 'estimation' || raw.confidence === 'inconnu'
      ? raw.confidence
      : 'estimation';
  const sourceUrl = httpUrlOrNull(raw.source_url);
  if (confidence === 'confirmé' && !sourceUrl && sources.length === 0) confidence = 'estimation';
  const unknown = confidence === 'inconnu';
  const text = (v: unknown) => (unknown ? null : stringOrNull(v));
  const placement = oneOf(raw.placement, ['avant-plan', 'milieu', 'arrière-plan', 'flottante', 'sur décor']);
  return {
    identified_name: stringOrNull(raw.identified_name),
    scientific_name: text(raw.scientific_name),
    origin: text(raw.origin),
    placement: unknown ? null : placement,
    height_cm: unknown ? null : positiveNumberOrNull(raw.height_cm, 300),
    width_cm: unknown ? null : positiveNumberOrNull(raw.width_cm, 100),
    growth: unknown ? null : oneOf(raw.growth, ['lente', 'moyenne', 'rapide']),
    light: unknown ? null : oneOf(raw.light, ['faible', 'moyenne', 'forte']),
    co2: unknown ? null : oneOf(raw.co2, ['inutile', 'conseillé', 'nécessaire']),
    difficulty: unknown ? null : oneOf(raw.difficulty, ['facile', 'moyenne', 'difficile']),
    temperature: text(raw.temperature),
    water: text(raw.water),
    planting: text(raw.planting),
    care: text(raw.care),
    propagation: text(raw.propagation),
    role: text(raw.role),
    confidence,
    source_url: sourceUrl,
    sources: sources.slice(0, 5),
    note: stringOrNull(raw.note) ?? '',
  };
}

export async function researchPlant(name: string, scientificName?: string | null): Promise<PlantResearch> {
  const subject = scientificName && scientificName !== name ? `"${name}" (${scientificName})` : `"${name}"`;
  try {
    const { text, sources } = await callGeminiGrounded(
      [{ text: `Plante d'aquarium à identifier et documenter : ${subject}.` }],
      PLANT_SYSTEM_PROMPT
    );
    return normalizePlantResearch(extractJsonObject(text) as Record<string, unknown>, sources);
  } catch {
    const text = await callGemini([{ text: `Fiche sur cette plante d'aquarium : ${subject}.` }], PLANT_FALLBACK_SYSTEM_PROMPT);
    const raw = JSON.parse(text) as Record<string, unknown>;
    const result = normalizePlantResearch({ ...raw, confidence: 'estimation' }, []);
    return {
      ...result,
      note: ['Fiche issue des connaissances générales de l’IA (recherche web indisponible).', result.note]
        .filter(Boolean)
        .join(' '),
    };
  }
}

const TANK_CHECKUP_SYSTEM_PROMPT = `Tu es l'assistant aquariophile intégré à AquaTrack AI, façon "AI
Aquarium Doctor". On te donne un état complet et détaillé d'un bac (âge du bac, statut du cyclage,
peuplement et charge biologique, derniers paramètres d'eau avec leur ancienneté, historique
d'entretien avec la date des dernières interventions par type, rappels en retard ou proches, et
produits ouverts proches de la péremption), et éventuellement une ou plusieurs photos d'ensemble du
bac. Si une ou plusieurs photos sont fournies, observe aussi leur état visuel : couleur et
transparence de l'eau, présence d'algues (et leur type si identifiable : vertes, brunes/diatomées,
cyanobactéries...) sur les vitres, le décor ou les plantes, aspect général des plantes (croissance,
feuilles jaunies ou fondues), aspect et comportement des poissons visibles, propreté du sol et du
filtre visible, niveau d'eau, buée ou dépôts sur les vitres — et croise ces observations visuelles
avec les données fournies. Sans photo, base-toi uniquement sur les données factuelles, sans halluciner
de symptôme visuel. Identifie les problèmes réels ou probables et les points de vigilance (ex.
cyclage pas terminé avec des poissons déjà en place, paramètres hors plage, changement d'eau très en
retard, charge biologique trop élevée pour le volume, produit périmé, algues visibles, plante en
mauvais état), classés par gravité, et une liste d'actions concrètes et priorisées à faire. S'il n'y a
rien d'alarmant, dis-le clairement dans l'évaluation générale et propose quand même 1 ou 2 conseils
d'entretien courant plutôt que d'inventer un problème. Réponds uniquement avec un objet JSON de la
forme :
{"overall_assessment": "...", "issues": [{"label": "...", "severity": "low|medium|high|urgent", "detail": "..."}],
"todos": ["...", "..."]}`;

export async function checkupTank(params: {
  tankContext: string;
  images?: { base64: string; mimeType: string }[];
}) {
  const hasPhotos = (params.images?.length ?? 0) > 0;
  const parts: GeminiPart[] = [
    {
      text: `Voici l'état complet du bac à analyser :\n${params.tankContext}\n\n${
        hasPhotos
          ? `${params.images!.length} photo(s) du bac sont jointes ci-dessous.`
          : "Aucune photo n'est fournie pour ce scan."
      }`,
    },
  ];
  for (const img of params.images ?? []) {
    parts.push({ inline_data: { mime_type: img.mimeType, data: img.base64 } });
  }
  const text = await callGemini(parts, TANK_CHECKUP_SYSTEM_PROMPT);
  return JSON.parse(text) as {
    overall_assessment: string;
    issues: { label: string; severity: 'low' | 'medium' | 'high' | 'urgent'; detail: string }[];
    todos: string[];
  };
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

const OBSERVATION_SYSTEM_PROMPT = `Tu identifies ce que l'on observe dans un aquarium d'eau douce, en dehors des
maladies : œufs (poissons, crevettes, escargots), jeunes, algues et dépôts, bestioles (planaires, hydres,
vers, copépodes), biofilm, moisissures. À partir d'une photo et/ou d'une description, tu donnes ce que
c'est le plus probablement, une catégorie ("oeufs", "algues", "bestioles" ou "autre"), un niveau de
confiance entre 0 et 1, si c'est dangereux ("none" = sans danger, "watch" = à surveiller, "act" = à
traiter), une courte explication et une liste d'actions concrètes. Si une maladie d'un animal est
probable, dis-le et conseille l'onglet des maladies. Si tu n'es pas sûr, dis-le plutôt que d'inventer.
Réponds uniquement avec un objet JSON de la forme :
{"identification": "...", "category": "oeufs|algues|bestioles|autre", "confidence": 0.0,
"risk": "none|watch|act", "explanation": "...", "actions": ["..."]}`;

export async function identifyObservation(params: {
  description?: string;
  hint?: string;
  imageBase64?: string;
  imageMimeType?: string;
}) {
  const parts: GeminiPart[] = [
    {
      text: `Observation dans mon bac${params.hint ? ` (type indiqué : ${params.hint})` : ''} : ${
        params.description ?? '(aucune description, se baser sur la photo)'
      }`,
    },
  ];
  if (params.imageBase64 && params.imageMimeType) {
    parts.push({ inline_data: { mime_type: params.imageMimeType, data: params.imageBase64 } });
  }
  const text = await callGemini(parts, OBSERVATION_SYSTEM_PROMPT);
  return JSON.parse(text) as {
    identification: string;
    category: 'oeufs' | 'algues' | 'bestioles' | 'autre';
    confidence: number;
    risk: 'none' | 'watch' | 'act';
    explanation: string;
    actions: string[];
  };
}

// Profil de comportement d'une espèce hors catalogue, pour l'évaluation des
// incompatibilités du simulateur (voir src/lib/compatibility.ts).
const TRAITS_SYSTEM_PROMPT = `Tu es un aquariophile expert. On te donne une espèce d'aquarium (nom commun, nom scientifique, type). Réponds UNIQUEMENT en JSON, avec des booléens prudents (true seulement si c'est bien établi pour l'espèce adulte) :
{"marine": eau de mer, "shrimp": crevette d'eau douce, "crayfish": écrevisse, "snail": escargot, "plantEatingSnail": escargot qui mange les plantes saines, "assassinSnail": escargot qui mange d'autres escargots, "harmless": poisson très pacifique qui ne mange jamais d'autres poissons (corydoras, loricariidés, otocinclus…), "strongPredator": avale les poissons plus petits que lui, "shrimpHunter": mange les crevettes adultes ou jeunes, "eatsSnails": mange les escargots, "nipper": mordille les nageoires des autres, "longfin": a de longues nageoires fragiles, "labyrinth": poisson à labyrinthe (gourami, betta…), "solitary": doit vivre seul (ou un seul mâle) car il tue ses congénères, "territorial": mâles ou couples très territoriaux, "active": nageur très rapide et agité, "shy": timide, stressé par les nageurs agités, "hot": exige 28 °C ou plus, "cool": préfère 22 °C ou moins, "soft": exige une eau douce et acide (pH < 7), "hard": exige une eau dure et alcaline (pH > 7,5), "note": une phrase courte en français sur son caractère et ses compagnons à éviter}`;

export async function analyzeSpeciesTraits(params: {
  name: string;
  scientificName?: string | null;
  kind?: string;
}) {
  const text = await callGemini(
    [
      {
        text: `Espèce : ${params.name}${params.scientificName ? ` (${params.scientificName})` : ''}${params.kind ? `, type : ${params.kind === 'invertebrate' ? 'invertébré' : 'poisson'}` : ''}.`,
      },
    ],
    TRAITS_SYSTEM_PROMPT
  );
  return JSON.parse(text) as Record<string, boolean | string>;
}
