# Artificial Selection — Architecture & Build Guide

## What This Document Is

This is the master blueprint for building **Artificial Selection**, an educational game that teaches genetics and plant breeding principles through gameplay. You (the coding agent) should read this entire document before writing any code. It describes the game concept, architecture, tech stack, genetics engine specification, UI/UX direction, progression system, and build order.

The creator of this game is a university professor and plant genomics researcher. The science must be real. The game must be fun.

---

## Game Concept

**Artificial Selection** is a single-player, browser-based strategy game where the player runs a plant breeding program. Starting with simple Mendelian crosses, the player progressively unlocks more advanced tools and techniques — marker-assisted selection, genomic prediction, mutagenesis, gene editing, hybrid breeding, and more — as they work to improve crop varieties under real genetic constraints.

The game teaches by doing. Players learn that:
- Selection response depends on heritability, selection intensity, and genetic variance
- Marker-assisted selection gives you an edge over phenotypic selection alone
- Strong selection erodes genetic diversity (and why that matters)
- Pre-breeding and introgression from wild relatives can introduce useful alleles
- Mating system design matters (inbreeding depression, heterosis, maintaining diversity)
- Genomic prediction can accelerate gains when training data is sufficient
- Gene editing and mutagenesis create new variation but require understanding the target

**Core fantasy:** You are the breeder. Every cross, every screen, every selection decision is yours. The genome is real (simulated but genetically accurate). There are no shortcuts that violate biology.

### Target Audience
- University students in genetics, plant breeding, or biology courses
- Curious people who want to understand how breeding works
- Future: competitive multiplayer for classroom settings

### Platform
- **Web app** (mobile-first responsive design, works on phones and laptops)
- Built as a Progressive Web App (PWA) so it can be installed and potentially wrapped for app stores later
- No native app development — web only for now

---

## Tech Stack

### Frontend
- **React 18+** with **TypeScript**
- **Vite** for build tooling (fast, modern, good DX for agents)
- **Tailwind CSS** for utility styling
- **Framer Motion** for animations (plant growth, breeding visualizations)
- **Recharts** or **D3** for data visualization (selection response charts, allele frequency plots, breeding value distributions)
- PWA manifest + service worker for installability

### Backend (lightweight, add later)
- For v1: **all client-side**. Game state saved to localStorage/IndexedDB
- For multiplayer (future): Supabase (auth, database, realtime) or Firebase
- No backend needed for the prototype or single-player experience

### Project Structure
```
artificial-selection/
├── README.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── index.html
├── public/
│   ├── manifest.json
│   └── icons/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── engine/              # ← THE GENETICS ENGINE (pure logic, no UI)
│   │   ├── types.ts         # Core genetic types
│   │   ├── genome.ts        # Genome representation, alleles, loci
│   │   ├── meiosis.ts       # Recombination, independent assortment, linkage
│   │   ├── cross.ts         # Crossing two individuals, generating offspring
│   │   ├── population.ts    # Population-level operations
│   │   ├── traits.ts        # Phenotype calculation from genotype (including QTL, epistasis, GxE)
│   │   ├── selection.ts     # Selection methods (mass, family, marker-assisted, genomic)
│   │   ├── mutation.ts      # Mutagenesis, spontaneous mutation
│   │   ├── markers.ts       # Marker discovery, genotyping, MAS logic
│   │   ├── prediction.ts    # Genomic prediction / BLUP-like estimation
│   │   ├── editing.ts       # Gene editing simulation
│   │   ├── diversity.ts     # Diversity metrics, inbreeding coefficients
│   │   └── index.ts         # Public API for the engine
│   ├── game/                # ← GAME MECHANICS (uses engine, no direct UI)
│   │   ├── state.ts         # Game state management
│   │   ├── economy.ts       # Budget, costs, revenue from variety release
│   │   ├── progression.ts   # Tech tree, unlocks, level progression
│   │   ├── scenarios.ts     # Challenge definitions, objectives
│   │   ├── scoring.ts       # How performance is evaluated
│   │   └── time.ts          # Season/generation system
│   ├── components/          # ← REACT UI COMPONENTS
│   │   ├── layout/          # App shell, navigation, responsive layout
│   │   ├── organisms/       # Plant visualization components
│   │   ├── lab/             # Crossing interface, marker lab, gene editing UI
│   │   ├── field/           # Field trial views, phenotype display
│   │   ├── data/            # Charts, plots, data tables
│   │   ├── tech-tree/       # Tech tree / unlock progression UI
│   │   ├── inventory/       # Seed bank, germplasm collection
│   │   └── common/          # Buttons, modals, tooltips, etc.
│   ├── hooks/               # Custom React hooks
│   ├── stores/              # Zustand or similar state management
│   ├── utils/               # General utilities
│   ├── assets/              # Images, SVGs for plant illustrations
│   └── styles/              # Global styles, Tailwind extensions
└── tests/
    ├── engine/              # Unit tests for genetics engine (CRITICAL)
    └── game/                # Tests for game mechanics
```

