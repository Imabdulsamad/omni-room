import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  memo,
} from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
  useAnimationFrame,
  useAnimationControls,
} from "framer-motion";
import {
  KeyRound,
  Lock,
  Feather,
  Scroll,
  FlaskConical,
  Droplet,
  BookOpen,
  BookMarked,
  Gem,
  Star,
  Moon,
  Flame,
  Sun,
  Wand2,
  Crown,
  Bell,
  Compass,
  Skull,
  Ghost,
  Eye,
  Bug,
  Rat,
  Bone,
  CloudLightning,
  Sparkles,
  Hourglass,
  Volume2,
  VolumeX,
  RotateCcw,
  DoorOpen,
  ShieldAlert,
} from "lucide-react";

/* ------------------------------------------------------------------ *
 *  THE ROOM OF REQUIREMENT
 *  A surreal, procedural puzzle room that learns what you reach for.
 * ------------------------------------------------------------------ */

/* ---------------------------- tuning ------------------------------ */

const SHIFT_MS = 12000; // the room re-imagines itself this often
const TIME_TURNER_MS = 6000; // length of the slow-motion bonus window
const COMBO_FOR_TURNER = 3; // correct-in-a-row needed to bend time
const MAX_ROOMS = 9;
const DECAY_PER_SEC = 0.65; // ambient magic bleed
const HIT_STABILITY = 3.5;
const MISS_STABILITY = -6;
const TRAP_STABILITY = -18;

/* --------------------------- utilities ---------------------------- */

let _uid = 0;
const uid = () => `${Date.now().toString(36)}-${++_uid}`;
const rand = (min, max) => min + Math.random() * (max - min);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const range = (n) => Array.from({ length: n }, (_, i) => i);
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/* ------------------------ the room's bestiary ---------------------- */

const KINDS = [
  { id: "key", Icon: KeyRound, cat: "key" },
  { id: "lock", Icon: Lock, cat: "key" },
  { id: "quill", Icon: Feather, cat: "quill" },
  { id: "scroll", Icon: Scroll, cat: "quill" },
  { id: "potion", Icon: FlaskConical, cat: "potion" },
  { id: "essence", Icon: Droplet, cat: "potion" },
  { id: "diary", Icon: BookOpen, cat: "book" },
  { id: "grimoire", Icon: BookMarked, cat: "book" },
  { id: "orb", Icon: Gem, cat: "memory" },
  { id: "starlight", Icon: Star, cat: "memory" },
  { id: "moonshard", Icon: Moon, cat: "memory" },
  { id: "candle", Icon: Flame, cat: "flame" },
  { id: "wisp", Icon: Sun, cat: "flame" },
  { id: "wand", Icon: Wand2, cat: "relic" },
  { id: "crown", Icon: Crown, cat: "relic" },
  { id: "bell", Icon: Bell, cat: "relic" },
  { id: "compass", Icon: Compass, cat: "relic" },
];

const CATS = ["key", "quill", "potion", "book", "memory", "flame", "relic"];

const CAT_NOUN = {
  key: "key",
  quill: "quill",
  potion: "potion",
  book: "book",
  memory: "memory",
  flame: "flame",
  relic: "relic",
};

const CAT_PHRASE = {
  key: "key that opens nothing",
  quill: "quill still writing on its own",
  potion: "bottle with no label",
  book: "book that remembers your name",
  memory: "memory someone threw away",
  flame: "flame that burns without fuel",
  relic: "relic no one came back for",
};

const REVEAL_ICONS = [Skull, Ghost, Eye, Bug, Rat, Bone, CloudLightning];

const HUES = {
  gold: { hex: "#f6c453", name: "gold" },
  emerald: { hex: "#37d39b", name: "emerald" },
  violet: { hex: "#a78bfa", name: "violet" },
  crimson: { hex: "#f87171", name: "crimson" },
  frost: { hex: "#7dd3fc", name: "frost" },
};
const HUE_KEYS = Object.keys(HUES);

const kindsOf = (cat) => KINDS.filter((k) => k.cat === cat);
const kindNotOf = (cat) => pick(KINDS.filter((k) => k.cat !== cat));
const hueNot = (hue) => pick(HUE_KEYS.filter((h) => h !== hue));

/* ------------------------- rooms the room becomes ------------------ */

const THEMES = [
  {
    id: "requirement",
    name: "The Room of Requirement",
    line: "It has not decided what it is yet.",
    accent: "#f6c453",
    base: "#150e33",
    glow: "#4c2d8a",
    affinity: null,
  },
  {
    id: "restricted",
    name: "The Restricted Section",
    line: "Every spine here is watching the door.",
    accent: "#e0b64b",
    base: "#170f2b",
    glow: "#6b4a1f",
    affinity: "book",
  },
  {
    id: "apothecary",
    name: "The Apothecary Vault",
    line: "Something in the corner is still fermenting.",
    accent: "#37d39b",
    base: "#062622",
    glow: "#0b5f4a",
    affinity: "potion",
  },
  {
    id: "aviary",
    name: "The Flying Key Aviary",
    line: "A thousand wings, and one true lock.",
    accent: "#8ec5ff",
    base: "#0d1740",
    glow: "#2b4a9c",
    affinity: "key",
  },
  {
    id: "pensieve",
    name: "The Pensieve Gallery",
    line: "Do not lean too far over the basins.",
    accent: "#b3c0ff",
    base: "#0b1733",
    glow: "#2f4699",
    affinity: "memory",
  },
  {
    id: "scriptorium",
    name: "The Endless Scriptorium",
    line: "The quills are writing about you now.",
    accent: "#e6d0ff",
    base: "#22133a",
    glow: "#5b3596",
    affinity: "quill",
  },
  {
    id: "hearth",
    name: "The Hollow Hearth",
    line: "Warmth without a fire is a kind of warning.",
    accent: "#fb9a4c",
    base: "#2a1210",
    glow: "#8a3418",
    affinity: "flame",
  },
  {
    id: "reliquary",
    name: "The Reliquary of Small Regrets",
    line: "Left behind on purpose, most of them.",
    accent: "#f0a5c0",
    base: "#24102a",
    glow: "#7a2f61",
    affinity: "relic",
  },
];

const THEME_BY_AFFINITY = Object.fromEntries(
  THEMES.filter((t) => t.affinity).map((t) => [t.affinity, t])
);

/* -------------------- boggart tells (rotating rule) ---------------- */

const TELLS = [
  { id: "twitch", text: "Tonight the boggarts cannot keep still." },
  { id: "shadow", text: "Tonight the boggarts cast a shadow with no light." },
  { id: "hurry", text: "Tonight the boggarts drift too eagerly." },
  { id: "reverse", text: "Tonight the boggarts turn against the room." },
];

/* --------------------------- objectives ---------------------------- *
 * Each objective knows how to *strip* an object (guarantee it does not
 * satisfy the riddle) and how to *stamp* one (guarantee it does). That
 * makes every procedurally generated room provably solvable.
 * ------------------------------------------------------------------- */

