// Server-only AI prompts and Lovable AI calls for every AI feature.
import { Output, streamText, type ModelMessage } from "ai";
import { z } from "zod";

import { asset } from "@/data/asset";
import { aiProviderOptions, createAiModel, toAiError } from "@/lib/ai/lovable.server";
import { buildAssetBrief } from "./context";

const PERSONA = `Kamu adalah asisten AI di aplikasi "Ebran Aset Digital - Arsip Data Pribadi Aman" milik Grey Gandaw untuk mengelola akun & aset digital.
Jawab dalam Bahasa Indonesia yang ringkas dan profesional. Jangan pernah meminta, menebak, atau menuliskan password, secret token, TOTP secret, atau backup code — kamu hanya menerima fakta turunan tentangnya.`;

function briefText() {
  return `Data aset (JSON, rahasia sudah disamarkan):\n${JSON.stringify(buildAssetBrief(), null, 2)}`;
}

async function runText(instructions: string, prompt: string, effort: "low" | "medium") {
  try {
    const { model } = createAiModel();
    const result = streamText({
      model,
      instructions,
      messages: [{ role: "user", content: prompt }],
      maxRetries: 1,
      providerOptions: aiProviderOptions(effort),
    });
    const text = (await result.text).trim();
    if (!text) throw new Error("Empty AI response");
    return text;
  } catch (error) {
    throw toAiError(error);
  }
}

async function runObject<T>(
  schema: z.ZodType<T>,
  instructions: string,
  messages: ModelMessage[],
  effort: "low" | "medium",
): Promise<T> {
  try {
    const { model } = createAiModel();
    const result = streamText({
      model,
      instructions,
      messages,
      maxRetries: 1,
      output: Output.object({ schema }),
      providerOptions: aiProviderOptions(effort),
    });
    return (await result.output) as T;
  } catch (error) {
    throw toAiError(error);
  }
}

/* ---------- Notes ---------- */

export async function generateNote(draft: string) {
  const note = await runText(
    `${PERSONA}\nTugasmu menulis catatan konteks penggunaan akun untuk tim: 2–3 kalimat, maksimal 400 karakter, teks biasa tanpa markdown/bullet. Sebutkan kegunaan akun, siapa pemegang akses, dan aturan login penting bila ada.`,
    `${briefText()}\n\nDraf catatan saat ini:\n"""${draft.slice(0, 2000)}"""\n\nTulis ulang menjadi catatan yang lebih lengkap dan jelas.`,
    "low",
  );
  return note.slice(0, 1200);
}

/* ---------- Security audit ---------- */

export const auditSchema = z.object({
  score: z.number().describe("Skor keamanan 0-100"),
  headline: z.string().describe("Ringkasan satu kalimat"),
  insights: z
    .array(
      z.object({
        title: z.string().describe("Judul singkat, maks 60 karakter"),
        body: z.string().describe("Penjelasan satu kalimat"),
        tone: z.enum(["warning", "success", "muted"]),
      }),
    )
    .describe("Tepat 3 insight, urutkan dari yang paling penting"),
  recommendations: z.array(z.string()).describe("2-4 langkah konkret yang bisa dilakukan sekarang"),
});
export type SecurityAudit = z.infer<typeof auditSchema>;

export async function runAudit(): Promise<SecurityAudit> {
  const audit = await runObject(
    auditSchema,
    `${PERSONA}\nKamu auditor keamanan akun. Nilai risiko berdasarkan fakta password (panjang, variasi karakter, mengandung nama akun/tahun), 2FA, backup codes, email pemulihan, masa berlaku token API (hari tersisa), dan lokasi login. Tone "warning" untuk risiko, "success" untuk hal yang sudah baik, "muted" untuk info netral.`,
    [{ role: "user", content: `${briefText()}\n\nJalankan audit keamanan untuk aset ini.` }],
    "medium",
  );
  return {
    ...audit,
    score: Math.max(0, Math.min(100, Math.round(audit.score))),
    insights: audit.insights.slice(0, 3),
    recommendations: audit.recommendations.slice(0, 4),
  };
}

/* ---------- .env formatter ---------- */

