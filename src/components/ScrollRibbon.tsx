import { useRef, useEffect, useState, useMemo } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValueEvent,
} from "framer-motion";

/* ─── Shape SVG paths (centered at 0,0) ───────────────── */
const SHAPE_PATHS = {
  star: "M0,-12 L2.9,-4.1 L11.4,-3.7 L4.8,1.5 L7.1,9.7 L0,5 L-7.1,9.7 L-4.8,1.5 L-11.4,-3.7 L-2.9,-4.1 Z",
  diamond: "M0,-14 L14,0 L0,14 L-14,0 Z",
  hexagon: "M0,-13 L11.3,-6.5 L11.3,6.5 L0,13 L-11.3,6.5 L-11.3,-6.5 Z",
  triangle: "M0,-14 L14,10 L-14,10 Z",
  cross: "M-4,-14 L4,-14 L4,-4 L14,-4 L14,4 L4,4 L4,14 L-4,14 L-4,4 L-14,4 L-14,-4 L-4,-4 Z",
};

type ShapeKey = keyof typeof SHAPE_PATHS;

/* ─── Waypoint config: where shapes appear along ribbon ── */
const WAYPOINTS: { at: number; shape: ShapeKey; fill: string }[] = [
  { at: 0.14, shape: "star", fill: "#818cf8" },
  { at: 0.32, shape: "diamond", fill: "#a78bfa" },
  { at: 0.50, shape: "hexagon", fill: "#c084fc" },
  { at: 0.68, shape: "triangle", fill: "#e879f9" },
  { at: 0.86, shape: "cross", fill: "#f472b6" },
];

/* ═══════════════════════════════════════════════════════════
   SCROLL RIBBON
   A scroll-driven SVG ribbon that unfolds as the user scrolls,
   does a playful loop, and reveals geometric shapes at waypoints.
   ═══════════════════════════════════════════════════════════ */