const OBJECTIVES = [
  {
    id: "stranger",
    fixedTargets: 1,
    mimic: false, // boggarts blend in rather than impersonate the answer
    prep: () => {
      const [home, odd] = shuffle(CATS).slice(0, 2);
      return { home, odd };
    },
    riddle: (c) => `Find the ${CAT_NOUN[c.home]} that does not belong.`,
    strip: (o, c) => ({ ...o, kind: pick(kindsOf(c.home)) }),
    stamp: (o, c) => ({ ...o, kind: pick(kindsOf(c.odd)) }),
  },
  {
    id: "whisper",
    riddle: () => "Silence the books that will not stop whispering.",
    strip: (o) => ({ ...o, kind: kindNotOf("book"), whisper: false }),
    stamp: (o) => ({ ...o, kind: pick(kindsOf("book")), whisper: true }),
  },
  {
    id: "hunt",
    prep: () => ({ cat: pick(CATS) }),
    riddle: (c) => `Gather every ${CAT_PHRASE[c.cat]}.`,
    strip: (o, c) => ({ ...o, kind: kindNotOf(c.cat) }),
    stamp: (o, c) => ({ ...o, kind: pick(kindsOf(c.cat)) }),
  },
  {
    id: "hue",
    prep: () => ({ hue: pick(HUE_KEYS) }),
    riddle: (c) => `Only what burns ${HUES[c.hue].name} is true. Take it.`,
    strip: (o, c) => ({ ...o, hue: hueNot(c.hue) }),
    stamp: (o, c) => ({ ...o, hue: c.hue }),
  },
  {
    id: "cracked",
    riddle: () => "Take only what is already broken.",
    strip: (o) => ({ ...o, cracked: false }),
    stamp: (o) => ({ ...o, cracked: true }),
  },
  {
    id: "restless",
    riddle: () => "The room forgets the still. Touch only the wanderers.",
    strip: (o) => ({ ...o, restless: false }),
    stamp: (o) => ({ ...o, restless: true }),
  },
  {
    id: "both",
    minLevel: 4,
    prep: () => ({ hue: pick(HUE_KEYS), cat: pick(CATS) }),
    riddle: (c) =>
      `Nothing leaves here but the ${HUES[c.hue].name} ${CAT_NOUN[c.cat]}.`,
    strip: (o, c) =>
      Math.random() < 0.5
        ? { ...o, hue: hueNot(c.hue), kind: pick(kindsOf(c.cat)) }
        : { ...o, hue: c.hue, kind: kindNotOf(c.cat) },
    stamp: (o, c) => ({ ...o, hue: c.hue, kind: pick(kindsOf(c.cat)) }),
  },
];

/* ------------------------- round generation ------------------------ */

function makeObject(theme) {
  const biased =
    theme.affinity && Math.random() < 0.45 ? kindsOf(theme.affinity) : KINDS;
  return {
    id: uid(),
    kind: pick(biased.length ? biased : KINDS),
    hue: pick(HUE_KEYS),
    cracked: Math.random() < 0.28,
    restless: Math.random() < 0.3,
    whisper: false,
    boggart: false,
    target: false,
    scale: rand(0.86, 1.18),
    dur: rand(4, 7.5),
    delay: rand(0, 2.5),
    dir: Math.random() < 0.5 ? 1 : -1,
    amp: rand(6, 16),
    x: 50,
    y: 50,
  };
}

function scatter(objs) {
  const n = objs.length;
  const cols = Math.max(3, Math.ceil(Math.sqrt(n * 1.7)));
  const rows = Math.ceil(n / cols);
  return shuffle(objs).map((o, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const jx = (Math.random() - 0.5) * (62 / cols);
    const jy = (Math.random() - 0.5) * (58 / rows);
    return {
      ...o,
      x: clamp(((c + 0.5) / cols) * 100 + jx, 7, 93),
      y: clamp(((r + 0.5) / rows) * 100 + jy, 9, 91),
    };
  });
}

function buildRound(level, theme, previousObjectiveId) {
  const eligible = OBJECTIVES.filter(
    (o) => (o.minLevel ?? 0) <= level && o.id !== previousObjectiveId
  );
  const objective = pick(eligible.length ? eligible : OBJECTIVES);
  const ctx = objective.prep ? objective.prep(theme) : {};

  const total = clamp(9 + Math.floor(level * 0.7), 9, 15);
  const targets = objective.fixedTargets ?? clamp(3 + (level % 3), 3, 5);
  const boggarts = clamp(1 + Math.floor(level / 2), 1, 4);

  let objs = range(total).map(() => objective.strip(makeObject(theme), ctx));

  const order = shuffle(range(total));
  const targetIdx = new Set(order.slice(0, targets));
  const boggartIdx = new Set(order.slice(targets, targets + boggarts));

  objs = objs.map((o, i) => {
    if (targetIdx.has(i)) return { ...objective.stamp(o, ctx), target: true };
    if (boggartIdx.has(i)) {
      // A boggart impersonates exactly what you are looking for.
      const shape = objective.mimic === false ? o : objective.stamp(o, ctx);
      return { ...shape, boggart: true, target: false };
    }
    return o;
  });

  return {
    objectiveId: objective.id,
    riddle: objective.riddle(ctx),
    tell: pick(TELLS),
    objects: scatter(objs),
  };
}

function chooseTheme(affinity, current) {
  const entries = Object.entries(affinity).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, n]) => s + n, 0);
  if (entries.length && total >= 6) {
    const [topCat, topN] = entries[0];
    const match = THEME_BY_AFFINITY[topCat];
    if (match && match.id !== current.id && topN / total >= 0.32) return match;
  }
  return pick(THEMES.filter((t) => t.id !== current.id));
}

/* --------------------------- sound (no assets) ---------------------- */

function useMagicAudio(enabledRef) {
  const ctxRef = useRef(null);

  const ac = useCallback(() => {
    if (!enabledRef.current) return null;
    if (!ctxRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try {
        ctxRef.current = new AC();
      } catch {
        return null;
      }
    }
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }, [enabledRef]);

  const tone = useCallback(
    (freq, dur, type = "sine", gain = 0.05, slideTo = null, delay = 0) => {
      const c = ac();
      if (!c) return;
      const t0 = c.currentTime + delay;
      const osc = c.createOscillator();
      const amp = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      amp.gain.setValueAtTime(0.0001, t0);
      amp.gain.linearRampToValueAtTime(gain, t0 + 0.012);
      amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(amp);
      amp.connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.03);
    },
    [ac]
  );

  return useMemo(
    () => ({
      chime: (step = 0) => {
        const f = 523.25 * Math.pow(1.1225, Math.min(step, 8));
        tone(f, 0.5, "triangle", 0.05);
        tone(f * 2, 0.32, "sine", 0.018, null, 0.04);
      },
      thud: () => {
        tone(110, 0.5, "sawtooth", 0.07, 42);
        tone(70, 0.6, "sine", 0.05, 35);
      },
      deny: () => tone(190, 0.16, "square", 0.03, 120),
      whoosh: () => tone(340, 0.75, "sine", 0.035, 82),
      warp: () => {
        tone(196, 1.1, "sine", 0.045, 784);
        tone(392, 1.1, "triangle", 0.02, 1568, 0.05);
      },
      door: () => {
        tone(261.6, 0.9, "triangle", 0.05);
        tone(392, 0.9, "triangle", 0.04, null, 0.08);
        tone(523.25, 1.1, "sine", 0.035, null, 0.16);
      },
    }),
    [tone]
  );
}

