import OpenAI from 'openai';
import fs from 'fs';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';

const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

interface ObjectTypeInfo {
  id: string;
  nameNl: string;
  nameFr: string;
}

export interface ClassificationResult {
  typeId: string;
  confidence: number;
  candidates: Array<{ typeId: string; confidence: number }>;
}

export async function classifyPhoto(
  photoAbsPath: string,
  buildingTypeNameNl: string,
  applicableTypes: ObjectTypeInfo[],
): Promise<ClassificationResult> {
  const imageBuffer = fs.readFileSync(photoAbsPath);
  const base64Image = imageBuffer.toString('base64');

  const typeList = applicableTypes
    .map((t) => `- id: "${t.id}", name_nl: "${t.nameNl}", name_fr: "${t.nameFr}"`)
    .join('\n');

  const prompt = `You are a fire safety equipment classifier for building inspections.

Building type: ${buildingTypeNameNl}

Classify the object in this photo as one of the following types:
${typeList}

Return ONLY valid JSON (no markdown):
{
  "typeId": "<matching id from list above>",
  "confidence": <0.0 to 1.0>,
  "candidates": [{"typeId": "<id>", "confidence": <0.0 to 1.0>}, ...]
}

Rules:
- confidence: how certain you are (1.0 = absolutely certain, 0.0 = no idea)
- candidates: top 3-5 matches ranked by confidence (include the primary match)
- If nothing matches well, use the closest match with low confidence`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}`, detail: 'low' } },
        ],
      },
    ],
    max_tokens: 500,
    temperature: 0.1,
  });

  const raw = response.choices[0]?.message?.content ?? '';
  logger.debug({ raw }, 'AI raw response');

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI response did not contain valid JSON');
  }

  return JSON.parse(jsonMatch[0]) as ClassificationResult;
}
