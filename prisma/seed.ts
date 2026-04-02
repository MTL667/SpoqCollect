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
  exportParty?: string;
  parentObjectTypeNl?: string;
}

interface OdooProductSeed {
  code: string;
  name: string;
  category: string | null;
  unit?: string;
}

interface MappingSeed {
  objectTypeNl: string;
  regime: string | null;
  region: string | null;
  minQuantity: number | null;
  maxQuantity: number | null;
  odooProductCode: string;
  startPriceProductCode: string | null;
  labelNl: string;
  priority: number;
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

// ────────────────────────────────────────────────────────────────
// Object types: original 45 + ~35 new for full Odoo coverage
// ────────────────────────────────────────────────────────────────
const objectTypes: ObjectTypeSeed[] = [
  // === Elektriciteit ===
  { nameNl: 'Laagspanning (max 10 kringen)', nameFr: 'Basse tension (max 10 circuits)', heliOmCategory: 'LS1', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Laagspanning (vanaf 11 kringen)', nameFr: 'Basse tension (à partir de 11 circuits)', heliOmCategory: 'LS2', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Laagspanning gemene delen', nameFr: 'Basse tension parties communes', heliOmCategory: 'LS gem.', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Hoogspanning', nameFr: 'Haute tension', heliOmCategory: 'HS', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'ATEX', nameFr: 'ATEX', heliOmCategory: 'Atex', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Bliksemafleiders', nameFr: 'Paratonnerres', heliOmCategory: 'Bliksemafleiders', applicableBuildings: ALL_BUILDINGS },

  // === Gas ===
  { nameNl: 'Gasdichtheid < 70kW', nameFr: 'Étanchéité au gaz < 70 kW/h', heliOmCategory: 'Gas 1', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Gasdichtheid ≥ 70kW (stookplaats)', nameFr: 'Étanchéité au gaz ≥ 70 kW/h (chaufferie)', heliOmCategory: 'Gas 2', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Gasdetectie', nameFr: 'Détection de gaz', heliOmCategory: 'GD', applicableBuildings: ALL_BUILDINGS },

  // === Brand ===
  { nameNl: 'Veiligheidsverlichting', nameFr: 'Éclairage de sécurité', heliOmCategory: 'VV', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Branddetectie goede werking', nameFr: 'Bon fonctionnement de la détection incendie', heliOmCategory: 'BD – centrale', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Brandblussers', nameFr: 'Extincteurs', heliOmCategory: 'BB – benor', applicableBuildings: ALL_BUILDINGS, exportParty: 'simafire' },
  { nameNl: 'Brandhaspels', nameFr: 'Dévidoirs incendie', heliOmCategory: 'BB – haspel', applicableBuildings: ALL_BUILDINGS, exportParty: 'simafire' },
  { nameNl: 'Hydranten', nameFr: 'Hydrants', heliOmCategory: 'BB – Hydrant', applicableBuildings: ALL_BUILDINGS, exportParty: 'simafire' },
  { nameNl: 'Rookkoepels goede werking', nameFr: 'Bon fonctionnement des coupoles de désenfumage', heliOmCategory: 'Rookkoepel', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Dampkapblusinstallatie', nameFr: "Système d'extinction pour hotte aspirante", heliOmCategory: 'Dampkapblusinstallatie', applicableBuildings: ALL_BUILDINGS, exportParty: 'simafire' },
  { nameNl: 'Brandwerende deur', nameFr: 'Porte coupe-feu', heliOmCategory: 'Branddeur – benor', applicableBuildings: ALL_BUILDINGS, exportParty: 'firesecure' },

  // === Subassets: Branddetectie componenten ===
  { nameNl: 'Rookmelder', nameFr: 'Détecteur de fumée', heliOmCategory: 'BD – rookmelder', applicableBuildings: ALL_BUILDINGS, parentObjectTypeNl: 'Branddetectie goede werking' },
  { nameNl: 'Drukknop', nameFr: 'Bouton-poussoir', heliOmCategory: 'BD – drukknop', applicableBuildings: ALL_BUILDINGS, parentObjectTypeNl: 'Branddetectie goede werking' },
  { nameNl: 'Sirene', nameFr: 'Sirène', heliOmCategory: 'BD – sirene', applicableBuildings: ALL_BUILDINGS, parentObjectTypeNl: 'Branddetectie goede werking' },

  // === Hef en Hijs (original) ===
  { nameNl: 'Personenliften', nameFr: 'Ascenseurs pour personnes', heliOmCategory: 'PL', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Goederenliften', nameFr: 'Monte-charges', heliOmCategory: 'GL', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Fabrieksliften', nameFr: 'Ascenseurs industriels', heliOmCategory: 'FL', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Mindervalidenliften', nameFr: 'Ascenseurs PMR', heliOmCategory: 'MvL', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Hangstelling', nameFr: 'Nacelle suspendue', heliOmCategory: 'Hangstelling', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Speeltoestellen', nameFr: 'Équipements de jeux', heliOmCategory: 'Speeltoestellen', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Ankerlijnen', nameFr: "Lignes d'ancrage", heliOmCategory: 'Ankerlijn', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Ankerpunten', nameFr: "Points d'ancrage", heliOmCategory: 'Ankerpunt', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Hoogwerker', nameFr: 'Nacelle élévatrice', heliOmCategory: 'Hoogwerker', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Ladders', nameFr: 'Échelles', heliOmCategory: 'Ladders', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Stellingen', nameFr: 'Échafaudages', heliOmCategory: 'Stellingen', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Autobrug', nameFr: 'Pont élévateur', heliOmCategory: 'Autobrug', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Heftruck', nameFr: 'Chariot élévateur', heliOmCategory: 'Heftruck', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Graafmachine', nameFr: 'Excavatrice', heliOmCategory: 'Graafmachine', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Hefplatform', nameFr: 'Plateforme élévatrice', heliOmCategory: 'Hefplatform', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Werkplaatskraan', nameFr: "Grue d'atelier", heliOmCategory: 'Werkplaatskraan', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Transmissiekrik', nameFr: 'Cric de transmission', heliOmCategory: 'Transmissiekrik', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Magazijnrek', nameFr: "Rayonnage d'entrepôt", heliOmCategory: 'Magazijnrek', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Rolbrug', nameFr: 'Pont roulant', heliOmCategory: 'Rolbrug', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Roltrap', nameFr: 'Escalator', heliOmCategory: 'Roltrap', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Tillift', nameFr: 'Soulève-personnes actif ou passif', heliOmCategory: 'Tillift', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Poorten', nameFr: 'Portails', heliOmCategory: 'Poorten', applicableBuildings: ALL_BUILDINGS },

  // === Milieu (original) ===
  { nameNl: 'Stookolietank ondergronds', nameFr: 'Citerne à mazout souterraine', heliOmCategory: 'Stookolietank – 1', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Stookolietank bovengronds', nameFr: 'Citerne à mazout hors-sol', heliOmCategory: 'Stookolietank – 2', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Boven- en ondergrondse houders', nameFr: 'Réservoirs aériens et souterrains', heliOmCategory: 'Houder', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Brandstofverdeelinstallaties', nameFr: 'Installations de distribution de carburant', heliOmCategory: 'Verdeelinst.', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Opslagplaats gevaarlijke stoffen', nameFr: 'Zone de stockage de substances dangereuses', heliOmCategory: 'Opslag GS', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Persluchthouders', nameFr: "Réservoirs d'air comprimé", heliOmCategory: 'Perslucht', applicableBuildings: ALL_BUILDINGS },

  // ────────────────────────────────────────────────────────────
  // NEW: Hef en Hijs – Kranen
  // ────────────────────────────────────────────────────────────
  { nameNl: 'Autolaadkraan', nameFr: 'Grue de chargement', heliOmCategory: 'Autolaadkraan', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Bouwkraan', nameFr: 'Grue de construction', heliOmCategory: 'Bouwkraan', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Dakwerkerskraan', nameFr: 'Grue de couvreur', heliOmCategory: 'Dakwerkerskraan', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Galgkraan', nameFr: 'Grue potence', heliOmCategory: 'Galgkraan', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Havenkraan', nameFr: 'Grue portuaire', heliOmCategory: 'Havenkraan', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Mobiele kraan', nameFr: 'Grue mobile', heliOmCategory: 'Mobiele kraan', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Portaalkraan', nameFr: 'Grue portique', heliOmCategory: 'Portaalkraan', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Spoorwegkraan', nameFr: 'Grue ferroviaire', heliOmCategory: 'Spoorwegkraan', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Torenkraan', nameFr: 'Grue à tour', heliOmCategory: 'Torenkraan', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Zwenkkraan', nameFr: 'Grue pivotante', heliOmCategory: 'Zwenkkraan', applicableBuildings: ALL_BUILDINGS },

  // ────────────────────────────────────────────────────────────
  // NEW: Hef en Hijs – Overige
  // ────────────────────────────────────────────────────────────
  { nameNl: 'Elektrische takels', nameFr: 'Palans électriques', heliOmCategory: 'Elek. takel', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Enkelspoor', nameFr: 'Monorail', heliOmCategory: 'Enkelspoor', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Heftafel', nameFr: 'Table élévatrice', heliOmCategory: 'Heftafel', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Hijstoebehoren', nameFr: 'Accessoires de levage', heliOmCategory: 'Hijstoebeh.', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Laadklep', nameFr: 'Rampe de chargement', heliOmCategory: 'Laadklep', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Materiaallift', nameFr: 'Monte-matériaux', heliOmCategory: 'Materiaallift', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Metalen gordijn', nameFr: 'Rideau métallique', heliOmCategory: 'Metalen gordijn', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Manuele takel', nameFr: 'Palan manuel', heliOmCategory: 'Man. takel', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Personenbouwlift', nameFr: 'Ascenseur de chantier', heliOmCategory: 'Pers.bouwlift', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Transportplatform', nameFr: 'Plateforme de transport', heliOmCategory: 'Transportplat.', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Verreiker', nameFr: 'Télescopique', heliOmCategory: 'Verreiker', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'PBM valhoogte', nameFr: 'EPI anti-chute', heliOmCategory: 'PBM val', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Robrug zwaar', nameFr: 'Pont roulant lourd', heliOmCategory: 'Robrug zwaar', applicableBuildings: ALL_BUILDINGS },

  // ────────────────────────────────────────────────────────────
  // NEW: Elektriciteit – Specifiek
  // ────────────────────────────────────────────────────────────
  { nameNl: 'Laadpaal', nameFr: 'Borne de recharge', heliOmCategory: 'Laadpaal', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Neon-installatie', nameFr: 'Installation néon', heliOmCategory: 'Neon', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Noodgroep', nameFr: "Groupe de secours", heliOmCategory: 'Noodgroep', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Werfinstallatie', nameFr: 'Installation de chantier', heliOmCategory: 'Werfinstallatie', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Elektrische buiteninstallatie', nameFr: 'Installation électrique extérieure', heliOmCategory: 'Buiteninstall.', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Warmtepomp', nameFr: 'Pompe à chaleur', heliOmCategory: 'Warmtepomp', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Aardverbinding', nameFr: 'Mise à la terre', heliOmCategory: 'Aardverb.', applicableBuildings: ALL_BUILDINGS },

  // ────────────────────────────────────────────────────────────
  // NEW: Milieu / Overige
  // ────────────────────────────────────────────────────────────
  { nameNl: 'Rioolkeuring', nameFr: 'Inspection des égouts', heliOmCategory: 'Rioolkeuring', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Zonnebank', nameFr: 'Banc solaire', heliOmCategory: 'Zonnebank', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Kermisattractie type A', nameFr: 'Attraction foraine type A', heliOmCategory: 'Kermis A', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Kermisattractie type B', nameFr: 'Attraction foraine type B', heliOmCategory: 'Kermis B', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Attractietoestel', nameFr: "Appareil d'attraction", heliOmCategory: 'Attractie', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Foodtruck', nameFr: 'Food truck', heliOmCategory: 'Foodtruck', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Voetbalstadion', nameFr: 'Stade de football', heliOmCategory: 'Stadion', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'Lastoestel', nameFr: 'Appareil de soudage', heliOmCategory: 'Lastoestel', applicableBuildings: ALL_BUILDINGS },
  { nameNl: 'VCA arbeidsmiddelen', nameFr: 'VCA équipements de travail', heliOmCategory: 'VCA', applicableBuildings: ALL_BUILDINGS },
];

// ────────────────────────────────────────────────────────────────
// All 172 Odoo products from the official PDF product list
// ────────────────────────────────────────────────────────────────
const odooProducts: OdooProductSeed[] = [
  { code: 'PC.HH.74', name: 'Arbeidsmiddel gebruikt als behandelingstoestel klein - Jaarlijkse controle', category: 'Hef en Hijs' },
  { code: 'PC.HH.49', name: 'Arbeidsmiddelen gebruikt als behandelingstoestel (zoals heftruck) - Jaarlijkse controle', category: 'Hef en Hijs' },
  { code: 'PC.EK3.02', name: 'ATEX: nazicht zoneringsdossier gasexplosie', category: null },
  { code: 'PC.EK3.03', name: 'ATEX: nazicht zoneringsdossier stofexplosie', category: null },
  { code: 'PC.HH.52', name: 'Autolaadkraan: indienststelling', category: 'Hef en Hijs' },
  { code: 'PC.HH.53', name: 'Autolaadkraan: Periodiek', category: 'Hef en Hijs' },
  { code: 'PC.HH.72', name: 'Autolift: periodieke controle', category: 'Liften' },
  { code: 'PC.HH.38', name: 'Beweegbare hangstelling: periodiek', category: 'Hef en Hijs' },
  { code: 'PC.HH.75', name: 'Bouwkraan met volle mast: periodiek', category: 'Hef en Hijs' },
  { code: 'PC.HH.17', name: 'Bouwkraan: periodiek', category: 'Hef en Hijs' },
  { code: 'PC.BD1', name: 'Branddetectie - periodieke controle volgens goede werking (per component)', category: 'Elek Industrie' },
  { code: 'PC.BD2.02', name: 'Branddetectie - Periodieke controle volgens norm (per component)', category: 'Elek Industrie' },
  { code: 'PC.BD3.01', name: 'Branddetectie CNG tankstation: periodieke inspectie van de gas- en branddetectie installatie volgens norm', category: 'Tankstation' },
  { code: 'PC.MVB.05', name: 'Buitengebruikstelling andere dan stookolietanks', category: 'Opslagtanks' },
  { code: 'PC.HH.02', name: 'Controle van ankerlijnen en ankerpunten (visuele controle) (per ankerpunt)', category: 'HOTEL' },
  { code: 'PC.HH.02.', name: 'Controle van ankerlijnen en ankerpunten (visuele controle) (startprijs)', category: 'HOTEL' },
  { code: 'PC.HH.13.3', name: 'Dakwerkerskraan: periodiek', category: 'Hef en Hijs' },
  { code: 'PC.EK6.06', name: 'Elektrische controle van een Stroomgroep/Werfkast/Werfkeet - aangesloten op HS (per unit)', category: null },
  { code: 'PC.EK6.05', name: 'Elektrische controle van een Stroomgroep/Werfkast/Werfkeet (per unit)', category: null },
  { code: 'PC.EK6.01', name: 'Elektrische controle van een werfinstallatie (startprijs)', category: null },
  { code: 'PC.EK2.37.', name: 'Elektrische keuring - Gelijkvormigheid: niet-huishoudelijke installatie aangesloten op een hoogspanningscabine - Startprijs', category: null },
  { code: 'PC.EK2.37', name: 'Elektrische keuring - Gelijkvormigheid: niet-huishoudelijke installatie aangesloten op een hoogspanningscabine (per bord)', category: null },
  { code: 'PC.EK2.12.05', name: 'Elektrische keuring - Gelijkvormigheid: niet-huishoudelijke installatie aangesloten op een teller (>63A) - Startprijs', category: null },
  { code: 'PC.EK2.12.05.', name: 'Elektrische keuring - Gelijkvormigheid: niet-huishoudelijke installatie aangesloten op een teller (>63A) (per bord)', category: null },
  { code: 'PC.EK3.05', name: 'Elektrische keuring ATEX in een gasexplosieve atmosfeer (per zone)', category: null },
  { code: 'PC.EK3.06', name: 'Elektrische keuring ATEX in een stofexplosieve atmosfeer (per zone)', category: null },
  { code: 'PC.EK.5.01', name: 'Elektrische keuring bliksemafleiderinstallatie: periodieke controle (per daalleiding)', category: null },
  { code: 'PC.EK2.42', name: 'Elektrische keuring buiteninstallatie: reclamepaneel, fontein, marktkast, verkeersbord, …', category: null },
  { code: 'PC.EK1.38', name: 'Elektrische keuring gemeenschappelijke delen (per bord)', category: null },
  { code: 'PC.EK4.07', name: 'Elektrische keuring hoogspanningsinstallatie: gelijkvormigheid', category: null },
  { code: 'PC.EK2.39', name: 'Elektrische keuring hotel: periodieke controle (per bord)', category: null },
  { code: 'PC.EK2.39.', name: 'Elektrische keuring hotels en studentenhuizen met elektrische borden op de kamers: gelijkvormigheid (eenheidsprijs/kamer)', category: null },
  { code: 'PC.EK2.40', name: 'Elektrische keuring hotels en studentenhuizen met elektrische borden op de kamers: gelijkvormigheid (startprijs)', category: null },
  { code: 'PC.EK1.01', name: 'Elektrische keuring hotels en studentenhuizen met elektrische borden op de kamers: periodiek (eenheidsprijs/kamer)', category: null },
  { code: 'PC.EK6.04', name: 'Elektrische keuring immo (voor verkoop)', category: 'Immo' },
  { code: 'PC.EK4.02', name: 'Elektrische keuring laadpaal (per laadpaal)', category: null },
  { code: 'PC.EK2.17', name: 'Elektrische keuring neon-installatie: periodieke controle', category: null },
  { code: 'PC.EK3.04', name: 'Elektrische keuring periodiek (per kring)', category: null },
  { code: 'PC.EK1.49', name: 'Elektrische keuring tankstation: periodieke controle', category: null },
  { code: 'PC.EK1.08', name: 'Elektrische keuring: Beperkte uitbreiding in huishoudelijke installaties (max. 3 kringen)', category: null },
  { code: 'PC.EK1.48', name: 'Elektrische keuring: bestaande huishoudelijke installatie', category: 'Elek Huishoudelijk' },
  { code: 'PC.EK1.47', name: 'Elektrische keuring: huishoudelijke installatie thuisbatterijen (I)', category: null },
  { code: 'PC.EK2.12', name: 'Elektrische keuring: huishoudelijke installatie zonnepanelen', category: null },
  { code: 'PC.EK2.13.01', name: 'Elektrische keuring: niet-huishoudelijk installatie zonnepanelen en/of batterijen en/of WKK aangesloten op een teller (>10kVA)', category: null },
  { code: 'PC.EK2.22', name: 'Elektrische keuring: niet-huishoudelijke installatie aangesloten op een hoogspanningscabine: periodiek onderzoek (per bord)', category: null },
  { code: 'PC.EK2.22.', name: 'Elektrische keuring: niet-huishoudelijke installatie laadpaal aangesloten op een privé hoogspanningscabine (per laadpaal)', category: null },
  { code: 'PC.EK2.22..', name: 'Elektrische keuring: niet-huishoudelijke installatie laadpaal aangesloten op een privé hoogspanningscabine (startprijs)', category: null },
  { code: 'PC.EK.2.29', name: 'Elektrische keuring: niet-huishoudelijke installatie laadpaal aangesloten op teller', category: null },
  { code: 'PC.EK2.29', name: 'Elektrische keuring: niet-huishoudelijke installatie laadpaal aangesloten op teller (per laadpaal)', category: null },
  { code: 'PC.EK1.31', name: 'Elektrische keuring: niet-huishoudelijke installatie zonnepanelen en thuisbatterijen (<10kVA) (I)', category: null },
  { code: 'PC.EK2.24', name: 'Elektrische keuring: niet-huishoudelijke installatie zonnepanelen, batterijen of WKK aangesloten op een privé hoogspanningscabine (>10kVA)', category: null },
  { code: 'PC.HH.11.02', name: 'Elektrische takels: Periodiek', category: 'Hef en Hijs' },
  { code: 'PC.HH.11.4', name: 'Enkelspoor: periodiek', category: 'Hef en Hijs' },
  { code: 'PC.FT.01', name: 'Foodtruck - marktwagen', category: 'Elek' },
  { code: 'PC.HH.11.5', name: 'Galgkraan - Periodiek', category: 'Hef en Hijs' },
  { code: 'PC.BD3.06', name: 'Gasdetectie (CNG): indienststelling volgens goede werking (per detector)', category: null },
  { code: 'PC.BD3.03', name: 'Gasdetectie (per component)', category: null },
  { code: 'PC.G.08', name: 'Gaskeuring butaan- of propaaninstallatie', category: null },
  { code: 'PC.G.03', name: 'Gaskeuring installatie (gas aanwezig) vermogen <70kW', category: null },
  { code: 'PC.G.02', name: 'Gaskeuring installatie vermogen <70kW', category: null },
  { code: 'PC.G.05', name: 'Gaskeuring stookplaats >70kW', category: null },
  { code: 'PC.G.04', name: 'Gaskeuring stookplaats >70kW: Gelijkvormigheid', category: null },
  { code: 'PC.EK5.02', name: 'Gelijkvormigheid bliksemafleider (per daalleiding)', category: null },
  { code: 'PC.HH.21', name: 'Goederenlift (Fabriekslift) Betreedbaar voor personen - Periodiek', category: 'Hef en Hijs' },
  { code: 'PC.HH.19', name: 'Goederenlift niet betreedbaar voor personen: Periodiek', category: 'Hef en Hijs' },
  { code: 'PC.HH.26', name: 'Graafmachine gebruikt voor het hijsen van lasten: Periodiek', category: 'Hef en Hijs' },
  { code: 'PC.HH.13.1', name: 'Havenkraan: periodiek', category: 'Hef en Hijs' },
  { code: 'PC.HH.24', name: 'Hefbrug', category: 'Hef en Hijs' },
  { code: 'PC.HH.30', name: 'Heftafel', category: 'Hef en Hijs' },
  { code: 'PC.HH.09.1', name: 'Hijstoebehoren groot: periodiek', category: 'Hef en Hijs' },
  { code: 'PC.HH.09', name: 'Hijstoebehoren klein: periodiek onderzoek', category: 'Hef en Hijs' },
  { code: 'PC.HH.34', name: 'Hoogwerker: periodiek onderzoek', category: 'Hef en Hijs' },
  { code: 'PC.MVB.04', name: 'Indienstname van bovengrondse houders voor opslag van gevaarlijke producten (VL)', category: 'Opslagtanks' },
  { code: 'PC.MVO.01', name: 'Indienstname van ondergrondse houders voor opslag van gevaarlijke producten (VL)', category: 'Opslagtanks' },
  { code: 'PC.LAS1', name: 'Inspectie lastoestel', category: 'Arbeidsmiddelen' },
  { code: 'PC.EK8.01', name: 'Jaarlijkse visuele controle van een noodgroep en test van de goede werking bij een spanningsonderbreking (Per noodgroep)', category: null },
  { code: 'PC.HH.55.03', name: 'Kermisattractie type A: 3-jaarlijkse keuring', category: 'Hef en Hijs' },
  { code: 'PC.HH.55.02', name: 'Kermisattractie type A: jaarlijkse onderhoudsinspectie', category: 'Hef en Hijs' },
  { code: 'PC.HH.55', name: 'Kermisattractie type A: opstellingskeuring groot', category: 'Hef en Hijs' },
  { code: 'PC.HH.55.01', name: 'Kermisattractie type A: opstellingskeuring klein', category: 'Hef en Hijs' },
  { code: 'PC.HH.54.02', name: 'Kermisattractie type B: 10 jaarlijkse keuring', category: 'Hef en Hijs' },
  { code: 'PC.HH.54.01', name: 'Kermisattractie type B: Jaarlijkse onderhoudsinspectie', category: 'Hef en Hijs' },
  { code: 'PC.HH.54', name: 'Kermisattractie type B: Opstellingskeuring', category: 'Hef en Hijs' },
  { code: 'PC.HH.32', name: 'Laadklep: periodiek', category: 'Hef en Hijs' },
  { code: 'PC.HH.47', name: 'Ladders en stellingen: periodiek onderzoek', category: 'Hef en Hijs' },
  { code: 'PC.HH.23', name: 'Materiaallift / Ladderlift: Periodiek', category: 'Hef en Hijs' },
  { code: 'PC.HH.44', name: 'Metalen gordijn: periodiek', category: 'Hef en Hijs' },
  { code: 'PC.EK2.46', name: 'Meting van de spreidingsweerstand van een aardverbinding (per meting)', category: null },
  { code: 'PC.EK2.46.', name: 'Meting van de spreidingsweerstand van een aardverbinding (startprijs)', category: null },
  { code: 'PC.UVA.02', name: 'Meting van de stralingswaarde van zonnebanklampen in het kader van een tegenexpertise na een controle door de FOD Economie (per zonnebank)', category: null },
  { code: 'PC.HH.13.05', name: 'Mobiele kraan tot 50 ton: Periodiek', category: 'Hef en Hijs' },
  { code: 'PC.HH.13.5', name: 'Mobiele kraan vanaf 50 ton: periodiek', category: 'Hef en Hijs' },
  { code: 'PC.VCA.01', name: 'Nazicht arbeidsmiddelen (VCA)', category: 'Arbeidsmiddelen' },
  { code: 'PC.VCA.02', name: 'Nazicht elektrische arbeidsmiddelen (VCA)', category: null },
  { code: 'PC.RKV.03', name: 'Niet-huishoudelijke rioolkeuring', category: null },
  { code: 'PC.VV.01', name: 'Noodverlichting goede werking (per component)', category: null },
  { code: 'PC.VV.02', name: 'Noodverlichting volgens norm: zonder lichtsterktemeting (jaarlijks) (per component)', category: null },
  { code: 'PC.VV.04', name: 'Noodverlichting volgens norm - Initiële en periodieke controle (5 jaarlijks) (per component)', category: null },
  { code: 'PC.MVB.03', name: 'Periodiek algemeen onderzoek van bovengrondse houder voor opslag van gevaarlijke producten (Vlaanderen)', category: 'Opslagtanks' },
  { code: 'PC.MVO.03', name: 'Periodiek algemeen onderzoek van ondergrondse houder voor opslag van gevaarlijke producten (Vlaanderen)', category: 'Opslagtanks' },
  { code: 'PC.MVB.02', name: 'Periodiek beperkt onderzoek van bovengrondse houder voor opslag van gevaarlijke producten (Vlaanderen)', category: 'Opslagtanks' },
  { code: 'PC.MVO.02', name: 'Periodiek algemeen onderzoek van ondergrondse houder voor opslag van gevaarlijke producten (Vlaanderen)', category: 'Opslagtanks' },
  { code: 'PC.MP.06', name: 'Periodiek onderzoek persluchthouder Vlaanderen (>3000 bar.liter)', category: 'Perslucht' },
  { code: 'PC.MP.03', name: 'Periodiek onderzoek persluchthouder volgens exploitatievoorwaarden (BHG)', category: 'Perslucht' },
  { code: 'PC.HH.57', name: 'Periodiek onderzoek van een attractietoestel (groot)', category: 'Hef en Hijs' },
  { code: 'PC.HH.57.01', name: 'Periodiek onderzoek van een attractietoestel (klein)', category: 'Hef en Hijs' },
  { code: 'PC.UVA.01', name: 'Periodieke controle van de stralingswaarde van een zonnebank (per bank)', category: null },
  { code: 'PC.G.09', name: 'Periodieke controle van een gasinstallatie (vermogen <70 kW / MOP <100mBar / DN < 50)', category: null },
  { code: 'PC.D.23', name: 'Periodieke controle van IBCs die worden gebruikt als bovengrondse houder (conform de Vlarem-wetgeving & ADR-voorschriften)', category: null },
  { code: 'PC.MP.09', name: 'Periodieke inspectie van persluchttank (> 150 liter) (Wallonië)', category: 'Perslucht' },
  { code: 'PC.EK.4.01', name: 'Periodieke keuring hoogspanningsinstallatie (per cabine)', category: 'Elek Industrie' },
  { code: 'PC.EK.2.14', name: 'Periodieke keuring laagspanningsinstallatie aangesloten op HS (per bord)', category: 'Elek Industrie' },
  { code: 'PC.EK1.36', name: 'Periodieke keuring laagspanningsinstallatie aangesloten op teller (<63A)(per bord)', category: null },
  { code: 'PC.EK2.01', name: 'Periodieke keuring laagspanningsinstallatie aangesloten op teller (>63A)(per bord)', category: null },
  { code: 'PC.HH.36', name: 'Personenbouwlift: periodiek', category: 'Hef en Hijs' },
  { code: 'PC.HH.03', name: 'Personenlift: Controle lift met ondhoudscontract bij niet-gecertificeerde onderhoudsfirma (per 3 maanden)', category: 'Hef en Hijs' },
  { code: 'PC.HH.07', name: 'Personenlift: eindcontrole', category: 'Hef en Hijs' },
  { code: 'PC.HH.05', name: 'Personenliften - risicoanalyse', category: 'Hef en Hijs' },
  { code: 'PC.HH.04', name: 'Personenliften: Periodieke 6 maandelijkse controle', category: 'Hef en Hijs' },
  { code: 'PC.HH.01', name: 'Persoonlijke beschermingsmiddelen tegen een val van hoogte: periodieke controle', category: 'Hef en Hijs' },
  { code: 'PC.HH.11.1', name: 'Portaalkraan: periodiek', category: 'Hef en Hijs' },
  { code: 'PC.RQCW01.01', name: 'Rescert Quality Control Warmtepomp (enkel Vlaanderen)', category: null },
  { code: 'PC.HH.11.6', name: 'Robrug zwaar: periodiek', category: 'Hef en Hijs' },
  { code: 'PC.HH.11', name: 'Rolbrug: Periodiek', category: 'Hef en Hijs' },
  { code: 'PC.HH.46', name: 'Roltrappen: periodieke keuring', category: 'Liften' },
  { code: 'PC.BD3.02', name: 'Rookkoepels - periodieke controle', category: null },
  { code: 'PC.HH.42', name: 'Samenstelling: Arbeidsmiddelen bestemd voor het hijsen of heffen van lasten, uitzonderlijk gebruik voor hijsen of heffen van personen: periodiek', category: 'Hef en Hijs' },
  { code: 'PC.HH.48', name: 'Speeltoestellen & toebehoren', category: 'Hef en Hijs' },
  { code: 'PC.HH.13.2', name: 'Spoorwegkraan: periodiek', category: 'Hef en Hijs' },
  { code: 'PC.BD1.8', name: 'Startprijs - Branddetectie', category: null },
  { code: 'PC.EK6.05.', name: 'Startprijs - Elektrische controle van een werfcontainer/stroomgroep/werfkast', category: null },
  { code: 'PC.EK2.14', name: 'Startprijs - Elektrische keuring hotel: periodieke controle', category: 'HOTEL' },
  { code: 'PC.BD3.03.', name: 'Startprijs - Gasdetectie', category: null },
  { code: 'PC.EK2.01.', name: 'Startprijs - Laagspanningsinstallatie (per teller)', category: null },
  { code: 'PC.EK2.13.01.', name: 'Startprijs - Laagspanningsinstallatie aangesloten op HS-cabine', category: null },
  { code: 'PC.VV.01.1', name: 'Startprijs - Noodverlichting goede werking', category: null },
  { code: 'PC.VV.02.', name: 'Startprijs - Noodverlichting volgens norm: zonder lichtsterktemeting (jaarlijks)', category: null },
  { code: 'PC.VV.04.', name: 'Startprijs - Noodverlichting volgens normering initiële en periodieke controle (5 jaarlijks)', category: null },
  { code: 'PC.BD3.02.', name: 'Startprijs - Rookkoepels', category: null },
  { code: 'PC.EK3.05.', name: 'Startprijs Elektrische keuring ATEX in een gasexplosieve atmosfeer', category: null },
  { code: 'PC.EK3.06.', name: 'Startprijs Elektrische keuring ATEX in een stofexplosieve atmosfeer', category: null },
  { code: 'PC.EK5.01', name: 'Startprijs Elektrische keuring bliksemafleiderinstallatie: periodieke controle', category: null },
  { code: 'PC.EK1.38.', name: 'Startprijs Elektrische Keuring Gemeenschappelijke delen', category: null },
  { code: 'PC.BD3.06.', name: 'Startprijs Gasdetectie (CNG): indienststelling volgens goede werking', category: null },
  { code: 'PC.EK1.36.', name: 'Startprijs keuring laagspanningsinstallatie aangesloten op teller (<63A)', category: null },
  { code: 'PC.UVA.02.', name: 'Startprijs Meting van de stralingswaarde van zonnebanklampen in het kader van een tegenexpertise na een controle door de FOD Economie', category: null },
  { code: 'PC.UVA.01.', name: 'Startprijs Periodieke controle van de stralingswaarde van een zonnebank', category: null },
  { code: 'PC.RA.01', name: 'Startprijs relais testen (met de testkoffer van de klant)', category: null },
  { code: 'PC.EK4.06', name: 'Startprijs risicoanalyse van een laagspanningsinstallatie (exclusief veiligheid- en/of kritische installaties)', category: null },
  { code: 'PC.EK6.04.', name: 'Startprijs: Elektrische keuring laadpaal', category: null },
  { code: 'PC.EK2.29.', name: 'Startprijs: Elektrische keuring: niet-huishoudelijke installatie laadpaal aangesloten op teller', category: null },
  { code: 'PC.EK5.02.', name: 'Startprijs: Gelijkvormigheid bliksemafleider', category: null },
  { code: 'PC.EK8.01.', name: 'Startprijs: Jaarlijkse visuele controle van een noodgroep en test van de goede werking bij een spanningsonderbreking', category: null },
  { code: 'PC.RKV.02', name: 'Startprijs: Rioolkeuring privé waterafvoer', category: null },
  { code: 'PC.STK.01', name: 'Stookolieattest bovengronds', category: null },
  { code: 'PC.STK.02', name: 'Stookolieattest ondergronds', category: null },
  { code: 'PC.MVB.01', name: 'Takel: manueel', category: 'Hef en Hijs' },
  { code: 'PC.HH.15.1', name: 'Technisch onderzoek van een verplaatsbare houder (werftank)', category: null },
  { code: 'PC.HH.15', name: 'Torenkraan hoog: periodiek', category: 'Hef en Hijs' },
  { code: 'PC.HH.40', name: 'Torenkraan: periodiek', category: 'Hef en Hijs' },
  { code: 'PC.MGB.02', name: 'Uitvoeren van periodieke onderzoeken van bovengrondse houders voor opslag van gassen (VL)', category: 'Opslagtanks' },
  { code: 'PC.MGB.06', name: 'Uitvoeren van periodieke onderzoeken van bovengrondse houders voor opslag van gassen (WAL)', category: 'Opslagtanks' },
  { code: 'PC.MGO.02', name: 'Uitvoeren van periodieke onderzoeken van ondergrondse houders voor opslag van gassen (VL)', category: 'Opslagtanks' },
  { code: 'PC.MGO.06', name: 'Uitvoeren van periodieke onderzoeken van ondergrondse houders voor opslag van gassen (WAL)', category: 'Opslagtanks' },
  { code: 'PC.HH.28', name: 'Transportplatform: periodiek', category: 'Hef en Hijs' },
  { code: 'PC.HH.61', name: 'Verreiker (gebruikt als hijstoestel): Periodiek', category: 'Hef en Hijs' },
  { code: 'PC.HH.59', name: 'Visueel technisch onderzoek: jaarlijks', category: null },
  { code: 'PC.HH.13', name: 'Voetbalstadia visueel onderzoek jaarlijks en stabiliteit 3 jaarlijks', category: null },
  { code: 'PC.HH.11.03', name: 'Werkplaatskraan: periodiek', category: 'Hef en Hijs' },
  { code: 'PC.HH.11.03.', name: 'Zwenkkraan: Periodiek', category: 'Hef en Hijs' },

  // === Simafire products ===
  { code: 'OBB.01', name: 'Onderhoud brandblusser (jaarlijks)', category: 'Simafire' },
  { code: 'OBB.05', name: 'Onderhoud automatische brandblusser (jaarlijks) - branders, stookplaatsen, etc.', category: 'Simafire' },
  { code: 'OBW.01', name: 'Onderhoud bluswagen (jaarlijks)', category: 'Simafire' },
  { code: 'OBH.01', name: 'Onderhoud brandhaspel (jaarlijks)', category: 'Simafire' },
  { code: 'OH.01', name: 'Onderhoud bovengrondse hydrant', category: 'Simafire' },
  { code: 'OH.02', name: 'Onderhoud ondergrondse hydrant', category: 'Simafire' },
  { code: 'OH.03', name: 'Onderhoud muurhydrant (jaarlijks)', category: 'Simafire' },
  { code: 'OFL.01', name: 'Onderhoud automatische blussysteem (jaarlijks) - keukens, dampkappen, friteusbeveiliging, etc.', category: 'Simafire' },
  { code: 'ORM.01', name: 'Controle rookmelder volgens goede werking (jaarlijks)', category: 'Simafire' },

  // === Firesecure products ===
  { code: 'FS.BD.01', name: 'Controle brand- en nooddeuren', category: 'Firesecure' },
];

// ────────────────────────────────────────────────────────────────
// ServiceCodeMappings: ObjectType → Odoo product code(s)
// ────────────────────────────────────────────────────────────────
const R = null; // shorthand for region=null
const Q = null; // shorthand for min/maxQuantity=null
const P0 = 0;   // default priority

const serviceCodeMappings: MappingSeed[] = [
  // === Elektriciteit ===
  { objectTypeNl: 'Laagspanning (max 10 kringen)', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.EK3.04', startPriceProductCode: 'PC.EK2.01.', labelNl: 'EK periodiek (per kring) + startprijs LS teller', priority: P0 },
  { objectTypeNl: 'Laagspanning (vanaf 11 kringen)', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.EK3.04', startPriceProductCode: 'PC.EK2.01.', labelNl: 'EK periodiek (per kring) + startprijs LS teller', priority: P0 },
  { objectTypeNl: 'Laagspanning gemene delen', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.EK1.38', startPriceProductCode: 'PC.EK1.38.', labelNl: 'EK gemeenschappelijke delen (per bord) + startprijs', priority: P0 },
  { objectTypeNl: 'Hoogspanning', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.EK.4.01', startPriceProductCode: null, labelNl: 'Periodieke keuring HS (per cabine)', priority: P0 },
  { objectTypeNl: 'ATEX', regime: 'gas', region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.EK3.05', startPriceProductCode: 'PC.EK3.05.', labelNl: 'EK ATEX gasexplosieve atmosfeer (per zone) + startprijs', priority: P0 },
  { objectTypeNl: 'ATEX', regime: 'stof', region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.EK3.06', startPriceProductCode: 'PC.EK3.06.', labelNl: 'EK ATEX stofexplosieve atmosfeer (per zone) + startprijs', priority: P0 },
  { objectTypeNl: 'ATEX', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.EK3.02', startPriceProductCode: null, labelNl: 'ATEX nazicht zoneringsdossier gasexplosie (default)', priority: P0 },
  { objectTypeNl: 'Bliksemafleiders', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.EK.5.01', startPriceProductCode: 'PC.EK5.01', labelNl: 'EK bliksemafleider periodiek (per daalleiding) + startprijs', priority: P0 },
  { objectTypeNl: 'Bliksemafleiders', regime: 'gelijkvormigheid', region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.EK5.02', startPriceProductCode: 'PC.EK5.02.', labelNl: 'Gelijkvormigheid bliksemafleider (per daalleiding) + startprijs', priority: P0 },

  // === Gas ===
  { objectTypeNl: 'Gasdichtheid < 70kW', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.G.02', startPriceProductCode: null, labelNl: 'Gaskeuring installatie <70kW', priority: P0 },
  { objectTypeNl: 'Gasdichtheid ≥ 70kW (stookplaats)', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.G.05', startPriceProductCode: null, labelNl: 'Gaskeuring stookplaats >70kW', priority: P0 },
  { objectTypeNl: 'Gasdetectie', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.BD3.03', startPriceProductCode: 'PC.BD3.03.', labelNl: 'Gasdetectie (per component) + startprijs', priority: P0 },

  // === Brand ===
  { objectTypeNl: 'Veiligheidsverlichting', regime: 'werking', region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.VV.01', startPriceProductCode: 'PC.VV.01.1', labelNl: 'Noodverlichting goede werking (per component) + startprijs', priority: P0 },
  { objectTypeNl: 'Veiligheidsverlichting', regime: 'norm', region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.VV.02', startPriceProductCode: 'PC.VV.02.', labelNl: 'Noodverlichting norm jaarlijks (per component) + startprijs', priority: P0 },
  { objectTypeNl: 'Veiligheidsverlichting', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.VV.01', startPriceProductCode: 'PC.VV.01.1', labelNl: 'Noodverlichting goede werking (per component) + startprijs (default)', priority: P0 },
  { objectTypeNl: 'Branddetectie goede werking', regime: 'werking', region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.BD1', startPriceProductCode: 'PC.BD1.8', labelNl: 'Branddetectie goede werking (per component) + startprijs', priority: P0 },
  { objectTypeNl: 'Branddetectie goede werking', regime: 'norm', region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.BD2.02', startPriceProductCode: 'PC.BD1.8', labelNl: 'Branddetectie norm (per component) + startprijs', priority: P0 },
  { objectTypeNl: 'Branddetectie goede werking', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.BD1', startPriceProductCode: 'PC.BD1.8', labelNl: 'Branddetectie goede werking (per component) + startprijs (default)', priority: P0 },
  { objectTypeNl: 'Rookkoepels goede werking', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.BD3.02', startPriceProductCode: 'PC.BD3.02.', labelNl: 'Rookkoepels periodieke controle + startprijs', priority: P0 },

  // === Hef en Hijs (original) ===
  { objectTypeNl: 'Personenliften', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.04', startPriceProductCode: null, labelNl: 'Personenliften: Periodieke 6 maandelijkse controle', priority: P0 },
  { objectTypeNl: 'Goederenliften', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.19', startPriceProductCode: null, labelNl: 'Goederenlift niet betreedbaar: Periodiek', priority: P0 },
  { objectTypeNl: 'Fabrieksliften', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.21', startPriceProductCode: null, labelNl: 'Goederenlift (Fabriekslift) Betreedbaar: Periodiek', priority: P0 },
  { objectTypeNl: 'Mindervalidenliften', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.72', startPriceProductCode: null, labelNl: 'Autolift: periodieke controle', priority: P0 },
  { objectTypeNl: 'Hangstelling', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.38', startPriceProductCode: null, labelNl: 'Beweegbare hangstelling: periodiek', priority: P0 },
  { objectTypeNl: 'Speeltoestellen', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.48', startPriceProductCode: null, labelNl: 'Speeltoestellen & toebehoren', priority: P0 },
  { objectTypeNl: 'Ankerlijnen', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.02', startPriceProductCode: 'PC.HH.02.', labelNl: 'Controle ankerlijnen (per ankerpunt) + startprijs', priority: P0 },
  { objectTypeNl: 'Ankerpunten', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.02', startPriceProductCode: 'PC.HH.02.', labelNl: 'Controle ankerpunten (per ankerpunt) + startprijs', priority: P0 },
  { objectTypeNl: 'Hoogwerker', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.34', startPriceProductCode: null, labelNl: 'Hoogwerker: periodiek onderzoek', priority: P0 },
  { objectTypeNl: 'Ladders', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.47', startPriceProductCode: null, labelNl: 'Ladders en stellingen: periodiek onderzoek', priority: P0 },
  { objectTypeNl: 'Stellingen', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.47', startPriceProductCode: null, labelNl: 'Ladders en stellingen: periodiek onderzoek', priority: P0 },
  { objectTypeNl: 'Autobrug', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.24', startPriceProductCode: null, labelNl: 'Hefbrug', priority: P0 },
  { objectTypeNl: 'Heftruck', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.49', startPriceProductCode: null, labelNl: 'Arbeidsmiddelen behandelingstoestel (heftruck)', priority: P0 },
  { objectTypeNl: 'Graafmachine', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.26', startPriceProductCode: null, labelNl: 'Graafmachine hijsen lasten: Periodiek', priority: P0 },
  { objectTypeNl: 'Hefplatform', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.28', startPriceProductCode: null, labelNl: 'Transportplatform: periodiek', priority: P0 },
  { objectTypeNl: 'Werkplaatskraan', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.11.03', startPriceProductCode: null, labelNl: 'Werkplaatskraan: periodiek', priority: P0 },
  { objectTypeNl: 'Rolbrug', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.11', startPriceProductCode: null, labelNl: 'Rolbrug: Periodiek', priority: P0 },
  { objectTypeNl: 'Roltrap', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.46', startPriceProductCode: null, labelNl: 'Roltrappen: periodieke keuring', priority: P0 },

  // === Milieu (original) ===
  { objectTypeNl: 'Stookolietank ondergronds', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.STK.02', startPriceProductCode: null, labelNl: 'Stookolieattest ondergronds', priority: P0 },
  { objectTypeNl: 'Stookolietank bovengronds', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.STK.01', startPriceProductCode: null, labelNl: 'Stookolieattest bovengronds', priority: P0 },
  { objectTypeNl: 'Boven- en ondergrondse houders', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.MVB.03', startPriceProductCode: null, labelNl: 'Periodiek onderzoek bovengrondse houder (VL)', priority: P0 },
  { objectTypeNl: 'Persluchthouders', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.MP.06', startPriceProductCode: null, labelNl: 'Periodiek onderzoek persluchthouder VL', priority: P0 },

  // === Kranen ===
  { objectTypeNl: 'Autolaadkraan', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.53', startPriceProductCode: null, labelNl: 'Autolaadkraan: Periodiek', priority: P0 },
  { objectTypeNl: 'Bouwkraan', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.17', startPriceProductCode: null, labelNl: 'Bouwkraan: periodiek', priority: P0 },
  { objectTypeNl: 'Dakwerkerskraan', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.13.3', startPriceProductCode: null, labelNl: 'Dakwerkerskraan: periodiek', priority: P0 },
  { objectTypeNl: 'Galgkraan', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.11.5', startPriceProductCode: null, labelNl: 'Galgkraan: Periodiek', priority: P0 },
  { objectTypeNl: 'Havenkraan', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.13.1', startPriceProductCode: null, labelNl: 'Havenkraan: periodiek', priority: P0 },
  { objectTypeNl: 'Mobiele kraan', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.13.05', startPriceProductCode: null, labelNl: 'Mobiele kraan tot 50 ton: Periodiek', priority: P0 },
  { objectTypeNl: 'Portaalkraan', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.11.1', startPriceProductCode: null, labelNl: 'Portaalkraan: periodiek', priority: P0 },
  { objectTypeNl: 'Spoorwegkraan', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.13.2', startPriceProductCode: null, labelNl: 'Spoorwegkraan: periodiek', priority: P0 },
  { objectTypeNl: 'Torenkraan', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.40', startPriceProductCode: null, labelNl: 'Torenkraan: periodiek', priority: P0 },
  { objectTypeNl: 'Zwenkkraan', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.11.03.', startPriceProductCode: null, labelNl: 'Zwenkkraan: Periodiek', priority: P0 },

  // === Hef en Hijs – Overige ===
  { objectTypeNl: 'Elektrische takels', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.11.02', startPriceProductCode: null, labelNl: 'Elektrische takels: Periodiek', priority: P0 },
  { objectTypeNl: 'Enkelspoor', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.11.4', startPriceProductCode: null, labelNl: 'Enkelspoor: periodiek', priority: P0 },
  { objectTypeNl: 'Heftafel', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.30', startPriceProductCode: null, labelNl: 'Heftafel', priority: P0 },
  { objectTypeNl: 'Hijstoebehoren', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.09', startPriceProductCode: null, labelNl: 'Hijstoebehoren klein: periodiek onderzoek', priority: P0 },
  { objectTypeNl: 'Laadklep', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.32', startPriceProductCode: null, labelNl: 'Laadklep: periodiek', priority: P0 },
  { objectTypeNl: 'Materiaallift', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.23', startPriceProductCode: null, labelNl: 'Materiaallift / Ladderlift: Periodiek', priority: P0 },
  { objectTypeNl: 'Metalen gordijn', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.44', startPriceProductCode: null, labelNl: 'Metalen gordijn: periodiek', priority: P0 },
  { objectTypeNl: 'Manuele takel', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.MVB.01', startPriceProductCode: null, labelNl: 'Takel: manueel', priority: P0 },
  { objectTypeNl: 'Personenbouwlift', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.36', startPriceProductCode: null, labelNl: 'Personenbouwlift: periodiek', priority: P0 },
  { objectTypeNl: 'Transportplatform', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.28', startPriceProductCode: null, labelNl: 'Transportplatform: periodiek', priority: P0 },
  { objectTypeNl: 'Verreiker', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.61', startPriceProductCode: null, labelNl: 'Verreiker: Periodiek', priority: P0 },
  { objectTypeNl: 'PBM valhoogte', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.01', startPriceProductCode: null, labelNl: 'PBM valhoogte: periodieke controle', priority: P0 },
  { objectTypeNl: 'Robrug zwaar', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.11.6', startPriceProductCode: null, labelNl: 'Robrug zwaar: periodiek', priority: P0 },

  // === Elektriciteit – Specifiek ===
  { objectTypeNl: 'Laadpaal', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.EK4.02', startPriceProductCode: 'PC.EK6.04.', labelNl: 'EK laadpaal (per laadpaal) + startprijs', priority: P0 },
  { objectTypeNl: 'Neon-installatie', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.EK2.17', startPriceProductCode: null, labelNl: 'EK neon-installatie: periodieke controle', priority: P0 },
  { objectTypeNl: 'Noodgroep', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.EK8.01', startPriceProductCode: 'PC.EK8.01.', labelNl: 'Noodgroep visuele controle (per noodgroep) + startprijs', priority: P0 },
  { objectTypeNl: 'Werfinstallatie', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.EK6.05', startPriceProductCode: 'PC.EK6.01', labelNl: 'EK Stroomgroep/Werfkast (per unit) + startprijs werfinstallatie', priority: P0 },
  { objectTypeNl: 'Elektrische buiteninstallatie', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.EK2.42', startPriceProductCode: null, labelNl: 'EK buiteninstallatie', priority: P0 },
  { objectTypeNl: 'Warmtepomp', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.RQCW01.01', startPriceProductCode: null, labelNl: 'Rescert QC Warmtepomp', priority: P0 },
  { objectTypeNl: 'Aardverbinding', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.EK2.46', startPriceProductCode: 'PC.EK2.46.', labelNl: 'Meting spreidingsweerstand aardverbinding (per meting) + startprijs', priority: P0 },

  // === Milieu / Overige ===
  { objectTypeNl: 'Rioolkeuring', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.RKV.03', startPriceProductCode: 'PC.RKV.02', labelNl: 'NH rioolkeuring + startprijs', priority: P0 },
  { objectTypeNl: 'Zonnebank', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.UVA.01', startPriceProductCode: 'PC.UVA.01.', labelNl: 'Periodieke controle zonnebank (per bank) + startprijs', priority: P0 },
  { objectTypeNl: 'Kermisattractie type A', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.55.02', startPriceProductCode: null, labelNl: 'Kermisattractie type A: jaarlijkse onderhoudsinspectie', priority: P0 },
  { objectTypeNl: 'Kermisattractie type B', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.54.01', startPriceProductCode: null, labelNl: 'Kermisattractie type B: jaarlijkse onderhoudsinspectie', priority: P0 },
  { objectTypeNl: 'Attractietoestel', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.57', startPriceProductCode: null, labelNl: 'Periodiek onderzoek attractietoestel (groot)', priority: P0 },
  { objectTypeNl: 'Foodtruck', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.FT.01', startPriceProductCode: null, labelNl: 'Foodtruck - marktwagen', priority: P0 },
  { objectTypeNl: 'Voetbalstadion', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.HH.13', startPriceProductCode: null, labelNl: 'Voetbalstadia visueel onderzoek', priority: P0 },
  { objectTypeNl: 'Lastoestel', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.LAS1', startPriceProductCode: null, labelNl: 'Inspectie lastoestel', priority: P0 },
  { objectTypeNl: 'VCA arbeidsmiddelen', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.VCA.01', startPriceProductCode: null, labelNl: 'Nazicht arbeidsmiddelen (VCA)', priority: P0 },

  // === Simafire mappings ===
  { objectTypeNl: 'Brandblussers', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'OBB.01', startPriceProductCode: null, labelNl: 'Onderhoud brandblusser (jaarlijks)', priority: P0 },
  { objectTypeNl: 'Brandhaspels', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'OBH.01', startPriceProductCode: null, labelNl: 'Onderhoud brandhaspel (jaarlijks)', priority: P0 },
  { objectTypeNl: 'Hydranten', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'OH.01', startPriceProductCode: null, labelNl: 'Onderhoud bovengrondse hydrant', priority: P0 },
  { objectTypeNl: 'Dampkapblusinstallatie', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'OFL.01', startPriceProductCode: null, labelNl: 'Onderhoud automatische blussysteem (jaarlijks)', priority: P0 },

  // === Firesecure mappings ===
  { objectTypeNl: 'Brandwerende deur', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'FS.BD.01', startPriceProductCode: null, labelNl: 'Controle brand- en nooddeuren', priority: P0 },

  // === Subassets: Branddetectie componenten (stukprijs per component, geen startprijs) ===
  { objectTypeNl: 'Rookmelder', regime: 'werking', region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.BD1', startPriceProductCode: null, labelNl: 'Rookmelder goede werking (per stuk)', priority: P0 },
  { objectTypeNl: 'Rookmelder', regime: 'norm', region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.BD2.02', startPriceProductCode: null, labelNl: 'Rookmelder norm (per stuk)', priority: P0 },
  { objectTypeNl: 'Rookmelder', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.BD1', startPriceProductCode: null, labelNl: 'Rookmelder goede werking (per stuk) (default)', priority: P0 },
  { objectTypeNl: 'Drukknop', regime: 'werking', region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.BD1', startPriceProductCode: null, labelNl: 'Drukknop goede werking (per stuk)', priority: P0 },
  { objectTypeNl: 'Drukknop', regime: 'norm', region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.BD2.02', startPriceProductCode: null, labelNl: 'Drukknop norm (per stuk)', priority: P0 },
  { objectTypeNl: 'Drukknop', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.BD1', startPriceProductCode: null, labelNl: 'Drukknop goede werking (per stuk) (default)', priority: P0 },
  { objectTypeNl: 'Sirene', regime: 'werking', region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.BD1', startPriceProductCode: null, labelNl: 'Sirene goede werking (per stuk)', priority: P0 },
  { objectTypeNl: 'Sirene', regime: 'norm', region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.BD2.02', startPriceProductCode: null, labelNl: 'Sirene norm (per stuk)', priority: P0 },
  { objectTypeNl: 'Sirene', regime: null, region: R, minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.BD1', startPriceProductCode: null, labelNl: 'Sirene goede werking (per stuk) (default)', priority: P0 },

  // === Region-specific examples: Persluchthouders ===
  { objectTypeNl: 'Persluchthouders', regime: null, region: 'wallonie', minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.MP.09', startPriceProductCode: null, labelNl: 'Periodieke inspectie persluchttank (Wallonië)', priority: 10 },
  { objectTypeNl: 'Persluchthouders', regime: null, region: 'brussel', minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.MP.03', startPriceProductCode: null, labelNl: 'Periodiek onderzoek persluchthouder BHG', priority: 10 },

  // === Region-specific: Boven- en ondergrondse houders (Wallonië) ===
  { objectTypeNl: 'Boven- en ondergrondse houders', regime: null, region: 'wallonie', minQuantity: Q, maxQuantity: Q, odooProductCode: 'PC.MGB.06', startPriceProductCode: null, labelNl: 'Periodiek onderzoek bovengrondse houder (WAL)', priority: 10 },
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
  const otMap = new Map<string, string>();
  // First pass: create all types (without parent links)
  for (const ot of objectTypes) {
    const existing = await prisma.objectType.findFirst({ where: { nameNl: ot.nameNl, clientName: null } });
    const record = existing
      ? await prisma.objectType.update({
          where: { id: existing.id },
          data: { nameFr: ot.nameFr, heliOmCategory: ot.heliOmCategory, ...(ot.exportParty ? { exportParty: ot.exportParty } : {}) },
        })
      : await prisma.objectType.create({
          data: {
            nameNl: ot.nameNl,
            nameFr: ot.nameFr,
            heliOmCategory: ot.heliOmCategory,
            ...(ot.exportParty ? { exportParty: ot.exportParty } : {}),
          },
        });
    otMap.set(ot.nameNl, record.id);

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
  // Second pass: link parent-child relationships
  for (const ot of objectTypes) {
    if (ot.parentObjectTypeNl) {
      const childId = otMap.get(ot.nameNl);
      const parentId = otMap.get(ot.parentObjectTypeNl);
      if (childId && parentId) {
        await prisma.objectType.update({
          where: { id: childId },
          data: { parentObjectTypeId: parentId },
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

  console.log('Seeding Odoo products...');
  let odooCount = 0;
  for (const op of odooProducts) {
    await prisma.odooProduct.upsert({
      where: { code: op.code },
      update: { name: op.name, category: op.category, unit: op.unit ?? 'Stuks' },
      create: { code: op.code, name: op.name, category: op.category, unit: op.unit ?? 'Stuks' },
    });
    odooCount++;
  }
  console.log(`  ${odooCount} Odoo products upserted`);

  console.log('Seeding service code mappings (Odoo handoff)...');
  await prisma.serviceCodeMapping.deleteMany({});
  let mapCount = 0;
  for (const m of serviceCodeMappings) {
    const ot = await prisma.objectType.findFirst({ where: { nameNl: m.objectTypeNl, clientName: null } });
    if (!ot) {
      console.warn(`  WARN: ObjectType "${m.objectTypeNl}" not found, skipping mapping`);
      continue;
    }
    await prisma.serviceCodeMapping.create({
      data: {
        objectTypeId: ot.id,
        regime: m.regime,
        region: m.region,
        minQuantity: m.minQuantity,
        maxQuantity: m.maxQuantity,
        odooProductCode: m.odooProductCode,
        startPriceProductCode: m.startPriceProductCode,
        labelNl: m.labelNl,
        priority: m.priority,
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