/* ------------------------- cursor + spark trail --------------------- *
 * Isolated so pointer movement never re-renders the game itself.
 * ------------------------------------------------------------------- */

const CursorLayer = memo(function CursorLayer({ accent, charged }) {
  const mx = useMotionValue(-200);
  const my = useMotionValue(-200);
  const sx = useSpring(mx, { stiffness: 620, damping: 38, mass: 0.35 });
  const sy = useSpring(my, { stiffness: 620, damping: 38, mass: 0.35 });
  const [sparks, setSparks] = useState([]);
  const last = useRef(0);

  useEffect(() => {
    const onMove = (e) => {
      mx.set(e.clientX);
      my.set(e.clientY);
      const now = performance.now();
      if (now - last.current > 42) {
        last.current = now;
        setSparks((prev) =>
          [
            ...prev.slice(-17),
            {
              id: uid(),
              x: e.clientX + rand(-6, 6),
              y: e.clientY + rand(-6, 6),
              s: rand(3, 8),
              dx: rand(-26, 26),
              dy: rand(6, 40),
            },
          ]
        );
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [mx, my]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[90]">
      {sparks.map((s) => (
        <motion.span
          key={s.id}
          className="absolute rounded-full"
          style={{
            left: s.x,
            top: s.y,
            width: s.s,
            height: s.s,
            background: accent,
            boxShadow: `0 0 ${s.s * 2.5}px ${accent}`,
          }}
          initial={{ opacity: 0.85, scale: 1 }}
          animate={{ opacity: 0, scale: 0.2, x: s.dx, y: s.dy }}
          transition={{ duration: 0.85, ease: "easeOut" }}
        />
      ))}

      <motion.div className="absolute left-0 top-0" style={{ x: sx, y: sy }}>
        <div className="-translate-x-1/2 -translate-y-1/2">
          <motion.div
            className="relative grid h-9 w-9 place-items-center rounded-full border"
            style={{
              borderColor: accent,
              boxShadow: `0 0 18px ${accent}, inset 0 0 12px ${accent}55`,
            }}
            animate={{
              rotate: 360,
              scale: charged ? [1, 1.22, 1] : 1,
            }}
            transition={{
              rotate: { duration: 6, repeat: Infinity, ease: "linear" },
              scale: { duration: 1.1, repeat: charged ? Infinity : 0 },
            }}
          >
            <span
              className="block h-1.5 w-1.5 rounded-full"
              style={{ background: accent, boxShadow: `0 0 10px ${accent}` }}
            />
            <span
              className="absolute h-[3px] w-[3px] rounded-full"
              style={{ background: accent, top: -2, left: "50%" }}
            />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
});

/* --------------------------- floating object ------------------------ */

const FloatingObject = memo(function FloatingObject({
  obj,
  tell,
  frozen,
  fieldRef,
  onPick,
}) {
  const hue = HUES[obj.hue].hex;
  const Icon = obj.kind.Icon;
  const dragging = useRef(false);
  const RevealIcon = obj.revealIcon;

  const amp = obj.restless ? obj.amp * 2.1 : obj.amp * 0.6;
  const dur = obj.restless ? obj.dur * 0.62 : obj.dur;
  const bogHurry = obj.boggart && tell.id === "hurry";
  const bogTwitch = obj.boggart && tell.id === "twitch";
  const bogReverse = obj.boggart && tell.id === "reverse";
  const bogShadow = obj.boggart && tell.id === "shadow";

  const floatAnim = frozen
    ? { x: 0, y: 0, rotate: 0 }
    : {
        y: [0, -amp * obj.dir, 0, amp * obj.dir * 0.7, 0],
        x: [0, amp * 0.5 * obj.dir, 0, -amp * 0.4 * obj.dir, 0],
        rotate: bogTwitch
          ? [-5, 5, -4, 6, -5]
          : bogReverse
          ? [0, -10, 0, -10, 0]
          : [0, 3 * obj.dir, 0, -2.5 * obj.dir, 0],
      };

  const floatTransition = frozen
    ? { duration: 0.7, ease: "easeOut" }
    : {
        duration: bogHurry ? dur * 0.45 : dur,
        repeat: Infinity,
        ease: "easeInOut",
        delay: obj.delay,
        rotate: bogTwitch
          ? { duration: 0.32, repeat: Infinity, ease: "linear" }
          : undefined,
      };

  return (
    <motion.div
      className="absolute"
      style={{ left: `${obj.x}%`, top: `${obj.y}%`, x: "-50%", y: "-50%" }}
      initial={{ opacity: 0, scale: 0.2 }}
      animate={{ opacity: 1, scale: obj.scale }}
      exit={{ opacity: 0, scale: 0, filter: "blur(6px)" }}
      transition={{ type: "spring", stiffness: 200, damping: 18 }}
    >
      <motion.div animate={floatAnim} transition={floatTransition}>
        <motion.button
          type="button"
          drag
          dragConstraints={fieldRef}
          dragElastic={0.32}
          dragTransition={{ bounceStiffness: 260, bounceDamping: 18 }}
          onDragStart={() => {
            dragging.current = true;
          }}
          onDragEnd={() => {
            window.setTimeout(() => {
              dragging.current = false;
            }, 60);
          }}
          onClick={() => {
            if (dragging.current || obj.revealed) return;
            onPick(obj);
          }}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.86 }}
          transition={{ type: "spring", stiffness: 420, damping: 20 }}
          className="group relative grid h-14 w-14 cursor-none place-items-center rounded-2xl border backdrop-blur-[2px] sm:h-16 sm:w-16"
          style={{
            borderColor: `${hue}66`,
            background: `radial-gradient(circle at 35% 25%, ${hue}2e, rgba(8,6,18,0.72) 68%)`,
            boxShadow: obj.revealed
              ? "0 0 34px #ef4444, inset 0 0 22px #7f1d1d"
              : bogShadow
              ? `0 0 16px ${hue}44, inset 0 0 26px rgba(0,0,0,0.85)`
              : `0 0 20px ${hue}3a, inset 0 0 14px ${hue}1f`,
          }}
          aria-label={obj.kind.id}
        >
          {/* halo */}
          <motion.span
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{ boxShadow: `0 0 26px ${hue}` }}
            animate={{ opacity: frozen ? 0.5 : [0.22, 0.55, 0.22] }}
            transition={{
              duration: obj.boggart ? 1.4 : 3.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* whisper ripples */}
          {obj.whisper && !obj.revealed && (
            <>
              {[0, 0.9].map((d) => (
                <motion.span
                  key={d}
                  className="pointer-events-none absolute inset-0 rounded-full border"
                  style={{ borderColor: `${hue}88` }}
                  animate={{ scale: [0.7, 1.9], opacity: [0.55, 0] }}
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    delay: d,
                    ease: "easeOut",
                  }}
                />
              ))}
            </>
          )}

          {/* the thing itself */}
          {obj.revealed && RevealIcon ? (
            <motion.span
              initial={{ scale: 0.4, rotate: -25 }}
              animate={{ scale: 1.15, rotate: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 12 }}
            >
              <RevealIcon className="h-7 w-7 text-red-400 sm:h-8 sm:w-8" />
            </motion.span>
          ) : (
            <span className="relative">
              <Icon
                className="h-7 w-7 sm:h-8 sm:w-8"
                style={{ color: hue, filter: `drop-shadow(0 0 6px ${hue}aa)` }}
                strokeWidth={1.6}
              />
              {/* fracture overlay for "broken" things */}
              {obj.cracked && (
                <>
                  <span
                    className="pointer-events-none absolute left-1/2 top-1/2 h-9 w-[1.5px] -translate-x-1/2 -translate-y-1/2 rotate-[24deg] sm:h-10"
                    style={{
                      background: `linear-gradient(to bottom, transparent, ${hue}, transparent)`,
                    }}
                  />
                  <span
                    className="pointer-events-none absolute left-[58%] top-[38%] h-4 w-[1.5px] rotate-[-52deg]"
                    style={{
                      background: `linear-gradient(to bottom, ${hue}, transparent)`,
                    }}
                  />
                </>
              )}
            </span>
          )}

          {/* restless motes */}
          {obj.restless && !obj.revealed && (
            <motion.span
              className="pointer-events-none absolute -right-1 -top-1 h-2 w-2 rounded-full"
              style={{ background: hue, boxShadow: `0 0 8px ${hue}` }}
              animate={{ opacity: [0.2, 1, 0.2], scale: [0.7, 1.2, 0.7] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
          )}
        </motion.button>
      </motion.div>
    </motion.div>
  );
});

/* --------------------------- burst particles ------------------------ */

const Burst = memo(function Burst({ burst }) {
  const color = burst.bad ? "#f87171" : burst.color;
  return (
    <div
      className="pointer-events-none absolute z-30"
      style={{ left: `${burst.x}%`, top: `${burst.y}%` }}
    >
      <div className="-translate-x-1/2 -translate-y-1/2">
        <motion.span
          className="absolute left-0 top-0 block rounded-full border-2"
          style={{ borderColor: color, width: 20, height: 20, marginLeft: -10, marginTop: -10 }}
          initial={{ scale: 0.3, opacity: 0.9 }}
          animate={{ scale: 4.5, opacity: 0 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
        />
        {range(burst.bad ? 8 : 12).map((i, _, arr) => {
          const a = (i / arr.length) * Math.PI * 2 + rand(-0.25, 0.25);
          const d = rand(38, 96);
          return (
            <motion.span
              key={i}
              className="absolute left-0 top-0 block rounded-full"
              style={{
                width: rand(3, 7),
                height: rand(3, 7),
                background: color,
                boxShadow: `0 0 10px ${color}`,
              }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: Math.cos(a) * d,
                y: Math.sin(a) * d,
                opacity: 0,
                scale: 0.2,
              }}
              transition={{ duration: rand(0.55, 0.95), ease: "easeOut" }}
            />
          );
        })}
        {burst.label && (
          <motion.span
            className="absolute left-0 top-0 whitespace-nowrap font-display text-sm font-semibold tracking-wide"
            style={{ color, textShadow: `0 0 12px ${color}` }}
            initial={{ y: 0, opacity: 0, scale: 0.8 }}
            animate={{ y: -46, opacity: [0, 1, 1, 0], scale: 1 }}
            transition={{ duration: 1.05, ease: "easeOut" }}
          >
            {burst.label}
          </motion.span>
        )}
      </div>
    </div>
  );
});

/* ---------------------------- glitch veil --------------------------- */

function GlitchVeil({ active, accent }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[70] overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className="absolute inset-0"
            style={{ background: accent }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.22, 0.04, 0.14, 0] }}
            transition={{ duration: 0.9, times: [0, 0.12, 0.3, 0.5, 1] }}
          />
          {range(7).map((i) => (
            <motion.div
              key={i}
              className="absolute left-0 w-full mix-blend-screen"
              style={{
                top: `${rand(0, 92)}%`,
                height: rand(4, 34),
                background:
                  i % 2 ? "rgba(255,80,120,0.35)" : "rgba(80,220,255,0.32)",
              }}
              initial={{ x: 0, opacity: 0 }}
              animate={{
                x: [0, rand(-90, 90), rand(-40, 40), 0],
                opacity: [0, 1, 0.6, 0],
              }}
              transition={{ duration: rand(0.35, 0.8), delay: rand(0, 0.35) }}
            />
          ))}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to bottom, rgba(255,255,255,0.09) 0px, rgba(255,255,255,0.09) 1px, transparent 1px, transparent 4px)",
            }}
          />
          <div className="absolute inset-x-0 h-1/3 animate-scan bg-gradient-to-b from-transparent via-white/10 to-transparent" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* --------------------------- stability meter ------------------------ */

