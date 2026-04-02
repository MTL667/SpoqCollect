import OpenAI from 'openai';
import fs from 'fs';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';

const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

export interface InspectionExtraction {
  lastInspectionDate: string | null;
  certifiedUntilDate: string | null;
  lbLmbPercentage: string | null;
  lbLmbTestDate: string | null;
  inspectionComment: string | null;
  externalInspectionNumber: string | null;
  rawText: string | null;
}

const PROMPT = `You are an OCR specialist for inspection labels/stickers on technical equipment in Belgian buildings (fire safety, lifts, electrical, etc.).

Analyze this photo of an inspection label/sticker and extract the following information.
Return ONLY valid JSON with these fields (use null if not found or not legible):

{
  "lastInspectionDate": "YYYY-MM-DD or null — the date of the last/most recent inspection",
  "certifiedUntilDate": "YYYY-MM-DD or null — the date until which the certification is valid (next inspection due)",
  "lbLmbPercentage": "string or null — the LB or LMB percentage if shown",
  "lbLmbTestDate": "YYYY-MM-DD or null — the date of the LB/LMB test",
  "inspectionComment": "string or null — any comments or remarks on the label",
  "externalInspectionNumber": "string or null — the external inspection/certificate number (keuringsnummer)",
  "rawText": "string — all visible text on the label, transcribed as-is"
}

Important:
- Belgian date formats are typically DD/MM/YYYY — convert to YYYY-MM-DD
- The label may be in Dutch, French, or both
- Look for text like "Keuringsdatum", "Date de contrôle", "Geldig tot", "Valable jusqu'au", "Nr.", "Certificaat", etc.
- If the photo is not a label/sticker, return all nulls and describe what you see in rawText`;

export async function extractInspectionData(photoAbsPath: string): Promise<InspectionExtraction> {
  const imageBuffer = fs.readFileSync(photoAbsPath);
  const base64Image = imageBuffer.toString('base64');

  const ext = photoAbsPath.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0,
    });

    const raw = response.choices[0]?.message?.content ?? '{}';
    logger.info({ raw: raw.slice(0, 500) }, 'Label extraction raw response');

    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned) as InspectionExtraction;

    return {
      lastInspectionDate: parsed.lastInspectionDate || null,
      certifiedUntilDate: parsed.certifiedUntilDate || null,
      lbLmbPercentage: parsed.lbLmbPercentage || null,
      lbLmbTestDate: parsed.lbLmbTestDate || null,
      inspectionComment: parsed.inspectionComment || null,
      externalInspectionNumber: parsed.externalInspectionNumber || null,
      rawText: parsed.rawText || null,
    };
  } catch (err) {
    logger.error({ error: err instanceof Error ? err.message : String(err) }, 'Label extraction failed');
    return {
      lastInspectionDate: null,
      certifiedUntilDate: null,
      lbLmbPercentage: null,
      lbLmbTestDate: null,
      inspectionComment: null,
      externalInspectionNumber: null,
      rawText: null,
    };
  }
}
