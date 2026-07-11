

export const ShimmerLine = ({ className = '' }) => (
  <div className={`shimmer-bg rounded-sm ${className}`}></div>
);

export const StatCardSkeleton = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm flex flex-col justify-between h-36">
          <div className="space-y-3">
            <ShimmerLine className="h-3.5 w-24" />
            <ShimmerLine className="h-8 w-16" />
          </div>
          <div className="flex justify-between items-center mt-4 pt-2">
            <ShimmerLine className="h-3 w-28" />
            <ShimmerLine className="h-8 w-8 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const TableSkeleton = ({ rows = 5, cols = 5 }) => {
  return (
    <div className="w-full bg-canvas border border-hairline rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-hairline flex items-center justify-between">
        <ShimmerLine className="h-4 w-40" />
        <ShimmerLine className="h-7 w-24" />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-hairline-cool">
          <thead>
            <tr className="bg-canvas-soft/40">
              {[...Array(cols)].map((_, i) => (
                <th key={i} className="py-3 px-6">
                  <ShimmerLine className="h-3 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline-cool">
            {[...Array(rows)].map((_, rIdx) => (
              <tr key={rIdx}>
                {[...Array(cols)].map((_, cIdx) => (
                  <td key={cIdx} className="py-4 px-6">
                    <ShimmerLine className={`h-3 ${cIdx === 0 ? 'w-24' : cIdx === 1 ? 'w-36' : 'w-16'}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const CardSkeleton = ({ count = 3 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-canvas border border-hairline rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <ShimmerLine className="h-4 w-28" />
              <ShimmerLine className="h-3.5 w-40" />
            </div>
            <ShimmerLine className="h-6 w-12 rounded-full" />
          </div>
          <div className="space-y-2 pt-2 border-t border-hairline-cool/40">
            <ShimmerLine className="h-3 w-3/4" />
            <ShimmerLine className="h-3 w-1/2" />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-hairline-cool/40">
            <ShimmerLine className="h-7 w-16 rounded" />
            <ShimmerLine className="h-7 w-16 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default {
  StatCardSkeleton,
  TableSkeleton,
  CardSkeleton,
  ShimmerLine
};
