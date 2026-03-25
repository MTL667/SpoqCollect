---
bmadIntegration: true
integratedAt: '2026-03-25'
documentType: domain-specification
primaryConsumers:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad/_memory/domain-assets-odoo-integration.md'
---

# Asset-uitbreiding: brand & veiligheid + vervolgstap Odoo

**Status:** concept / input voor PRD & implementatie (in BMAD-geladen voor integratie)  
**Datum:** 2026-03-25  
**Bron:** domeinexpert-notities (gestructureerd voor BMAD & backlog)

---

## 1. Strategische insteek

| Pijler | Betekenis |
|--------|-----------|
| **Assets eerst** | Inventaris houdt een **assetverzameling** (fysieke installaties / stuks / aggregaties). |
| **Subassets** | “Extra” assets zijn **subassemblies** onder een hoofdasset (bv. branddetectie **per gebouw** + gedetecteerde componenten). |
| **Diensten als volgende stap** | Op basis van geregistreerde assets worden **diensten** afgeleid (inspectieperiode, keuringstype, productcodes). **Export naar Odoo** is die volgende laag (niet hetzelfde als assetregistratie). |
| **Productcodes** | **Normkeuring**, **goede werking**, en eventueel andere regimes mappen op **verschillende productcodes** in het export-/ERP-model. |

**Bestaande codebase:** objecttypes zitten in `prisma/seed.ts` (`ObjectType` + `heliOmCategory`). Dit document beschrijft **uitbreidingen en UX-regels**; seed/AI-labels moeten expliciet worden bijgewerkt wanneer deze specificatie wordt geïmplementeerd.

---

## 2. Moment van vragen (standaard)

Gebruik één consistente taxonomie in de app:

| Trigger | Code / label | Voorbeelden uit notities |
|---------|----------------|---------------------------|
| **Start sessie / eerste stappen** | `SESSION_START` | Appartementsgebouw / kantoor: **gemeenschappelijke delen** inventariseren? |
| **Direct na scan / bij classificatie** | `ON_SCAN` | Personenlift: 3- of 6-maandelijks; autolift: \> of \< 3 m; bliksemafleider: aantal **daalleidingen**; heftruck: hef- vs behandelingstoestel |
| **Bij afsluiten sessie (niet-huishoudelijk blok)** | `SESSION_END_NON_DOMESTIC` | Blikseminstallatie (alles **niet** huishoudelijk) |
| **Einde sessie (catch-all / onzekerheid)** | `SESSION_END` | Brand + noodverlichting: norm / goede werking / “ik weet het niet”; HSC: vraag **achteraf** |
| **Einde sessie, alleen als geen ATEX-asset** | `SESSION_END_IF_NO_ATEX` | Gasexplosieve vs stofexplosieve ATEX-zone |

---

## 3. Domeinen en assets (gestructureerd)

### 3.1 Branddetectie + veiligheidsverlichting (brand)

- **Hiërarchie:** installatie **per gebouw**; overige gedetecteerde zaken als **subassets** onder die installatie / gebouwcontext.
- **Keuring vs werking:** normkeuring en goede werking → **aparte productcodes**; detailvragen bij **`SESSION_END`** (of dedicated “afsluitflow”).
- **Overlap seed:** o.a. `Branddetectiecentrale`, `Veiligheidsverlichting` — uitbreiden met subtypes/logica indien nodig.

### 3.2 Noodverlichting

- **Hiërarchie:** **per gebouw**, daarna **stukeenheden** als aparte assets.
- **Antwoorden:** norm / goede werking / **ik weet het niet** → vraag bij **`SESSION_END`**.

### 3.3 Rookkoepels

- **Centrale** (indien van toepassing) + **aantal rookkoepels per gebouw** (aggregatie of teller na scans).
- **Overlap seed:** `Rookkoepels`.

### 3.4 Brandblussers, haspels, hydranten, blusinstallatie

| Onderdeel | Registratie |
|-----------|-------------|
| Brandblussers | **Stuks per type** |
| Brandhaspel | **Basisinstallatie** + **stuks** |
| Hydranten | **Muurhydrant**, **ondergronds**, **bovengronds** (evt. aparte objecttypes of attributen) |
| Dampkap | **Sprinklers bij dampkap** = **apart** van algemene sprinklers |
| Algemeen | **Blussysteem sprinklers** als aparte lijn |

### 3.5 Evacuatieplan

- **Per verdieping / per ruimte** (granulariteit in data model bepalen: meerdere records vs één plan met locaties).
- **Overlap seed:** `Evacuatieplan`.

### 3.6 AED

- **Per stuk** (asset).

### 3.7 Elektriciteit

| Item | Gedrag |
|------|--------|
| **Hoogspanningscabine (HSC)** | Vraag **`SESSION_END`** of “achteraf”; **logboek** in HSC als asset/eigenschap |
| **Laagspanning** | **1 installatie per gebouw**; **foto algemeen laagspanningsbord** |
| | Vraag: **aangesloten op HSC?** |
| | **Welke A (ampère)?** — **enkel bij teller**, **niet** bij HSC (business rule: conditioneel tonen) |
| **Appartement / kantoor** | **Gemeenschappelijke delen** → vraag **`SESSION_START`** |
| **Blikseminstallatie** | Niet-huishoudelijk: vraag bij **`SESSION_END_NON_DOMESTIC`** |
| **ATEX** | **`SESSION_END_IF_NO_ATEX`:** gasexplosief vs stofexplosief zone |
| **Zeldzaam** | Ontladingslampen van **lichtgevende uitgangsborden** |
| **Lasposten** | Per stuk; zie ook sectie hijs (oxycetyleen) |
| **Elektriciteitsmeter** | Per stuk |
| **Verdeelbord** | Foto; als **vooraf 63 A-teller** bekend → dat **product** mappen |
| **Mobiele verdeelborden / werkkast** | Apart registreren |
| **Bliksemafleider** | Na scan: vraag **aantal daalleidingen** |

