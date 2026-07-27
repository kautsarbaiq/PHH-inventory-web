// ============================================================
// PHH Inventory — Demo data seeder
// Populates admin@phh.com with realistic master sheets, a genealogy
// tree (matching the CANVAS flow reference), and cutting orders so the
// app looks fully populated for a demo.
//
// Idempotent: every row uses a fixed UUID with ON CONFLICT (id) DO
// NOTHING, so running it repeatedly never duplicates data.
//
// Run from the server directory:  node scripts/seed-demo.mjs
// ============================================================

import "dotenv/config";
import pg from "pg";

const { Pool } = pg;
const conn = process.env.DATABASE_URL;
if (!conn) {
  console.error("DATABASE_URL is not set (run from the server/ dir).");
  process.exit(1);
}

const pool = new Pool({
  connectionString: conn,
  ssl: conn.includes("supabase") ? { rejectUnauthorized: false } : undefined,
});

// ---- helpers ----------------------------------------------------------
const rectArea = (l, w) => l * w;
// effective area = cut area + kerf band around the perimeter
const effArea = (l, w, kerf = 2) => l * w + 2 * (l + w) * kerf;
const daysAgo = (d) => new Date(Date.now() - d * 86400_000);

// Sheets to insert. `cuts` are the cutting orders placed on that sheet.
// parentId links build the genealogy tree.
function buildData(adminId) {
  const sheets = [];
  const cuts = [];

  const addSheet = (s) => {
    const total = rectArea(s.length, s.width);
    const used = (s.cuts ?? []).reduce(
      (sum, c) => sum + effArea(c.length, c.width, s.kerf ?? 2),
      0
    );
    sheets.push({
      id: s.id,
      sheet_number: s.sheetNumber,
      grade: s.grade,
      supplier: s.supplier,
      length: s.length,
      width: s.width,
      thickness: s.thickness,
      density: s.density,
      total_area: total,
      used_area: Math.min(used, total),
      is_manual_usage: false,
      scrap_area: Math.round(used * 0.03),
      kerf_allowance: s.kerf ?? 2,
      status: s.status ?? "active",
      notes: s.notes ?? null,
      shape: "rectangle",
      dimensions: null,
      parent_id: s.parentId ?? null,
      created_by: adminId,
      last_opened_at: s.opened ? daysAgo(s.openedDays ?? 1) : null,
      created_at: daysAgo(s.ageDays ?? 5),
    });
    let x = 20;
    for (const c of s.cuts ?? []) {
      cuts.push({
        id: c.id,
        sheet_id: s.id,
        job_number: c.job,
        cutting_type: "rectangle",
        dimensions: JSON.stringify({ length: c.length, width: c.width }),
        cut_area: rectArea(c.length, c.width),
        effective_area: effArea(c.length, c.width, s.kerf ?? 2),
        position_x: x,
        position_y: 20,
        rotation: 0,
        notes: c.notes ?? null,
        created_by: adminId,
        created_at: daysAgo(s.ageDays ?? 5),
      });
      x += c.width + 40;
    }
  };

  const U = (p) => `a0000000-0000-4000-8000-0000000000${p}`; // tree sheets
  const C = (p) => `c0000000-0000-4000-8000-0000000000${p}`; // tree cuts

  // ---- Genealogy tree (matches the CANVAS reference) ----
  addSheet({
    id: U("01"), sheetNumber: "MS-001", grade: "Marine Plywood WBP",
    supplier: "PT Sumber Kayu Jaya", length: 2440, width: 1220, thickness: 18,
    density: 0.68, ageDays: 20, opened: true, openedDays: 1,
    notes: "Main mother sheet — reference genealogy",
    cuts: [{ id: C("01"), job: "555", length: 1200, width: 800 }],
  });
  addSheet({
    id: U("02"), sheetNumber: "MS-001/1", grade: "Marine Plywood WBP",
    supplier: "PT Sumber Kayu Jaya", length: 1200, width: 800, thickness: 18,
    density: 0.68, parentId: U("01"), ageDays: 16, opened: true, openedDays: 2,
    cuts: [{ id: C("02"), job: "567", length: 600, width: 400 }],
  });
  addSheet({
    id: U("03"), sheetNumber: "MS-001/1/1", grade: "Marine Plywood WBP",
    supplier: "PT Sumber Kayu Jaya", length: 600, width: 400, thickness: 18,
    density: 0.68, parentId: U("02"), ageDays: 12,
    cuts: [{ id: C("03"), job: "577", length: 300, width: 200 }],
  });
  addSheet({
    id: U("04"), sheetNumber: "MS-001/1/2", grade: "Marine Plywood WBP",
    supplier: "PT Sumber Kayu Jaya", length: 500, width: 300, thickness: 18,
    density: 0.68, parentId: U("02"), ageDays: 12,
    cuts: [{ id: C("04"), job: "569", length: 250, width: 150 }],
  });

  // ---- Standalone sheets to fill the dashboard ----
  const B = (p) => `b0000000-0000-4000-8000-0000000000${p}`;
  const D = (p) => `d0000000-0000-4000-8000-0000000000${p}`;
  addSheet({
    id: B("01"), sheetNumber: "MS-1002", grade: "MDF Standard",
    supplier: "CV Karya Papan", length: 2440, width: 1220, thickness: 12,
    density: 0.75, ageDays: 9, opened: true, openedDays: 3,
    cuts: [
      { id: D("01"), job: "601", length: 900, width: 600 },
      { id: D("02"), job: "602", length: 700, width: 500 },
    ],
  });
  addSheet({
    id: B("02"), sheetNumber: "MS-1003", grade: "Melamine White",
    supplier: "PT Cipta Panel", length: 2440, width: 1220, thickness: 15,
    density: 0.7, ageDays: 8,
  });
  addSheet({
    id: B("03"), sheetNumber: "MS-1004", grade: "Blockboard",
    supplier: "PT Sumber Kayu Jaya", length: 2440, width: 1220, thickness: 18,
    density: 0.65, ageDays: 7,
    cuts: [{ id: D("03"), job: "610", length: 1200, width: 900 }],
  });
  addSheet({
    id: B("04"), sheetNumber: "MS-1005", grade: "Particle Board",
    supplier: "CV Karya Papan", length: 3050, width: 1220, thickness: 16,
    density: 0.68, ageDays: 6, opened: true, openedDays: 1,
    cuts: [
      { id: D("04"), job: "620", length: 1400, width: 800 },
      { id: D("05"), job: "621", length: 1000, width: 600 },
    ],
  });
  addSheet({
    id: B("05"), sheetNumber: "MS-1006", grade: "Plywood Meranti",
    supplier: "PT Rimba Raya", length: 2440, width: 1220, thickness: 9,
    density: 0.6, status: "depleted", ageDays: 14,
    cuts: [
      { id: D("06"), job: "630", length: 1200, width: 1100 },
      { id: D("07"), job: "631", length: 1100, width: 900 },
    ],
  });
  addSheet({
    id: B("06"), sheetNumber: "MS-1007", grade: "HPL Backing Ply",
    supplier: "PT Cipta Panel", length: 2440, width: 1220, thickness: 4,
    density: 0.55, ageDays: 5,
    cuts: [{ id: D("08"), job: "640", length: 800, width: 500 }],
  });
  addSheet({
    id: B("07"), sheetNumber: "MS-1008", grade: "Teak Veneer Ply",
    supplier: "PT Rimba Raya", length: 2440, width: 1220, thickness: 18,
    density: 0.7, status: "archived", ageDays: 25,
  });
  addSheet({
    id: B("08"), sheetNumber: "MS-1009", grade: "Marine Plywood WBP",
    supplier: "PT Sumber Kayu Jaya", length: 2440, width: 1220, thickness: 18,
    density: 0.68, status: "archived", ageDays: 30,
  });

  return { sheets, cuts };
}

