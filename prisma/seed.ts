import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../server/src/generated/prisma/client.js';
import { hash } from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface BuildingTypeSeed {
  nameNl: string;
  nameFr: string;
}

interface ObjectTypeSeed {
  nameNl: string;
  nameFr: string;
  heliOmCategory: string;
  applicableBuildings: string[];
}

const ALL_BUILDINGS = [
  'Winkel/retail', 'Hotel', 'Appartement', 'Garage/bandencentrale',
  'School', 'Zorg', 'Resto/café', 'Parking',
  'Sportfaciliteit', 'Kantoor', 'Magazijn', 'Evenementenhal',
];

const buildingTypes: BuildingTypeSeed[] = [
  { nameNl: 'Winkel/retail', nameFr: 'Commerce/retail' },
  { nameNl: 'Hotel', nameFr: 'Hôtel' },
  { nameNl: 'Appartement', nameFr: 'Appartement' },
  { nameNl: 'Garage/bandencentrale', nameFr: 'Garage/centre de pneus' },
  { nameNl: 'School', nameFr: 'École' },
  { nameNl: 'Zorg', nameFr: 'Soins' },
  { nameNl: 'Resto/café', nameFr: 'Resto/café' },
  { nameNl: 'Parking', nameFr: 'Parking' },
  { nameNl: 'Sportfaciliteit', nameFr: 'Installation sportive' },
  { nameNl: 'Kantoor', nameFr: 'Bureau' },
  { nameNl: 'Magazijn', nameFr: 'Entrepôt' },
  { nameNl: 'Evenementenhal', nameFr: 'Salle événementielle' },
];

