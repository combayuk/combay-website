export default function RouteLoadingShell({ label = "Loading page" }: { label?: string }) {
  return (
    <div className="min-h-[55vh] bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#E8A44A]/40 bg-[#FFF8E8] px-3 py-1 text-xs font-900 text-[#2D4F7A]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#E8A44A]" />
          {label}
        </div>
        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:block">
            <div className="mb-4 h-4 w-28 animate-pulse rounded bg-slate-100" />
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="h-8 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          </div>
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-5 h-8 w-2/3 animate-pulse rounded bg-slate-100" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-52 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
