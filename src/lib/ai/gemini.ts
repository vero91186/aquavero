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
pas ce produit précis, base-toi sur sa catégorie et dis-le clairement dans la note. Donne aussi
"purpose" (à quoi sert ce type de produit, en une ou deux phrases) et "usage" (comment et à quelle
fréquence on l'emploie, en une ou deux phrases). Réponds uniquement avec un objet JSON de la forme :
{"category": "conditioner|fertilizer|food|filter_media|test_kit|other", "purpose": "...",
"usage": "...", "dose_info": "...", "dose_ml_per_100l": 0.0, "shelf_life_days_after_opening": 0,
"note": "..."}`;

const PRODUCT_SYSTEM_PROMPT = `Tu es un expert produits d'aquariophilie. Utilise la recherche web pour
identifier EXACTEMENT le produit demandé (marque, gamme, contenance) et lire sa notice ou sa fiche
officielle : le site du fabricant en priorité, sinon un revendeur spécialisé sérieux. Ne te contente
pas d'un produit « similaire ».

Règles de précision :
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
{"identified_name": "...", "category": "conditioner|fertilizer|food|filter_media|test_kit|other",
"purpose": "...", "usage": "...", "dose_info": "...", "dose_ml_per_100l": 0.0, "shelf_life_days_after_opening": 0,
"confidence": "confirmé|estimation|inconnu", "source_url": "...", "note": "..."}`;

export type ProductConfidence = 'confirmé' | 'estimation' | 'inconnu';
type ProductCategoryId = 'conditioner' | 'fertilizer' | 'food' | 'filter_media' | 'test_kit' | 'other';

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

const HARDSCAPE_RESEARCH_SYSTEM_PROMPT = `Tu es un expert en décors d'aquarium (roches, bois et
racines), y compris les noms commerciaux français couramment utilisés en aquariophilie et
aquascaping, même quand ils sont une traduction ou une adaptation d'un nom anglais (ex. "racine
araignée" ou "bois araignée" = spiderwood ; "racine de tourbière"/"racine de mangrove" = bogwood/
mangrove wood ; "bois de mopani" = mopani wood ; "racine de tourbière" = moorwood). Avant de conclure
que tu ne connais pas un matériau, pense à sa traduction anglaise probable et à ses variantes
d'orthographe ou de nom commercial. On te donne le nom d'un matériau. Tu donnes une fiche
synthétique : son effet éventuel sur le pH ou la dureté de l'eau (ex. matériau calcaire qui durcit et
alcalinise l'eau, bois qui l'acidifie et la teinte via les tanins), la préparation nécessaire avant
utilisation le cas échéant (faire bouillir, faire tremper plusieurs jours, brosser), et un point de
vigilance si pertinent. Ce n'est que si vraiment aucun matériau d'aquariophilie connu ne correspond,
même approximativement, que tu le dis clairement plutôt que d'inventer une fiche. Réponds uniquement
avec un objet JSON de la forme :
{"water_effect": "...", "preparation": "...", "note": "..."}`;

export async function researchHardscape(name: string) {
  const prompt = `Fiche sur ce matériau de décor d'aquarium : "${name}".`;
  const text = await callGemini([{ text: prompt }], HARDSCAPE_RESEARCH_SYSTEM_PROMPT);
  return JSON.parse(text) as { water_effect: string; preparation: string; note: string };
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
