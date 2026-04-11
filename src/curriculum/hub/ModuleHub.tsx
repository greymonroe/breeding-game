const MODULES = [
  {
    title: 'Transmission Genetics',
    description: 'Discover dominance, segregation, and independent assortment through hands-on crosses.',
    difficulty: 'Introductory',
    color: 'emerald',
    experiments: 7,
    href: '/breeding-game/lab.html',
    icon: 'plant' as const,
  },
  {
    title: 'Linkage & Recombination',
    description: 'Explore linked genes, recombination frequency, and build genetic maps.',
    difficulty: 'Intermediate',
    color: 'cyan',
    experiments: 7,
    href: '/breeding-game/linkage.html',
    icon: 'chromosome' as const,
  },
  {
    title: 'Population Genetics',
    description: 'Simulate drift, selection, migration, and mutation in evolving populations.',
    difficulty: 'Advanced',
    color: 'violet',
    experiments: 7,
    href: '/breeding-game/popgen.html',
    icon: 'population' as const,
  },
];

const COMING_SOON = [
  { title: 'Molecular Biology' },
  { title: 'Quantitative Genetics' },
];

/* ── Inline SVG icons ─────────────────────────────────────────────── */

function PlantSvg({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 40V24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 28C18 28 14 22 14 16C20 16 24 22 24 28Z" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2" />
      <path d="M24 24C30 24 34 18 34 12C28 12 24 18 24 24Z" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2" />
      <path d="M24 20C21 17 21 12 24 8C27 12 27 17 24 20Z" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function ChromosomeSvg({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="20" width="32" height="8" rx="4" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="24" r="2.5" fill="currentColor" />
      <circle cx="26" cy="24" r="2.5" fill="currentColor" />
      <circle cx="36" cy="24" r="2.5" fill="currentColor" opacity="0.5" />
      <path d="M20 20V14M20 28V34" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
    </svg>
  );
}

function PopulationSvg({ className }: { className?: string }) {
  const positions = [
    [12, 14], [20, 12], [28, 14], [36, 12],
    [12, 22], [20, 24], [28, 22], [36, 24],
    [12, 32], [20, 34], [28, 32], [36, 34],
  ];
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {positions.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="3.5" fill="currentColor" opacity={i % 3 === 0 ? 0.8 : i % 3 === 1 ? 0.5 : 0.25} />
      ))}
    </svg>
  );
}

function LockSvg({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const ICON_MAP = {
  plant: PlantSvg,
  chromosome: ChromosomeSvg,
  population: PopulationSvg,
};

const COLOR_MAP: Record<string, { gradient: string; border: string; bg: string; text: string; btnFrom: string; btnTo: string }> = {
  emerald: {
    gradient: 'from-emerald-400 to-emerald-500',
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    btnFrom: 'from-emerald-500',
    btnTo: 'to-emerald-600',
  },
  cyan: {
    gradient: 'from-cyan-400 to-cyan-500',
    border: 'border-cyan-200',
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    btnFrom: 'from-cyan-500',
    btnTo: 'to-cyan-600',
  },
  violet: {
    gradient: 'from-violet-400 to-violet-500',
    border: 'border-violet-200',
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    btnFrom: 'from-violet-500',
    btnTo: 'to-violet-600',
  },
};

/* ── Module Card ──────────────────────────────────────────────────── */

function ModuleCard({ module }: { module: typeof MODULES[number] }) {
  const colors = COLOR_MAP[module.color];
  const Icon = ICON_MAP[module.icon];

  return (
    <a
      href={module.href}
      className="group bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden"
    >
      {/* Color accent bar */}
      <div className={`h-1.5 bg-gradient-to-r ${colors.gradient}`} />

      <div className="p-5 flex flex-col flex-1">
        {/* Icon */}
        <div className={`w-14 h-14 rounded-xl ${colors.bg} ${colors.text} flex items-center justify-center mb-4`}>
          <Icon className="w-8 h-8" />
        </div>

        {/* Title & description */}
        <h3 className="text-lg font-extrabold text-stone-800 mb-1">{module.title}</h3>
        <p className="text-sm text-stone-500 leading-relaxed mb-4 flex-1">{module.description}</p>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-stone-400 mb-4">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold ${colors.bg} ${colors.text}`}>
            {module.difficulty}
          </span>
          <span>{module.experiments} experiments</span>
        </div>

        {/* Button */}
        <div
          className={`rounded-xl bg-gradient-to-b ${colors.btnFrom} ${colors.btnTo} px-4 py-2.5 text-sm font-bold text-white text-center shadow-sm group-hover:shadow-md transition-all`}
        >
          Start Module &rarr;
        </div>
      </div>
    </a>
  );
}

function ComingSoonCard({ title }: { title: string }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm opacity-50 flex flex-col overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-stone-300 to-stone-400" />
      <div className="p-5 flex flex-col items-center text-center gap-3">
        <div className="w-14 h-14 rounded-xl bg-stone-100 text-stone-400 flex items-center justify-center">
          <LockSvg className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-extrabold text-stone-400">{title}</h3>
        <span className="text-xs font-semibold text-stone-400 bg-stone-100 rounded-full px-3 py-1">Coming Soon</span>
      </div>
    </div>
  );
}

/* ── Hub Page ─────────────────────────────────────────────────────── */

export default function ModuleHub() {
  return (
    <div className="min-h-screen bg-stone-50 font-[Nunito,sans-serif]">
      {/* Header */}
      <header className="bg-gradient-to-r from-stone-800 to-stone-700 text-white">
        <div className="max-w-5xl mx-auto px-4 py-8 sm:py-10">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Genetics Learning Lab</h1>
            <a
              href="/breeding-game/"
              className="text-stone-400 hover:text-white text-xs font-semibold underline transition-colors"
            >
              Back to Game
            </a>
          </div>
          <p className="text-stone-400 text-sm sm:text-base">Choose a module to begin</p>
        </div>
      </header>

      {/* Module cards */}
      <section className="max-w-5xl mx-auto px-4 -mt-4 sm:-mt-6 relative z-[1]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {MODULES.map((m) => (
            <ModuleCard key={m.title} module={m} />
          ))}
        </div>
      </section>

      {/* Coming soon */}
      <section className="max-w-5xl mx-auto px-4 mt-10 mb-16">
        <h2 className="text-sm font-bold text-stone-400 uppercase tracking-wide mb-4">Coming Soon</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {COMING_SOON.map((m) => (
            <ComingSoonCard key={m.title} title={m.title} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 py-6 text-center text-xs text-stone-400">
        Part of{' '}
        <a href="/breeding-game/" className="underline hover:text-stone-600 transition-colors">
          the Breeding Game
        </a>
      </footer>
    </div>
  );
}
