# Design System Document: The Architectural Inventory

## 1. Overview & Creative North Star
### The Creative North Star: "The Precision Atelier"
Inventory management is often relegated to cluttered spreadsheets and utilitarian grids. This design system rejects the "warehouse" aesthetic in favor of the "Atelier"—a space of extreme precision, quiet authority, and curated focus. 

The system moves beyond standard enterprise UI by employing **Architectural Layering**. We break the "template" look by treating the interface as a physical workspace where information is etched into surfaces rather than printed on boxes. We prioritize high information density through sophisticated typography and tonal shifts, ensuring that even the most data-heavy tables feel intentional, breathable, and premium.

---

## 2. Colors
Our palette is anchored in **Deep Blue (`#1A365D`)** to establish institutional trust, while the **Teal/Charcoal (`#2D3748`)** provides a sophisticated secondary layer for utility.

### The "No-Line" Rule
To achieve a high-end editorial feel, **prohibit the use of 1px solid borders for sectioning.** Traditional lines create visual noise that contributes to "inventory fatigue." Instead:
- Define boundaries through **Background Color Shifts**. Place a `surface-container-low` section against a `surface` background to define scope.
- Use **Vertical White Space** and alignment to imply structure.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked, precision-cut sheets. Use the `surface-container` tiers to define "Importance Depth":
- **Base Level:** `surface` (#faf9fd) for the overall application background.
- **Sectioning:** `surface-container-low` (#f4f3f7) for sidebars or secondary navigation.
- **Data Workspaces:** `surface-container-lowest` (#ffffff) for the primary "active" cards where data entry occurs.
- **Overlays:** `surface-container-highest` (#e3e2e6) for modal headers or persistent utility bars.

### The "Glass & Gradient" Rule
For high-level dashboards or "Hero" inventory metrics, move beyond flat fills. 
- **Signature CTA:** Use a subtle linear gradient from `primary` (#002045) to `primary_container` (#1a365d) at a 135-degree angle.
- **Glassmorphism:** For floating action panels or tooltips, use `surface_container_lowest` with 80% opacity and a `20px` backdrop-blur to allow underlying data colors to bleed through softly.

---

## 3. Typography
We utilize a dual-typeface strategy to balance "Editorial Authority" with "Data Clarity."

*   **Display & Headlines (Manrope):** We use Manrope for its geometric precision. It feels modern and custom, breaking the "standard sans-serif" monotony. Use `headline-lg` for warehouse titles and `display-sm` for aggregate inventory totals.
*   **Data & Body (Inter):** Inter is our workhorse. Its tall x-height ensures readability at small scales (`body-sm`) within dense data tables.

**The Hierarchy of Truth:**
- **Display-LG/MD:** For critical KPIs (e.g., Total Stock Value).
- **Title-SM:** For card headers and table column names—always in `on_surface_variant` (#43474e) to keep focus on the data itself.
- **Label-MD:** Use for status tags, always set in `Semi-Bold` for immediate recognition.

---

## 4. Elevation & Depth
Depth is a tool for navigation, not just decoration. We move away from the "shadow-heavy" look of 2010s design.

### Tonal Layering
Place a `surface-container-lowest` card on top of a `surface-container-low` background. This creates a "Natural Lift" that is easier on the eyes during long shifts than high-contrast shadows.

### Ambient Shadows
Where floating elements (like dropdowns) are required, use "Ambient Shadows":
- **Blur:** 32px to 48px.
- **Opacity:** 4% to 6% of the `on_surface` color.
- **Tint:** Infuse the shadow with a hint of `primary` to ensure it feels integrated into the Deep Blue ecosystem.

### The "Ghost Border" Fallback
If a border is required for accessibility in high-density tables:
- Use `outline-variant` (#c4c6cf) at **15% opacity**.
- **Never** use 100% opaque borders; they shatter the "Atelier" fluidity.

---

## 5. Components

### Data Tables (The Core)
- **Zero-Line Construction:** Forbid row dividers. Instead, use alternating `surface-container-lowest` and `surface-container-low` background fills on hover.
- **Status Indicators:** Do not use heavy solid blocks. Use "Soft Indicators": A `tertiary_fixed` (#a0f2e1) background with `on_tertiary_fixed` (#00201b) text for "In Stock." This provides color-coding without visual aggression.

### Cards
- **Radii:** Use `lg` (0.5rem) for main dashboard cards to maintain a professional, architectural edge.
- **Nesting:** Content inside cards should use `md` (0.375rem) for inner elements (inputs/buttons) to create a visual "nesting" rhythm.

### Buttons
- **Primary:** Gradient fill (Primary to Primary Container), `full` roundedness for high-touch actions.
- **Secondary:** `surface_container_high` fill with `primary` text. No border.

### Precision Inputs
- **Input Fields:** Use `surface_container_lowest` with a "Ghost Border" that transitions to a 2px `primary` bottom-only stroke on focus. This mimics technical drawing aesthetics.

---

## 6. Do's and Don'ts

### Do:
- **Use "Data Breathing":** In high-density tables, increase horizontal padding (`spacing-lg`) while keeping vertical padding tight. This allows the eye to scan rows without getting lost.
- **Layer your Blues:** Use the full spectrum of `primary` tokens to separate "System Actions" (Deep Blue) from "User Content" (Neutrals).
- **Subtle Motion:** All surface transitions should use a `200ms` ease-in-out to mimic the feel of premium hardware.

### Don't:
- **Don't use "Pure Black":** Use `on_surface` (#1a1c1e) for text. Pure black is too harsh for the sophisticated Deep Blue/Teal palette.
- **Don't use Standard Red/Green:** Use the specific `error` (#ba1a1a) and `tertiary` (#002520) tokens. These are calibrated to remain legible against our Deep Blue backgrounds.
- **Don't Over-Iconize:** Use icons only when they serve as immediate functional signposts. When in doubt, let the typography do the work.