export default function ProductPageLoading() {
  return (
    <div className="bg-white">
      <div className="border-b border-gray-100 py-3">
        <div className="mx-auto max-w-7xl px-4">
          <div className="h-4 w-72 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
      <main className="mx-auto max-w-7xl px-4 py-5 lg:py-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_430px]">
          <div className="h-[420px] animate-pulse rounded-2xl bg-slate-100" />
          <div className="space-y-3">
            <div className="h-8 w-3/4 animate-pulse rounded bg-slate-100" />
            <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        </div>
      </main>
    </div>
  );
}
