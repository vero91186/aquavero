import Link from 'next/link';
import { Droplets, Sparkles, LineChart, Camera } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
      <main className="mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center">
        <Droplets className="mb-4 text-teal-600" size={40} />
        <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">AquaTrack AI</h1>
        <p className="mt-3 max-w-xl text-slate-600">
          Le suivi d&apos;aquarium qui comprend ton bac : paramètres d&apos;eau, peuplement, entretien —
          et un assistant IA qui interprète tes données pour te dire quoi faire.
        </p>

        <div className="mt-8 flex gap-3">
          <Link href="/signup" className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-700">
            Créer un compte
          </Link>
          <Link href="/login" className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Se connecter
          </Link>
        </div>

        <div className="mt-16 grid gap-6 text-left sm:grid-cols-2">
          <Feature icon={<LineChart size={20} />} title="Suivi générique" desc="Un ou plusieurs bacs, eau douce ou de mer, avec courbes de tendance." />
          <Feature icon={<Camera size={20} />} title="Photo bandelette" desc="Prends en photo un test, l'IA en extrait les valeurs pour toi." />
          <Feature icon={<Sparkles size={20} />} title="Assistant IA" desc="Pose tes questions, il connaît ton bac et ses derniers relevés." />
          <Feature icon={<Droplets size={20} />} title="Score de santé" desc="Charge biologique et alertes calculées à partir de ton peuplement." />
        </div>
      </main>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-2 text-teal-600">{icon}</div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{desc}</p>
    </div>
  );
}
