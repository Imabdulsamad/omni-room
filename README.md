# The Room of Requirement

An interactive puzzle game inspired by the Room of Requirement. Every twelve seconds the
room reconstructs itself, generating a new puzzle while adapting to the player's behaviour
over time.

Built with **React 18**, **Vite**, **Tailwind CSS 3**, **Framer Motion 11** and **Lucide**.

The project contains **no image or audio assets**. Visual effects are implemented entirely
with CSS and SVG; sound effects are synthesised at runtime with the **Web Audio API**.

---

## Features

* Procedurally generated puzzle rooms with guaranteed-solvable objectives
* Seven objective types, eight room themes, seventeen object kinds
* Adaptive room selection driven by measured player behaviour
* Bounded difficulty progression across nine rooms
* Boggart traps identified by behaviour rather than appearance
* Time-Turner slow-motion bonus mechanic
* Runtime-synthesised audio, no media files
* Custom cursor with particle trail, isolated from React rendering
* Responsive single-viewport layout

---

## Getting started

```bash
npm install
npm run dev      # development server on http://localhost:5173
npm run build    # production bundle to dist/
npm run preview  # serve the built bundle locally
```

Requires **Node.js 18+**.

---

## Project structure

```
src/
│
├── RoomOfRequirement.jsx    Complete game implementation
├── main.jsx                 React entry point
└── index.css                Tailwind entry + viewport reset

index.html                   Document shell and font loading
vite.config.js               Build config (see Compatibility)
tailwind.config.js           Theme extensions and keyframes
```

The game intentionally lives in a single module. Nearly every system reads or writes the
same round state — generation, objectives, timing, scoring, rendering and adaptation — so
splitting it would introduce either deep prop-drilling or a global store for a component
tree that is only three levels deep.

The source is organised into labelled sections in this order:

1. Tuning constants
2. Content definitions (object kinds, hues, themes, tells)
3. Objective definitions
4. Round generation
5. Presentational subcomponents
6. Root game component

---

## Configuration

All balance and pacing values are centralised at the top of the module, so mechanics can
be tuned without touching gameplay logic.

```js
const SHIFT_MS = 12000;        // how often the room reconstructs itself
const TIME_TURNER_MS = 6000;   // duration of the slow-motion window
const COMBO_FOR_TURNER = 3;    // consecutive correct picks required
const MAX_ROOMS = 9;
const DECAY_PER_SEC = 0.65;    // ambient stability decay
const HIT_STABILITY = 3.5;
const MISS_STABILITY = -6;
const TRAP_STABILITY = -18;
```

---

## Gameplay

The player paces three times before the wall to open the door, then clears nine rooms
before **Magic Stability** reaches zero. Each room poses a riddle; the objective is to
select every object satisfying it while avoiding disguised Boggarts.

Stability also decays passively at `0.65` per second, so inaction is itself a loss
condition.

### Controls

| Input | Action |
| --- | --- |
| Click | Select object |
| Drag | Reposition object within the field |
| `M` | Toggle sound |
| `Enter` | Restart from an end screen |

### Scoring

| Action | Result |
| --- | --- |
| Correct selection | `+score`, `+3.5` stability, combo increments |
| Incorrect selection | `−6` stability, combo resets |
| Boggart | `−18` stability, `−50` score, combo resets |
| Room cleared | `+500` bonus, immediate shift |

Score per correct selection is:

```
100 × (1 + 0.25 × (combo − 1))    ×3 while the Time-Turner is active
```

### Difficulty progression

Difficulty is a function of room index, bounded at both ends:

| Quantity | Formula | Range |
| --- | --- | --- |
| Objects per room | `9 + ⌊level × 0.7⌋` | 9 – 15 |
| Targets | `3 + (level mod 3)` | 3 – 5 |
| Boggarts | `1 + ⌊level ÷ 2⌋` | 1 – 4 |

The `both` objective — matching hue *and* category simultaneously — is gated behind room 4
via a `minLevel` field, so compound riddles never appear before the player has seen their
components in isolation.

---

## Architecture

### Guaranteed-solvable generation

Object placement is randomised, but solvability is not left to chance. Rather than
generating objects and hoping some satisfy the riddle — which yields occasional impossible
rooms and a target counter that can lie — each objective declares two inverse
transformations:

```js
{
  id: "cracked",
  riddle: () => "Take only what is already broken.",
  strip: (o) => ({ ...o, cracked: false }),   // guarantee it does NOT match
  stamp: (o) => ({ ...o, cracked: true }),    // guarantee it DOES match
}
```

Generation then follows a fixed pipeline:

1. Populate the room with randomised objects.
2. **Strip** every object, so nothing satisfies the objective.
3. Select an exact number of indices and **stamp** them back into valid targets.
4. Stamp the Boggart indices identically, then flag them as traps.

Because step 2 establishes the invariant and step 3 is the only thing that can break it,
the target count is exact by construction. This guarantees:

* No room can be unsolvable
* The on-screen "N LEFT" counter is always accurate
* Difficulty is expressed as two integers rather than tuned by feel
* New objectives require no changes to the generator

Objectives needing round-scoped context declare an optional `prep()`, executed once per
round, whose result is threaded into `riddle`, `strip` and `stamp`. This is how the
odd-one-out riddle selects a majority category and a stranger category without hardcoding
either.