function StabilityMeter({ value, accent }) {
  const critical = value < 30;
  return (
    <div className="relative">
      <div className="mb-1 flex items-baseline justify-between font-display text-[10px] uppercase tracking-[0.28em] text-white/45 sm:text-[11px]">
        <span>Magic Stability</span>
        <motion.span
          animate={critical ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
          transition={{ duration: 0.9, repeat: critical ? Infinity : 0 }}
          style={{ color: critical ? "#f87171" : accent }}
        >
          {Math.round(value)}%
        </motion.span>
      </div>
      <div className="relative h-2.5 overflow-hidden rounded-full border border-white/10 bg-black/50">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: critical
              ? "linear-gradient(90deg,#7f1d1d,#f87171)"
              : `linear-gradient(90deg,${accent}88,${accent})`,
            boxShadow: `0 0 16px ${critical ? "#f87171" : accent}`,
          }}
          animate={{ width: `${clamp(value, 0, 100)}%` }}
          transition={{ type: "spring", stiffness: 140, damping: 22 }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to right, transparent 0 11px, rgba(0,0,0,0.55) 11px 12px)",
          }}
        />
      </div>
    </div>
  );
}

/* ---------------------------- shift dial ---------------------------- */

function ShiftDial({ progress, accent, frozen }) {
  const R = 16;
  const C = 2 * Math.PI * R;
  const offset = useTransform(progress, (p) => C * (1 - p));
  return (
    <div className="relative grid h-11 w-11 place-items-center">
      <svg viewBox="0 0 40 40" className="h-11 w-11 -rotate-90">
        <circle
          cx="20"
          cy="20"
          r={R}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="2.5"
        />
        <motion.circle
          cx="20"
          cy="20"
          r={R}
          fill="none"
          stroke={frozen ? "#f6c453" : accent}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={C}
          style={{ strokeDashoffset: offset }}
        />
      </svg>
      <Hourglass
        className="absolute h-4 w-4"
        style={{ color: frozen ? "#f6c453" : accent }}
        strokeWidth={1.8}
      />
    </div>
  );
}

