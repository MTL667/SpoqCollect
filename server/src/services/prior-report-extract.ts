import OpenAI from 'openai';
import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';
import pdfParse from 'pdf-parse';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';

const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

const MAX_VISION_IMAGES = 12;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

export interface ExtractedAssetRow {
  title: string;
  lastInspectionDate: string | null;
  locationHint: string | null;
  objectTypeNameNlGuess: string | null;
}

const MAX_TEXT_CHARS = 100_000;

/**
 * Extract plain text from PDF (works for text-based PDFs; scanned PDFs may return little text).
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return (data.text ?? '').trim();
}

/**
 * Use LLM to pull structured assets + last inspection dates from report text.
 */
export async function structureReportText(
  reportText: string,
  objectTypesNl: string[],
): Promise<ExtractedAssetRow[]> {
  if (!config.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY ontbreekt');
  }

  const truncated = reportText.length > MAX_TEXT_CHARS ? reportText.slice(0, MAX_TEXT_CHARS) : reportText;

  const prompt = `Je bent een expert in Belgische keuringsverslagen (elektriciteit, liften, hijswerktuigen, brandveiligheid, drukvaten, enz.).

Hieronder staat de platte tekst uit één of meerdere samengevoegde PDF-verslagen. Identificeer elke **concrete installatie / toestel / asset** waarvoor een keuringsdatum, volgende keuring, of conformiteitsvermelding voorkomt.

${buildAssetExtractionJsonInstructions(objectTypesNl)}

- Als de tekst onleesbaar of leeg is: {"assets": []}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Je antwoordt uitsluitend met compacte JSON.' },
      { role: 'user', content: `${prompt}\n\n--- TEKST VERSLAG ---\n${truncated}` },
    ],
    max_tokens: 4096,
    temperature: 0.1,
  });

  const raw = response.choices[0]?.message?.content ?? '';
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    logger.warn({ raw: raw.slice(0, 500) }, 'prior-report extract: no JSON');
    return [];
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as { assets?: ExtractedAssetRow[] };
    const assets = Array.isArray(parsed.assets) ? parsed.assets : [];
    return assets.filter((a) => a && typeof a.title === 'string' && a.title.trim().length > 0);
  } catch {
    return [];
  }
}

function buildAssetExtractionJsonInstructions(objectTypesNl: string[]): string {
  const typeList = objectTypesNl.slice(0, 80).join(', ');
  return `Bekende objecttypes in ons systeem (kies de **best passende** naam of null): ${typeList}

Return ALLEEN geldige JSON (geen markdown):
{
  "assets": [
    {
      "title": "korte duidelijke titel (bv. Heftruck Toyota, Rolbrug atelier 2,5T, HS-kabine hoofdgebouw)",
      "lastInspectionDate": "YYYY-MM-DD" of null als niet te bepalen,
      "locationHint": "verdieping/ruimte/lokaal indien vermeld" of null,
      "objectTypeNameNlGuess": "één van de bekende types hierboven, of null"
    }
  ]
}

Regels:
- Maak **per fysiek toestel** een entry als het verslag dat toelaat (bv. meerdere heftrucks = meerdere assets).
- Geen duplicaten met exact dezelfde titel en datum tenzij het echt aparte objecten zijn.
- Datums: alleen indien expliciet vermeld in de tekst of op de foto; anders null.
- Als er niets bruikbaar is: {"assets": []}`;
}

function dedupeExtractedRows(rows: ExtractedAssetRow[]): ExtractedAssetRow[] {
  const seen = new Set<string>();
  const out: ExtractedAssetRow[] = [];
  for (const r of rows) {
    const key = `${r.title.trim().toLowerCase()}|${r.lastInspectionDate ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

/** Eén OpenAI vision-request (max. MAX_VISION_IMAGES beelden). */
async function structureReportFromImagesChunk(
  parts: Array<{ buffer: Buffer; mimeType: string }>,
  objectTypesNl: string[],
  chunkHint: string,
): Promise<ExtractedAssetRow[]> {
  const content: ChatCompletionContentPart[] = [];

  const intro = `Je bent een expert in Belgische keuringsverslagen (elektriciteit, liften, hijswerktuigen, brandveiligheid, drukvaten, enz.).

Hieronder volgen één of meer **foto's van pagina's** (papier of scherm). Lees de zichtbare tekst en identificeer elke **concrete installatie / toestel / asset** waarvoor een keuringsdatum, volgende keuring, of conformiteitsvermelding zichtbaar is.

Het kunnen opeenvolgende pagina's van hetzelfde verslag zijn: voeg geen dubbele assets toe met dezelfde titel en dezelfde datum.
${chunkHint}

${buildAssetExtractionJsonInstructions(objectTypesNl)}`;

  content.push({ type: 'text', text: intro });

  let added = 0;
  for (const { buffer, mimeType } of parts) {
    if (added >= MAX_VISION_IMAGES) break;
    if (buffer.length > MAX_IMAGE_BYTES) {
      logger.warn({ size: buffer.length }, 'prior-report vision: image skipped (too large)');
      continue;
    }
    const mt = mimeType === 'image/jpg' ? 'image/jpeg' : mimeType;
    if (!mt.startsWith('image/')) continue;
    const b64 = buffer.toString('base64');
    content.push({
      type: 'image_url',
      image_url: { url: `data:${mt};base64,${b64}`, detail: 'high' },
    });
    added += 1;
  }

  if (content.length < 2) {
    return [];
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Je antwoordt uitsluitend met compacte JSON.' },
      { role: 'user', content },
    ],
    max_tokens: 4096,
    temperature: 0.1,
  });

  const raw = response.choices[0]?.message?.content ?? '';
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    logger.warn({ raw: raw.slice(0, 500) }, 'prior-report vision extract: no JSON');
    return [];
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as { assets?: ExtractedAssetRow[] };
    const assets = Array.isArray(parsed.assets) ? parsed.assets : [];
    return assets.filter((a) => a && typeof a.title === 'string' && a.title.trim().length > 0);
  } catch {
    return [];
  }
}

