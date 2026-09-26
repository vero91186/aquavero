# AquaTrack AI

Suivi d'aquarium générique (un ou plusieurs bacs, eau douce/mer/saumâtre) avec
un assistant IA façon *AI Aquarium Doctor* : chat contextualisé sur ton bac,
check-up par texte et/ou photo avec niveau de confiance et recommandation de
consulter un professionnel, et lecture automatique de bandelettes de test par
photo.

Stack : Next.js 16 (App Router) + Supabase (auth, base Postgres, stockage
photos) + Gemini (Google AI) pour l'IA. Déployable sur Vercel.

## 1. Créer le projet Supabase

1. Sur [supabase.com](https://supabase.com), crée un nouveau projet.
2. Dans **SQL Editor**, colle et exécute le contenu de
   `supabase/migrations/0001_init.sql`. Cela crée les tables (bacs,
   paramètres d'eau, peuplement, entretien, conversations et diagnostics IA),
   active la sécurité par ligne (chaque utilisateur ne voit que ses données)
   et crée le bucket de stockage pour les photos.
3. Dans **Project Settings > API**, récupère l'URL du projet et la clé
   `anon public`.
4. Dans **Authentication > Providers**, l'authentification par email est
   activée par défaut — pas de configuration supplémentaire nécessaire pour
   démarrer.

## 2. Obtenir une clé Gemini (gratuite)

1. Va sur [Google AI Studio](https://aistudio.google.com/apikey).
2. Crée une clé API (compte Google suffisant, aucune carte bancaire requise
   pour le niveau gratuit).

## 3. Configuration locale

```bash
npm install
cp .env.local.example .env.local
# renseigner NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, GOOGLE_API_KEY
npm run dev
```

L'application est disponible sur http://localhost:3000.

## 4. Déploiement sur Vercel

1. Pousse ce dossier sur un dépôt GitHub.
2. Sur [vercel.com](https://vercel.com), importe le dépôt.
3. Renseigne les trois variables d'environnement (les mêmes que
   `.env.local`) dans les réglages du projet Vercel.
4. Déploie. Vercel détecte automatiquement Next.js.

## Structure

- `supabase/migrations/0001_init.sql` — schéma complet de la base
  (tables, RLS, bucket de stockage).
- `src/lib/health-score.ts` — calcul générique de charge biologique et de
  score de santé, à partir du volume du bac et de son peuplement déclaré
  (aucune population figée : s'adapte à n'importe quel bac).
- `src/lib/ai/gemini.ts` — appels à l'API Gemini (chat, diagnostic,
  lecture de bandelette par photo).
- `src/app/api/ai/*` — routes serveur qui injectent le contexte du bac
  (peuplement, derniers paramètres, score de santé) avant d'appeler l'IA,
  pour des réponses personnalisées plutôt que génériques.
- `src/app/tanks/[id]/page.tsx` — page principale d'un bac (onglets Aperçu,
  Paramètres, Peuplement, Entretien, Assistant IA).

## Notes

- Le score de santé et le calcul de charge biologique sont volontairement
  simples et prudents (seuils indicatifs) — ils donnent une tendance, pas un
  avis expert.
- Les check-up IA affichent systématiquement un rappel à consulter un
  vétérinaire ou un spécialiste aquariophile en cas de gravité moyenne ou
  plus : l'IA est un point de départ, jamais un diagnostic définitif.
- Les photos (bandelettes, poissons) sont stockées dans le bucket Supabase
  `aquarium-photos`, dans un dossier par utilisateur.
