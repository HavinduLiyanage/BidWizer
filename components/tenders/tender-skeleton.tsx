export function TenderSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse">
      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-full bg-gray-200" />
        <div className="w-24 h-6 rounded-full bg-gray-200" />
      </div>

      {/* Title */}
      <div className="space-y-2 mb-3">
        <div className="h-5 bg-gray-200 rounded w-3/4" />
        <div className="h-5 bg-gray-200 rounded w-1/2" />
      </div>

      {/* Meta */}
      <div className="flex gap-4 mb-3">
        <div className="h-4 bg-gray-200 rounded w-32" />
        <div className="h-4 bg-gray-200 rounded w-24" />
      </div>

      {/* Description */}
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
      </div>

      {/* Budget + Deadline */}
      <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-100">
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-16" />
          <div className="h-4 bg-gray-200 rounded w-24" />
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-16" />
          <div className="h-4 bg-gray-200 rounded w-24" />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-3">
          <div className="h-4 bg-gray-200 rounded w-16" />
          <div className="h-4 bg-gray-200 rounded w-20" />
        </div>
        <div className="h-6 bg-gray-200 rounded w-16" />
      </div>

      {/* Button */}
      <div className="h-10 bg-gray-200 rounded-lg w-full" />
    </div>
  );
}

