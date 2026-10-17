# Excursões & Romarias System (SIMPLIFY NV1) — instructions for agents

Personal / product app to help micro agencies organize excursions and pilgrimages (romarias).  
Focus on simplicity, clarity, beauty, and daily use — especially by non-technical agency owners who currently use notebooks, spreadsheets, and WhatsApp.

The product replaces manual control of seats (poltronas), installments (parcelas), passenger lists, and rooming lists with one clear place.  
Value proposition: “Parcelas, poltronas e quartos da excursão num lugar só, sem caderno e sem planilha.”

## Start every session here
1. Read this `AGENTS.md` completely.
2. Confirm active skills and MCPs (`grok inspect` and `grok mcp list`).
3. For non-trivial features, always start in Plan Mode (`/plan`) and wait for approval before editing files.

## Required stack
- Next.js (App Router) + TypeScript + Tailwind CSS
- Database: Neon (Postgres serverless) with `@neondatabase/serverless`
- Target deploy: Vercel
- Payments later: Asaas (agency’s own account — money never passes through the platform)
- PDF generation for contracts, receipts, and passenger lists (exportable for ANTT / transporter)

## Default location (optional)
- Primary market: Vale do Paraíba / Aparecida, SP, Brazil
- Coordinates reference: Aparecida ≈ latitude -22.85, longitude -45.23
- App should work for agencies nationwide; location is not hard-coded for core flows

## Design (non-negotiable — Brand Identity)
Follow the visual identity defined at https://brand-identity.abraaomoreira.dev/

- **Minimalism**: prioritize black and white. Use color only when necessary to highlight.
- **Primary palette** (fixed):
  - Pure Black `#000000`
  - Pure White `#ffffff`
  - Soft Black `#0a0a0a`
  - Soft White `#fafafa`
- **Accent color** (chosen):
  - Primary accent: Amber `#f59e0b` (with light `#fbbf24` and dark `#d97706` variations as needed)
  - **Justification**: Amber evokes the warmth of group travel, pilgrimage destinations (such as Aparecida), and the energy of organized excursions. It provides high contrast against the monochrome base, draws attention to important actions (reserve seat, mark paid, export list), and feels trustworthy without being aggressive for micro business owners.
  - Once chosen and justified, keep consistency across buttons, links, highlights, and interactive states.
- **Neutrals**:
  - Text Gray `#6b7280`
  - Light Gray `#9ca3af`
  - Border Gray `#e5e7eb`
- **Typography**:
  - Anton for titles and highlights
  - Inter for body text
- **Themes**: support light and dark mode with good readability in both.
- **Mobile-first**: design and implement for mobile first. Agency owners often work from phones (WhatsApp, field, bus). The main experience must be excellent on mobile.
- **Responsiveness**: work very well on larger screens (tablet and desktop) for office use (planning multiple trips, reviewing finances).
- Use Tailwind. Examples: `bg-white dark:bg-black`, `text-black dark:text-white`, `border-gray-200 dark:border-gray-800`, `transition-colors duration-300`.
- Prioritize polish: generous spacing, precise alignment, clear typographic hierarchy, and subtle microinteractions.
- Components must be intentional and consistent with the identity.
- Test on mobile and on at least one desktop breakpoint.

## Core domains
1. **Excursions / Trips** — destination, dates, vehicle capacity, boarding points, status.
2. **Seats (Poltronas)** — visual map, availability, assignment to passengers, prevent double booking.
3. **Passengers** — name, document (for ANTT list), contact, status, boarding point.
4. **Installments (Parcelas)** — per passenger, amount, due date, paid status, payment method (Pix/boleto via agency Asaas later).
5. **Rooming / Accommodation** — room assignments when relevant.
6. **Lists & Exports** — passenger list (name + document + issuer), rooming list, printable/PDF for transporter or ANTT.

The app must make the daily job obvious: “who paid, who is on which seat, what is the passenger list for the bus.”

## Never break the core experience
Agency owners will use this daily. A wrong seat assignment, lost payment status, or broken list creates distrust and churn.
- Prefer Server Components when possible.
- Handle database and payment errors clearly (never leave a blank screen or raw error).
- Test critical logic (seat availability, installment status, list generation, capacity checks) with TDD when it makes sense.
- Never invent connection strings — obtain them via Neon MCP or ask the user.
- Never commit `.env*` or secrets.
- Money of passengers stays in the agency’s Asaas account. The platform does not hold funds.

## Architecture
Keep separation of responsibilities. Business logic must not be mixed with the UI.  
Service layers for trips, seats, passengers, and installments should be usable by both UI and future API routes.

## Compliance notes (later stages)
- LGPD: careful with personal data (CPF, documents). Prefer minimal collection, clear purpose, and export controls.
- ANTT: the system should be able to export the required passenger list; do not claim to replace official licensing.
- Start simple: no full NF-e or complex homologation in early versions.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