### Critical Architecture Principle

**The `engine/` directory is the heart of the game and must have ZERO dependencies on React, the DOM, or any UI framework.** It is pure TypeScript logic that simulates genetics. It should be independently testable, and in theory could be extracted as its own npm package. Every function in `engine/` takes data in and returns data out. No side effects, no state mutation, no UI awareness.

The `game/` directory orchestrates the engine and manages game state but also has no UI dependencies.

The `components/` directory is the only place that imports React.

This separation is essential because the UI **will** be rewritten. The engine must survive that.

---

## Genetics Engine Specification

This is the most important section. The engine must be scientifically accurate.

### Genome Representation

```typescript
// Core types — starting point, expand as needed

interface Locus {
  id: string;
  chromosome: number;
  position: number;          // cM position on chromosome (for linkage)
  alleles: string[];         // possible alleles at this locus (e.g., ["A", "a", "T", "G"])
  type: "mendelian" | "qtl" | "marker" | "regulatory";
}

interface Haplotype {
  alleles: Map<string, string>;  // locusId → allele on this haplotype
}

interface Genotype {
  haplotypes: [Haplotype, Haplotype];  // diploid: one from each parent
  species: string;
}

interface Individual {
  id: string;
  genotype: Genotype;
  phenotype: Map<string, number>;      // traitName → phenotypic value
  parents: [string, string] | null;    // parent IDs or null if founder
  generation: number;
  isAlive: boolean;
}

interface Trait {
  name: string;
  displayName: string;
  type: "qualitative" | "quantitative";
  // For qualitative traits:
  dominance?: "complete" | "incomplete" | "codominant";
  // For quantitative traits:
  heritability: number;        // narrow-sense h²
  loci: string[];              // QTL locus IDs contributing to this trait
  effects: Map<string, number>; // locusId → additive effect
  environmentalVariance: number;
  // Optional complexity (unlockable):
  epistasis?: EpistaticInteraction[];
  gxe?: GxEEffect[];
}

interface EpistaticInteraction {
  loci: [string, string];
  type: "additive_x_additive" | "additive_x_dominance" | "dominance_x_dominance";
  effect: number;
}
```

### Meiosis & Recombination

Meiosis must simulate:
1. **Independent assortment** of chromosomes
2. **Crossover/recombination** between linked loci based on map distance (cM)
   - Use the Haldane or Kosambi mapping function to convert cM to recombination frequency
   - At least one crossover per chromosome arm is biologically realistic
3. **Segregation** of alleles at each locus

```typescript
// Pseudocode for gamete production
function produceGamete(genotype: Genotype, genomeMap: GenomeMap): Haplotype {
  // For each chromosome:
  //   1. Determine crossover points (Poisson process, rate = chromosome length in Morgans)
  //   2. Alternate between parental haplotypes at crossover points
  //   3. Collect resulting alleles into new haplotype
  // Return the recombinant haplotype
}
```

### Phenotype Calculation

For **qualitative traits** (single-gene, Mendelian):
- Complete dominance: heterozygote = dominant phenotype
- Incomplete dominance: heterozygote = intermediate
- Codominance: heterozygote shows both

For **quantitative traits** (polygenic):
```
Phenotypic value = Σ(additive effects across QTLs) + dominance deviations + epistatic effects + environmental noise

Where:
- Additive effect at locus i = effect_i * (number of favorable alleles: 0, 1, or 2)
- Dominance deviation = d_i if heterozygous at locus i
- Environmental noise ~ Normal(0, Ve)
- Ve is calibrated so that h² = Va / (Va + Ve)
```

GxE (when unlocked): phenotypic value shifts based on a simulated "environment" variable per field/season.

### Marker System

Markers are loci that don't directly affect traits but are linked to QTLs:
- Player can "genotype" individuals (at a cost) to reveal marker alleles
- If a marker is tightly linked to a QTL, the marker allele tracks the favorable QTL allele
- Loose linkage = less reliable marker-trait association
- Player must discover marker-trait associations through statistical analysis (or the game provides hints)
- **Key teaching moment:** MAS lets you select without phenotyping, which is faster and cheaper for traits that are hard/expensive to phenotype