**Overlap seed:** `Laagspanning`, `Hoogspanning`, `Bliksemafleider`, `ATEX`, `Laspost` (+ mogelijk nieuwe types: meter, verdeelbord mobiel, …).

### 3.8 Gas

| Item | Gedrag |
|------|--------|
| **Gasteller** | Per stuk |
| **Stookplaats** | Per stuk; **\< of \> 70 kW** + **foto ketelplaatje** (referentie intern: Tom van de Wiele) |
| **Gasdetectie** | **Centrale** + **detectoren tellen** |
| **Overlap seed:** `Stookplaats`, `Gasdetectie` — evt. splitsing gasteller / centrale+detectoren |

### 3.9 Liften, hijs & hefwerktuigen

| Asset | Vragen / regels |
|-------|-----------------|
| **Personenlift** | **`ON_SCAN`:** **3-maandelijks** of **6-maandelijks** |
| **Goederenlift** | Personen toegestaan? **Bediening langs buitenzijde** als herkenningspunt |
| **Mindervalidenlift (Stannah)** | Per type/herkenning |
| **Sectionaalpoort** | Per stuk |
| **Tillift** | Per stuk |
| **Roltrap** | Per stuk |
| **Autohefbrug** | Per stuk |
| **Autolift** | **`ON_SCAN`:** type / afmeting **lager of groter dan 3 m**; in inventaris **periodiek** |
| **Rolbrug** | \> **25 T**? Spoorbaan \> **8 m**? Lengte spoor \> **50 m**? (klassengrenzen exact definiëren in UX) |
| **Laspost** | **Elektrisch** vs **oxycetyleen** |
| **Hijsbanden** | **Aantal** |
| **Kartonpers** | Asset |
| **Ankerpunten** | **Aantal** |
| **Hangstellingen** | **Aantal** |
| **Heftruck** | **`ON_SCAN`:** **heftoestel** vs **behandelingstoestel** |
| **Hoogwerker** | Per stuk / type |
| **Ladders** | Per stuk / regime |
| **Speeltoestellen** | Per seed |
| **Elektrische schuifdeur** | Als **arbeidsmiddel** |
| **Laadklep** | Per stuk |

**Overlap seed:** veel types bestaan al (`Personenlift`, `Goederenlift`, `Mindervalidenlift`, `Sectionaalpoort`, `Roltrap`, `Autolift`, `Autobrug`, `Rolbrug`, `Heftruck`, `Hangstelling`, `Hoogwerker`, `Laspost`, `Kartonpers`, `Ankerlijn/ankerpunt`, `Speeltoestel`, `Laadbrug`, …) — vooral **conditionele vragen** en **aggregaten** toevoegen.

### 3.10 Milieu en druk (tanks, opslag, tankstations)

| Item | Gedrag |
|------|--------|
| **Stookolietank verwarming** | Als **\> 6000 l** → specifieke flow; **\< 6000 l** → **bovengronds / ondergronds** |
| **Stookolietank niet-verwarming** | **Bovengronds / ondergronds** |
| **Opslag gevaarlijke gassen (≠ LPG)** | Type: **cryogeen** vs **sferische** tank |
| **Opslag gevaarlijke vloeistoffen** | **Periodiek** vs **algemene** vraag (juridisch kader vastleggen) |
| **Persluchthouder** | Identificatie o.b.v. **kentekenplaatje** op locatie |
| **Gasopslagtank** | Tevens **ATEX-zone**; **bovengronds / ondergronds** |
| **Tankstation** | **Bedrijfsterrein** vs **publiek terrein** |

**Overlap seed:** `Stookolietank ondergronds/bovengronds`, `Boven-/ondergrondse houder`, `Brandstofverdeelinstallatie`, `Opslagplaats gevaarlijke stoffen`, `Persluchthouder` — uitbreiden met subtypes en vragenlijsten.

---

## 4. Open punten voor product / techniek

1. **Odoo-mapping:** welke entiteit = asset vs orderregel (dienst); welke velden zijn verplicht per productcode.
2. **Hiërarchie in DB:** parent-child op `ScannedObject` / sessie-niveau vs plat met `groupId` — beslissen vóór grote refactor.
3. **AI-labels:** nieuwe of fijnmazige types trainen/prompten (bv. hydrant varianten, 63 A-teller vs bord).
4. **Teksten FR/NL** voor alle nieuwe prompts (bestaande app is tweetalig).
5. **“Tom van de Wiele”** — interne referentie voor stookplaats-foto workflow; geen functionele eis in code tenzij als commentaar/documentatie.

---

## 5. Suggestie volgende BMAD-stap

- **PRD delta:** sectie “Asset model & Odoo-export” + “Conditionele vragen per objecttype”.  
- **Epic:** “Sessie-triggers (start/einde/scan)” + “Subassets onder gebouw/installatie”.  
- **Seed / schema:** wijzigingen batchgewijs na goedkeuring productcodes met Heli/Odoo.

---

*Dit document vervangt geen bestaande PRD; het is gestructureerde input om `prd.md` en epics bij te werken.*
