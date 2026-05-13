export default function AdminLoading() {
  return (
    <div className="min-h-[60vh] p-4 lg:p-6">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#E8A44A]/40 bg-[#FFF8E8] px-3 py-1 text-xs font-900 text-[#2D4F7A]">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[#E8A44A]" />
        Loading admin page
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-5 h-8 w-64 animate-pulse rounded bg-slate-100" />
        <div className="grid gap-3 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
        <div className="mt-4 space-y-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-10 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
