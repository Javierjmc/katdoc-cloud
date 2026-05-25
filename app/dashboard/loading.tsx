// app/dashboard/loading.tsx
// Skeleton de carga automático de Next.js (Streaming SSR)

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header skeleton */}
      <div className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="w-24 h-5 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
        </div>
        <div className="w-24 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      </div>

      {/* Search skeleton */}
      <div className="px-4 py-4 space-y-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="w-full h-11 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        <div className="flex gap-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="w-16 h-7 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      </div>

      {/* Cards skeleton */}
      <div className="px-4 py-4 max-w-3xl mx-auto space-y-3">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="h-24 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
