# Design System Strategy: The Kinetic Neon Protocol

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Digital Void."** Unlike traditional gaming interfaces that rely on heavy metal textures and cluttered HUDs, this system treats the UI as a high-performance light projection within a deep-space vacuum. 

We are moving away from the "template" look of flat boxes. Instead, we embrace **Intentional Asymmetry** and **Tonal Depth**. The goal is to make the user feel like they are interacting with a living energy grid. By using overlapping elements, staggered layouts, and high-contrast typography scales, we create an editorial experience that feels premium, fast, and exclusive.

---

## 2. Colors: The Neon Spectrum
Our palette is rooted in the deep shadows of space, punctuated by high-velocity light.

### Color Roles & Strategy
*   **Primary (`#adc8f5`):** Used for "Hard-Light" interactions. It provides the core visibility for active states.
*   **Secondary (`#cfbcff`):** Our "Hyper-Purple" accent. Use this for secondary actions and to break the monotony of the blue-scale.
*   **Tertiary (`#00dbe7`):** The "Data-Stream" cyan. This is reserved for critical data points, active neon glows, and success states.
*   **Background (`#10141a`):** The "Void." This is the canvas.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to define sections. Traditional borders create a "boxed-in" feeling that kills the sci-fi aesthetic. 
*   **Boundary Definition:** Separate sections using background shifts. A `surface-container-low` section sitting against the `surface` background provides all the separation needed.
*   **Tonal Transitions:** Use soft, linear gradients (e.g., `primary_container` to `surface`) to lead the eye from one content block to the next.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked light-plates. 
*   **Level 0 (The Void):** `surface` (`#10141a`).
*   **Level 1 (The Deck):** `surface_container_low` for large content areas.
*   **Level 2 (The Module):** `surface_container_high` for interactive cards or floating panels.
*   **The Glass Rule:** For floating HUD elements, use `surface_variant` at 40% opacity with a `20px` backdrop-blur. This "frosted tech" look integrates the UI into the background rather than pasting it on top.

---

## 3. Typography: Robotic Precision
We use a dual-font system to balance high-tech character with legibility.

*   **Display & Headlines (Space Grotesk):** This is our "Command Center" font. Its wide stance and geometric apertures feel engineered. Use `display-lg` (3.5rem) with `-0.05em` letter spacing for hero sections to create an aggressive, editorial impact.
*   **Body & Titles (Manrope):** Our "Tactical" font. Manrope is highly legible at small sizes. Use `body-md` for all descriptions to ensure the "high-tech" look doesn't sacrifice usability.
*   **Labels (Space Grotesk):** Use `label-md` in all-caps with `0.1em` letter spacing for button text and metadata to mimic technical readouts.

---

## 4. Elevation & Depth: Tonal Layering
In a sci-fi environment, depth is created by light, not physical shadows.

*   **The Layering Principle:** Instead of drop shadows, "lift" a component by shifting its color from `surface_container` to `surface_bright`. 
*   **Ambient Glow (The "Shadow" Replacement):** When a floating effect is required, use a shadow color tinted with `primary` (`#adc8f5`) at 10% opacity with a blur radius of `32px` or greater. This simulates light reflecting off the "Void."
*   **The "Ghost Border" Fallback:** If a containment line is required for accessibility, use the `outline_variant` token at **15% opacity**. It should be a whisper of a line, not a hard boundary.

---

## 5. Components: Engineered Elements

### Buttons (Kinetic Triggers)
*   **Primary:** Solid `primary_container` background with a `1px` inner glow of `primary`. Use `0.25rem` (sm) roundedness for a sharp, military-tech feel. 
*   **Secondary:** Ghost style. No background, `outline` border at 30% opacity, with `primary` text.
*   **The Hover State:** On hover, the button should emit a `tertiary` (Cyan) outer glow (`box-shadow: 0 0 15px`) to simulate a powered-on state.

### Cards & Modules
*   **Layout:** Forbid divider lines. Use `1.5rem` (6) vertical spacing to separate groups.
*   **Styling:** Use `surface_container_highest` for the card body. Add a subtle top-left accent line (2px wide, 20px long) in `tertiary` to give it a "digitally manufactured" look.

### Input Fields (Data Entry)
*   **Style:** Minimalist. Only a bottom border using `outline_variant`. 
*   **Focus State:** The bottom border transforms into a `primary` glow, and the label (`label-sm`) slides upward, changing color to `tertiary`.

### Custom Components: The "HUD Header"
*   **Header:** A fixed top bar using 60% `surface` opacity and backdrop-blur. Include a "System Status" indicator on the far right using a pulsing `tertiary` dot to reinforce the game-center theme.

---

## 6. Do's and Don'ts

### Do
*   **DO** use intentional asymmetry. Align a large `display-lg` headline to the left and a small `body-md` block to the far right to create dynamic tension.
*   **DO** use "Breathing Room." Utilize the `24` (6rem) spacing scale between major sections to let the tech elements shine.
*   **DO** use `tertiary_fixed` for micro-interactions (toggles, radio pips) to make them pop like LEDs.

### Don't
*   **DON'T** use 100% opaque white for text. Use `on_surface_variant` (`#c4c6cf`) for body text to reduce eye strain in the dark environment.
*   **DON'T** use large border-radii. Keep to `DEFAULT` (0.25rem) or `sm` (0.125rem) for a precise, "hard-surface" feel. Avoid "bubbly" UI.
*   **DON'T** use standard grey shadows. If it's not a light-glow or a tonal shift, it doesn't belong in the "Digital Void."