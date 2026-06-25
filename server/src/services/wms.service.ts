// ============================================================
// PHH Inventory — WMS Service (shared backend for the WMS mobile app)
//
// In-memory source of truth for Receiving / Picking / Placement /
// Comparison so the mobile app and web run against ONE backend today.
// The Drizzle schema + migration 0002 are ready to persist this to the
// shared Postgres next — see TODO(db) markers.
// ============================================================

interface PoItem {
  id: string;
  sku: string;
  name: string;
  barcode: string;
  unit: string;
  expected_qty: number;
  received_qty: number;
}
interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier: string;
  expected_date: string;
  created_at: string;
  items: PoItem[];
}
interface PickLine {
  id: string;
  sku: string;
  name: string;
  barcode: string;
  bin_code: string;
  qty_to_pick: number;
  qty_picked: number;
}
interface PickList {
  id: string;
  reference: string;
  customer: string;
  created_at: string;
  lines: PickLine[];
}
interface BinLocation {
  code: string;
  zone: string;
  rack: string;
  shelf: string;
}
interface PlacementItem {
  id: string;
  sku: string;
  name: string;
  barcode: string;
  qty: number;
  source_po: string;
  bin_code: string | null;
}

export interface ScanResult {
  ok: boolean;
  message: string;
}

function poStatus(po: PurchaseOrder): string {
  const totalReceived = po.items.reduce((s, i) => s + i.received_qty, 0);
  if (totalReceived === 0) return "pending";
  if (po.items.every((i) => i.received_qty >= i.expected_qty)) return "received";
  return "partial";
}

function pickStatus(list: PickList): string {
  const totalPicked = list.lines.reduce((s, l) => s + l.qty_picked, 0);
  if (totalPicked === 0) return "pending";
  if (list.lines.every((l) => l.qty_picked >= l.qty_to_pick)) return "picked";
  return "partial";
}

export class WmsService {
  private orders: PurchaseOrder[] = [];
  private pickLists: PickList[] = [];
  private bins: BinLocation[] = [];
  private placements: PlacementItem[] = [];

  constructor() {
    this.seed();
  }

  private seed() {
    this.bins = [
      { code: "BIN-A1-S1", zone: "A", rack: "1", shelf: "1" },
      { code: "BIN-A1-S2", zone: "A", rack: "1", shelf: "2" },
      { code: "BIN-A2-S1", zone: "A", rack: "2", shelf: "1" },
      { code: "BIN-B1-S1", zone: "B", rack: "1", shelf: "1" },
      { code: "BIN-B2-S3", zone: "B", rack: "2", shelf: "3" },
      { code: "BIN-C1-S1", zone: "C", rack: "1", shelf: "1" },
    ];

    this.orders = [
      {
        id: "po1",
        po_number: "PO-2026-0148",
        supplier: "Sumber Kayu Jaya",
        expected_date: "2026-06-26T00:00:00.000Z",
        created_at: "2026-06-22T00:00:00.000Z",
        items: [
          { id: "po1-i1", sku: "PLY-18-MR", name: "Plywood 18mm MR Grade 1220×2440", barcode: "8991002340012", unit: "sheet", expected_qty: 40, received_qty: 0 },
          { id: "po1-i2", sku: "PLY-12-MR", name: "Plywood 12mm MR Grade 1220×2440", barcode: "8991002340029", unit: "sheet", expected_qty: 25, received_qty: 0 },
          { id: "po1-i3", sku: "MDF-15", name: "MDF Board 15mm 1220×2440", barcode: "8991002340036", unit: "sheet", expected_qty: 30, received_qty: 0 },
        ],
      },
      {
        id: "po2",
        po_number: "PO-2026-0151",
        supplier: "Anugerah Panel",
        expected_date: "2026-06-27T00:00:00.000Z",
        created_at: "2026-06-23T00:00:00.000Z",
        items: [
          { id: "po2-i1", sku: "HPL-WHT", name: "HPL Sheet White Gloss 1220×2440", barcode: "8991557000018", unit: "sheet", expected_qty: 60, received_qty: 60 },
          { id: "po2-i2", sku: "EDGE-PVC-2", name: "PVC Edge Banding 2mm (roll)", barcode: "8991557000025", unit: "roll", expected_qty: 12, received_qty: 12 },
        ],
      },
      {
        id: "po3",
        po_number: "PO-2026-0155",
        supplier: "Mega Particle Board",
        expected_date: "2026-06-28T00:00:00.000Z",
        created_at: "2026-06-24T00:00:00.000Z",
        items: [
          { id: "po3-i1", sku: "PB-16", name: "Particle Board 16mm 1220×2440", barcode: "8993005120011", unit: "sheet", expected_qty: 50, received_qty: 20 },
          { id: "po3-i2", sku: "PB-18", name: "Particle Board 18mm 1220×2440", barcode: "8993005120028", unit: "sheet", expected_qty: 50, received_qty: 0 },
        ],
      },
    ];

    this.pickLists = [
      {
        id: "pk1",
        reference: "SO-2026-0312",
        customer: "Cahaya Furniture",
        created_at: "2026-06-24T00:00:00.000Z",
        lines: [
          { id: "pk1-l1", sku: "PLY-18-MR", name: "Plywood 18mm MR Grade", barcode: "8991002340012", bin_code: "BIN-A1-S1", qty_to_pick: 10, qty_picked: 0 },
          { id: "pk1-l2", sku: "HPL-WHT", name: "HPL Sheet White Gloss", barcode: "8991557000018", bin_code: "BIN-B1-S1", qty_to_pick: 8, qty_picked: 0 },
        ],
      },
      {
        id: "pk2",
        reference: "SO-2026-0315",
        customer: "Interior Kita",
        created_at: "2026-06-24T00:00:00.000Z",
        lines: [
          { id: "pk2-l1", sku: "MDF-15", name: "MDF Board 15mm", barcode: "8991002340036", bin_code: "BIN-A2-S1", qty_to_pick: 12, qty_picked: 12 },
          { id: "pk2-l2", sku: "PB-16", name: "Particle Board 16mm", barcode: "8993005120011", bin_code: "BIN-C1-S1", qty_to_pick: 6, qty_picked: 2 },
        ],
      },
    ];

    this.placements = [
      { id: "pl-seed-1", sku: "HPL-WHT", name: "HPL Sheet White Gloss 1220×2440", barcode: "8991557000018", qty: 60, source_po: "PO-2026-0151", bin_code: null },
      { id: "pl-seed-2", sku: "EDGE-PVC-2", name: "PVC Edge Banding 2mm (roll)", barcode: "8991557000025", qty: 12, source_po: "PO-2026-0151", bin_code: "BIN-B2-S3" },
    ];
  }

