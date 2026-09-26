import { createBrowserClient } from '@supabase/ssr';

// Le typage strict des tables Supabase (generic Database) exige une forme
// précise (Insert/Update avec champs requis, Relationships, etc.) qui alourdit
// le projet sans bénéfice ici : on type manuellement les résultats via
// src/types/database.ts plutôt que de le brancher sur le client.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
