/** Version bump when fields change (NFR21). */
export const PROMPT_CATALOG_VERSION = 1;

export type PromptFieldType = 'choice' | 'number' | 'boolean' | 'text';

export interface PromptFieldDef {
  key: string;
  label: string;
  type: PromptFieldType;
  options?: { value: string; label: string }[];
}

export interface SessionStartRule {
  buildingTypesNl: string[];
  fields: PromptFieldDef[];
}

/** Session-start questions when entering scan flow (FR29). */
export const SESSION_START_RULES: SessionStartRule[] = [
  {
    buildingTypesNl: ['Appartement', 'Kantoor'],
    fields: [
      {
        key: 'gemeenschappelijkeDelen',
        label: 'Gemeenschappelijke delen inventariseren?',
        type: 'choice',
        options: [
          { value: 'ja', label: 'Ja' },
          { value: 'nee', label: 'Nee' },
          { value: 'onbekend', label: 'Weet ik niet' },
        ],
      },
    ],
  },
];

/** On-scan prompts by object type Dutch name (FR30). Keys must match ObjectType.nameNl from seed. */
export const ON_SCAN_PROMPTS_BY_TYPE_NL: Record<string, PromptFieldDef[]> = {
  Personenliften: [
    {
      key: 'interval',
      label: 'Keuringsinterval',
      type: 'choice',
      options: [
        { value: '3m', label: '3-maandelijks' },
        { value: '6m', label: '6-maandelijks' },
      ],
    },
  ],
  Mindervalidenliften: [
    {
      key: 'hoogte',
      label: 'Hefhoogte',
      type: 'choice',
      options: [
        { value: 'lt3m', label: '< 3 meter' },
        { value: 'gte3m', label: '≥ 3 meter' },
      ],
    },
  ],
  Bliksemafleiders: [
    { key: 'daalleidingen', label: 'Aantal daalleidingen', type: 'number' },
  ],
  Heftruck: [
    {
      key: 'soort',
      label: 'Type toestel',
      type: 'choice',
      options: [
        { value: 'hef', label: 'Heftruck' },
        { value: 'behandeling', label: 'Behandelingstoestel' },
      ],
    },
  ],
  Rolbrug: [
    {
      key: 'gewichtsklasse',
      label: 'Draagvermogen > 25 ton?',
      type: 'choice',
      options: [
        { value: 'lte25t', label: '≤ 25 ton' },
        { value: 'gt25t', label: '> 25 ton' },
      ],
    },
    {
      key: 'spoorbaan',
      label: 'Spoorbaan > 8 meter?',
      type: 'choice',
      options: [
        { value: 'lte8m', label: '≤ 8 meter' },
        { value: 'gt8m', label: '> 8 meter' },
      ],
    },
    {
      key: 'spoorlengte',
      label: 'Lengte spoor > 50 meter?',
      type: 'choice',
      options: [
        { value: 'lte50m', label: '≤ 50 meter' },
        { value: 'gt50m', label: '> 50 meter' },
      ],
    },
  ],
};

/** Session-end: brand + emergency lighting regime (FR31). */
export const SESSION_END_FIRE_LIGHTING_FIELDS: PromptFieldDef[] = [
  {
    key: 'brandVeiligheidRegime',
    label: 'Brand / veiligheidsverlichting: welke keuring?',
    type: 'choice',
    options: [
      { value: 'norm', label: 'Normkeuring' },
      { value: 'werking', label: 'Goede werking' },
      { value: 'onbekend', label: 'Weet ik niet' },
    ],
  },
];

/** Non-domestic lightning block (FR32). */
export const SESSION_END_LIGHTNING_FIELDS: PromptFieldDef[] = [
  {
    key: 'nonDomesticStatus',
    label: 'Bliksem (niet-huishoudelijk): status vastleggen',
    type: 'choice',
    options: [
      { value: 'uitgevoerd', label: 'Geïnspecteerd / vastgelegd' },
      { value: 'nvt', label: 'Niet van toepassing' },
      { value: 'onbekend', label: 'Weet ik niet' },
    ],
  },
];

/** ATEX catch-up when no ATEX asset scanned (FR33). */
export const SESSION_END_ATEX_FIELDS: PromptFieldDef[] = [
  {
    key: 'atexZone',
    label: 'ATEX-zone (geen ATEX-object gescand)',
    type: 'choice',
    options: [
      { value: 'geen', label: 'Geen ATEX-zone' },
      { value: 'gas', label: 'Gasexplosieve zone' },
      { value: 'stof', label: 'Stofexplosieve zone' },
    ],
  },
];

export const ATEX_OBJECT_TYPE_NL = 'ATEX';

export function sessionStartFieldsForBuilding(nameNl: string): PromptFieldDef[] | null {
  const rule = SESSION_START_RULES.find((r) => r.buildingTypesNl.includes(nameNl));
  return rule ? rule.fields : null;
}

export function onScanFieldsForTypeName(nameNl: string): PromptFieldDef[] | null {
  return ON_SCAN_PROMPTS_BY_TYPE_NL[nameNl] ?? null;
}
