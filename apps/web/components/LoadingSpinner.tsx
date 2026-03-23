'use client';

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin">
        <div className="w-12 h-12 border-4 border-gray-700 border-t-blue-600 rounded-full"></div>
      </div>
      <p className="ml-4 text-gray-400">Loading trends...</p>
    </div>
  );
}