export const envFieldKeys = ["publicKey", "secretToken", "webhookUrl"] as const;
export const envSchema = z.object({
  comment: z.string().describe("Komentar header satu baris tanpa tanda #"),
  variables: z.array(
    z.object({
      field: z.enum(envFieldKeys),
      name: z.string().describe("Nama variabel UPPER_SNAKE_CASE"),
    }),
  ),
});
export type EnvFormat = z.infer<typeof envSchema>;

export async function formatEnv(): Promise<EnvFormat> {
  const res = await runObject(
    envSchema,
    `${PERSONA}\nKamu menyusun nama variabel .env standar. Gunakan UPPER_SNAKE_CASE, awali dengan nama layanan (mis. INSTAGRAM_), dan buat satu variabel untuk setiap field: publicKey, secretToken, webhookUrl.`,
    [
      {
        role: "user",
        content: `Layanan: ${asset.title}\nKategori: ${asset.category}\nWebhook: ${asset.api.webhookUrl}\nBuat nama variabel .env dan komentar header singkat yang menyebut "Ebran Aset Digital".`,
      },
    ],
    "low",
  );
  const seen = new Set<string>();
  const variables = res.variables
    .map((v) => ({ field: v.field, name: v.name.toUpperCase().replace(/[^A-Z0-9_]/g, "_") }))
    .filter((v) => (seen.has(v.field) ? false : (seen.add(v.field), true)));
  return { comment: res.comment.replace(/^#+\s*/, "").slice(0, 120), variables };
}

/* ---------- OCR ---------- */

export const ocrSchema = z.object({
  documentType: z.string().describe("Jenis dokumen, mis. Invoice, KTP, Screenshot"),
  summary: z.string().describe("Ringkasan isi dokumen satu kalimat"),
  fields: z
    .array(z.object({ label: z.string(), value: z.string() }))
    .describe("Semua data penting yang terbaca, label dalam Bahasa Indonesia"),
});
export type OcrResult = z.infer<typeof ocrSchema>;

export async function extractDocument(input: {
  fileName: string;
  mediaType: string;
  base64: string;
}) {
  const filePart = {
    type: "file",
    filename: input.fileName,
    data: input.base64,
    mediaType: input.mediaType,
  } as const;
  return runObject(
    ocrSchema,
    `${PERSONA}\nKamu mesin OCR. Baca dokumen apa adanya dan ekstrak data terstruktur (nama, nomor, tanggal, jumlah, alamat, dll). Jangan mengarang nilai yang tidak terbaca. Untuk nomor identitas, tulis lengkap sesuai dokumen.`,
    [
      {
        role: "user",
        content: [{ type: "text", text: `Ekstrak data dari file "${input.fileName}".` }, filePart],
      },
    ],
    "medium",
  );
}

/* ---------- Chat ---------- */

export function chatInstructions() {
  return `${PERSONA}\nKamu menjawab pertanyaan pengguna tentang aset yang sedang dibuka. Gunakan data aset berikut sebagai sumber kebenaran; jika data tidak tersedia, katakan terus terang. Gunakan markdown ringan bila membantu.\n\n${briefText()}`;
}

/* ---------- Email vault audit ---------- */

export async function runVaultAudit(facts: unknown): Promise<SecurityAudit> {
  const audit = await runObject(
    auditSchema,
    `${PERSONA}\nKamu auditor keamanan untuk brankas akun email (banyak akun Gmail & domain kantor yang dipakai untuk proyek Lovable). Kamu hanya menerima statistik agregat, bukan password. Nilai risiko: password yang dipakai ulang di banyak akun, pola "Nama+tahun+simbol" yang mudah ditebak, password mengandung nama dari email, akun tanpa password tercatat, akun Lovable kosong yang bisa dimanfaatkan, dan proyek tanpa link. Tone "warning" untuk risiko, "success" untuk hal baik, "muted" untuk info netral. Sebutkan angka konkret.`,
    [
      {
        role: "user",
        content: `Statistik brankas email (JSON):\n${JSON.stringify(facts, null, 2)}\n\nJalankan audit untuk seluruh brankas.`,
      },
    ],
    "medium",
  );
  return {
    ...audit,
    score: Math.max(0, Math.min(100, Math.round(audit.score))),
    insights: audit.insights.slice(0, 3),
    recommendations: audit.recommendations.slice(0, 4),
  };
}
