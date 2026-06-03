---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Use when the user asks to build web components, pages, or applications and the visual direction matters as much as the code quality.
origin: ECC
---

# Frontend Design

Use this when the task is not just "make it work" but "make it look designed."

This skill is for product pages, dashboards, app shells, components, or visual systems that need a clear point of view instead of generic AI-looking UI.

## When To Use

- building a landing page, dashboard, or app surface from scratch
- upgrading a bland interface into something intentional and memorable
- translating a product concept into a concrete visual direction
- implementing a frontend where typography, composition, and motion matter

## Core Principle

Pick a direction and commit to it.

Safe-average UI is usually worse than a strong, coherent aesthetic with a few bold choices.

## Design Workflow

### 1. Frame the interface first

Before coding, settle:

- purpose
- audience
- emotional tone
- visual direction
- one thing the user should remember

Possible directions:

- brutally minimal
- editorial
- industrial
- luxury
- playful
- geometric
- retro-futurist
- soft and organic
- maximalist

Do not mix directions casually. Choose one and execute it cleanly.

When the brief is open-ended, generate at least 3 distinct concept lanes before choosing. The lanes must differ in composition, information density, visual language, interaction emphasis, and emotional tone. Do not count palette swaps, font swaps, or the same card layout with different decorations as distinct directions.

Evaluate each lane with this rubric:

- novelty: does the direction have a product-specific point of view rather than generic AI UI?
- usability: can users still scan, understand, and complete the primary workflow?
- accessibility: does it preserve semantics, keyboard operation, focus visibility, contrast, readable text, and motion safety?
- brand-fit: does it match the product domain, audience, and existing design system?
- feasibility: can it be implemented within the approved scope, framework, and performance budget?
- risk: what can fail visually, technically, legally, or operationally?

Accessibility is a blocking criterion. Reject or revise any lane that relies on low contrast, hidden focus, pointer-only controls, unreadable type, unsafe motion, ambiguous labels, broken semantics, or screen-reader-hostile structure.

### 2. Build the visual system

Define:

- type hierarchy
- color variables
- spacing rhythm
- layout logic
- motion rules
- surface / border / shadow treatment

Use CSS variables or the project's token system so the interface stays coherent as it grows.

### 3. Compose with intention

Prefer:

- asymmetry when it sharpens hierarchy
- overlap when it creates depth
- strong whitespace when it clarifies focus
- dense layouts only when the product benefits from density

Avoid defaulting to a symmetrical card grid unless it is clearly the right fit.

### 4. Make motion meaningful

Use animation to:

- reveal hierarchy
- stage information
- reinforce user action
- create one or two memorable moments

Do not scatter generic micro-interactions everywhere. One well-directed load sequence is usually stronger than twenty random hover effects.

## Strong Defaults

### Typography

- pick fonts with character
- pair a distinctive display face with a readable body face when appropriate
- avoid generic defaults when the page is design-led

### Color

- commit to a clear palette
- one dominant field with selective accents usually works better than evenly weighted rainbow palettes
- avoid cliché purple-gradient-on-white unless the product genuinely calls for it

### Background

Use atmosphere:

- gradients
- meshes
- textures
- subtle noise
- patterns
- layered transparency

Flat empty backgrounds are rarely the best answer for a product-facing page.

### Layout

- break the grid when the composition benefits from it
- use diagonals, offsets, and grouping intentionally
- keep reading flow obvious even when the layout is unconventional

## Anti-Patterns

Never default to:

Anti-generic/repetition checks should reject:

- interchangeable SaaS hero sections
- generic card piles with no hierarchy
- random accent colors without a system
- placeholder-feeling typography
- motion that exists only because animation was easy to add
- concept sets where every option is the same centered hero/card grid with cosmetic changes
- repeated decorative blobs, glass panels, gradients, or stock-like media that do not support the product workflow
- hiding the actual tool or object behind generic marketing sections when the user needs a usable app surface

Do not copy protected styles. Avoid prompts or implementation guidance that imitates a living artist, named designer, specific brand, proprietary product UI, or copyrighted/trademarked visual system. Translate inspiration into abstract, product-owned attributes such as editorial hierarchy, industrial materials, calm clinical spacing, playful geometry, or dense operator-console scanning.

## Execution Rules

- preserve the established design system when working inside an existing product
- match technical complexity to the visual idea
- keep accessibility and responsiveness intact
- frontends should feel deliberate on desktop and mobile

## Quality Gate

Before delivering:

- the interface has a clear visual point of view
- typography and spacing feel intentional
- color and motion support the product instead of decorating it randomly
- the result does not read like generic AI UI
- open-ended briefs considered 3+ distinct concept lanes or documented why a single constrained direction was appropriate
- novelty, usability, accessibility, brand-fit, feasibility, and risk were checked
- accessibility failures block delivery rather than becoming optional follow-up
- protected-style copying was avoided
- the implementation is production-grade, not just visually interesting
