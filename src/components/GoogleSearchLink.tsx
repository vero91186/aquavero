import { ExternalLink } from 'lucide-react';

// Solution de repli quand l'IA (Gemini) est surchargée ou lente à répondre :
// un simple lien vers une recherche Google, qui n'a besoin d'aucune clé et ne
// dépend d'aucun service tiers — toujours disponible, contrairement à l'IA.
export function GoogleSearchLink({ query, label }: { query: string; label?: string }) {
  if (!query.trim()) return null;
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 hover:underline"
    >
      <ExternalLink size={12} />
      {label ?? 'Ou chercher sur Google'}
    </a>
  );
}
