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

const objectTypes: ObjectTypeSeed[] = [
  { nameNl: 'Veiligheidsverlichting', nameFr: '\u00c9clairage de s\u00e9curit\u00e9', heliOmCategory: 'VV', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Branddetectiecentrale', nameFr: "Centrale de d\u00e9tection d'incendie", heliOmCategory: 'BD', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Rookkoepels', nameFr: 'Coupoles de d\u00e9senfumage', heliOmCategory: 'RK', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Brandblusser', nameFr: 'Extincteur', heliOmCategory: 'BB', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Brandhaspel', nameFr: 'D\u00e9vidoir incendie', heliOmCategory: 'BH', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Hydrant', nameFr: 'Hydrant', heliOmCategory: 'HYD', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Branddeur', nameFr: 'Porte coupe-feu', heliOmCategory: 'BD-D', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Brandblusinstallatie dampkap', nameFr: "Syst\u00e8me d'extinction pour hottes", heliOmCategory: 'BB-DK', applicableBuildings: ['Hotel', 'School', 'Zorg', 'Resto/caf\u00e9'] },
  { nameNl: 'Gasdetectie', nameFr: 'D\u00e9tection de gaz', heliOmCategory: 'GD', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Evacuatieplan', nameFr: "Plan d'\u00e9vacuation", heliOmCategory: 'EP', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Laagspanning', nameFr: 'Basse tension', heliOmCategory: 'LS', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Hoogspanning', nameFr: 'Haute tension', heliOmCategory: 'HS', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Bliksemafleider', nameFr: 'Paratonnerre', heliOmCategory: 'BLA', applicableBuildings: ['Winkel/retail', 'Hotel', 'Appartement', 'Garage/bandencentrale', 'School', 'Zorg', 'Parking', 'Sportfaciliteit', 'Kantoor', 'Magazijn', 'Evenementenhal'] },
  { nameNl: 'ATEX', nameFr: 'ATEX', heliOmCategory: 'ATEX', applicableBuildings: ['Garage/bandencentrale', 'Zorg', 'Magazijn'] },
  { nameNl: 'Stookplaats', nameFr: 'Chaufferie', heliOmCategory: 'GK', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Personenlift', nameFr: 'Ascenseur pour personnes', heliOmCategory: 'PL', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Goederenlift', nameFr: 'Monte-charges', heliOmCategory: 'GL', applicableBuildings: ['Hotel', 'Garage/bandencentrale', 'School', 'Zorg', 'Resto/caf\u00e9', 'Sportfaciliteit', 'Kantoor', 'Magazijn', 'Evenementenhal'] },
  { nameNl: 'Mindervalidenlift', nameFr: 'Ascenseur PMR', heliOmCategory: 'MVL', applicableBuildings: ['Winkel/retail', 'Hotel', 'Appartement', 'Garage/bandencentrale', 'School', 'Zorg', 'Resto/caf\u00e9', 'Parking', 'Sportfaciliteit', 'Kantoor', 'Evenementenhal'] },
  { nameNl: 'Hangstelling', nameFr: 'Nacelle suspendue', heliOmCategory: 'HST', applicableBuildings: ['Winkel/retail', 'Hotel', 'Appartement', 'Garage/bandencentrale', 'School', 'Zorg', 'Parking', 'Kantoor', 'Evenementenhal'] },
  { nameNl: 'Speeltoestel', nameFr: '\u00c9quipement de jeux', heliOmCategory: 'SPT', applicableBuildings: ['Hotel', 'Appartement', 'School', 'Zorg', 'Resto/caf\u00e9', 'Sportfaciliteit', 'Evenementenhal'] },
  { nameNl: 'Ankerlijn/ankerpunt', nameFr: "Ligne d'ancrage/point d'ancrage", heliOmCategory: 'ANK', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Hoogwerker', nameFr: 'Nacelle \u00e9l\u00e9vatrice', heliOmCategory: 'HW', applicableBuildings: ['Hotel', 'Garage/bandencentrale', 'Zorg', 'Sportfaciliteit', 'Magazijn', 'Evenementenhal'] },
  { nameNl: 'Autolift', nameFr: 'Ascenseur de voiture', heliOmCategory: 'AL', applicableBuildings: ['Appartement', 'Parking'] },
  { nameNl: 'Autobrug', nameFr: 'Pont de voiture', heliOmCategory: 'AB', applicableBuildings: ['Garage/bandencentrale'] },
  { nameNl: 'Sectionaalpoort', nameFr: 'Portail sectionnel', heliOmCategory: 'SP', applicableBuildings: ['Winkel/retail', 'Hotel', 'Appartement', 'Garage/bandencentrale', 'Parking', 'Sportfaciliteit', 'Magazijn', 'Evenementenhal'] },
  { nameNl: 'Rolbrug', nameFr: 'Pont roulant', heliOmCategory: 'RB', applicableBuildings: ['Garage/bandencentrale', 'Magazijn', 'Evenementenhal'] },
  { nameNl: 'Roltrap', nameFr: 'Escalator', heliOmCategory: 'RT', applicableBuildings: ['Winkel/retail', 'Hotel', 'Zorg', 'Parking', 'Kantoor', 'Evenementenhal'] },
  { nameNl: 'Heftruck', nameFr: 'Chariot \u00e9l\u00e9vateur', heliOmCategory: 'HT', applicableBuildings: ['Garage/bandencentrale', 'Magazijn'] },
  { nameNl: 'Stookolietank ondergronds', nameFr: 'Citerne \u00e0 mazout souterraine', heliOmCategory: 'STKO', applicableBuildings: ['Winkel/retail', 'Appartement', 'Garage/bandencentrale', 'School', 'Resto/caf\u00e9', 'Sportfaciliteit'] },
  { nameNl: 'Stookolietank bovengronds', nameFr: 'Citerne \u00e0 mazout hors-sol', heliOmCategory: 'STKB', applicableBuildings: ['Winkel/retail', 'Appartement', 'Garage/bandencentrale', 'School', 'Resto/caf\u00e9', 'Sportfaciliteit'] },
  { nameNl: 'Boven-/ondergrondse houder', nameFr: 'R\u00e9servoir a\u00e9rien/souterrain', heliOmCategory: 'BEO', applicableBuildings: ['Garage/bandencentrale', 'Magazijn'] },
  { nameNl: 'Brandstofverdeelinstallatie', nameFr: 'Installation de distribution de carburant', heliOmCategory: 'BVI', applicableBuildings: ['Garage/bandencentrale', 'Magazijn'] },
  { nameNl: 'Opslagplaats gevaarlijke stoffen', nameFr: 'Zone de stockage de substances dangereuses', heliOmCategory: 'OGS', applicableBuildings: ['Garage/bandencentrale', 'Zorg', 'Sportfaciliteit', 'Magazijn'] },
  { nameNl: 'Persluchthouder', nameFr: "R\u00e9servoir d'air comprim\u00e9", heliOmCategory: 'PLH', applicableBuildings: ['Hotel', 'Garage/bandencentrale', 'School', 'Zorg', 'Resto/caf\u00e9', 'Parking', 'Sportfaciliteit', 'Magazijn', 'Evenementenhal'] },
  { nameNl: 'Laspost', nameFr: 'Poste \u00e0 souder', heliOmCategory: 'LAS', applicableBuildings: ['Garage/bandencentrale', 'Magazijn'] },
  { nameNl: 'Kartonpers', nameFr: 'Presse \u00e0 carton', heliOmCategory: 'KP', applicableBuildings: ['Winkel/retail', 'Hotel', 'Magazijn'] },
  { nameNl: 'Generator', nameFr: 'G\u00e9n\u00e9rateur', heliOmCategory: 'GEN', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Laadbrug', nameFr: 'Pont de chargement', heliOmCategory: 'LB', applicableBuildings: ['Magazijn', 'Evenementenhal'] },
  { nameNl: 'Dockshelter', nameFr: 'Abri de quai', heliOmCategory: 'DS', applicableBuildings: ['Magazijn'] },
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
