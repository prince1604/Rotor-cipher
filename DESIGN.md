# Rotor — Design

The panel is a **cipher bench**: a dark metal desk, a paper tape, one brass accent. It is not a SaaS dashboard, not a terminal skin, not Anthropic-cream, not acid-green-on-black.

Spend the boldness on the **tape** (input / output). Everything else is quiet.

## Subject

A workbench for transforming text. The user is close to the glass, on a side panel ~360–420px wide. Primary job: pick a tool, get an answer, copy it, leave.

## Tokens

```css
--ink:        #12151a;   /* panel ground — not #0B0B0B, not #111 */
--ink-2:      #1a1f27;   /* wells, fields */
--ink-3:      #242b36;   /* raised chips, hover */
--rule:       #2e3644;   /* hairlines */
--paper:      #d8c9a3;   /* tape paper */
--paper-ink:  #2a2418;   /* text on tape */
--brass:      #c4a35a;   /* the one accent — active, focus, primary */
--brass-dim:  #8a7340;
--safe:       #6f9e7a;   /* authenticated / generated ok */
--warn:       #c47a4a;   /* historic, unauthenticated, JWT */
--fail:       #b4554a;   /* auth-fail, bad-input */
--mute:       #8b93a2;   /* secondary labels */
--type-ui:    "IBM Plex Sans", "Segoe UI", sans-serif;
--type-tape:  "IBM Plex Mono", "Cascadia Mono", "Consolas", monospace;
```

Fonts are **bundled** as woff2 under `fonts/` (IBM Plex Sans + Mono, SIL OFL). No Google Fonts request. If woff2 is missing during early build, fall back to `Segoe UI` / `Consolas` — never a network `@import`.

## Type scale (panel width)

| Role | Size | Weight | Face |
|---|---|---|---|
| Wordmark | 15px | 500 | UI, tracking 0.08em, “Rotor” |
| Group label | 11px | 500 | UI, mute, **not** all-caps |
| Algorithm name | 13px | 500 | UI |
| Field label | 12px | 400 | UI, mute |
| Tape | 13px / 1.45 | 400 | Mono |
| Meta / entropy | 11px | 400 | Mono, mute |
| Button | 13px | 500 | UI |

Line length on the tape is the panel width minus 24px padding. No centered hero.

## Layout (side panel, ~400px)

```
┌─────────────────────────────┐
│ Rotor                  ⚙ ☀  │  40px header, brass wordmark
│ [search algorithms      ]   │
│ encodings · classical · …   │  horizontal group tabs, scroll
│ ┌ Caesar            ⚠  ┐    │  selected chip in the wrap
│ └ 13 · latin            ┘    │
│                             │
│  encode  decode             │  mode switch (only valid modes)
│  shift [ 13 ]               │  fields from registry
│                             │
│  ┌─ input ────────── [drop] │
│  │                          │  paper tape
│  └──────────────────────────│
│           ⇅ swap            │
│  ┌─ output ─────── copy ──  │
│  │ TWFu                     │
│  └──────────────────────────│
│  4 bytes · latin-1 · live   │  meta line
│  ──── self-test 12/12 ────  │  collapsed by default
└─────────────────────────────┘
```

- Left-aligned. No card grid. No 01/02/03 markers.
- Group tabs are a single row with overflow scroll, not a dropdown of 40 items.
- Selected algorithm is a chip with a 2px brass left bar, not a glowing card.
- Warn chip sits on the algorithm row, not as an ALL-CAPS eyebrow.
- Swap (⇅) exchanges input/output when the current mode has an inverse.

## Components

**Tape.** `background: var(--paper); color: var(--paper-ink);` 2px inner indent, 0 radius on the outer panel, 2px radius on the tape itself (paper has a slight curl, not a squircle). Caret color `--brass`. Placeholder: “paste, type, or drop a file”.

**Primary button (Run / Generate).** Brass fill, ink text. Only shown for non-live modes. Idle live modes show a mute “live” word on the meta line instead of a fake button.

**Copy.** Ghost on the output tape header. After click: the word becomes “copied” for 1.2s, brass, then reverts. Do not toast across the panel.

**Warn chip.** `--warn` text, no fill, 1px `--warn` border. Copy is the registry `hint`, not “WARNING!!!”.

**Focus.** 2px brass ring, offset 2px. Never remove outlines.

**Theme.** Default is the dark bench. A sun toggle inverts to a light desk: `--ink: #e7e1d4`, `--paper: #f4efe2`, `--paper-ink: #1c1810`. Same brass. Persist in `chrome.storage.sync.theme`.

## Motion

- Mode switch: 120ms color on the active tab. No layout jump.
- Copy confirmation: text swap, no bounce.
- Self-test expand: height, 150ms, `prefers-reduced-motion: reduce` → instant.
- No page-load stagger. No hover lift on chips.

## Copy voice

- Buttons: “Copy”, “Run”, “Generate”, “Swap”, not “Submit”.
- Errors: “Password required.” / “Auth tag mismatch — ciphertext was changed or the password is wrong.”
- Empty output: leave the tape blank. Do not write “your result will appear here.”
- JWT: “Decoded. Signature not checked.”
- Classical: “Historic toy. Do not hide secrets with this.”

## Icons

Wordmark is the word **Rotor** plus a small 5-rotor glyph (five vertical ticks, the middle one brass). Toolbar icon: the same ticks on `--ink`. PNG 16 / 48 / 128, no drop shadow, no Chrome-puzzle cliché.

## Do not

- Inter font, Roboto, system-ui-only stack as the intended look.
- Purple gradients, glassmorphism, neon green.
- Numbered feature cards.
- A marketing landing page inside the extension.
- Rounded-everything (the panel is a tool; radius lives only on the tape and on chips at 3px).
