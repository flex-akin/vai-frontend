import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getEvents,
  EVENT_TYPES,
  type EventLog,
  type EventType,
} from "../../services/api/events";

const PAGE_SIZE = 20;

// ---------- Badge ----------

function Badge({ type }: { type: string }) {
  const colorMap: Record<string, string> = {
    video_generation_completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    video_generation_started:   "bg-blue-500/15 text-blue-400 border-blue-500/20",
    video_playback_started:     "bg-violet-500/15 text-violet-400 border-violet-500/20",
    error_generation_failed:    "bg-red-500/15 text-red-400 border-red-500/20",
    user_dropped_off:           "bg-orange-500/15 text-orange-400 border-orange-500/20",
    user_exited:                "bg-orange-500/15 text-orange-400 border-orange-500/20",
  };
  const cls = colorMap[type] ?? "bg-white/10 text-white/60 border-white/10";
  return (
    <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-mono ${cls}`}>
      {type}
    </span>
  );
}

// ---------- Detail row used inside the modal ----------

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 py-2.5 border-b border-white/5 last:border-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-white/30 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-white/80 break-all">{value}</span>
    </div>
  );
}

// ---------- Modal ----------

function EventDetailModal({
  event,
  onClose,
}: {
  event: EventLog;
  onClose: () => void;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const loc = event.location;
  const dev = event.device_info;

  const locationFull = loc
    ? [loc.street, loc.city, loc.state, loc.country]
        .filter(Boolean)
        .join(", ") || "Unknown"
    : null;

  const coords =
    loc?.lat != null
      ? `${(loc.lat as number).toFixed(6)}, ${(loc.lng as number).toFixed(6)}`
      : null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/30 font-mono">#{event.id}</span>
            <Badge type={event.event_type} />
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition"
            aria-label="Close"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-6 py-4 space-y-6">

          {/* Core */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 mb-2">Core</p>
            <div className="rounded-xl border border-white/8 bg-white/3 px-4 divide-y divide-white/5">
              <DetailRow label="Event ID" value={event.id} />
              <DetailRow
                label="Timestamp"
                value={new Date(event.timestamp).toLocaleString(undefined, {
                  year: "numeric", month: "short", day: "numeric",
                  hour: "2-digit", minute: "2-digit", second: "2-digit",
                  timeZoneName: "short",
                })}
              />
              <DetailRow
                label="User"
                value={
                  event.user_name
                    ? `${event.user_name}${event.user_id != null ? ` (#${event.user_id})` : ""}`
                    : event.user_id != null
                    ? `#${event.user_id}`
                    : <span className="text-white/25">—</span>
                }
              />
              <DetailRow
                label="Video"
                value={
                  event.video_title
                    ? `${event.video_title}${event.video_id != null ? ` (#${event.video_id})` : ""}`
                    : event.video_id != null
                    ? `#${event.video_id}`
                    : <span className="text-white/25">—</span>
                }
              />
              <DetailRow label="Session ID" value={event.session_id ?? <span className="text-white/25">—</span>} />
              <DetailRow label="Input type" value={event.input_type ?? <span className="text-white/25">—</span>} />
            </div>
          </section>

          {/* Location */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 mb-2">Location</p>
            <div className="rounded-xl border border-white/8 bg-white/3 px-4 divide-y divide-white/5">
              {loc ? (
                <>
                  <DetailRow label="Address"  value={locationFull} />
                  <DetailRow label="Street"   value={loc.street  ?? <span className="text-white/25">—</span>} />
                  <DetailRow label="City"     value={loc.city    ?? <span className="text-white/25">—</span>} />
                  <DetailRow label="State"    value={loc.state   ?? <span className="text-white/25">—</span>} />
                  <DetailRow label="Country"  value={loc.country ?? <span className="text-white/25">—</span>} />
                  <DetailRow label="Coords"   value={coords ?? <span className="text-white/25">—</span>} />
                </>
              ) : (
                <DetailRow label="Status" value={<span className="text-white/25">Not available</span>} />
              )}
            </div>
          </section>

          {/* Device */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 mb-2">Device</p>
            <div className="rounded-xl border border-white/8 bg-white/3 px-4 divide-y divide-white/5">
              {dev ? (
                <>
                  <DetailRow label="Browser"    value={dev.browser    ?? <span className="text-white/25">—</span>} />
                  <DetailRow label="OS"         value={dev.os         ?? <span className="text-white/25">—</span>} />
                  <DetailRow label="Screen"     value={dev.screen     ?? <span className="text-white/25">—</span>} />
                  <DetailRow label="Language"   value={dev.language   ?? <span className="text-white/25">—</span>} />
                  <DetailRow label="Timezone"   value={dev.timezone   ?? <span className="text-white/25">—</span>} />
                  <DetailRow label="Platform"   value={dev.platform   ?? <span className="text-white/25">—</span>} />
                  <DetailRow
                    label="User Agent"
                    value={
                      <span className="text-[11px] text-white/50 leading-relaxed">
                        {dev.user_agent}
                      </span>
                    }
                  />
                </>
              ) : (
                <DetailRow label="Status" value={<span className="text-white/25">Not available</span>} />
              )}
            </div>
          </section>

          {/* Metadata */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 mb-2">Metadata</p>
            <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3">
              {event.metadata ? (
                <pre className="text-xs text-white/60 whitespace-pre-wrap break-all leading-relaxed">
                  {JSON.stringify(event.metadata, null, 2)}
                </pre>
              ) : (
                <span className="text-sm text-white/25">—</span>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ---------- Pagination ----------

function Pagination({
  offset, limit, total, onPrev, onNext,
}: {
  offset: number; limit: number; total: number;
  onPrev: () => void; onNext: () => void;
}) {
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 text-sm text-white/40">
      <span>{from}–{to} of {total.toLocaleString()}</span>
      <div className="flex gap-2">
        <button
          onClick={onPrev}
          disabled={offset === 0}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs hover:bg-white/10 hover:text-white transition disabled:opacity-25 disabled:pointer-events-none"
        >
          ← Prev
        </button>
        <button
          onClick={onNext}
          disabled={offset + limit >= total}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs hover:bg-white/10 hover:text-white transition disabled:opacity-25 disabled:pointer-events-none"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// ---------- Page ----------

export default function AdminEvents() {
  const navigate = useNavigate();

  const [items,   setItems]   = useState<EventLog[]>([]);
  const [total,   setTotal]   = useState(0);
  const [offset,  setOffset]  = useState(0);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const [selected, setSelected] = useState<EventLog | null>(null);

  const [filterType,    setFilterType]    = useState<EventType | "">("");
  const [filterUserId,  setFilterUserId]  = useState("");
  const [filterVideoId, setFilterVideoId] = useState("");

  const [pendingType,    setPendingType]    = useState<EventType | "">("");
  const [pendingUserId,  setPendingUserId]  = useState("");
  const [pendingVideoId, setPendingVideoId] = useState("");

  useEffect(() => {
    setLoading(true);
    setError(null);
    getEvents({
      limit: PAGE_SIZE,
      offset,
      event_type: filterType || undefined,
      user_id:  filterUserId  ? parseInt(filterUserId,  10) : undefined,
      video_id: filterVideoId ? parseInt(filterVideoId, 10) : undefined,
    })
      .then((res) => { setItems(res.items); setTotal(res.total); })
      .catch(()   => setError("Could not load events."))
      .finally(()  => setLoading(false));
  }, [offset, filterType, filterUserId, filterVideoId]);

  function applyFilters() {
    setFilterType(pendingType);
    setFilterUserId(pendingUserId);
    setFilterVideoId(pendingVideoId);
    setOffset(0);
  }

  function clearFilters() {
    setPendingType(""); setPendingUserId(""); setPendingVideoId("");
    setFilterType(""); setFilterUserId(""); setFilterVideoId("");
    setOffset(0);
  }

  const hasActiveFilters = filterType || filterUserId || filterVideoId;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/")}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/60 hover:bg-white/10 hover:text-white transition"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-semibold">Event Logs</h1>
            <p className="text-sm text-white/40">Click any row to see full details</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/30 mb-3">Filters</p>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-white/40">Event type</label>
              <select
                value={pendingType}
                onChange={(e) => setPendingType(e.target.value as EventType | "")}
                className="rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 min-w-[220px]"
              >
                <option value="">All types</option>
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-white/40">User ID</label>
              <input
                type="number"
                placeholder="e.g. 3"
                value={pendingUserId}
                onChange={(e) => setPendingUserId(e.target.value)}
                className="rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 w-28"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-white/40">Video ID</label>
              <input
                type="number"
                placeholder="e.g. 7"
                value={pendingVideoId}
                onChange={(e) => setPendingVideoId(e.target.value)}
                className="rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 w-28"
              />
            </div>

            <div className="flex gap-2 items-end pb-0.5">
              <button
                onClick={applyFilters}
                className="rounded-lg bg-white text-black px-4 py-2 text-sm font-medium hover:bg-white/90 transition"
              >
                Apply
              </button>
              {(pendingType || pendingUserId || pendingVideoId || hasActiveFilters) && (
                <button
                  onClick={clearFilters}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 hover:bg-white/10 hover:text-white transition"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-3 flex flex-wrap gap-2">
              {filterType    && <span className="text-xs bg-white/10 rounded-full px-3 py-1 text-white/60">type: {filterType}</span>}
              {filterUserId  && <span className="text-xs bg-white/10 rounded-full px-3 py-1 text-white/60">user: {filterUserId}</span>}
              {filterVideoId && <span className="text-xs bg-white/10 rounded-full px-3 py-1 text-white/60">video: {filterVideoId}</span>}
            </div>
          )}
        </div>

        {/* States */}
        {loading && (
          <div className="flex h-48 items-center justify-center text-sm text-white/40">Loading…</div>
        )}
        {error && (
          <div className="flex h-48 items-center justify-center text-sm text-red-400">{error}</div>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-sm text-white/40">
            <span className="text-3xl">📋</span>
            No events found.
          </div>
        )}

        {/* Table — minimal columns */}
        {!loading && !error && items.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-left text-xs font-semibold uppercase tracking-wide text-white/40">
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3 whitespace-nowrap">Timestamp</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Video</th>
                  <th className="px-4 py-3">Location</th>
                </tr>
              </thead>
              <tbody>
                {items.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => setSelected(e)}
                    className="border-b border-white/5 last:border-0 hover:bg-white/5 transition cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <Badge type={e.event_type} />
                    </td>
                    <td className="px-4 py-3 text-white/50 whitespace-nowrap font-mono text-xs">
                      {new Date(e.timestamp).toLocaleString(undefined, {
                        month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit", second: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-white/70 text-xs">
                      {e.user_name
                        ? e.user_name
                        : e.user_id != null
                        ? <span className="font-mono text-white/40">#{e.user_id}</span>
                        : <span className="text-white/20">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {e.video_title
                        ? <span className="text-white/70 truncate max-w-[160px] block">{e.video_title}</span>
                        : e.video_id != null
                        ? <span className="font-mono text-white/40">#{e.video_id}</span>
                        : <span className="text-white/20">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {e.location ? (
                        <span className="text-white/60">
                          {[e.location.city, e.location.country].filter(Boolean).join(", ") || "Unknown"}
                        </span>
                      ) : (
                        <span className="text-white/20">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              offset={offset}
              limit={PAGE_SIZE}
              total={total}
              onPrev={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              onNext={() => setOffset((o) => o + PAGE_SIZE)}
            />
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <EventDetailModal event={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
