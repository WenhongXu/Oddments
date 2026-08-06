export default function LoadingSpinner({ size = 'md', text }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div
        className={`${sizes[size]} rounded-full border-2 border-gold/20 border-t-gold animate-spin`}
      />
      {text && <p className="text-textMuted text-sm">{text}</p>}
    </div>
  );
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="card mb-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`shimmer rounded h-4 mb-2 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  );
}
