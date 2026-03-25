# Domein: assets, subassets & Odoo-integratie (BMAD-geheugen)

**Laatst geladen in BMAD:** 2026-03-25  
**Volledige specificatie:** `{project-root}/_bmad-output/planning-artifacts/asset-uitbreiding-brand-veiligheid-odoo.md`

## Wanneer dit bestand gebruiken

- PRD-bewerking, nieuwe epics/stories, architectuurwijzigingen, UX-flows rond **inventaris/sessie/scan/export**.
- Werk aan **`prisma/seed.ts`** (objecttypes) of toekomstige **Odoo-export**.

## Kernregels (samenvatting)

1. **Assets eerst** — fysieke registratie; **subassets** onder gebouw/installatie waar nodig.
2. **Diensten** (norm / goede werking / …) = **eigen productcodes**; **Odoo** is laag bovenop assets, niet vervanging van Heli- of rapport-export.
3. **Triggers:** `SESSION_START` · `ON_SCAN` · `SESSION_END` · `SESSION_END_NON_DOMESTIC` · `SESSION_END_IF_NO_ATEX` — zie volledige doc voor per-domein mapping.

## Taal

Projectconfig (`_bmad/bmm/config.yaml`): communicatie **Nederlands**, document-output vaak **Engels** — houd PRD/epic-teksten consistent met die keuze bij vertaling van dit domein.
