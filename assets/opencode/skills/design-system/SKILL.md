---
name: design-system
description: Use this skill to generate or audit design systems, check visual consistency, and review PRs that touch styling.
origin: ECC
---

# Design System — Generate & Audit Visual Systems

## When to Use

- Starting a new project that needs a design system
- Auditing an existing codebase for visual consistency
- Before a redesign — understand what you have
- When the UI looks "off" but you can't pinpoint why
- Reviewing PRs that touch styling

## How It Works

### Mode 1: Generate Design System

Analyzes your codebase and generates a cohesive design system:

```
1. Scan CSS/Tailwind/styled-components for existing patterns
2. Extract: colors, typography, spacing, border-radius, shadows, breakpoints
3. Research 3 competitor sites for inspiration (via browser MCP)
4. Propose a design token set (JSON + CSS custom properties)
5. Generate DESIGN.md with rationale for each decision
6. Create an interactive HTML preview page (self-contained, no deps)
```

Output: `DESIGN.md` + `design-tokens.json` + `design-preview.html`

### Mode 2: Visual Audit

Scores your UI across 12 dimensions (0-10 each):

```
1. Color consistency — are you using your palette or random hex values?
2. Typography hierarchy — clear h1 > h2 > h3 > body > caption?
3. Spacing rhythm — consistent scale (4px/8px/16px) or arbitrary?
4. Component consistency — do similar elements look similar?
5. Responsive behavior — fluid or broken at breakpoints?
6. Dark mode — complete or half-done?
7. Animation — purposeful or gratuitous?
8. Accessibility — contrast ratios, focus states, touch targets
9. Information density — cluttered or clean?
10. Polish — hover states, transitions, loading states, empty states
11. Creativity fit — novelty, brand-fit, and product-specific point of view
12. Feasibility/risk — implementation complexity, performance, legal/style risk
```

Each dimension gets a score, specific examples, and a fix with exact file:line.
Accessibility failures are blocking: low contrast, missing visible focus,
pointer-only controls, unsafe motion, broken semantics, or unclear labels should
prevent approval even if the visual score is otherwise high.

### Mode 3: AI Slop Detection

Identifies generic AI-generated design patterns:

```
- Gratuitous gradients on everything
- Purple-to-blue defaults
- "Glass morphism" cards with no purpose
- Rounded corners on things that shouldn't be rounded
- Excessive animations on scroll
- Generic hero with centered text over stock gradient
- Sans-serif font stack with no personality
- Three "different" concepts that share the same layout and only swap colors,
  fonts, icons, gradients, or decorative blobs
- Repeated card grids with no hierarchy or workflow-specific scanning model
- Protected-style copying: imitating a living artist, named designer, specific
  brand, proprietary product UI, or copyrighted/trademarked visual system
```

## Concept Evaluation Rubric

When creating or auditing a design direction under ambiguity, require 3+ distinct
concept lanes unless the existing design system or approved scope requires a
single constrained direction. Evaluate each lane for:

Ambiguous briefs require 3+ distinct concept lanes unless explicitly constrained.

Use the rubric in this order: novelty, usability, accessibility, brand-fit, feasibility, and risk.

- novelty — product-specific and not generic/repeated AI UI
- usability — clear scanning, task flow, responsiveness, and state clarity
- accessibility — semantic structure, keyboard behavior, focus, labels,
  contrast, touch targets, and motion safety
- brand-fit — appropriate to domain, audience, and established tokens
- feasibility — implementable with existing components and approved scope
- risk — visual, technical, accessibility, performance, and protected-style risk

Reject or revise any lane that fails accessibility or protected-style-copying
checks before it reaches implementation.

## Examples

**Generate for a SaaS app:**
```
/design-system generate --style minimal --palette earth-tones
```

**Audit existing UI:**
```
/design-system audit --url http://localhost:3000 --pages / /pricing /docs
```

**Check for AI slop:**
```
/design-system slop-check
```
