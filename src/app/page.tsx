import Link from 'next/link';
import { Droplets, Sparkles, LineChart, Camera } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <section className="bg-abysse text-white">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:py-28">
          <Droplets className="mb-6 text-sable" size={36} />
          <h1 className="max-w-2xl text-5xl leading-[1.05] sm:text-6xl">AquaTrack AI</h1>
          <p className="mt-5 max-w-xl text-lg text-teal-100">
            Le suivi d&apos;aquarium qui comprend ton bac : paramètres d&apos;eau, peuplement, entretien, et un
            assistant IA qui interprète tes données pour te dire quoi faire.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="rounded-full bg-sable px-6 py-2.5 text-sm font-semibold text-abysse transition hover:bg-white">
              Créer un compte
            </Link>
            <Link href="/login" className="rounded-full border border-white/30 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-white/10">
              Se connecter
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-5xl gap-4 px-4 py-14 sm:grid-cols-2">
        <Feature icon={<LineChart size={20} />} title="Suivi générique" desc="Un ou plusieurs bacs, eau douce ou de mer, avec courbes de tendance." />
        <Feature icon={<Camera size={20} />} title="Photo bandelette" desc="Prends en photo un test, l'IA en extrait les valeurs pour toi." />
        <Feature icon={<Sparkles size={20} />} title="Assistant IA" desc="Pose tes questions, il connaît ton bac et ses derniers relevés." />
        <Feature icon={<Droplets size={20} />} title="Score de santé" desc="Charge biologique et alertes calculées à partir de ton peuplement." />
      </main>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-2 text-teal-600">{icon}</div>
      <h3 className="text-xl text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{desc}</p>
    </div>
  );
}
