// Pure CSV → normalized email-vault records. Shared by the server importer and tests.

export type LovableStatus = "unknown" | "empty" | "has_project" | "not_registered";

export type NormalizedProject = { name: string; url: string | null; note: string | null };

export type NormalizedAccount = {
  email: string;
  provider: string;
  password: string | null;
  altPassword: string | null;
  lovableStatus: LovableStatus;
  usageTag: string | null;
  note: string | null;
  projects: NormalizedProject[];
  sourceRows: number[];
};

export type ImportIssue = { row: number; message: string };

export type NormalizeResult = {
  accounts: NormalizedAccount[];
  totalRows: number;
  skipped: ImportIssue[];
  cleaned: ImportIssue[];
  merged: ImportIssue[];
};

/** Minimal RFC-4180 CSV parser (quotes, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/;

export function cleanEmail(raw: string): string | null {
  const stripped = raw.replace(/gambar\s*profil/gi, " ").trim();
  const match = stripped.match(EMAIL_RE);
  return match ? match[0].toLowerCase().replace(/\.+$/, "") : null;
}

export function providerOf(email: string) {
  const domain = email.split("@")[1] ?? "";
  return domain === "gmail.com" ? "gmail" : domain;
}

const isUrl = (v: string) => /^https?:\/\//i.test(v);

function titleFromUrl(url: string) {
  try {
    const host = new URL(url).hostname.split(".")[0] ?? url;
    return host.replace(/[-_]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  } catch {
    return url;
  }
}

function joinNotes(...parts: (string | null | undefined)[]) {
  const uniq = Array.from(new Set(parts.map((p) => p?.trim()).filter((p): p is string => !!p)));
  return uniq.length ? uniq.join(" · ") : null;
}

const STATUS_RANK: Record<LovableStatus, number> = {
  unknown: 0,
  not_registered: 1,
  empty: 2,
  has_project: 3,
};

type RowInfo = {
  lovableStatus: LovableStatus;
  usageTag: string | null;
  notes: string[];
  project: NormalizedProject | null;
};

/** Interpret the "Proyek Lovable", "Link Lovable" and "Catatan" columns of one row. */
export function interpretRow(projectRaw: string, linkRaw: string, noteRaw: string): RowInfo {
  const project = projectRaw.trim().replace(/\s+/g, " ");
  const link = linkRaw.trim();
  const notes = [noteRaw.trim()].filter(Boolean);
  const linkUrl = isUrl(link) ? link : null;
  if (link && !linkUrl) notes.push(link);

  if (!project) {
    if (linkUrl)
      return {
        lovableStatus: "has_project",
        usageTag: null,
        notes,
        project: { name: titleFromUrl(linkUrl), url: linkUrl, note: null },
      };
    return { lovableStatus: "unknown", usageTag: null, notes, project: null };
  }
  if (isUrl(project)) {
    return {
      lovableStatus: "has_project",
      usageTag: null,
      notes,
      project: { name: titleFromUrl(project), url: project, note: null },
    };
  }
  if (/tiktok/i.test(project)) {
    return {
      lovableStatus: "unknown",
      usageTag: project.replace(/^akun\s+/i, "").trim(),
      notes,
      project: null,
    };
  }
  if (/kosong/i.test(project)) {
    if (/bonus/i.test(project)) notes.push("Ada bonus");
    if (/referal/i.test(project)) notes.push("Belum di referal");
    const status: LovableStatus = /belum\s*regis/i.test(project) ? "not_registered" : "empty";
    return { lovableStatus: status, usageTag: null, notes, project: null };
  }
  const name = project.replace(/^lovable\s*(?:-\s*)?/i, "").trim() || project;
  return {
    lovableStatus: "has_project",
    usageTag: null,
    notes,
    project: { name, url: linkUrl, note: null },
  };
}

const HEADER_ALIASES: Record<string, keyof typeof COLS> = {
  link: "email",
  email: "email",
  kode: "password",
  password: "password",
  "proyek lovable": "project",
  "link lovable": "link",
  catatan: "note",
};
const COLS = { email: -1, password: -1, project: -1, link: -1, note: -1 };

export function normalizeCsv(text: string): NormalizeResult {
  const rows = parseCsv(text);
  const header = rows[0] ?? [];
  const cols = { ...COLS };
  header.forEach((h, i) => {
    const key = HEADER_ALIASES[h.trim().toLowerCase()];
    if (key && cols[key] === -1) cols[key] = i;
  });
  if (cols.email === -1) cols.email = 0;
  if (cols.password === -1) cols.password = 1;

  const byEmail = new Map<string, NormalizedAccount>();
  const skipped: ImportIssue[] = [];
  const cleaned: ImportIssue[] = [];
  const merged: ImportIssue[] = [];
  const get = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "") : "");

  rows.slice(1).forEach((r, idx) => {
    const rowNo = idx + 2; // spreadsheet row number (header is row 1)
    const rawEmail = get(r, cols.email).trim();
    const email = cleanEmail(rawEmail);
    if (!email) {
      skipped.push({ row: rowNo, message: `Email tidak valid: "${rawEmail || "(kosong)"}"` });
      return;
    }
    if (email !== rawEmail) cleaned.push({ row: rowNo, message: `"${rawEmail}" → ${email}` });

    const password = get(r, cols.password).trim() || null;
    const info = interpretRow(get(r, cols.project), get(r, cols.link), get(r, cols.note));
    const existing = byEmail.get(email);

    if (!existing) {
      byEmail.set(email, {
        email,
        provider: providerOf(email),
        password,
        altPassword: null,
        lovableStatus: info.lovableStatus,
        usageTag: info.usageTag,
        note: joinNotes(...info.notes),
        projects: info.project ? [info.project] : [],
        sourceRows: [rowNo],
      });
      return;
    }

    existing.sourceRows.push(rowNo);
    if (password && !existing.password) existing.password = password;
    else if (password && password !== existing.password && !existing.altPassword) {
      existing.altPassword = password;
      merged.push({
        row: rowNo,
        message: `${email}: password berbeda disimpan sebagai password alternatif`,
      });
    } else merged.push({ row: rowNo, message: `${email}: baris duplikat digabung` });
    if (STATUS_RANK[info.lovableStatus] > STATUS_RANK[existing.lovableStatus])
      existing.lovableStatus = info.lovableStatus;
    existing.usageTag ??= info.usageTag;
    existing.note = joinNotes(existing.note, ...info.notes);
    if (info.project && !existing.projects.some((p) => p.name === info.project!.name))
      existing.projects.push(info.project);
  });

  return {
    accounts: Array.from(byEmail.values()),
    totalRows: rows.length - 1,
    skipped,
    cleaned,
    merged,
  };
}

/* ---------- Password facts (stored instead of analysing plaintext later) ---------- */

export function passwordStrengthFacts(password: string, email: string) {
  const local = (email.split("@")[0] ?? "").toLowerCase().replace(/[^a-z]/g, "");
  const normalized = password
    .toLowerCase()
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s");
  const stem = local.slice(0, 4);
  return {
    length: password.length,
    classes: [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length,
    matchesEmail: stem.length === 4 && normalized.includes(stem),
    commonPattern: /^[A-Z][a-z]+(19|20)\d{2}[^A-Za-z0-9]?$/.test(password),
  };
}
