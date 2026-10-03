// Éléments d'interface partagés par les fiches générées par l'IA avec recherche
// web (produits du commerce, roches et racines) : niveau de confiance, sources
// et description enregistrée.

export type Confidence = 'confirmé' | 'estimation' | 'inconnu';

export const CONFIDENCE_STYLES: Record<Confidence, { label: string; className: string }> = {
  confirmé: { label: 'Confirmé par une source', className: 'bg-emerald-100 text-emerald-700' },
  estimation: { label: 'Estimation — à vérifier', className: 'bg-amber-100 text-amber-700' },
  inconnu: { label: 'Non identifié', className: 'bg-red-100 text-red-700' },
};

export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const style = CONFIDENCE_STYLES[confidence];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.className}`}>{style.label}</span>;
}

// Jusqu'à trois sources cliquables : la page principale d'abord, puis celles
// effectivement consultées par la recherche.
export function SourcesLine({
  sourceUrl,
  sources,
}: {
  sourceUrl: string | null;
  sources: { title: string; url: string }[];
}) {
  const list = sourceUrl
    ? [{ title: '', url: sourceUrl }, ...sources.filter((x) => x.url !== sourceUrl)]
    : sources;
  if (list.length === 0) return null;
  return (
    <p className="text-xs text-slate-500">
      Sources :{' '}
      {list.slice(0, 3).map((src, i) => (
        <span key={src.url}>
          {i > 0 && ' · '}
          <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-teal-700 underline">
            {src.title || hostOf(src.url)}
          </a>
        </span>
      ))}
    </p>
  );
}

const SECTION_PREFIX = /^(À quoi ça sert|Nature|Mode d'emploi|Effet sur l'eau|Préparation|Précautions|Fiabilité|Source) :/;

// Description enregistrée d'un élément : une rubrique par ligne. « À quoi ça
// sert » reste visible, le reste se déroule ; la ligne « Source : » devient un
// lien. Un texte libre ancien (sans rubriques) s'affiche tel quel.
export function SummaryDetails({ summary }: { summary: string }) {
  const lines = summary.split('\n').filter(Boolean);
  if (!lines.some((l) => SECTION_PREFIX.test(l))) {
    return <p className="mt-1 text-xs text-slate-500">{summary}</p>;
  }
  const purposeLine = lines.find((l) => l.startsWith('À quoi ça sert :'));
  const sourceLine = lines.find((l) => l.startsWith('Source : '));
  const rest = lines.filter((l) => l !== purposeLine && l !== sourceLine);
  const sourceUrl = sourceLine?.slice('Source : '.length).trim();
  const safeSource = sourceUrl && /^https?:\/\//i.test(sourceUrl) ? sourceUrl : null;
  return (
    <div className="mt-1 text-xs text-slate-500">
      {purposeLine && <p className="text-slate-600">{purposeLine}</p>}
      {(rest.length > 0 || safeSource) && (
        <details className="mt-0.5">
          <summary className="cursor-pointer text-teal-700">Plus de détails</summary>
          <div className="mt-1 space-y-0.5">
            {rest.map((l, i) => (
              <p key={i}>{l}</p>
            ))}
            {safeSource && (
              <p>
                Source :{' '}
                <a href={safeSource} target="_blank" rel="noopener noreferrer" className="text-teal-700 underline">
                  {hostOf(safeSource)}
                </a>
              </p>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