async function main() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT id FROM "user" WHERE email = $1`,
      ["admin@phh.com"]
    );
    if (rows.length === 0) {
      throw new Error("admin@phh.com not found — create it first.");
    }
    const adminId = rows[0].id;
    const { sheets, cuts } = buildData(adminId);

    await client.query("BEGIN");

    for (const s of sheets) {
      await client.query(
        `INSERT INTO master_sheets
          (id, sheet_number, grade, supplier, length, width, thickness, density,
           total_area, used_area, is_manual_usage, scrap_area, kerf_allowance,
           status, notes, shape, dimensions, parent_id, created_by,
           last_opened_at, created_at, updated_at)
         VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$21)
         ON CONFLICT (id) DO NOTHING`,
        [
          s.id, s.sheet_number, s.grade, s.supplier, s.length, s.width,
          s.thickness, s.density, s.total_area, s.used_area, s.is_manual_usage,
          s.scrap_area, s.kerf_allowance, s.status, s.notes, s.shape,
          s.dimensions, s.parent_id, s.created_by, s.last_opened_at, s.created_at,
        ]
      );
    }

    for (const c of cuts) {
      await client.query(
        `INSERT INTO cutting_orders
          (id, sheet_id, job_number, cutting_type, dimensions, cut_area,
           effective_area, position_x, position_y, rotation, notes, created_by, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (id) DO NOTHING`,
        [
          c.id, c.sheet_id, c.job_number, c.cutting_type, c.dimensions,
          c.cut_area, c.effective_area, c.position_x, c.position_y, c.rotation,
          c.notes, c.created_by, c.created_at,
        ]
      );
    }

    await client.query("COMMIT");

    const [{ rows: sc }, { rows: cc }] = await Promise.all([
      client.query(`SELECT count(*)::int AS n FROM master_sheets`),
      client.query(`SELECT count(*)::int AS n FROM cutting_orders`),
    ]);
    console.log(
      `✅ Seed complete. Inserted ${sheets.length} sheets + ${cuts.length} cuttings ` +
        `(idempotent). Totals now: ${sc[0].n} sheets, ${cc[0].n} cuttings.`
    );
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("❌ Seed failed:", err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
