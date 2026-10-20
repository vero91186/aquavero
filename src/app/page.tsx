import Link from 'next/link';
import { Droplets, Sparkles, LineChart, Camera } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <section className="eau text-white">
        <Bubbles />
        <div className="mx-auto max-w-5xl px-4 pb-32 pt-20 sm:pb-40 sm:pt-28">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-white/12 text-sable ring-1 ring-white/25 backdrop-blur-sm">
            <Droplets size={28} />
          </span>
          <h1 className="mt-7 max-w-2xl text-5xl leading-[1.05] text-balance sm:text-7xl">AquaTrack AI</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-teal-100">
            Le suivi d&apos;aquarium qui comprend ton bac : paramètres d&apos;eau, peuplement, entretien, et un
            assistant IA qui interprète tes données pour te dire quoi faire.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/signup" className="rounded-full bg-sable px-7 py-3 text-sm font-semibold text-abysse shadow-lg shadow-black/10 transition hover:bg-white">
              Créer un compte
            </Link>
            <Link href="/login" className="rounded-full border border-white/35 px-7 py-3 text-sm font-medium text-white transition hover:bg-white/10">
              Se connecter
            </Link>
          </div>
        </div>
        {/* Surface de l'eau : la vague raccorde l'en-tête au fond clair de la page. */}
        <svg className="absolute inset-x-0 bottom-0 h-16 w-full sm:h-24" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 64C160 20 320 20 480 56s320 60 480 24 320-52 480-8V120H0Z" fill="#f2f9fb" opacity="0.5" />
          <path d="M0 88C180 52 340 56 520 84s300 34 460 6 300-40 460-10V120H0Z" fill="#f2f9fb" />
        </svg>
      </section>

      <main className="mx-auto grid max-w-5xl gap-4 px-4 pb-16 pt-6 sm:grid-cols-2">
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
    <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700 ring-1 ring-teal-100">{icon}</span>
      <div>
        <h3 className="text-xl text-slate-900">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">{desc}</p>
      </div>
    </div>
  );
}

// Bulles qui remontent vers la surface, à droite de l'en-tête.
function Bubbles() {
  const bubbles = [
    { x: 78, y: 62, r: 34 },
    { x: 90, y: 38, r: 18 },
    { x: 70, y: 22, r: 10 },
    { x: 84, y: 82, r: 14 },
    { x: 95, y: 64, r: 8 },
    { x: 62, y: 74, r: 6 },
    { x: 88, y: 12, r: 6 },
  ];
  return (
    <svg className="absolute inset-0 hidden h-full w-full sm:block" viewBox="0 0 100 100" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
      {bubbles.map((b) => (
        <g key={`${b.x}-${b.y}`} transform={`translate(${b.x} ${b.y}) scale(0.65)`}>
          <circle r={b.r * 0.5} fill="rgb(255 255 255 / 0.05)" stroke="rgb(255 255 255 / 0.28)" strokeWidth="0.25" />
          <path d={`M ${-b.r * 0.3} ${-b.r * 0.12} A ${b.r * 0.34} ${b.r * 0.34} 0 0 1 ${-b.r * 0.06} ${-b.r * 0.34}`} fill="none" stroke="rgb(255 255 255 / 0.5)" strokeWidth="0.3" strokeLinecap="round" />
        </g>
      ))}
    </svg>
  );
}