/* ============================ MAIN GAME ============================= */

export default function RoomOfRequirement() {
  /* ------------------------------ state ---------------------------- */
  const [phase, setPhase] = useState("intro"); // intro | playing | lost | won
  const [paces, setPaces] = useState(0);
  const [theme, setTheme] = useState(THEMES[0]);
  const [round, setRound] = useState(() => ({
    objectiveId: null,
    riddle: "",
    tell: TELLS[0],
  }));
  const [objects, setObjects] = useState([]);
  const [bursts, setBursts] = useState([]);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [stability, setStability] = useState(100);
  const [shifting, setShifting] = useState(false);
  const [ttActive, setTtActive] = useState(false);
  const [warning, setWarning] = useState(null);
  const [banner, setBanner] = useState(null);
  const [affinity, setAffinity] = useState({});
  const [soundOn, setSoundOn] = useState(true);

  /* ------------------------------- refs ---------------------------- */
  const fieldRef = useRef(null);
  const objectsRef = useRef([]);
  const phaseRef = useRef(phase);
  const shiftingRef = useRef(false);
  const ttRef = useRef(false);
  const ttLeft = useRef(0);
  const roomClock = useRef(0);
  const stabRef = useRef(100);
  const stabShown = useRef(100);
  const levelRef = useRef(1);
  const themeRef = useRef(THEMES[0]);
  const objectiveRef = useRef(null);
  const affinityRef = useRef({});
  const comboRef = useRef(0);
  const soundRef = useRef(true);
  const timers = useRef([]);

  const shiftProgress = useMotionValue(0);
  const ttProgress = useMotionValue(0);
  const shake = useAnimationControls();

  const audio = useMagicAudio(soundRef);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    soundRef.current = soundOn;
  }, [soundOn]);
  useEffect(() => {
    objectsRef.current = objects;
  }, [objects]);

  const later = useCallback((fn, ms) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  }, []);

  useEffect(
    () => () => {
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
    },
    []
  );

  /* --------------------------- lifecycle --------------------------- */

  const endGame = useCallback(
    (result) => {
      phaseRef.current = result;
      setPhase(result);
      setObjects([]);
      ttRef.current = false;
      setTtActive(false);
      shiftingRef.current = false;
      setShifting(false);
      if (result === "won") audio.door();
      else audio.thud();
    },
    [audio]
  );

  const loadRound = useCallback((nextLevel, nextTheme) => {
    const r = buildRound(nextLevel, nextTheme, objectiveRef.current);
    objectiveRef.current = r.objectiveId;
    levelRef.current = nextLevel;
    themeRef.current = nextTheme;
    roomClock.current = 0;
    shiftProgress.set(0);
    setLevel(nextLevel);
    setTheme(nextTheme);
    setRound({ objectiveId: r.objectiveId, riddle: r.riddle, tell: r.tell });
    setObjects(r.objects);
  }, [shiftProgress]);

  const doShift = useCallback(
    (reason = "time") => {
      if (shiftingRef.current || phaseRef.current !== "playing") return;
      shiftingRef.current = true;
      setShifting(true);
      audio.whoosh();

      later(() => {
        if (phaseRef.current !== "playing") return;
        const next = levelRef.current + 1;
        if (next > MAX_ROOMS) {
          endGame("won");
          return;
        }
        loadRound(next, chooseTheme(affinityRef.current, themeRef.current));
      }, 430);

      later(() => {
        shiftingRef.current = false;
        setShifting(false);
        setBanner(null);
      }, 950);
    },
    [audio, endGame, later, loadRound]
  );

  const startGame = useCallback(() => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    objectiveRef.current = null;
    levelRef.current = 1;
    themeRef.current = THEMES[0];
    affinityRef.current = {};
    comboRef.current = 0;
    stabRef.current = 100;
    stabShown.current = 100;
    roomClock.current = 0;
    ttLeft.current = 0;
    ttRef.current = false;
    shiftingRef.current = false;
    shiftProgress.set(0);
    ttProgress.set(0);

    setAffinity({});
    setCombo(0);
    setBestCombo(0);
    setScore(0);
    setStability(100);
    setTtActive(false);
    setShifting(false);
    setWarning(null);
    setBanner(null);
    setBursts([]);
    setPhase("playing");
    phaseRef.current = "playing";
    loadRound(1, THEMES[0]);
    audio.door();
  }, [audio, loadRound, shiftProgress, ttProgress]);

  /* ------------------------- master clock -------------------------- */

  const tick = useCallback(
    (_, delta) => {
      if (phaseRef.current !== "playing") return;
      const dt = Math.min(delta, 60);

      // Time-Turner freezes the room's clock and its slow bleed of magic.
      if (ttRef.current) {
        ttLeft.current -= dt;
        ttProgress.set(clamp(ttLeft.current / TIME_TURNER_MS, 0, 1));
        if (ttLeft.current <= 0) {
          ttRef.current = false;
          setTtActive(false);
        }
        return;
      }

      if (shiftingRef.current) return;

      roomClock.current += dt;
      shiftProgress.set(clamp(roomClock.current / SHIFT_MS, 0, 1));
      if (roomClock.current >= SHIFT_MS) {
        roomClock.current = 0;
        doShift("time");
        return;
      }

      stabRef.current -= (DECAY_PER_SEC * dt) / 1000;
      if (stabRef.current <= 0) {
        stabRef.current = 0;
        setStability(0);
        endGame("lost");
        return;
      }
      if (Math.abs(stabRef.current - stabShown.current) >= 0.6) {
        stabShown.current = stabRef.current;
        setStability(stabRef.current);
      }
    },
    [doShift, endGame, shiftProgress, ttProgress]
  );

  useAnimationFrame(tick);

  /* ---------------------------- helpers ---------------------------- */

  const nudgeStability = useCallback(
    (amount) => {
      const next = clamp(stabRef.current + amount, 0, 100);
      stabRef.current = next;
      stabShown.current = next;
      setStability(next);
      if (next <= 0) endGame("lost");
    },
    [endGame]
  );

  const addBurst = useCallback(
    (burst) => {
      const b = { ...burst, id: uid() };
      setBursts((prev) => [...prev.slice(-8), b]);
      later(() => setBursts((prev) => prev.filter((x) => x.id !== b.id)), 1200);
    },
    [later]
  );

  const shakeRoom = useCallback(
    (strength = 1) => {
      shake.start({
        x: [0, -12 * strength, 9 * strength, -6 * strength, 3 * strength, 0],
        y: [0, 5 * strength, -4 * strength, 2 * strength, 0, 0],
        transition: { duration: 0.42, ease: "easeOut" },
      });
    },
    [shake]
  );

  /* --------------------------- interaction -------------------------- */

  const handlePick = useCallback(
    (obj) => {
      if (phaseRef.current !== "playing" || shiftingRef.current) return;

      // the room remembers what you keep reaching for
      const cat = obj.kind.cat;
      affinityRef.current = {
        ...affinityRef.current,
        [cat]: (affinityRef.current[cat] ?? 0) + 1,
      };
      setAffinity(affinityRef.current);

      /* ---- boggart: it was wearing the answer's face ---- */
      if (obj.boggart) {
        const revealIcon = pick(REVEAL_ICONS);
        setObjects((prev) =>
          prev.map((o) =>
            o.id === obj.id ? { ...o, revealed: true, revealIcon } : o
          )
        );
        later(
          () => setObjects((prev) => prev.filter((o) => o.id !== obj.id)),
          620
        );
        comboRef.current = 0;
        setCombo(0);
        nudgeStability(TRAP_STABILITY);
        setScore((s) => Math.max(0, s - 50));
        addBurst({ x: obj.x, y: obj.y, bad: true, label: "BOGGART!" });
        setWarning("A boggart wore the answer's face.");
        later(() => setWarning(null), 1300);
        shakeRoom(1);
        audio.thud();
        return;
      }

      /* ---- wrong, but honest ---- */
      if (!obj.target) {
        comboRef.current = 0;
        setCombo(0);
        nudgeStability(MISS_STABILITY);
        addBurst({
          x: obj.x,
          y: obj.y,
          bad: true,
          color: "#f87171",
          label: "the room disagrees",
        });
        shakeRoom(0.4);
        audio.deny();
        return;
      }

      /* ---- correct ---- */
      const nextCombo = comboRef.current + 1;
      comboRef.current = nextCombo;
      setCombo(nextCombo);
      setBestCombo((b) => Math.max(b, nextCombo));

      const gained = Math.round(
        100 * (1 + (nextCombo - 1) * 0.25) * (ttRef.current ? 3 : 1)
      );
      setScore((s) => s + gained);
      nudgeStability(HIT_STABILITY);
      addBurst({
        x: obj.x,
        y: obj.y,
        color: HUES[obj.hue].hex,
        label: `+${gained}`,
      });
      audio.chime(nextCombo - 1);

      const remaining = objectsRef.current.filter(
        (o) => o.target && o.id !== obj.id
      ).length;
      setObjects((prev) => prev.filter((o) => o.id !== obj.id));

      /* ---- three in a row bends time ---- */
      if (nextCombo % COMBO_FOR_TURNER === 0 && !ttRef.current) {
        ttRef.current = true;
        ttLeft.current = TIME_TURNER_MS;
        ttProgress.set(1);
        setTtActive(true);
        setBanner("The Time-Turner catches. Everything holds still.");
        later(() => setBanner(null), 2200);
        audio.warp();
      }

      /* ---- riddle solved: the room approves and re-imagines itself ---- */
      if (remaining === 0) {
        setScore((s) => s + 500);
        setBanner("The room approves. It becomes something else.");
        later(() => doShift("solved"), 700);
      }
    },
    [addBurst, audio, doShift, later, nudgeStability, shakeRoom, ttProgress]
  );

  /* --------------------------- derived ----------------------------- */

  const targetsLeft = objects.filter((o) => o.target).length;
  const accent = theme.accent;

  const dominant = useMemo(() => {
    const entries = Object.entries(affinity).sort((a, b) => b[1] - a[1]);
    return entries.length ? entries[0] : null;
  }, [affinity]);

  const affinityTotal = useMemo(
    () => Object.values(affinity).reduce((s, n) => s + n, 0),
    [affinity]
  );

  /* --------------------------- keyboard ---------------------------- */

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "m" || e.key === "M") setSoundOn((s) => !s);
      if (e.key === "Enter" && (phase === "lost" || phase === "won")) {
        startGame();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, startGame]);

  /* ----------------------------- render ---------------------------- */

  return (
    <div
      className="relative h-[100dvh] w-full cursor-none select-none overflow-hidden font-body text-white"
      style={{ background: theme.base }}
    >
      {/* ---------- ambient background, retinted on every shift ---------- */}
      <motion.div
        className="absolute inset-0"
        initial={false}
        animate={{ backgroundColor: theme.base }}
        transition={{ duration: 0.9 }}
      />
      <div
        className="absolute inset-0 transition-[background] duration-700"
        style={{
          backgroundImage: `radial-gradient(ellipse 70% 55% at 50% 8%, ${theme.glow}88, transparent 70%),
                            radial-gradient(ellipse 60% 50% at 12% 92%, ${theme.accent}22, transparent 70%),
                            radial-gradient(ellipse 55% 45% at 88% 85%, ${theme.glow}55, transparent 70%)`,
        }}
      />
      {/* slow rotating rune circles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.13]">
        <div
          className="absolute left-1/2 top-1/2 h-[130vmin] w-[130vmin] -translate-x-1/2 -translate-y-1/2 animate-spin-slow rounded-full border-2 border-dashed"
          style={{ borderColor: accent }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-[88vmin] w-[88vmin] -translate-x-1/2 -translate-y-1/2 animate-spin-reverse rounded-full border"
          style={{ borderColor: accent }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-[52vmin] w-[52vmin] -translate-x-1/2 -translate-y-1/2 animate-spin-slow rounded-full border border-dotted"
          style={{ borderColor: accent }}
        />
      </div>
      {/* vignette + grain */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.82)_100%)]" />

      {/* -------------------- time-turner distortion -------------------- */}
      <AnimatePresence>
        {ttActive && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-[60]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div
              className="absolute inset-0 backdrop-saturate-[1.8] backdrop-contrast-[1.06] backdrop-hue-rotate-15"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(246,196,83,0.10) 0%, rgba(246,196,83,0.02) 45%, rgba(60,20,0,0.42) 100%)",
              }}
            />
            {range(3).map((i) => (
              <motion.div
                key={i}
                className="absolute left-1/2 top-1/2 rounded-full border"
                style={{
                  width: `${34 + i * 22}vmin`,
                  height: `${34 + i * 22}vmin`,
                  marginLeft: `-${(34 + i * 22) / 2}vmin`,
                  marginTop: `-${(34 + i * 22) / 2}vmin`,
                  borderColor: "rgba(246,196,83,0.30)",
                }}
                animate={{ rotate: i % 2 ? -360 : 360, opacity: [0.3, 0.7, 0.3] }}
                transition={{
                  rotate: { duration: 9 + i * 5, repeat: Infinity, ease: "linear" },
                  opacity: { duration: 2.4, repeat: Infinity },
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------- danger flash ------------------------- */}
      <AnimatePresence>
        {warning && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-[65]"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.4, 0.9, 0.2] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 40%, rgba(190,18,60,0.55) 100%)",
            }}
          />
        )}
      </AnimatePresence>

      <GlitchVeil active={shifting} accent={accent} />

      {/* ============================ HUD =========================== */}
      <motion.div
        animate={shake}
        className="relative z-40 flex h-full flex-col px-3 py-3 sm:px-6 sm:py-5"
      >
        {phase === "playing" && (
          <>
            {/* ------------------------- top bar ------------------------ */}
            <header className="shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-display text-[10px] uppercase tracking-[0.3em] text-white/40 sm:text-[11px]">
                    Room {level} of {MAX_ROOMS}
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.h1
                      key={theme.id + level}
                      initial={{ opacity: 0, y: -8, filter: "blur(6px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: 8, filter: "blur(6px)" }}
                      transition={{ duration: 0.45 }}
                      className="truncate font-display text-base font-semibold tracking-wide sm:text-xl"
                      style={{ color: accent, textShadow: `0 0 22px ${accent}77` }}
                    >
                      {theme.name}
                    </motion.h1>
                  </AnimatePresence>
                </div>

                <div className="flex shrink-0 items-center gap-3 sm:gap-5">
                  <div className="text-right">
                    <div className="font-display text-[10px] uppercase tracking-[0.28em] text-white/40">
                      Score
                    </div>
                    <motion.div
                      key={score}
                      initial={{ scale: 1.25, color: accent }}
                      animate={{ scale: 1, color: "#ffffff" }}
                      transition={{ duration: 0.3 }}
                      className="font-display text-lg font-semibold tabular-nums sm:text-2xl"
                    >
                      {score.toLocaleString()}
                    </motion.div>
                  </div>

                  <div className="text-right">
                    <div className="font-display text-[10px] uppercase tracking-[0.28em] text-white/40">
                      Chain
                    </div>
                    <div
                      className="font-display text-lg font-semibold tabular-nums sm:text-2xl"
                      style={{
                        color: combo >= COMBO_FOR_TURNER ? "#f6c453" : "#ffffff",
                        textShadow:
                          combo >= COMBO_FOR_TURNER ? "0 0 16px #f6c453" : "none",
                      }}
                    >
                      ×{combo}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSoundOn((s) => !s)}
                    className="grid h-9 w-9 cursor-none place-items-center rounded-lg border border-white/15 bg-black/30 text-white/60 transition hover:border-white/40 hover:text-white"
                    aria-label={soundOn ? "Mute" : "Unmute"}
                  >
                    {soundOn ? (
                      <Volume2 className="h-4 w-4" />
                    ) : (
                      <VolumeX className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* --------------------- the riddle --------------------- */}
              <div className="mt-2.5 flex items-center gap-3">
                <Sparkles
                  className="hidden h-4 w-4 shrink-0 animate-flicker sm:block"
                  style={{ color: accent }}
                />
                <AnimatePresence mode="wait">
                  <motion.p
                    key={round.riddle}
                    initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -10, filter: "blur(8px)" }}
                    transition={{ duration: 0.5 }}
                    className="flex-1 font-display text-[13px] italic leading-snug tracking-wide text-white/90 sm:text-lg"
                  >
                    “{round.riddle}”
                  </motion.p>
                </AnimatePresence>
                <div
                  className="shrink-0 rounded-full border px-2.5 py-1 font-display text-[10px] tabular-nums tracking-widest sm:text-xs"
                  style={{
                    borderColor: `${accent}55`,
                    color: accent,
                    background: `${accent}12`,
                  }}
                >
                  {targetsLeft} LEFT
                </div>
              </div>

              <div className="mt-2.5">
                <StabilityMeter value={stability} accent={accent} />
              </div>
            </header>

            {/* ------------------------ play field ---------------------- */}
            <main
              ref={fieldRef}
              className="relative my-2 min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/[0.07] bg-black/15"
            >
              <AnimatePresence>
                {objects.map((o) => (
                  <FloatingObject
                    key={o.id}
                    obj={o}
                    tell={round.tell}
                    frozen={ttActive}
                    fieldRef={fieldRef}
                    onPick={handlePick}
                  />
                ))}
              </AnimatePresence>

              {bursts.map((b) => (
                <Burst key={b.id} burst={b} />
              ))}

              {/* centred banner */}
              <AnimatePresence>
                {banner && (
                  <motion.div
                    className="pointer-events-none absolute inset-x-0 top-1/2 z-40 -translate-y-1/2 px-4 text-center"
                    initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                    transition={{ duration: 0.4 }}
                  >
                    <span
                      className="font-display text-lg tracking-wide sm:text-2xl"
                      style={{ color: "#f6c453", textShadow: "0 0 26px #f6c45399" }}
                    >
                      {banner}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* boggart warning */}
              <AnimatePresence>
                {warning && (
                  <motion.div
                    className="pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-center px-4"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 14 }}
                  >
                    <span className="flex items-center gap-2 rounded-full border border-red-400/50 bg-red-950/70 px-4 py-1.5 font-display text-xs tracking-wide text-red-200 sm:text-sm">
                      <ShieldAlert className="h-4 w-4" />
                      {warning}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* time-turner countdown */}
              <AnimatePresence>
                {ttActive && (
                  <motion.div
                    className="pointer-events-none absolute inset-x-0 top-3 z-40 flex justify-center"
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                  >
                    <div className="rounded-full border border-amber-300/50 bg-black/60 px-4 py-1.5">
                      <div className="flex items-center gap-2 font-display text-[11px] tracking-[0.22em] text-amber-200 sm:text-xs">
                        <Hourglass className="h-3.5 w-3.5 animate-spin-slow" />
                        TIME-TURNER · TRIPLE SCORE
                      </div>
                      <div className="mt-1 h-1 w-40 overflow-hidden rounded-full bg-amber-950/80 sm:w-52">
                        <motion.div
                          className="h-full rounded-full bg-amber-300 shadow-[0_0_10px_#fcd34d]"
                          style={{ scaleX: ttProgress, originX: 0 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </main>

            {/* -------------------------- footer ------------------------ */}
            <footer className="flex shrink-0 items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-[10px] uppercase tracking-[0.24em] text-white/35 sm:text-[11px]">
                  {round.tell.text}
                </div>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-white/45 sm:text-xs">
                  <span className="hidden sm:inline">The room is learning:</span>
                  {dominant && affinityTotal >= 3 ? (
                    <span className="flex items-center gap-1.5">
                      <span style={{ color: accent }}>
                        {CAT_NOUN[dominant[0]]}s
                      </span>
                      <span className="flex gap-0.5">
                        {range(5).map((i) => (
                          <span
                            key={i}
                            className="h-1.5 w-1.5 rounded-full"
                            style={{
                              background:
                                i < Math.min(5, dominant[1])
                                  ? accent
                                  : "rgba(255,255,255,0.15)",
                              boxShadow:
                                i < Math.min(5, dominant[1])
                                  ? `0 0 6px ${accent}`
                                  : "none",
                            }}
                          />
                        ))}
                      </span>
                    </span>
                  ) : (
                    <span className="italic text-white/30">nothing, yet</span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <div className="hidden text-right font-display text-[10px] uppercase tracking-[0.24em] text-white/35 sm:block">
                  next shift
                </div>
                <ShiftDial
                  progress={shiftProgress}
                  accent={accent}
                  frozen={ttActive}
                />
              </div>
            </footer>
          </>
        )}
      </motion.div>

      {/* ============================ INTRO ========================== */}
      <AnimatePresence>
        {phase === "intro" && (
          <motion.div
            className="absolute inset-0 z-[80] grid place-items-center px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(14px)" }}
            transition={{ duration: 0.6 }}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-lg text-center">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.7 }}
              >
                <div
                  className="mb-3 font-display text-[11px] uppercase tracking-[0.4em]"
                  style={{ color: THEMES[0].accent }}
                >
                  Seventh Floor · Left of the Tapestry
                </div>
                <h1
                  className="font-display text-3xl font-bold leading-tight tracking-wide sm:text-5xl"
                  style={{ textShadow: `0 0 40px ${THEMES[0].accent}66` }}
                >
                  The Room of
                  <br />
                  Requirement
                </h1>
                <p className="mx-auto mt-4 max-w-md text-[15px] italic leading-relaxed text-white/60 sm:text-base">
                  It becomes whatever you need — and it decides what you need by
                  watching what you reach for. Answer its riddles. Distrust the
                  things that look exactly right.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="mt-9"
              >
                <div className="mb-4 font-display text-[11px] uppercase tracking-[0.3em] text-white/45">
                  {paces < 3
                    ? `Pace before the wall — ${3 - paces} more`
                    : "The door has appeared"}
                </div>

                <div className="mb-6 flex justify-center gap-3">
                  {range(3).map((i) => (
                    <motion.span
                      key={i}
                      className="h-2.5 w-10 rounded-full border"
                      style={{
                        borderColor: `${THEMES[0].accent}55`,
                        background:
                          i < paces ? THEMES[0].accent : "transparent",
                        boxShadow:
                          i < paces ? `0 0 14px ${THEMES[0].accent}` : "none",
                      }}
                      animate={i < paces ? { scaleX: [1.15, 1] } : {}}
                    />
                  ))}
                </div>

                {paces < 3 ? (
                  <motion.button
                    type="button"
                    onClick={() => {
                      setPaces((p) => p + 1);
                      audio.whoosh();
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.94 }}
                    className="cursor-none rounded-xl border px-8 py-3 font-display text-sm uppercase tracking-[0.25em] text-white/85 transition-colors"
                    style={{
                      borderColor: `${THEMES[0].accent}66`,
                      background: `${THEMES[0].accent}14`,
                    }}
                  >
                    Pace
                  </motion.button>
                ) : (
                  <motion.button
                    type="button"
                    onClick={startGame}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                    className="mx-auto flex cursor-none items-center gap-3 rounded-xl border px-9 py-3.5 font-display text-sm uppercase tracking-[0.25em]"
                    style={{
                      borderColor: THEMES[0].accent,
                      color: THEMES[0].accent,
                      background: `${THEMES[0].accent}1f`,
                      boxShadow: `0 0 40px ${THEMES[0].accent}55`,
                    }}
                  >
                    <DoorOpen className="h-5 w-5" />
                    Enter
                  </motion.button>
                )}

                <div className="mt-7 text-[11px] leading-relaxed text-white/35">
                  Click the things the riddle asks for · three in a row bends
                  time
                  <br />
                  The room re-imagines itself every 12 seconds · press M to mute
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================== END SCREENS ====================== */}
      <AnimatePresence>
        {(phase === "won" || phase === "lost") && (
          <motion.div
            className="absolute inset-0 z-[80] grid place-items-center px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="absolute inset-0 bg-black/72 backdrop-blur-md" />
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 120, damping: 18 }}
              className="relative w-full max-w-md rounded-2xl border p-7 text-center sm:p-9"
              style={{
                borderColor: phase === "won" ? `${accent}66` : "#7f1d1d",
                background: "rgba(8,6,18,0.8)",
                boxShadow: `0 0 60px ${phase === "won" ? `${accent}33` : "#7f1d1d55"}`,
              }}
            >
              <div className="mb-2 font-display text-[11px] uppercase tracking-[0.35em] text-white/40">
                {phase === "won" ? "The door opens" : "The room unmade itself"}
              </div>
              <h2
                className="font-display text-2xl font-bold tracking-wide sm:text-3xl"
                style={{ color: phase === "won" ? accent : "#f87171" }}
              >
                {phase === "won"
                  ? "You found what you required"
                  : "Magic Stability Lost"}
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-sm italic leading-relaxed text-white/55">
                {phase === "won"
                  ? "Nine rooms answered you, and the last one let you leave."
                  : "The walls forgot their shape, and then they forgot you were standing in them."}
              </p>

              <div className="my-6 grid grid-cols-3 gap-3">
                {[
                  ["Score", score.toLocaleString()],
                  ["Rooms", `${clamp(level, 1, MAX_ROOMS)}/${MAX_ROOMS}`],
                  ["Best chain", `×${bestCombo}`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-2 py-3"
                  >
                    <div className="font-display text-[9px] uppercase tracking-[0.2em] text-white/35">
                      {label}
                    </div>
                    <div className="mt-1 font-display text-lg font-semibold tabular-nums sm:text-xl">
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              {dominant && (
                <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div className="font-display text-[9px] uppercase tracking-[0.24em] text-white/35">
                    The room decided you required
                  </div>
                  <div
                    className="mt-1 font-display text-sm tracking-wide sm:text-base"
                    style={{ color: accent }}
                  >
                    {THEME_BY_AFFINITY[dominant[0]]?.name ??
                      `${CAT_NOUN[dominant[0]]}s, mostly`}
                  </div>
                </div>
              )}

              <motion.button
                type="button"
                onClick={startGame}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
                className="mx-auto flex cursor-none items-center gap-2.5 rounded-xl border px-7 py-3 font-display text-xs uppercase tracking-[0.25em]"
                style={{
                  borderColor: accent,
                  color: accent,
                  background: `${accent}1a`,
                  boxShadow: `0 0 30px ${accent}44`,
                }}
              >
                <RotateCcw className="h-4 w-4" />
                Pace again
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CursorLayer accent={accent} charged={ttActive} />
    </div>
  );
}
