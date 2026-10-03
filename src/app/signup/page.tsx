'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMessage('Compte créé. Vérifie ta boîte mail pour confirmer, puis connecte-toi.');
    setTimeout(() => router.push('/login'), 2000);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-abysse px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-8 shadow-xl">
        <h1 className="text-3xl text-slate-900">Créer un compte</h1>
        <p className="text-sm text-slate-500">Un compte pour synchroniser tes bacs sur tous tes appareils.</p>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        {message && <p className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-700">{message}</p>}

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Mot de passe</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-teal-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {loading ? 'Création…' : 'Créer mon compte'}
        </button>

        <p className="text-center text-sm text-slate-500">
          Déjà un compte ?{' '}
          <Link href="/login" className="font-medium text-teal-600 hover:underline">
            Se connecter
          </Link>
        </p>
      </form>
    </div>
  );
}
