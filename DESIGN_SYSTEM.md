# Design System — Dravon To-Do (SyncDo)

This document defines the visual architecture and components of the shared task list app ("SyncDo"). It was carefully structured to reflect the essence, manifesto and positioning of the **Dravon** brand: clarity, predictability, structure and rationality.

The visual identity should convey **calm, firmness, security and systems engineering**, removing visual noise and guesswork from the design.

---

## 1. Visual Architecture Principles

- **Clarity comes before scale:** The interface cannot have confusing elements. Priorities and owners must be readable immediately and without effort.
- **Logic and Structure:** Mathematical alignment, heavy use of consistent *grids*, and modular components that feel "built" (engineering).
- **Control and Top-Down View (Architect):** The layout should give the "big picture" of the day's tasks without unnecessary scrolling, building confidence for decision-making.
- **"Out of the Dark" Aesthetic:** A deep Dark Mode, lit by strategic accents in the brand color (Dravon Green), guiding the user's eye like points of clarity amid the chaos.

---

## 2. Design Tokens

### 2.1 Base & Neutral Colors
*The interface base reflects seriousness and focus (native "Dark Mode").*
- **Main Background (The "Dark"):** `#090A0B` (A deep, almost pure black, maximum contrast).
- **Surfaces and Cards (The Structure):** `#141517` (Very dark gray, for subtle elevation) and `#1E1F22` (For *hover* elements).
- **Borders (The Project Lines):** `#2A2B2E` (Clear, structured boundaries).
- **Primary Text (Didactic):** `#E4E4E7` (Very light gray, excellent readability without eye strain).
- **Secondary Text:** `#A1A1AA` (For metadata, dates, placeholders).

### 2.2 Semantic & Brand Colors
*The brand uses tones inspired by its identity and hexagonal logo.*
- **Dravon Green (Primary & Action):** `#00B368` (A vibrant emerald/tech green, taken from the logo). Represents the system running, clarity and success.
- **Dravon Green (Shadow/Glow):** `#00B36833` (Translucent version to create a highlight aura around key buttons).
- **High Priority (Bottleneck):** `#EF4444` (Sharp red, alert without panic).
- **Medium Priority (Attention):** `#F59E0B` (Technical amber).
- **Low Priority (Aware):** `#3B82F6` (Calm blue).

### 2.3 Typography (Verbal Engineering)
*Sans-serif, high-performance fonts with extreme technical neutrality.*
- **Primary Typeface:** `Inter` (Industry-standard interface font, easy to scan).
- **Secondary Typeface (For numbers, metrics and IDs):** `JetBrains Mono` or `Roboto Mono`. Brings a "system" and engineering feel.
- **Weights:**
  - `Regular (400)` for body text.
  - `Medium (500)` for buttons and labels.
  - `SemiBold (600)` for headings and strong hierarchy. *(Dravon doesn't shout, it states. So avoid `Black` or `ExtraBold`.)*

### 2.4 Spacing and Geometry
*Firm, defined construction. Dravon is not "rounded and friendly"; it is "structured and secure".*
- **Base (Grid Unit):** 4px system (4, 8, 12, 16, 24, 32...).
- **Border Radius:**
  - `4px` for inputs and smaller buttons.
  - `8px` for task cards and structural containers.
  - *Avoid "pill shapes" (100px radius); the look should suggest solid, precise blocks, not bubbles.*

---

## 3. Primitive Components

### 3.1 Buttons (Actions)
- **Primary:** `#00B368` background, dark text (for high contrast). Slightly lighter on hover. If the action is critical, it gets a subtle Dravon Green shadow to signal clarity.
- **Secondary:** Transparent background, `#2A2B2E` border, `#E4E4E7` text.
- **Interaction:** Smooth transition (`transition: all 0.2s ease`).

### 3.2 Inputs and Forms
- Filled backgrounds with `#141517`, thin `#2A2B2E` border, precise typography.
- On focus (`:focus`), the border turns `#00B368` to show control of the current action.

### 3.3 The Task Card (The Execution Block)
- Precise rectangular shape (`border-radius: 8px`).
- Strict internal layout (title on the left, badges on the right).
- **Checkbox:** Perfect square with slightly rounded corners (`4px`). When checked, it fills with Dravon Green and plays a crisp, technical "check" animation. The whole task drops in opacity (`opacity: 0.5`) to show it has "left the bottleneck".

---

## 4. The System at Work (Dashboard)

The user interface will not be a tangle of endless lists, but a **command panel (rational architecture)**.
- **Split View:** Two rigid columns (My Tasks | Partner). Nobody hunts for information; it is right there, obvious and mapped.
- **Visibility Level:** Numeric gauges at the top, in the Mono font, showing: `[Tasks Today: 4/10]`. This is not "gamification", it is **predictability and control**.

## 5. What NOT to Do (Anti-Patterns)
- **No overly cute/rounded elements:** Dravon does not use playful emojis or childish illustrations (empty states should be clean, with technical wireframe-style icons or just clear text).
- **Avoid color noise:** Don't paint whole cards with priority colors. Use only a clear indicator (a badge or side line) to avoid "visual chaos".
- **No "bouncy" animations:** Nothing should bounce on screen. Animations should be fast, mathematical and direct (`ease-out`, 150ms).

---
*This Design System will be translated directly into the variables and utilities of the app's base CSS, ensuring the software reflects Dravon's exact stance, security and clarity.*