  // ----- reads -----
  listPurchaseOrders() {
    return this.orders.map((o) => ({ ...o, status: poStatus(o) }));
  }
  getPurchaseOrder(id: string) {
    const o = this.orders.find((x) => x.id === id);
    return o ? { ...o, status: poStatus(o) } : null;
  }
  listPickLists() {
    return this.pickLists.map((l) => ({ ...l, status: pickStatus(l) }));
  }
  getPickList(id: string) {
    const l = this.pickLists.find((x) => x.id === id);
    return l ? { ...l, status: pickStatus(l) } : null;
  }
  listBins() {
    return this.bins;
  }
  listPlacements() {
    return this.placements;
  }

  // ----- receiving -----
  // TODO(db): UPDATE po_items SET received_qty = received_qty + 1 WHERE ...
  receiveByBarcode(poId: string, rawCode: string): ScanResult {
    const order = this.orders.find((o) => o.id === poId);
    if (!order) return { ok: false, message: "Purchase order not found" };
    const code = (rawCode || "").trim();
    const item = order.items.find((i) => i.barcode === code);
    if (!item) return { ok: false, message: `Barcode "${code}" is not on this PO` };
    if (item.received_qty >= item.expected_qty) {
      return { ok: false, message: `${item.sku} already fully received` };
    }
    item.received_qty += 1;
    this.ensurePlacement(order, item);
    return { ok: true, message: `${item.sku} received  ·  ${item.received_qty}/${item.expected_qty}` };
  }

  receiveLineFully(poId: string, itemId: string): ScanResult {
    const order = this.orders.find((o) => o.id === poId);
    const item = order?.items.find((i) => i.id === itemId);
    if (!order || !item) return { ok: false, message: "Item not found" };
    item.received_qty = item.expected_qty;
    this.ensurePlacement(order, item);
    return { ok: true, message: `${item.sku} fully received` };
  }

  private ensurePlacement(order: PurchaseOrder, item: PoItem) {
    if (item.received_qty < item.expected_qty) return;
    const id = `pl-${order.id}-${item.id}`;
    if (this.placements.some((p) => p.id === id)) return;
    this.placements.push({
      id,
      sku: item.sku,
      name: item.name,
      barcode: item.barcode,
      qty: item.received_qty,
      source_po: order.po_number,
      bin_code: null,
    });
  }

  // ----- picking -----
  pickByBarcode(listId: string, rawCode: string): ScanResult {
    const list = this.pickLists.find((l) => l.id === listId);
    if (!list) return { ok: false, message: "Pick list not found" };
    const code = (rawCode || "").trim();
    const line = list.lines.find((l) => l.barcode === code);
    if (!line) return { ok: false, message: `Barcode "${code}" is not on this pick list` };
    if (line.qty_picked >= line.qty_to_pick) {
      return { ok: false, message: `${line.sku} already fully picked` };
    }
    line.qty_picked += 1;
    return { ok: true, message: `${line.sku} picked  ·  ${line.qty_picked}/${line.qty_to_pick}  ·  ${line.bin_code}` };
  }

  // ----- placement -----
  placeByBarcode(itemId: string, locationCode: string): ScanResult {
    const item = this.placements.find((p) => p.id === itemId);
    if (!item) return { ok: false, message: "Item not found" };
    const bin = this.bins.find((b) => b.code.toUpperCase() === (locationCode || "").trim().toUpperCase());
    if (!bin) return { ok: false, message: `Unknown location tag "${locationCode}"` };
    item.bin_code = bin.code;
    return { ok: true, message: `${item.sku} placed at Rack ${bin.rack} - Shelf ${bin.shelf}` };
  }
}

export const wmsService = new WmsService();