### Selection Methods (progressively unlocked)

1. **Mass selection** (available from start): Pick the best phenotypes, use as parents
2. **Family selection**: Evaluate family means, select best families
3. **Marker-assisted selection** (unlocked): Use marker genotypes to pre-screen
4. **Marker-assisted backcrossing** (unlocked): Introgress specific alleles from donor
5. **Genomic selection/prediction** (late unlock): Train a prediction model on genotype + phenotype data, select on predicted breeding values without phenotyping

### Mutation & Variation Creation

- **Mutagenesis** (unlockable): Treat a population with mutagen → random new alleles at random loci. Most are neutral or deleterious, rare beneficial ones. Player does a "mutant screen" to find useful variants.
- **Gene editing** (late unlock): Target a specific locus, change a specific allele. High precision but requires knowing which locus to target (must have discovered the QTL first).
- **Wild relative introgression** (unlockable): Cross with a different (simulated) species/subspecies that has novel alleles. Introduces useful variation but also linkage drag.

### Diversity & Population Genetics

The engine must track:
- **Allele frequencies** in the breeding population
- **Expected heterozygosity** (diversity metric)
- **Inbreeding coefficient** (F) per individual and population average
- **Effective population size** (Ne) — warn player when Ne gets dangerously low
- **Genetic drift** effects in small populations
- **Inbreeding depression** for traits where dominance matters

**Key teaching moment:** Aggressive selection reduces diversity. If you select too hard, you lose alleles you might need later. Maintaining a broad base population while advancing an elite population is a real breeding strategy.

### Mating Systems

- **Selfing** (for self-compatible species): rapid fixation, develop inbred lines
- **Outcrossing**: maintain heterozygosity, exploit heterosis
- **Controlled crosses**: specific parent combinations
- **Open pollination**: simulate random mating within a population
- **Hybrid production** (unlockable): cross inbred lines to produce F1 hybrids with heterosis

---

## Game Mechanics

### Economy

| Action | Cost | Notes |
|--------|------|-------|
| Grow a generation (field space) | $ per plant | Scales with population size |
| Phenotype a trait | $ per individual per trait | Some traits cheap (color), some expensive (yield trials) |
| Genotype (markers) | $ per individual per marker panel | Gets cheaper as tech improves |
| Whole-genome genotyping | $$$ per individual | Required for genomic prediction |
| Mutagenesis treatment | $$ | Plus cost of screening population |
| Gene editing | $$$ | Requires prior QTL discovery |
| Acquire wild germplasm | $$ | One-time cost per accession |
| Release a variety | Revenue based on genetic merit | This is how you make money |

The player earns money by releasing improved varieties. Better varieties = more revenue. Revenue funds the next cycle of breeding. This creates a natural tension: invest in long-term tools (markers, diversity) vs. short-term gains (aggressive selection on current best).

### Progression / Tech Tree

The tech tree is how complexity is introduced gradually. The player starts with basic tools and unlocks advanced ones through a combination of:
- Completing objectives (e.g., "Release a variety with trait X above threshold Y")
- Spending research points (earned through gameplay)
- Reaching certain generation counts

**Suggested tech tree structure:**

```
TIER 1 — Foundations (available from start)
├── Mass selection
├── Controlled crosses
├── Phenotyping (visual traits: color, shape)
└── Basic field trials

TIER 2 — Quantitative Breeding (unlock after first variety release)
├── Family selection
├── Phenotyping (quantitative traits: yield, height)
├── Selection intensity controls
├── Population size management
└── Pedigree tracking

TIER 3 — Molecular Tools (unlock via research points)
├── Marker discovery
├── Marker-assisted selection (MAS)
├── Marker-assisted backcrossing
├── Genetic diversity dashboard
└── Inbreeding coefficient tracking

TIER 4 — Advanced Breeding (unlock via objectives)
├── Wild relative collection & introgression
├── Pre-breeding program
├── Hybrid breeding system
├── Mating design optimization
└── Multi-environment trials (GxE)

TIER 5 — Genomics Era (late game)
├── Whole-genome genotyping
├── Genomic prediction / GBLUP
├── Mutagenesis & mutant screening
├── Gene editing (CRISPR)
├── Genomic-assisted backcrossing
└── Speed breeding (faster generations)
```

Each unlock should come with a brief, well-written explanation of the concept (think: a tooltip or mini-tutorial, not a textbook). The game teaches through context, not lectures.

