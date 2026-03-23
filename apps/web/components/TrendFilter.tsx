'use client';

export function TrendFilter({
  filter,
  onFilterChange,
}: {
  filter: string;
  onFilterChange: (filter: any) => void;
}) {
  const filters = [
    { value: 'emerging', label: '🌱 Emerging' },
    { value: 'growing', label: '📈 Growing' },
    { value: 'peak', label: '🔥 Peak' },
    { value: 'all', label: '🌐 All Trends' },
  ];

  return (
    <div className="flex gap-2">
      {filters.map(f => (
        <button
          key={f.value}
          onClick={() => onFilterChange(f.value)}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            filter === f.value
              ? 'bg-blue-600 text-white ring-2 ring-blue-400'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
