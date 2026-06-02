'use client';

/* Squelettes de chargement unifiés (effet shimmer doux). */

export function SkeletonBox({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-beige-200/60 ${className}`}
      aria-hidden
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(201,169,110,0.18), transparent)',
          animation: 'shimmer 1.6s infinite',
        }}
      />
    </div>
  );
}

/** Grille de cartes en chargement (événements, etc.). */
export function SkeletonCards({ count = 6 }: { count?: number }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true" aria-label="Chargement">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-beige-200 bg-beige-50 overflow-hidden">
          <SkeletonBox className="h-40 rounded-none" />
          <div className="p-6 space-y-3">
            <SkeletonBox className="h-5 w-2/3" />
            <SkeletonBox className="h-4 w-full" />
            <SkeletonBox className="h-4 w-4/5" />
            <div className="flex gap-2 pt-2">
              <SkeletonBox className="h-6 w-20 rounded-full" />
              <SkeletonBox className="h-6 w-24 rounded-full" />
            </div>
            <SkeletonBox className="h-11 w-full rounded-xl mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Lignes de tableau / liste en chargement. */
export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Chargement">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBox key={i} className="h-16 w-full rounded-2xl" />
      ))}
    </div>
  );
}
