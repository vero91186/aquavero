// Photos d'illustration des fiches maladies et observations : titres d'articles
// Wikipédia choisis à la main (page exacte, pas de recherche floue), dont on
// prend l'image principale. Format « langue:Titre ». Le premier titre qui a une
// image gagne. Une fiche absente de la liste n'a simplement pas de photo.
export const TOPIC_PHOTO_PAGES: Record<string, string[]> = {
  // Maladies
  ich: ["en:Ichthyophthirius multifiliis", "fr:Ichtyophthiriose"],
  velours: [
    "en:Piscinoodinium",
    "en:Velvet disease",
    "en:Amyloodinium ocellatum",
  ],
  columnaris: ["en:Flavobacterium columnare", "en:Columnaris"],
  "pourriture-nageoires": ["en:Fin rot", "fr:Pourriture des nageoires"],
  hydropisie: ["en:Dropsy"],
  mycose: ["en:Saprolegnia", "fr:Saprolegnia"],
  camallanus: ["en:Camallanus", "fr:Camallanus"],
  hexamita: ["en:Hexamita", "en:Hole-in-the-head disease"],
  "vers-branchiaux": ["en:Gyrodactylus", "en:Dactylogyrus"],
  costia: ["en:Ichthyobodo", "en:Ichthyobodo necator"],
  lymphocystis: ["en:Lymphocystis", "en:Lymphocystis disease"],
  mycobacteriose: ["en:Mycobacterium marinum", "en:Fish tuberculosis"],
  "vessie-natatoire": ["en:Swim bladder disease", "en:Swim bladder"],
  "crevette-mue": ["en:Ecdysis"],
  "crevette-scutariella": ["en:Scutariella didactyla", "en:Scutariella"],
  "crypto-melt": ["en:Cryptocoryne", "fr:Cryptocoryne"],
  // Autres observations
  "oeufs-poisson": ["en:Roe", "fr:Œuf de poisson"],
  "oeufs-pomacea": ["en:Pomacea canaliculata", "fr:Pomacea canaliculata"],
  "oeufs-escargot": ["en:Physa acuta", "en:Planorbidae"],
  "oeufs-crevette": ["en:Neocaridina davidi", "fr:Neocaridina davidi"],
  alevins: ["en:Fish fry", "en:Fry (fish)"],
  diatomees: ["en:Diatom", "fr:Diatomée"],
  "algues-vertes": ["en:Green algae", "fr:Chlorophyta"],
  "algues-filamenteuses": ["en:Spirogyra", "fr:Spirogyra"],
  "algues-brosse": ["en:Audouinella", "en:Black beard algae", "en:Compsopogon"],
  cyanobacteries: ["en:Cyanobacteria", "fr:Cyanobactérie"],
  biofilm: ["en:Biofilm", "fr:Biofilm"],
  planaires: ["en:Planaria", "fr:Planaire"],
  hydres: ["en:Hydra (genus)", "fr:Hydre (cnidaire)"],
  "vers-detritus": ["en:Nematode", "fr:Nematoda"],
  copepodes: ["en:Copepod", "fr:Copépodes"],
  sangsues: ["en:Leech", "fr:Hirudinea"],
};

export async function fetchWikipediaLeadImage(
  spec: string,
): Promise<string | null> {
  const i = spec.indexOf(":");
  const lang = spec.slice(0, i);
  const title = spec.slice(i + 1);
  try {
    const res = await fetch(
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const d = (await res.json()) as {
      thumbnail?: { source?: string };
      originalimage?: { source?: string };
    };
    return d.thumbnail?.source ?? d.originalimage?.source ?? null;
  } catch {
    return null;
  }
}
