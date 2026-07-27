// ============================================================
// PHH Inventory — Warehouse Bin Occupancy (frontend / mock data)
// Mirrors the mobile "WH-A / WH-B → rack → bin" layout: each bin is a
// pill coloured by status (empty / occupied / full). Bins are clickable
// to cycle status locally — wiring to the backend comes later.
// ============================================================

import { useMemo, useState } from "react";
import { Plus, Warehouse as WarehouseIcon, LayoutGrid, Table2 } from "lucide-react";

const STATUS = { EMPTY: "empty", OCCUPIED: "occupied", FULL: "full" };
const CYCLE = {
  [STATUS.EMPTY]: STATUS.OCCUPIED,
  [STATUS.OCCUPIED]: STATUS.FULL,
  [STATUS.FULL]: STATUS.EMPTY,
};

// Build a row of bins from a compact pattern string: "." empty, "o" occupied, "x" full.
const row = (label, pattern) => ({
  label,
  bins: pattern.split("").map((ch, i) => ({
    n: i + 1,
    status: ch === "x" ? STATUS.FULL : ch === "o" ? STATUS.OCCUPIED : STATUS.EMPTY,
  })),
});

// Mock warehouse layout (matches the reference screenshot vibe).
const INITIAL = {
  "WH-A": [
    {
      name: "rack-a",
      rows: [
        row("A", ".ox oxoo xo xox".replace(/ /g, "")), // 14
        row("B", ".oxo o xoxo xox".replace(/ /g, "")),
        row("C", ".ox o xo oxo xox".replace(/ /g, "")),
      ],
    },
    {
      name: "rack-b",
      rows: [
        row("A", "..ox oxo xoxo".replace(/ /g, "")), // 12
        row("B", ".oxo xo xoxo".replace(/ /g, "")),
      ],
    },
  ],
  "WH-B": [
    {
      name: "rack-a",
      rows: [
        row("A", "oo xoxo .o xox".replace(/ /g, "")),
        row("B", "..o xox o.ox o".replace(/ /g, "")),
      ],
    },
    {
      name: "rack-c",
      rows: [
        row("A", "x.x. o.o. x.x.".replace(/ /g, "")),
        row("B", ".x.x .o.o .x.x".replace(/ /g, "")),
        row("C", "oo.. xx.. oo..".replace(/ /g, "")),
      ],
    },
  ],
};

const binClass = (status) => {
  switch (status) {
    case STATUS.FULL:
      return "bg-amber-400 text-white border-transparent shadow-sm";
    case STATUS.OCCUPIED:
      return "bg-slate-300 text-slate-700 border-transparent dark:bg-slate-600 dark:text-slate-100";
    default:
      return "bg-transparent text-text-muted border-border hover:border-text-muted";
  }
};

const STATUS_LABEL = {
  [STATUS.EMPTY]: "Empty",
  [STATUS.OCCUPIED]: "Occupied",
  [STATUS.FULL]: "Full",
};
const pillClass = (status) => {
  switch (status) {
    case STATUS.FULL:
      return "bg-amber-400/20 text-amber-600 dark:text-amber-300";
    case STATUS.OCCUPIED:
      return "bg-slate-400/20 text-slate-600 dark:text-slate-300";
    default:
      return "bg-bg-elevated text-text-muted";
  }
};

// Flatten a warehouse's racks/rows/bins into table rows.
function flattenBins(racks) {
  const out = [];
  for (const rack of racks)
    for (const row of rack.rows)
      for (const bin of row.bins)
        out.push({
          code: `${rack.name}-${row.label}${bin.n}`,
          rack: rack.name,
          row: row.label,
          bin: bin.n,
          status: bin.status,
        });
  return out;
}