/**
 * Alle foto's in één logische batch: gecombineerde extractie (meerdere API-calls alleen boven de vision-limiet
 * per request; resultaten worden samengevoegd en gededupliceerd).
 */
export async function structureReportFromImages(
  parts: Array<{ buffer: Buffer; mimeType: string }>,
  objectTypesNl: string[],
): Promise<ExtractedAssetRow[]> {
  if (!config.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY ontbreekt');
  }
  if (parts.length === 0) return [];

  const merged: ExtractedAssetRow[] = [];
  const totalChunks = Math.ceil(parts.length / MAX_VISION_IMAGES);

  for (let c = 0; c < totalChunks; c++) {
    const chunk = parts.slice(c * MAX_VISION_IMAGES, (c + 1) * MAX_VISION_IMAGES);
    const hint =
      totalChunks > 1
        ? `\n(Dit is deel ${c + 1} van ${totalChunks} van dezelfde upload; vermijd duplicaten met dezelfde titel en datum als op andere delen.)`
        : '';
    merged.push(...(await structureReportFromImagesChunk(chunk, objectTypesNl, hint)));
  }

  return dedupeExtractedRows(merged);
}

/** Resolve guess string to object type id (exact or case-insensitive). */
export function matchObjectTypeId(
  guess: string | null | undefined,
  types: Array<{ id: string; nameNl: string }>,
): string | null {
  if (!guess?.trim()) return null;
  const g = guess.trim().toLowerCase();
  const exact = types.find((t) => t.nameNl.toLowerCase() === g);
  if (exact) return exact.id;
  const partial = types.find((t) => g.includes(t.nameNl.toLowerCase()) || t.nameNl.toLowerCase().includes(g));
  return partial?.id ?? null;
}