### Seasons & Time

- Each "turn" or "season" represents one growing cycle (one generation for annuals)
- The player allocates their budget, makes crosses, plants populations, phenotypes, selects, and advances
- Time pressure creates urgency: can you improve the variety faster than a competitor (future multiplayer) or before a deadline?

### Objectives & Challenges

The game should have both:
1. **A main sandbox mode**: Here's a crop, here are the starting genetics, breed it however you want. Open-ended.
2. **Challenge scenarios** (unlockable or selectable): Specific objectives like:
   - "Breed a variety with disease resistance from this wild relative within 10 generations"
   - "Maximize yield without dropping below X diversity threshold"
   - "Develop an F1 hybrid system from scratch"
   - "A new pathogen just appeared — your varieties are susceptible. Fix it."

---

## Visual Design Direction

### Overall Aesthetic
- **Charming + data-rich hybrid.** Think: Stardew Valley meets a breeding program dashboard
- Plants should be visually appealing — stylized but recognizable, with phenotypic traits visible (color, size, shape, vigor)
- Data views should be clean and informative — allele frequency bar charts, selection response line graphs, pedigree trees, diversity heatmaps
- The player should be able to switch between "looking at their plants" and "looking at their data"

### Plant Visualization
- Plants are rendered as stylized SVG/illustrations
- Phenotypic traits map to visual properties:
  - Color traits → actual plant color
  - Size/height traits → plant height in the illustration
  - Shape traits → leaf or fruit shape variations
  - Vigor/health → lushness of the illustration
- When you cross two plants, show the parents and a preview of expected offspring variation
- Plants should have subtle idle animations (gentle sway, growth over time)

### Data Visualization
- Allele frequency plots (bar charts showing frequency of each allele at key loci)
- Selection response over generations (line chart: mean phenotypic value per generation)
- Pedigree viewer (tree/network diagram showing breeding history)
- Diversity metrics dashboard (He, F, Ne over time)
- Breeding value distributions (histogram of estimated breeding values)

### UI Layout
- **Mobile-first** responsive design
- Bottom navigation bar (mobile) / sidebar (desktop)
- Main views: Field (see your plants), Lab (make crosses, genotype), Data (charts & analysis), Tech Tree, Inventory (seed bank)
- Warm, natural color palette with green/earth tones as base, accent colors for UI elements
- Clean typography: a friendly display font for headings, a readable sans-serif for data

### Color Palette Suggestion
```css
:root {
  --color-soil: #3d2c1f;
  --color-leaf: #4a7c59;
  --color-leaf-light: #7cb587;
  --color-wheat: #e8d5a3;
  --color-sky: #87CEEB;
  --color-accent: #e07a3a;     /* warm orange for actions/CTAs */
  --color-danger: #c0392b;
  --color-surface: #faf7f2;    /* warm off-white */
  --color-text: #2c1810;
  --color-text-muted: #6b5c4f;
}
```

---

## Build Order (for the coding agent)

### Phase 1: Genetics Engine + Minimal UI (BUILD THIS FIRST)

**Goal:** A working genetics simulation with a bare-bones interface to make crosses and see results.

1. Initialize the project (Vite + React + TypeScript + Tailwind)
2. Implement `engine/types.ts` — all core type definitions
3. Implement `engine/genome.ts` — create genomes, initialize founders with allele diversity
4. Implement `engine/meiosis.ts` — gamete production with recombination
5. Implement `engine/cross.ts` — cross two individuals, produce offspring
6. Implement `engine/traits.ts` — calculate phenotype from genotype (start with 2-3 simple Mendelian traits + 1 quantitative trait)
7. Write unit tests for all engine modules (this is critical — the engine must be correct)
8. Build a minimal UI: display a population of plants, click two to cross them, see offspring
9. Visualize phenotypes on the plant illustrations (even if rough SVGs at this stage)

**Definition of done:** You can create a founding population, make crosses, see Mendelian segregation working correctly (e.g., 3:1 ratios in F2), and see quantitative trait variation in offspring.

### Phase 2: Game Loop + Economy

**Goal:** It feels like a game, not just a simulation.

1. Implement `game/state.ts` — game state management with Zustand
2. Implement `game/time.ts` — season/generation system
3. Implement `game/economy.ts` — budget, costs for actions, revenue for variety release
4. Implement `engine/selection.ts` — mass selection (select top N individuals)
5. Implement `engine/population.ts` — population management, allele frequency tracking
6. Build the Field view (see your current population, select individuals)
7. Build the Lab view (make crosses, plan matings)
8. Build a basic HUD (generation counter, budget, current objectives)
9. Implement variety release mechanic (evaluate a line, release it, earn money)