function WarehouseTable({ rows, warehouse }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-bg-surface text-text-secondary text-xs uppercase tracking-wide">
            <th className="text-left font-semibold px-4 py-2.5">Location</th>
            <th className="text-left font-semibold px-4 py-2.5">Warehouse</th>
            <th className="text-left font-semibold px-4 py-2.5">Rack</th>
            <th className="text-left font-semibold px-4 py-2.5">Row</th>
            <th className="text-left font-semibold px-4 py-2.5">Bin</th>
            <th className="text-left font-semibold px-4 py-2.5">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.code} className="border-t border-border hover:bg-bg-elevated/40 transition-colors">
              <td className="px-4 py-2.5 font-mono font-medium text-text-primary">{r.code}</td>
              <td className="px-4 py-2.5 text-text-secondary">{warehouse}</td>
              <td className="px-4 py-2.5 text-text-secondary">{r.rack}</td>
              <td className="px-4 py-2.5 text-text-secondary">{r.row}</td>
              <td className="px-4 py-2.5 text-text-secondary">{r.bin}</td>
              <td className="px-4 py-2.5">
                <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold ${pillClass(r.status)}`}>
                  {STATUS_LABEL[r.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Legend() {
  const item = (cls, label) => (
    <div className="flex items-center gap-2">
      <span className={`w-6 h-6 rounded-lg border ${cls}`} />
      <span className="text-sm text-text-secondary">{label}</span>
    </div>
  );
  return (
    <div className="flex items-center gap-6 px-4 py-3 rounded-xl bg-bg-surface border border-border">
      {item("bg-transparent border-border", "Empty")}
      {item("bg-slate-300 dark:bg-slate-600 border-transparent", "Occupied")}
      {item("bg-amber-400 border-transparent", "Full")}
    </div>
  );
}

export default function WarehousePage() {
  const [active, setActive] = useState("WH-A");
  const [view, setView] = useState("rack"); // "rack" | "table"
  const [data, setData] = useState(INITIAL);

  const warehouses = Object.keys(data);
  const racks = data[active];
  const tableRows = useMemo(() => flattenBins(racks), [racks]);

  const totals = useMemo(() => {
    const t = { empty: 0, occupied: 0, full: 0 };
    for (const r of racks)
      for (const rw of r.rows)
        for (const b of rw.bins) t[b.status]++;
    return t;
  }, [racks]);

  const cycleBin = (rackIdx, rowIdx, binIdx) => {
    setData((prev) => {
      const next = structuredClone(prev);
      const bin = next[active][rackIdx].rows[rowIdx].bins[binIdx];
      bin.status = CYCLE[bin.status];
      return next;
    });
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2.5">
            <WarehouseIcon className="w-6 h-6 text-primary" />
            Warehouse
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Bin occupancy per rack — click a bin to change its status
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm shadow-sm transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          title="Add location (coming soon)"
        >
          <Plus className="w-4 h-4" />
          Add Location
        </button>
      </div>

      {/* Warehouse tabs + view toggle */}
      <div className="flex items-center justify-between gap-3 border-b border-border mb-5">
        <div className="flex items-center gap-1">
          {warehouses.map((wh) => (
            <button
              key={wh}
              onClick={() => setActive(wh)}
              className={`px-4 py-2.5 text-sm font-semibold -mb-px border-b-2 transition-colors cursor-pointer focus:outline-none ${
                active === wh
                  ? "border-emerald-500 text-text-primary"
                  : "border-transparent text-text-muted hover:text-text-secondary"
              }`}
            >
              {wh}
            </button>
          ))}
        </div>
        {/* Rack / Table toggle */}
        <div className="flex items-center gap-0.5 mb-1.5 bg-bg-elevated rounded-lg p-0.5 border border-border">
          {[
            { id: "rack", label: "Rack", icon: LayoutGrid },
            { id: "table", label: "Table", icon: Table2 },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                view === v.id
                  ? "bg-bg-surface text-text-primary shadow-sm"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <v.icon className="w-3.5 h-3.5" />
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend + totals */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <Legend />
        <div className="flex items-center gap-4 text-sm">
          <span className="text-text-secondary">
            Empty <b className="text-text-primary">{totals.empty}</b>
          </span>
          <span className="text-text-secondary">
            Occupied <b className="text-text-primary">{totals.occupied}</b>
          </span>
          <span className="text-text-secondary">
            Full <b className="text-amber-500">{totals.full}</b>
          </span>
        </div>
      </div>

      {/* Table view */}
      {view === "table" && <WarehouseTable rows={tableRows} warehouse={active} />}

      {/* Rack view */}
      {view === "rack" && (
      <div className="space-y-8">
        {racks.map((rack, rackIdx) => (
          <section key={rack.name}>
            <h2 className="text-lg font-bold text-text-primary mb-3 lowercase">
              {rack.name}
            </h2>
            <div className="space-y-2.5">
              {rack.rows.map((rw, rowIdx) => (
                <div key={rw.label} className="flex items-center gap-2 overflow-x-auto pb-1">
                  {/* Row label */}
                  <span className="shrink-0 w-10 h-10 rounded-lg bg-bg-surface border border-border flex items-center justify-center font-bold text-text-primary">
                    {rw.label}
                  </span>
                  {/* Bins */}
                  {rw.bins.map((b, binIdx) => (
                    <button
                      key={b.n}
                      onClick={() => cycleBin(rackIdx, rowIdx, binIdx)}
                      title={`${rack.name} · ${rw.label}${b.n} · ${b.status}`}
                      className={`shrink-0 w-10 h-10 rounded-lg border flex items-center justify-center text-sm font-medium transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 ${binClass(
                        b.status
                      )}`}
                    >
                      {b.n}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      )}
    </div>
  );
}
