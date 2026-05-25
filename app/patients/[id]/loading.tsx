// app/patients/[id]/loading.tsx
export default function PatientLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="flex-1 space-y-1.5">
          <div className="w-32 h-4 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="w-20 h-3 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
        {/* Perfil card */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex gap-4 items-start">
            <div className="w-20 h-20 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="w-28 h-5 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
              <div className="flex gap-1.5">
                <div className="w-16 h-5 rounded-full bg-slate-100 dark:bg-slate-700 animate-pulse" />
                <div className="w-12 h-5 rounded-full bg-slate-100 dark:bg-slate-700 animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Tutor card */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-2">
          <div className="w-24 h-4 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
          {[1,2,3].map(i => (
            <div key={i} className="w-full h-4 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />
          ))}
        </div>

        {/* Records */}
        <div className="space-y-2">
          {[1,2].map(i => (
            <div key={i} className="h-16 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