Shipped objectives: odd-one-out, whispering books, category hunt, single hue, broken
objects, restless objects, and the compound hue-plus-category riddle.

### Objective system

Each objective is self-contained and declares its riddle text, matching logic, target
generation, optional setup and optional Boggart behaviour. Adding one requires
implementing only the objective; the generator is untouched.

### Boggart system

Boggarts are passed through the same `stamp` as legitimate targets, so they satisfy the
riddle *exactly* as well as real ones. Identification depends on behaviour, not
appearance. Each room announces the active tell in the footer:

| Tell | Behaviour |
| --- | --- |
| `twitch` | Rotates on a fast, irregular cycle |
| `shadow` | Renders a dark inner shadow instead of an outward glow |
| `hurry` | Drifts at roughly twice the ambient speed |
| `reverse` | Rotates counter to the room |

The odd-one-out objective opts out through `mimic: false`. With only one legitimate
target, mimicry would leave the player choosing blindly between identical candidates
rather than reading a tell, so its Boggarts blend into the majority instead.

### Adaptive room selection

Every selection increments an affinity counter for that object's category, whether or not
the pick was correct. When a category accounts for **at least 32%** of a minimum of
**six** selections, the next shift resolves to its matching themed room instead of a
random one:

| Dominant category | Resulting room |
| --- | --- |
| `book` | The Restricted Section |
| `potion` | The Apothecary Vault |
| `key` | The Flying Key Aviary |
| `memory` | The Pensieve Gallery |
| `quill` | The Endless Scriptorium |
| `flame` | The Hollow Hearth |
| `relic` | The Reliquary of Small Regrets |

That room then biases its own spawn pool **45%** toward the same category, closing a
feedback loop: sustained preference produces more of what the player already favours. The
end screen reports the inferred preference.

A shift simultaneously retints the ambient background, rotates the accent colour through
the entire HUD and replaces the objective, so the transition reads as one coherent event
rather than several independent animations.

### Time-Turner

Three consecutive correct selections activate the Time-Turner for six seconds:

* Object motion freezes
* Stability decay pauses
* The room timer pauses
* Score is tripled

The room timer is genuinely suspended rather than merely hidden, so the bonus window is
free time rather than time borrowed from the current room.

The distortion layer applies saturation, contrast and hue rotation but deliberately no
blur — blur read better in isolation and rendered the riddle unreadable during precisely
the window in which reading it matters most.

---

## Performance

The design goal is to keep sixty frames per second with roughly fifteen spring-animated
elements on screen.

### Cursor rendering

The custom cursor and its particle trail are isolated in a memoised component driven
entirely by Framer Motion `MotionValue`s, which write to the compositor without passing
through React. Pointer movement therefore never triggers a render of the game. Trail
particles are throttled to one every 42 ms and capped at 18, evicted by that cap rather
than by timers.

### Single animation loop

One `useAnimationFrame` callback owns the room timer, the Time-Turner countdown and
stability decay, writing to refs and motion values. React state is updated only when a
*displayed* value actually changes: stability commits when it has moved by `0.6`, roughly
once per second, rather than sixty times. The countdown ring and Time-Turner bar are
driven straight from motion values through `useTransform` and `scaleX`, so they animate
without reconciliation.

### Mutable runtime state

Frequently accessed gameplay state — phase, level, theme, affinity, combo — is mirrored
into refs. The animation loop is not a React consumer, and reading through refs avoids
stale closures, callback recreation, and a dependency list that would invalidate every
frame.

### Layered object rendering

Interactive objects are split into three nested elements handling position, idle float
animation and interaction respectively. Separating them prevents the drag gesture and the
looping float animation from competing for the same CSS `transform`.

---

## Compatibility

### Vite 8

`@vitejs/plugin-react` 4.7.0 declares peer support for Vite `^4.2 || ^5 || ^6 || ^7`. Under
Vite 8 it takes a Rolldown-specific branch that sets
`optimizeDeps.rollupOptions.jsx`, a key current Rolldown no longer accepts:

```
Warning: Invalid input options (1 issue found)
- For the "jsx". Invalid key: Expected never but received "jsx".
```

The warning is cosmetic — Vite's own oxc transform already compiles JSX with the automatic
runtime — but it fires on every dependency-optimizer run.
[vite.config.js](vite.config.js) includes a small `configResolved` plugin that removes the
obsolete key. Remove the shim once plugin-react is upgraded to a release whose peer range
includes Vite 8, or pin Vite to `^7` to remain inside the supported matrix.

### Fonts

Cinzel and Cormorant Garamond are loaded from Google Fonts and fall back to the system
serif stack when unavailable. The layout does not depend on either being present.

### Audio

The `AudioContext` is created lazily on the player's first interaction in the intro
sequence, satisfying browser autoplay policy without a separate permission prompt.

---

## Design principles

* Correctness by construction over correctness by tuning
* Data-driven objectives; new content requires no engine changes
* No reachable impossible states
* Minimal React re-rendering; animation outside the reconciliation path
* Runtime-generated assets over bundled media
* Self-contained architecture with explicit, centralised configuration

---

## License

MIT
