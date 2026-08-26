import LiveMapLoader from "@/components/LiveMapLoader";

export default function UserHome() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome</h1>
        <p className="text-sm text-brand-100/50">
          Check electricity availability, report outages, and stay informed.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-brand-100/40">Your area</p>
          <p className="mt-2 text-lg font-semibold">Pincode 682001</p>
          <span className="pill pill-normal mt-3">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
            Electricity available
          </span>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-brand-100/40">Active outages</p>
          <p className="mt-2 text-3xl font-bold text-status-normal">0</p>
          <p className="mt-1 text-xs text-brand-100/40">In your locality</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-brand-100/40">Maintenance</p>
          <p className="mt-2 text-3xl font-bold">None</p>
          <p className="mt-1 text-xs text-brand-100/40">No scheduled work</p>
        </div>
      </div>

      {/* Two live Kerala maps */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-brand-100/90">Power availability</p>
            <div className="flex gap-2">
              <span className="pill pill-normal">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
                Current available
              </span>
              <span className="pill pill-fault">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
                No current
              </span>
            </div>
          </div>
          <LiveMapLoader role="USER" variant="availability" compact height="22rem" />
        </div>

        <div className="card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-brand-100/90">Faults &amp; maintenance</p>
            <div className="flex gap-2">
              <span className="pill pill-fault">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
                Line fault
              </span>
              <span className="pill pill-maint">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
                Maintenance
              </span>
            </div>
          </div>
          <LiveMapLoader role="USER" variant="operations" compact height="22rem" />
        </div>
      </div>

      <p className="text-xs text-brand-100/40">
        Demo / simulated data. Status is never shown by colour alone. Estimated restoration
        times, when shown, are estimates only.
      </p>
    </div>
  );
}