// Object types from official "Objecten Checklijst" — 45 types across 5 categories
const objectTypes: ObjectTypeSeed[] = [
  // === Elektriciteit ===
  { nameNl: 'Laagspanning (max 10 kringen)', nameFr: 'Basse tension (max 10 circuits)', heliOmCategory: 'LS1', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Laagspanning (vanaf 11 kringen)', nameFr: 'Basse tension (\u00e0 partir de 11 circuits)', heliOmCategory: 'LS2', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Laagspanning gemene delen', nameFr: 'Basse tension parties communes', heliOmCategory: 'LS gem.', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Hoogspanning', nameFr: 'Haute tension', heliOmCategory: 'HS', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'ATEX', nameFr: 'ATEX', heliOmCategory: 'Atex', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Bliksemafleiders', nameFr: 'Paratonnerres', heliOmCategory: 'Bliksemafleiders', applicableBuildings: ALL_BUILDINGS },

  // === Gas ===
  { nameNl: 'Gasdichtheid < 70kW', nameFr: '\u00c9tanch\u00e9it\u00e9 au gaz < 70 kW/h', heliOmCategory: 'Gas 1', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Gasdichtheid \u2265 70kW (stookplaats)', nameFr: '\u00c9tanch\u00e9it\u00e9 au gaz \u2265 70 kW/h (chaufferie)', heliOmCategory: 'Gas 2', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Gasdetectie', nameFr: 'D\u00e9tection de gaz', heliOmCategory: 'GD', applicableBuildings: ALL_BUILDINGS },

  // === Brand ===
  { nameNl: 'Veiligheidsverlichting', nameFr: '\u00c9clairage de s\u00e9curit\u00e9', heliOmCategory: 'VV', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Branddetectie goede werking', nameFr: 'Bon fonctionnement de la d\u00e9tection incendie', heliOmCategory: 'BD \u2013 centrale', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Brandblussers', nameFr: 'Extincteurs', heliOmCategory: 'BB \u2013 benor', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Brandhaspels', nameFr: 'D\u00e9vidoirs incendie', heliOmCategory: 'BB \u2013 haspel', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Hydranten', nameFr: 'Hydrants', heliOmCategory: 'BB \u2013 Hydrant', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Rookkoepels goede werking', nameFr: 'Bon fonctionnement des coupoles de d\u00e9senfumage', heliOmCategory: 'Rookkoepel', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Dampkapblusinstallatie', nameFr: "Syst\u00e8me d'extinction pour hotte aspirante", heliOmCategory: 'Dampkapblusinstallatie', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Brandwerende deur', nameFr: 'Porte coupe-feu', heliOmCategory: 'Branddeur \u2013 benor', applicableBuildings: ALL_BUILDINGS },

  // === Hef en Hijs ===
  { nameNl: 'Personenliften', nameFr: 'Ascenseurs pour personnes', heliOmCategory: 'PL', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Goederenliften', nameFr: 'Monte-charges', heliOmCategory: 'GL', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Fabrieksliften', nameFr: 'Ascenseurs industriels', heliOmCategory: 'FL', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Mindervalidenliften', nameFr: 'Ascenseurs PMR', heliOmCategory: 'MvL', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Hangstelling', nameFr: 'Nacelle suspendue', heliOmCategory: 'Hangstelling', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Speeltoestellen', nameFr: '\u00c9quipements de jeux', heliOmCategory: 'Speeltoestellen', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Ankerlijnen', nameFr: "Lignes d'ancrage", heliOmCategory: 'Ankerlijn', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Ankerpunten', nameFr: "Points d'ancrage", heliOmCategory: 'Ankerpunt', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Hoogwerker', nameFr: 'Nacelle \u00e9l\u00e9vatrice', heliOmCategory: 'Hoogwerker', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Ladders', nameFr: '\u00c9chelles', heliOmCategory: 'Ladders', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Stellingen', nameFr: '\u00c9chafaudages', heliOmCategory: 'Stellingen', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Autobrug', nameFr: 'Pont \u00e9l\u00e9vateur', heliOmCategory: 'Autobrug', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Heftruck', nameFr: 'Chariot \u00e9l\u00e9vateur', heliOmCategory: 'Heftruck', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Graafmachine', nameFr: 'Excavatrice', heliOmCategory: 'Graafmachine', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Hefplatform', nameFr: 'Plateforme \u00e9l\u00e9vatrice', heliOmCategory: 'Hefplatform', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Werkplaatskraan', nameFr: "Grue d'atelier", heliOmCategory: 'Werkplaatskraan', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Transmissiekrik', nameFr: 'Cric de transmission', heliOmCategory: 'Transmissiekrik', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Magazijnrek', nameFr: "Rayonnage d'entrep\u00f4t", heliOmCategory: 'Magazijnrek', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Rolbrug', nameFr: 'Pont roulant', heliOmCategory: 'Rolbrug', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Roltrap', nameFr: 'Escalator', heliOmCategory: 'Roltrap', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Tillift', nameFr: 'Soul\u00e8ve-personnes actif ou passif', heliOmCategory: 'Tillift', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Poorten', nameFr: 'Portails', heliOmCategory: 'Poorten', applicableBuildings: ALL_BUILDINGS },

  // === Milieu ===
  { nameNl: 'Stookolietank ondergronds', nameFr: 'Citerne \u00e0 mazout souterraine', heliOmCategory: 'Stookolietank \u2013 1', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Stookolietank bovengronds', nameFr: 'Citerne \u00e0 mazout hors-sol', heliOmCategory: 'Stookolietank \u2013 2', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Boven- en ondergrondse houders', nameFr: 'R\u00e9servoirs a\u00e9riens et souterrains', heliOmCategory: 'Houder', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Brandstofverdeelinstallaties', nameFr: 'Installations de distribution de carburant', heliOmCategory: 'Verdeelinst.', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Opslagplaats gevaarlijke stoffen', nameFr: 'Zone de stockage de substances dangereuses', heliOmCategory: 'Opslag GS', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Persluchthouders', nameFr: "R\u00e9servoirs d'air comprim\u00e9", heliOmCategory: 'Perslucht', applicableBuildings: ALL_BUILDINGS },
];

async function main() {
  console.log('Seeding building types...');
  const btMap = new Map<string, string>();
  for (const bt of buildingTypes) {
    const record = await prisma.buildingType.upsert({
      where: { nameNl: bt.nameNl },
      update: { nameFr: bt.nameFr },
      create: { nameNl: bt.nameNl, nameFr: bt.nameFr },
    });
    btMap.set(bt.nameNl, record.id);
  }
  console.log(`  ${btMap.size} building types upserted`);

  console.log('Seeding object types...');
  for (const ot of objectTypes) {
    const record = await prisma.objectType.upsert({
      where: { nameNl: ot.nameNl },
      update: { nameFr: ot.nameFr, heliOmCategory: ot.heliOmCategory },
      create: {
        nameNl: ot.nameNl,
        nameFr: ot.nameFr,
        heliOmCategory: ot.heliOmCategory,
      },
    });

    for (const btName of ot.applicableBuildings) {
      const btId = btMap.get(btName);
      if (btId) {
        await prisma.objectTypeBuildingType.upsert({
          where: {
            objectTypeId_buildingTypeId: {
              objectTypeId: record.id,
              buildingTypeId: btId,
            },
          },
          update: {},
          create: { objectTypeId: record.id, buildingTypeId: btId },
        });
      }
    }
  }
  console.log(`  ${objectTypes.length} object types upserted with building type links`);

  const activeNames = new Set(objectTypes.map((ot) => ot.nameNl));
  const deactivated = await prisma.objectType.updateMany({
    where: { nameNl: { notIn: [...activeNames] }, active: true },
    data: { active: false },
  });
  if (deactivated.count > 0) {
    console.log(`  ${deactivated.count} old object types deactivated`);
  }

  console.log('Seeding service code mappings (Odoo handoff)...');
  await prisma.serviceCodeMapping.deleteMany({});
  const mappingSeeds: { nameNl: string; regime: string | null; odooProductCode: string; labelNl: string }[] = [
    { nameNl: 'Personenliften', regime: null, odooProductCode: 'ODOO-SVC-PL', labelNl: 'Personenlift (default)' },
    { nameNl: 'Personenliften', regime: 'norm', odooProductCode: 'ODOO-SVC-PL-NORM', labelNl: 'Personenlift normkeuring' },
    { nameNl: 'Personenliften', regime: 'werking', odooProductCode: 'ODOO-SVC-PL-WERK', labelNl: 'Personenlift goede werking' },
    { nameNl: 'Brandblussers', regime: null, odooProductCode: 'ODOO-SVC-BB', labelNl: 'Brandblussers' },
    { nameNl: 'Bliksemafleiders', regime: null, odooProductCode: 'ODOO-SVC-BLA', labelNl: 'Bliksemafleiders' },
    { nameNl: 'Heftruck', regime: null, odooProductCode: 'ODOO-SVC-HT', labelNl: 'Heftruck' },
  ];
  let mapCount = 0;
  for (const m of mappingSeeds) {
    const ot = await prisma.objectType.findUnique({ where: { nameNl: m.nameNl } });
    if (!ot) continue;
    await prisma.serviceCodeMapping.create({
      data: {
        objectTypeId: ot.id,
        regime: m.regime,
        odooProductCode: m.odooProductCode,
        labelNl: m.labelNl,
        version: 1,
      },
    });
    mapCount++;
  }
  console.log(`  ${mapCount} service code mappings created`);

  console.log('Seeding test inspector...');
  const passwordHash = await hash('test1234', 10);
  await prisma.inspector.upsert({
    where: { email: 'test@inventarispoq.be' },
    update: {},
    create: {
      email: 'test@inventarispoq.be',
      name: 'Test Inspector',
      passwordHash,
      role: 'inspector',
    },
  });
  console.log('  Test inspector upserted');

  console.log('Seed complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
