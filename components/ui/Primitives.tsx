export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="font-mono text-xs uppercase tracking-widest text-gray-400 mb-2.5">{children}</div>;
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`print-card bg-white rounded-lg border border-gray-100 shadow-sm p-4 ${className}`}>{children}</div>;
}

export function TagList({ items, variant = 'gray' }: { items: string[]; variant?: 'gray' | 'red' | 'teal' | 'blue' }) {
  const s: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-700',
    red: 'bg-red-50 text-red-700',
    teal: 'bg-teal-50 text-teal-700',
    blue: 'bg-blue-50 text-blue-700',
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {(items || []).map((item, i) => (
        <span key={i} className={`text-xs px-2.5 py-1 rounded-md ${s[variant]}`}>{item}</span>
      ))}
    </div>
  );
}
