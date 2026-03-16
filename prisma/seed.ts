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
  { nameNl: 'Brandblusser ABC poeder', nameFr: 'Extincteur ABC poudre', heliOmCategory: 'BB', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Brandblusser CO2', nameFr: 'Extincteur CO2', heliOmCategory: 'BB', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Brandblusser schuim', nameFr: 'Extincteur mousse', heliOmCategory: 'BB', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Brandblusser water', nameFr: 'Extincteur eau', heliOmCategory: 'BB', applicableBuildings: ['Hotel', 'School', 'Zorg', 'Kantoor', 'Evenementenhal'] },
  { nameNl: 'Brandhaspel', nameFr: 'Dévidoir', heliOmCategory: 'BH', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Noodverlichting', nameFr: 'Éclairage de secours', heliOmCategory: 'NV', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Nooduitgang', nameFr: 'Sortie de secours', heliOmCategory: 'NU', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Evacuatieplan', nameFr: "Plan d'évacuation", heliOmCategory: 'EP', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Branddetectiecentrale', nameFr: "Centrale de détection d'incendie", heliOmCategory: 'BD', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Rookmelder optisch', nameFr: 'Détecteur de fumée optique', heliOmCategory: 'RM', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Rookmelder thermisch', nameFr: 'Détecteur de fumée thermique', heliOmCategory: 'RM', applicableBuildings: ['Garage/bandencentrale', 'Parking', 'Magazijn'] },
  { nameNl: 'Handmelder', nameFr: "Déclencheur manuel d'alarme", heliOmCategory: 'HM', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Sirene/flitslicht', nameFr: "Sirène/flash d'alarme", heliOmCategory: 'SI', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Sprinklerinstallatie', nameFr: 'Installation de sprinklers', heliOmCategory: 'SP', applicableBuildings: ['Winkel/retail', 'Hotel', 'Parking', 'Magazijn', 'Evenementenhal'] },
  { nameNl: 'Branddeur', nameFr: 'Porte coupe-feu', heliOmCategory: 'BD', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Brandwerende wand', nameFr: 'Mur coupe-feu', heliOmCategory: 'BW', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Brandklep', nameFr: 'Clapet coupe-feu', heliOmCategory: 'BK', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Rookkoepel', nameFr: 'Exutoire de fumée', heliOmCategory: 'RK', applicableBuildings: ['Winkel/retail', 'Garage/bandencentrale', 'Parking', 'Sportfaciliteit', 'Magazijn', 'Evenementenhal'] },
  { nameNl: 'Lift', nameFr: 'Ascenseur', heliOmCategory: 'LF', applicableBuildings: ['Winkel/retail', 'Hotel', 'Appartement', 'Zorg', 'Kantoor', 'Evenementenhal'] },
  { nameNl: 'Gasdetectie', nameFr: 'Détection de gaz', heliOmCategory: 'GD', applicableBuildings: ['Garage/bandencentrale', 'Parking', 'Magazijn'] },
  { nameNl: 'ATEX-installatie', nameFr: 'Installation ATEX', heliOmCategory: 'AX', applicableBuildings: ['Garage/bandencentrale', 'Magazijn'] },
  { nameNl: 'Persluchthouder', nameFr: "Réservoir d'air comprimé", heliOmCategory: 'PL', applicableBuildings: ['Garage/bandencentrale', 'Magazijn'] },
  { nameNl: 'Sectionaaldeur', nameFr: 'Porte sectionnelle', heliOmCategory: 'SD', applicableBuildings: ['Garage/bandencentrale', 'Magazijn', 'Evenementenhal'] },
  { nameNl: 'Dockshelter', nameFr: 'Dockshelter', heliOmCategory: 'DS', applicableBuildings: ['Magazijn'] },
  { nameNl: 'Heftruck', nameFr: 'Chariot élévateur', heliOmCategory: 'HT', applicableBuildings: ['Garage/bandencentrale', 'Magazijn'] },
  { nameNl: 'Brandkraan', nameFr: "Borne d'incendie", heliOmCategory: 'BKR', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Droogstijgleiding', nameFr: 'Colonne sèche', heliOmCategory: 'DSL', applicableBuildings: ['Hotel', 'Appartement', 'Kantoor'] },
  { nameNl: 'Blusleiding', nameFr: "Conduite d'extinction", heliOmCategory: 'BL', applicableBuildings: ['Winkel/retail', 'Hotel', 'Parking', 'Magazijn', 'Evenementenhal'] },
  { nameNl: 'Rwa-installatie', nameFr: "Installation RWA", heliOmCategory: 'RWA', applicableBuildings: ['Winkel/retail', 'Magazijn', 'Evenementenhal', 'Sportfaciliteit'] },
  { nameNl: 'Blusdeken', nameFr: "Couverture anti-feu", heliOmCategory: 'BLD', applicableBuildings: ['Resto/café', 'School', 'Zorg'] },
  { nameNl: 'EHBO-koffer', nameFr: 'Trousse de premiers secours', heliOmCategory: 'EH', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'AED-toestel', nameFr: 'Appareil DEA', heliOmCategory: 'AED', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Nooddouche', nameFr: "Douche de secours", heliOmCategory: 'ND', applicableBuildings: ['Garage/bandencentrale', 'Magazijn'] },
  { nameNl: 'Oogdouche', nameFr: 'Douche oculaire', heliOmCategory: 'OD', applicableBuildings: ['Garage/bandencentrale', 'Magazijn'] },
  { nameNl: 'Pictogram brandveiligheid', nameFr: 'Pictogramme sécurité incendie', heliOmCategory: 'PB', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Brandweerinfobord', nameFr: "Panneau d'information pompiers", heliOmCategory: 'BI', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Ladderhaspel', nameFr: 'Dévidoir échelle', heliOmCategory: 'LH', applicableBuildings: ['Hotel', 'Appartement'] },
  { nameNl: 'Vluchtmasker', nameFr: "Masque d'évacuation", heliOmCategory: 'VM', applicableBuildings: ['Hotel', 'Zorg'] },
  { nameNl: 'Brandweersleutelkluis', nameFr: 'Coffre à clés pompiers', heliOmCategory: 'BSK', applicableBuildings: ALL_BUILDINGS },
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