**Definition of done:** You can play through multiple generations, make selection decisions, manage a budget, and release improved varieties.

### Phase 3: Progression + Intermediate Tools

**Goal:** The tech tree works and the game progressively introduces complexity.

1. Implement `game/progression.ts` — tech tree state, unlock conditions
2. Build the Tech Tree UI
3. Implement `engine/diversity.ts` — He, F, Ne calculations
4. Implement `engine/markers.ts` — marker genotyping, linkage to QTLs
5. Add MAS as an unlockable selection method
6. Build the Data view (charts: selection response, allele frequencies, diversity)
7. Add family selection
8. Add inbreeding depression mechanics
9. Add educational tooltips/mini-tutorials when new tools unlock
10. Implement pedigree tracking and pedigree viewer

### Phase 4: Advanced Features

**Goal:** Full-depth breeding simulation.

1. Wild relative germplasm + introgression mechanics
2. Hybrid breeding system (inbred line development → testcrossing → F1 hybrids)
3. Mutagenesis + mutant screening
4. Gene editing (targeted allele modification)
5. Genomic prediction (simplified GBLUP-like model)
6. Multi-environment trials + GxE
7. Epistasis effects
8. Advanced mating design tools

### Phase 5: Polish + Multiplayer Foundation

**Goal:** Release-ready quality.

1. Refined plant illustrations and animations
2. Sound design (subtle, satisfying feedback sounds)
3. Tutorial / onboarding flow
4. Save/load game state (IndexedDB)
5. PWA setup (manifest, service worker, offline capability)
6. Challenge scenario system
7. Leaderboard foundation (prepare for multiplayer)

---

## Key Design Principles for the Agent

1. **Engine purity.** Never let UI concerns leak into the genetics engine. If you're tempted to import React in an engine file, stop and refactor.

2. **Test the engine obsessively.** Every genetics function needs unit tests. Test Mendelian ratios. Test that recombination frequencies match expected values for given map distances. Test that selection response follows the breeder's equation (R = h²S). The science must be right.

3. **Start ugly, make it pretty later.** Phase 1 UI can be boxes and text. Get the engine right first. Beautiful plant SVGs come in Phase 3-4.

4. **Mobile-first layout.** Design for a phone screen first, then expand for desktop. Use Tailwind responsive utilities (`sm:`, `md:`, `lg:`).

5. **Progressive disclosure.** Don't show the player everything at once. The tech tree gates complexity. Early gameplay should feel simple and approachable. Complexity emerges naturally.

6. **Teach through consequences, not lectures.** If the player selects too aggressively and loses diversity, show them what happened (diversity chart dropping, inbreeding coefficient rising, performance plateau). Don't just pop up a warning — let them experience it and then explain why.

7. **Every number should be inspectable.** If a plant has a yield value, the player should be able to click it and see: breeding value estimate, environmental component, which QTLs are contributing. Transparency builds understanding.

8. **Save state frequently.** Auto-save to localStorage/IndexedDB after every action. Players will close the tab and come back.

---

## Naming & Branding

- **Game title:** Artificial Selection
- **Tagline ideas:** "Breed. Select. Evolve." / "Master the genome." / "Nature selects. Now it's your turn."
- **Tone:** Warm, smart, accessible. Not dumbed-down, not intimidating. Think: a really good professor who's also fun at parties.

---

## References for Scientific Accuracy

The genetics engine should be consistent with:
- **Falconer & Mackay** — *Introduction to Quantitative Genetics* (the breeder's equation, heritability, selection response)
- **Bernardo** — *Breeding for Quantitative Traits in Plants* (breeding schemes, MAS, genomic selection)
- **Lynch & Walsh** — *Genetics and Analysis of Quantitative Traits* (population genetics foundations)

When in doubt about a genetic mechanism, err on the side of the textbook rather than simplifying. The whole point is that the simulation is real enough to teach real principles.

---

## What Success Looks Like

A student plays this game for a few hours. Afterwards, they can:
- Explain why selection response depends on heritability and genetic variance
- Describe why MAS is useful and when it's worth the cost
- Understand the tradeoff between selection intensity and diversity loss
- Explain what heterosis is and how hybrid breeding exploits it
- Reason about why pre-breeding and wild relatives matter
- Have an intuition for how genomic prediction works

And they had fun doing it.