export const ScrollRibbon = () => {
  /* ── Refs ──────────────────────────────────────────── */
  const pathRef = useRef<SVGPathElement>(null);
  const tipCore = useRef<SVGCircleElement>(null);
  const tipGlow = useRef<SVGCircleElement>(null);
  const tipHalo = useRef<SVGCircleElement>(null);

  /* ── State ─────────────────────────────────────────── */
  const [len, setLen] = useState(0);
  const [dims, setDims] = useState({
    w: typeof window !== "undefined" ? window.innerWidth : 1440,
    h: 5800,
  });
  const [activeWps, setActiveWps] = useState(() => WAYPOINTS.map(() => false));
  const activeRef = useRef(WAYPOINTS.map(() => false));

  /* ── Scroll tracking with spring physics ───────────── */
  const { scrollYProgress } = useScroll();
  const smooth = useSpring(scrollYProgress, {
    stiffness: 50,
    damping: 20,
    restDelta: 0.001,
  });

  /* ── Measure page dimensions ───────────────────────── */
  useEffect(() => {
    const update = () => {
      setDims({
        w: window.innerWidth,
        h: document.documentElement.scrollHeight,
      });
    };
    update();
    // Re-measure on resize and after images/fonts load
    const ro = new ResizeObserver(update);
    ro.observe(document.documentElement);
    window.addEventListener("resize", update);
    // Delayed re-measure to catch layout shifts
    const t = setTimeout(update, 1500);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
      clearTimeout(t);
    };
  }, []);

  /* ── Generate the ribbon path ──────────────────────── */
  const d = useMemo(() => {
    const { w, h } = dims;
    const f = (n: number) => n.toFixed(1);

    return [
      // ── Start: center, just below hero ──
      `M ${f(w * 0.5)},${f(h * 0.145)}`,

      // ── Graceful swoop to the right ──
      `C ${f(w * 0.68)},${f(h * 0.18)} ${f(w * 0.84)},${f(h * 0.22)} ${f(w * 0.74)},${f(h * 0.26)}`,

      // ── Swing left with wide arc ──
      `S ${f(w * 0.18)},${f(h * 0.32)} ${f(w * 0.26)},${f(h * 0.36)}`,

      // ── THE PLAYFUL LOOP (corkscrew / figure-8) ──
      `C ${f(w * 0.36)},${f(h * 0.38)} ${f(w * 0.52)},${f(h * 0.365)} ${f(w * 0.56)},${f(h * 0.385)}`,
      `C ${f(w * 0.62)},${f(h * 0.405)} ${f(w * 0.54)},${f(h * 0.435)} ${f(w * 0.46)},${f(h * 0.42)}`,
      `C ${f(w * 0.38)},${f(h * 0.41)} ${f(w * 0.34)},${f(h * 0.445)} ${f(w * 0.44)},${f(h * 0.47)}`,

      // ── Resume flowing right ──
      `S ${f(w * 0.80)},${f(h * 0.51)} ${f(w * 0.73)},${f(h * 0.55)}`,

      // ── Wide S-curve through the middle ──
      `C ${f(w * 0.52)},${f(h * 0.59)} ${f(w * 0.20)},${f(h * 0.63)} ${f(w * 0.30)},${f(h * 0.67)}`,

      // ── Sweep right again ──
      `S ${f(w * 0.78)},${f(h * 0.71)} ${f(w * 0.68)},${f(h * 0.75)}`,

      // ── Gentle left curve ──
      `C ${f(w * 0.50)},${f(h * 0.79)} ${f(w * 0.28)},${f(h * 0.82)} ${f(w * 0.36)},${f(h * 0.86)}`,

      // ── Converge to center at bottom ──
      `S ${f(w * 0.62)},${f(h * 0.89)} ${f(w * 0.50)},${f(h * 0.92)}`,
    ].join(" ");
  }, [dims]);

  /* ── Measure path length after path updates ────────── */
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (pathRef.current) {
        setLen(pathRef.current.getTotalLength());
      }
    });
    return () => cancelAnimationFrame(id);
  }, [d]);

  /* ── Compute waypoint pixel positions ──────────────── */
  const wpPos = useMemo(() => {
    if (!pathRef.current || !len) return null;
    return WAYPOINTS.map((wp) => {
      const pt = pathRef.current!.getPointAtLength(wp.at * len);
      return { x: pt.x, y: pt.y };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [len]);

  /* ── Scroll handler: move tip + activate waypoints ─── */
  useMotionValueEvent(smooth, "change", (v) => {
    if (!pathRef.current || !len) return;

    // Move the tip along the path (direct DOM — no React re-render)
    const pt = pathRef.current.getPointAtLength(v * len);
    const sx = pt.x.toFixed(1);
    const sy = pt.y.toFixed(1);
    tipCore.current?.setAttribute("cx", sx);
    tipCore.current?.setAttribute("cy", sy);
    tipGlow.current?.setAttribute("cx", sx);
    tipGlow.current?.setAttribute("cy", sy);
    tipHalo.current?.setAttribute("cx", sx);
    tipHalo.current?.setAttribute("cy", sy);

    // Activate waypoint shapes when the ribbon reaches them
    let dirty = false;
    WAYPOINTS.forEach((wp, i) => {
      if (v >= wp.at - 0.015 && !activeRef.current[i]) {
        activeRef.current[i] = true;
        dirty = true;
      }
    });
    if (dirty) setActiveWps([...activeRef.current]);
  });

  /* ── Dash offset driven by scroll ──────────────────── */
  const offset = useTransform(smooth, [0, 1], [len, 0]);

  /* ── Initial tip position (path start) ─────────────── */
  const sx = dims.w * 0.5;
  const sy = dims.h * 0.145;

  /* ── Render ────────────────────────────────────────── */
  return (
    <div
      className="absolute inset-0 pointer-events-none hidden md:block"
      style={{ zIndex: 20 }}
      aria-hidden="true"
    >
      <svg
        className="absolute top-0 left-0 w-full"
        style={{ height: dims.h }}
        viewBox={`0 0 ${dims.w} ${dims.h}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradient along the ribbon */}
          <linearGradient id="rbn-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="30%" stopColor="#a78bfa" />
            <stop offset="60%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>

          {/* Blur filters */}
          <filter id="rbn-blur-lg">
            <feGaussianBlur stdDeviation="18" />
          </filter>
          <filter id="rbn-blur-md">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <filter id="rbn-tip-glow">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Main path (always rendered for ref measurement) ── */}
        <motion.path
          ref={pathRef}
          d={d}
          stroke="url(#rbn-grad)"
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
          opacity={len > 0 ? 0.3 : 0}
          strokeDasharray={len || undefined}
          style={len > 0 ? { strokeDashoffset: offset } : undefined}
        />

        {len > 0 && (
          <>
            {/* ── Layer 1: Wide ambient glow ── */}
            <motion.path
              d={d}
              stroke="url(#rbn-grad)"
              strokeWidth={34}
              strokeLinecap="round"
              fill="none"
              opacity={0.04}
              filter="url(#rbn-blur-lg)"
              strokeDasharray={len}
              style={{ strokeDashoffset: offset }}
            />

            {/* ── Layer 2: Tight glow ── */}
            <motion.path
              d={d}
              stroke="url(#rbn-grad)"
              strokeWidth={10}
              strokeLinecap="round"
              fill="none"
              opacity={0.08}
              filter="url(#rbn-blur-md)"
              strokeDasharray={len}
              style={{ strokeDashoffset: offset }}
            />

            {/* ── Waypoint shapes ── */}
            {wpPos?.map((pos, i) => (
              <g
                key={i}
                transform={`translate(${pos.x.toFixed(1)},${pos.y.toFixed(1)})`}
              >
                <motion.g
                  initial={{ scale: 0, opacity: 0, rotate: -60 }}
                  animate={
                    activeWps[i]
                      ? { scale: 1, opacity: 1, rotate: 0 }
                      : { scale: 0, opacity: 0, rotate: -60 }
                  }
                  transition={{
                    type: "spring",
                    stiffness: 220,
                    damping: 14,
                    mass: 0.8,
                  }}
                  style={{ transformOrigin: "center" }}
                >
                  {/* Ambient glow circle */}
                  <circle r={26} fill={WAYPOINTS[i].fill} opacity={0.06} />
                  {/* Dashed ring */}
                  <circle
                    r={18}
                    fill="none"
                    stroke={WAYPOINTS[i].fill}
                    strokeWidth={1.2}
                    opacity={0.2}
                    strokeDasharray="4 3"
                  />
                  {/* Geometric shape */}
                  <path
                    d={SHAPE_PATHS[WAYPOINTS[i].shape]}
                    fill={WAYPOINTS[i].fill}
                    opacity={0.4}
                  />
                </motion.g>
              </g>
            ))}

            {/* ── Tip: three concentric circles ── */}
            {/* Halo (large, soft) */}
            <circle
              ref={tipHalo}
              cx={sx}
              cy={sy}
              r={20}
              fill="#a78bfa"
              opacity={0.06}
              filter="url(#rbn-blur-lg)"
            />
            {/* Glow (mid, brighter) */}
            <circle
              ref={tipGlow}
              cx={sx}
              cy={sy}
              r={8}
              fill="#a78bfa"
              opacity={0.3}
              filter="url(#rbn-tip-glow)"
            />
            {/* Core (small, white, crisp) */}
            <circle
              ref={tipCore}
              cx={sx}
              cy={sy}
              r={3.5}
              fill="white"
              opacity={0.85}
            />
          </>
        )}
      </svg>
    </div>
  );
};
