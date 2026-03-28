import { useState, useEffect, useRef, useCallback } from "react";
import { APIPieChart } from "./APIPieChart";
import { motion } from "framer-motion"; /* ── THEME COLORS ── */
const C = {
  bg: "#0a0e1a",
  bgDeep: "#0f1420",
  bgPanel: "rgba(15,20,32,0.75)",
  bgCard: "rgba(18,24,40,0.65)",
  border: "rgba(65,155,209,0.15)",
  borderHot: "rgba(65,155,209,0.35)",
  primary: "#419bd1",
  primaryLight: "#52aee0",
  success: "#2dd4bf",
  danger: "#ef4444",
  warning: "#f97316",
  info: "#8b5cf6",
  textPrimary: "#e2e8f0",
  textMuted: "#64748b",
};

/* ── DATA HELPERS ── */
const ENDPOINTS = [
  "/api/v1/users",
  "/api/v1/auth/login",
  "/api/v1/auth/token",
  "/api/v2/orders",
  "/api/v2/products",
  "/api/v2/inventory",
  "/api/legacy/payments",
  "/api/legacy/reports",
  "/api/legacy/users",
  "/api/internal/admin",
  "/api/internal/metrics",
  "/api/internal/debug",
  "/api/v3/notifications",
  "/api/v3/events",
  "/api/v3/webhooks",
  "/api/v1/files/upload",
  "/api/v1/search",
  "/api/v2/analytics",
  "/api/legacy/export",
  "/api/v1/profile",
  "/api/v2/cart",
  "/api/internal/logs",
  "/api/v3/billing",
  "/api/legacy/sync",
];
const STATUSES = ["active", "zombie", "deprecated", "orphaned"];
const AUTH_TYPES = ["Bearer JWT", "API Key", "None", "OAuth2", "Basic Auth"];
const SOURCES = [
  "API Gateway",
  "GitHub Repo",
  "Swagger Docs",
  "Postman Collection",
  "Traffic Logs",
];
const OWNERS = [
  "Platform Team",
  "@alice.m",
  "@dev-bots",
  "Security Team",
  "@raj.k",
  "@legacy-svc",
];
const TRAP_ENDPOINTS = [
  "/api/legacy/auth",
  "/api/deprecated/users",
  "/api/v1/private",
  "/api/internal/admin",
  "/api/zombie/payments",
  "/api/v2/oldapi",
  "/api/test/backdoor",
  "/api/orphaned/export",
  "/api/hidden/debug",
  "/api/legacy/sync",
  "/api/admin/override",
  "/api/internal/metrics",
];

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function makeApi(id, endpoint, statusOverride) {
  const status = statusOverride || pick(STATUSES);
  const risk =
    status === "zombie"
      ? rand(72, 99)
      : status === "deprecated"
        ? rand(40, 74)
        : status === "orphaned"
          ? rand(30, 65)
          : rand(5, 35);
  const daysAgo =
    status === "zombie"
      ? rand(60, 365)
      : status === "active"
        ? rand(0, 3)
        : rand(10, 90);
  const lastUsed =
    daysAgo === 0
      ? "Just now"
      : daysAgo === 1
        ? "1 day ago"
        : `${daysAgo} days ago`;
  return {
    id,
    endpoint: endpoint || pick(ENDPOINTS),
    status,
    lastUsed,
    daysAgo,
    authType: pick(AUTH_TYPES),
    risk,
    source: pick(SOURCES),
    owner: pick(OWNERS),
    https: Math.random() > 0.25,
    rateLimit: status === "active" ? Math.random() > 0.3 : Math.random() > 0.7,
    sensitiveData:
      status !== "active" ? Math.random() > 0.4 : Math.random() > 0.8,
  };
}

function makeTrap(id, endpoint) {
  return {
    id,
    endpoint: endpoint || TRAP_ENDPOINTS[id % TRAP_ENDPOINTS.length],
    armed: Math.random() > 0.2,
    bans: Math.floor(Math.random() * 150),
    triggered: Math.floor(Math.random() * 45),
    latency: Math.floor(Math.random() * 80) + 10,
    lastTriggered:
      Math.random() > 0.5
        ? `${Math.floor(Math.random() * 60)} min ago`
        : "Never",
  };
}

const riskColor = (s) =>
  s >= 75 ? C.danger : s >= 50 ? C.warning : s >= 30 ? C.success : C.primary;

/* ── GLOBAL STYLES ── */
const globalCss = `
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Inter:wght@300;400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0e1a;color:#e2e8f0;font-family:'Inter',sans-serif;overflow-x:hidden;min-height:100vh}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0f1420}::-webkit-scrollbar-thumb{background:#419bd133;border-radius:2px}
@keyframes pageIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@keyframes pulse-alert{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.95)}}
@keyframes pulse-danger{0%,100%{opacity:1}50%{opacity:0.8}}
@keyframes tableRowIn{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:none}}
@keyframes toastIn{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:none}}
@keyframes ripple{to{transform:scale(24);opacity:0}}
@keyframes spin{to{transform:rotate(360deg)}}
.anim-page{animation:pageIn 0.5s cubic-bezier(0.23,1,0.32,1) both}
`;

/* ── SHARED COMPONENTS ── */

const Logo = () => (
  <svg viewBox="0 0 32 32" fill="none" style={{ width: 32, height: 32 }}>
    <circle cx="16" cy="14" r="10" stroke={C.primaryLight} strokeWidth="1.5" />
    <path
      d="M10 20v4a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-4"
      stroke={C.primaryLight}
      strokeWidth="1.5"
    />
    <circle cx="12.5" cy="13" r="2" fill={C.primaryLight} />
    <circle cx="19.5" cy="13" r="2" fill={C.primaryLight} />
    <path
      d="M13 21h2v-2h2v2h2"
      stroke={C.primaryLight}
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <path
      d="M8 17c-2-1-3-3-3-5"
      stroke={C.primaryLight}
      strokeWidth="1.2"
      strokeLinecap="round"
      opacity="0.5"
    />
    <path
      d="M24 17c2-1 3-3 3-5"
      stroke={C.primaryLight}
      strokeWidth="1.2"
      strokeLinecap="round"
      opacity="0.5"
    />
  </svg>
);

const BgCanvas = () => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 0,
      background: `radial-gradient(ellipse 80% 60% at 10% 20%,rgba(65,155,209,0.12) 0%,transparent 60%),radial-gradient(ellipse 60% 50% at 90% 80%,rgba(139,92,246,0.08) 0%,transparent 60%),radial-gradient(ellipse 40% 30% at 50% 50%,rgba(45,212,191,0.04) 0%,transparent 60%),#0a0e1a`,
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage:
          "linear-gradient(rgba(65,155,209,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(65,155,209,0.02) 1px,transparent 1px)",
        backgroundSize: "50px 50px",
        opacity: 0.6,
      }}
    />
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.04) 2px,rgba(0,0,0,0.04) 4px)",
        opacity: 0.5,
        pointerEvents: "none",
      }}
    />
  </div>
);

const Panel = ({ children, style = {} }) => (
  <div
    style={{
      background: C.bgPanel,
      border: `1px solid ${C.border}`,
      borderRadius: 14,
      padding: "1.6rem",
      position: "relative",
      overflow: "hidden",
      transition: "border-color 0.3s",
      ...style,
    }}
    onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.borderHot)}
    onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
  >
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 1,
        background:
          "linear-gradient(90deg,transparent,rgba(65,155,209,0.2),transparent)",
      }}
    />
    {children}
  </div>
);

const SectionTitle = ({ children }) => (
  <p
    style={{
      fontFamily: "'Inter',sans-serif",
      fontSize: "0.7rem",
      fontWeight: 600,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: C.primaryLight,
      marginBottom: "1.2rem",
      display: "flex",
      alignItems: "center",
      gap: 10,
    }}
  >
    <span
      style={{
        width: 3,
        height: 3,
        background: C.primaryLight,
        borderRadius: "50%",
        display: "inline-block",
      }}
    />
    {children}
  </p>
);

const Badge = ({ status }) => {
  const colors = {
    zombie: {
      bg: "rgba(239,68,68,0.12)",
      color: "#ef4444",
      border: "rgba(239,68,68,0.3)",
    },
    active: {
      bg: "rgba(45,212,191,0.12)",
      color: "#2dd4bf",
      border: "rgba(45,212,191,0.3)",
    },
    deprecated: {
      bg: "rgba(249,115,22,0.12)",
      color: "#f97316",
      border: "rgba(249,115,22,0.3)",
    },
    orphaned: {
      bg: "rgba(139,92,246,0.12)",
      color: "#8b5cf6",
      border: "rgba(139,92,246,0.3)",
    },
  };
  const c = colors[status] || colors.active;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "0.2rem 0.7rem",
        borderRadius: 99,
        fontSize: "0.65rem",
        fontWeight: 600,
        letterSpacing: "0.05em",
        fontFamily: "'Fira Code',monospace",
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: "currentColor",
          display: "inline-block",
        }}
      />
      {status.toUpperCase()}
    </span>
  );
};

const Toast = ({ msg, show }) =>
  show ? (
    <div
      style={{
        position: "fixed",
        bottom: "2rem",
        right: "2rem",
        zIndex: 9999,
        background: "rgba(15,20,32,0.95)",
        border: `1px solid ${C.primaryLight}`,
        borderRadius: 8,
        padding: "0.8rem 1.4rem",
        fontFamily: "'Fira Code',monospace",
        fontSize: "0.78rem",
        color: C.textPrimary,
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        animation: "toastIn 0.3s ease both",
        backdropFilter: "blur(8px)",
      }}
    >
      {msg}
    </div>
  ) : null;

const Btn = ({
  children,
  variant = "primary",
  onClick,
  disabled,
  style = {},
}) => {
  const variants = {
    primary: {
      background: "rgba(65,155,209,0.15)",
      border: `1px solid rgba(65,155,209,0.4)`,
      color: C.primaryLight,
    },
    danger: {
      background: "rgba(239,68,68,0.12)",
      border: `1px solid rgba(239,68,68,0.3)`,
      color: C.danger,
    },
    warning: {
      background: "rgba(249,115,22,0.12)",
      border: `1px solid rgba(249,115,22,0.3)`,
      color: C.warning,
    },
    purple: {
      background: "rgba(139,92,246,0.12)",
      border: `1px solid rgba(139,92,246,0.3)`,
      color: C.info,
    },
  };
  const v = variants[variant] || variants.primary;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...v,
        padding: "0.45rem 1rem",
        borderRadius: 6,
        fontSize: "0.72rem",
        fontFamily: "'Fira Code',monospace",
        fontWeight: 600,
        letterSpacing: "0.04em",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "all 0.2s",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.filter = "brightness(1.2)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.filter = "none";
      }}
    >
      {children}
    </button>
  );
};

/* ── SIDEBAR NAV ── */
const Header = ({ page, onNavigate }) => (
  <aside
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "stretch",
      width: 200,
      minHeight: "100vh",
      background: "rgba(10,14,26,0.92)",
      borderRight: `1px solid ${C.border}`,
      position: "sticky",
      top: 0,
      zIndex: 100,
      boxShadow: "1px 0 3px rgba(0,0,0,0.4)",
      padding: "1.6rem 0 2rem",
      flexShrink: 0,
    }}
  >
    {/* Logo */}
    <button
      onClick={() => onNavigate("dashboard")}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "none",
        border: "none",
        cursor: "pointer",
        color: C.primaryLight,
        fontSize: "1rem",
        fontWeight: 600,
        letterSpacing: "0.04em",
        fontFamily: "'Inter',sans-serif",
        padding: "0 1.4rem",
        marginBottom: "2rem",
      }}
    >
      <Logo />
      ALIE
    </button>

    {/* Nav items */}
    <nav
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.15rem",
        flex: 1,
      }}
    >
      {[
        ["dashboard", "Dashboard"],
        ["detail", "Reports"],
        ["traps", "ZombieTraps"],
        ["threat", "Threats"],
        ["ai-recs", "AI Recs"],
        ["settings", "Settings"],
      ].map(([p, label]) => (
        <button
          key={p}
          onClick={() => onNavigate(p)}
          style={{
            position: "relative",
            padding: "0.65rem 1.4rem",
            background: page === p ? "rgba(65,155,209,0.1)" : "none",
            border: "none",
            borderLeft: `3px solid ${page === p ? C.primaryLight : "transparent"}`,
            color: page === p ? C.primaryLight : C.textMuted,
            fontFamily: "'Inter',sans-serif",
            fontWeight: 500,
            fontSize: "0.8rem",
            letterSpacing: "0.03em",
            textTransform: "uppercase",
            cursor: "pointer",
            transition: "color 0.2s, background 0.2s, border-color 0.2s",
            textAlign: "left",
          }}
          onMouseEnter={(e) => {
            if (page !== p) e.currentTarget.style.color = C.textPrimary;
          }}
          onMouseLeave={(e) => {
            if (page !== p) e.currentTarget.style.color = C.textMuted;
          }}
        >
          {label}
        </button>
      ))}
    </nav>

    {/* Threat badge at bottom */}
    <div
      style={{
        margin: "0 1rem",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0.5rem 0.8rem",
        background: "rgba(239,68,68,0.08)",
        border: "1px solid rgba(239,68,68,0.25)",
        borderRadius: 8,
        fontFamily: "'Fira Code',monospace",
        fontSize: "0.65rem",
        fontWeight: 500,
        color: C.danger,
        letterSpacing: "0.04em",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: C.danger,
          flexShrink: 0,
          animation: "pulse-alert 1.8s cubic-bezier(0.4,0,0.6,1) infinite",
        }}
      />
      THREAT DETECTED
    </div>
  </aside>
);

/* ── REALTIME CHART ── */
const RT_POINTS = 100;
function useRealtimeChart(canvasRef, active) {
  const state = useRef({
    data: [],
    head: 0,
    rollingMaxTotal: 5,
    rollingMaxSan: 3,
    scrollPx: 0,
    idlePhase: 0,
    barPhase: 0,
    blend: 0,
    gState: 0,
    lastEventTs: 0,
    pulseRings: [],
    rafId: null,
    counters: { total: 0, san: 0 },
  });
  const [counters, setCounters] = useState({ total: 0, san: 0 });

  const init = useCallback(() => {
    const s = state.current;
    s.data = Array.from({ length: RT_POINTS + 80 }, (_, i) => ({
      total: 0,
      sanitized: 0,
      ts: Date.now() - (RT_POINTS + 79 - i) * 300,
      _idle: true,
    }));
    s.head = s.data.length - 1;
  }, []);

  const getView = useCallback(() => {
    const { data, head } = state.current;
    const len = data.length;
    return Array.from(
      { length: RT_POINTS },
      (_, i) => data[(head - RT_POINTS + 1 + i + len * 4) % len],
    );
  }, []);

  const push = useCallback(
    (total, sanitized) => {
      const s = state.current;
      const now = performance.now();
      s.head = (s.head + 1) % s.data.length;
      s.data[s.head] = { total, sanitized, ts: Date.now(), _idle: false };
      s.rollingMaxTotal = Math.max(s.rollingMaxTotal * 0.88, total, 4);
      s.rollingMaxSan = Math.max(s.rollingMaxSan * 0.88, sanitized, 3);
      s.lastEventTs = now;
      s.gState = 1;
      s.blend = Math.min(1, s.blend + 0.5);
      const view = getView();
      const sumT = view.reduce((a, d) => a + (d._idle ? 0 : d.total), 0);
      const sumS = view.reduce((a, d) => a + (d._idle ? 0 : d.sanitized), 0);
      setCounters({ total: sumT, san: sumS });
    },
    [getView],
  );

  useEffect(() => {
    if (!active || !canvasRef.current) return;
    const canvas = canvasRef.current;
    init();
    const ST = { IDLE: 0, ACTIVE: 1, COOLING: 2 };
    const clamp01 = (t) => Math.max(0, Math.min(1, t));
    const smoothstep = (t) => {
      t = clamp01(t);
      return t * t * (3 - 2 * t);
    };
    const COOLDOWN_MS = 3000;
    const s = state.current;
    let lastStamp = performance.now();

    function stampIdle() {
      s.head = (s.head + 1) % s.data.length;
      s.data[s.head] = { total: 0, sanitized: 0, ts: Date.now(), _idle: true };
      s.rollingMaxTotal = Math.max(4, s.rollingMaxTotal * 0.998);
      s.rollingMaxSan = Math.max(3, s.rollingMaxSan * 0.998);
    }

    function loop(now) {
      const sinceEvent = now - s.lastEventTs;
      if (s.gState === ST.ACTIVE) {
        s.blend = Math.min(1, s.blend + 0.08);
        if (sinceEvent > 200) s.gState = ST.COOLING;
      } else if (s.gState === ST.COOLING) {
        const f = clamp01((sinceEvent - 200) / COOLDOWN_MS);
        s.blend = 1 - smoothstep(f);
        if (f >= 1) {
          s.gState = ST.IDLE;
          s.blend = 0;
        }
      } else {
        s.blend = Math.max(0, s.blend - 0.018);
      }
      const W = canvas.width,
        H = canvas.height;
      const slotW = W / RT_POINTS;
      s.scrollPx += 0.5 + s.blend * 2.8;
      if (s.scrollPx >= slotW) {
        s.scrollPx -= slotW;
        stampIdle();
      }
      s.idlePhase += 0.02;
      s.barPhase += 0.03;

      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, W, H);
      const PT = 10,
        PB = 6,
        gH = H - PT - PB;
      const view = getView();
      const blend = s.blend;

      if (blend > 0.08) {
        ctx.fillStyle = `rgba(0,185,255,${(blend * 0.05).toFixed(3)})`;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.strokeStyle = `rgba(255,255,255,${(0.04 + blend * 0.04).toFixed(3)})`;
      ctx.lineWidth = 1;
      for (let r = 0; r <= 4; r++) {
        const y = PT + (r / 4) * gH;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      for (let i = 0; i < RT_POINTS; i++) {
        const d = view[i];
        const x = i * slotW - s.scrollPx;
        if (x + slotW < 0 || x > W) continue;
        let barH;
        if (d._idle || d.total === 0) {
          const wave = Math.sin(s.barPhase + i * 0.3) * 0.5 + 0.5;
          barH = (0.12 + wave * 0.26) * gH * (1 - blend * 0.7);
        } else {
          const ratio = clamp01(d.total / Math.max(1, s.rollingMaxTotal));
          barH = (0.4 + ratio * 0.6) * gH;
        }
        const y = PT + gH - barH;
        const topG = Math.round(120 + blend * 85),
          topB = Math.round(185 + blend * 70),
          topA = (0.22 + blend * 0.58).toFixed(2);
        const grad = ctx.createLinearGradient(0, y, 0, PT + gH);
        grad.addColorStop(0, `rgba(0,${topG},${topB},${topA})`);
        grad.addColorStop(
          0.45,
          `rgba(0,${Math.round(topG * 0.65)},${topB},${(parseFloat(topA) * 0.55).toFixed(2)})`,
        );
        grad.addColorStop(1, "rgba(0,25,70,0.04)");
        ctx.fillStyle = grad;
        ctx.fillRect(
          Math.floor(x) + 1,
          Math.floor(y),
          Math.max(1, Math.floor(slotW) - 2),
          Math.ceil(barH),
        );
      }

      ctx.strokeStyle = `rgba(0,175,255,${(0.2 + blend * 0.35).toFixed(2)})`;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = `rgba(0,200,255,${(0.4 + blend * 0.4).toFixed(2)})`;
      ctx.shadowBlur = 4 + blend * 8;
      ctx.beginPath();
      ctx.moveTo(0, PT + gH);
      ctx.lineTo(W, PT + gH);
      ctx.stroke();
      ctx.shadowBlur = 0;

      function lineY(i) {
        const d = view[i];
        const wave = Math.sin(s.idlePhase + i * 0.11) * 0.5 + 0.5;
        const idleY = PT + gH * (0.58 - wave * 0.2);
        if (d._idle || d.total === 0)
          return idleY * (1 - blend) + (PT + gH - 3) * blend;
        const ratio = clamp01(d.sanitized / Math.max(1, s.rollingMaxSan));
        const activeY = PT + gH - (0.35 + ratio * 0.65) * gH;
        return idleY * (1 - blend) + activeY * blend;
      }
      function ptx(i) {
        return i * slotW + slotW / 2 - s.scrollPx;
      }

      const lG = Math.round(180 + blend * 75),
        lB = Math.round(148 + blend * 15),
        lA = (0.5 + blend * 0.5).toFixed(2);
      const lineCol = `rgba(0,${lG},${lB},${lA})`;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, PT - 4, W, gH + 6);
      ctx.clip();
      ctx.beginPath();
      for (let i = 0; i < RT_POINTS; i++) {
        const x = ptx(i),
          y = lineY(i);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          const px = ptx(i - 1),
            py = lineY(i - 1);
          ctx.bezierCurveTo((px + x) / 2, py, (px + x) / 2, y, x, y);
        }
      }
      ctx.strokeStyle = lineCol;
      ctx.lineWidth = 1.8 + blend * 1.5;
      ctx.shadowColor = `rgba(0,${lG},${lB},${(0.3 + blend * 0.6).toFixed(2)})`;
      ctx.shadowBlur = 3 + blend * 14;
      ctx.stroke();
      ctx.shadowBlur = 0;

      s.pulseRings = s.pulseRings.filter((r) => now - r.ts < 1000);
      s.pulseRings.forEach((r) => {
        const frac = (now - r.ts) / 1000;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 3 + frac * 32, 0, Math.PI * 2);
        ctx.strokeStyle = r.isSan
          ? `rgba(0,255,163,${(1 - frac) * 0.65})`
          : `rgba(0,200,255,${(1 - frac) * 0.65})`;
        ctx.lineWidth = 2.5 * (1 - frac) + 0.5;
        ctx.stroke();
      });

      const cx = ptx(RT_POINTS - 1),
        cy = lineY(RT_POINTS - 1);
      ctx.beginPath();
      ctx.arc(cx, cy, 3 + blend * 3.5, 0, Math.PI * 2);
      ctx.fillStyle = lineCol;
      ctx.shadowColor = lineCol;
      ctx.shadowBlur = 5 + blend * 18;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();

      s.rafId = requestAnimationFrame(loop);
    }
    s.rafId = requestAnimationFrame(loop);
    return () => {
      if (s.rafId) cancelAnimationFrame(s.rafId);
    };
  }, [active, canvasRef, init, getView]);

  return { push, counters };
}

/* ── ANIMATED COUNTER ── */
function useCounter(target) {
  const [val, setVal] = useState(0);
  const ref = useRef({ from: 0, target: 0, start: 0, raf: null });
  useEffect(() => {
    const r = ref.current;
    r.from = r.target;
    r.target = target;
    r.start = performance.now();
    if (r.raf) cancelAnimationFrame(r.raf);
    function step(now) {
      const p = Math.min((now - r.start) / 800, 1),
        ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(r.from + (r.target - r.from) * ease));
      if (p < 1) r.raf = requestAnimationFrame(step);
    }
    r.raf = requestAnimationFrame(step);
    return () => {
      if (r.raf) cancelAnimationFrame(r.raf);
    };
  }, [target]);
  return val;
}

/* ── DASHBOARD PAGE ── */
function Dashboard({ onNavigate, showToast }) {
  const [apiData, setApiData] = useState(() =>
    ENDPOINTS.map((ep, i) => makeApi(i + 1, ep)),
  );
  const [filter, setFilter] = useState("all");
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState("Ready to scan");
  const [scanReport, setScanReport] = useState(null);
  const [liveOn, setLiveOn] = useState(false);
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const { push: rtPush, counters } = useRealtimeChart(canvasRef, true);
  const scanRef = useRef(null);

  const metrics = {
    total: apiData.length,
    active: apiData.filter((a) => a.status === "active").length,
    zombie: apiData.filter((a) => a.status === "zombie").length,
    highRisk: apiData.filter((a) => a.risk >= 70).length,
  };
  const pieData = [
    {
      name: "Active",
      value: apiData.filter((a) => a.status === "active").length,
      color: "#2dd4bf",
    },
    {
      name: "Zombie",
      value: apiData.filter((a) => a.status === "zombie").length,
      color: "#ef4444",
    },
    {
      name: "Deprecated",
      value: apiData.filter((a) => a.status === "deprecated").length,
      color: "#f97316",
    },
    {
      name: "Orphaned",
      value: apiData.filter((a) => a.status === "orphaned").length,
      color: "#8b5cf6",
    },
  ];
  const totalCount = useCounter(metrics.total);
  const activeCount = useCounter(metrics.active);
  const zombieCount = useCounter(metrics.zombie);
  const highRiskCount = useCounter(metrics.highRisk);

  // Resize canvas
  useEffect(() => {
    function resize() {
      if (!canvasRef.current || !wrapRef.current) return;
      canvasRef.current.width = wrapRef.current.clientWidth;
      canvasRef.current.height = wrapRef.current.clientHeight;
    }
    resize();
    window.addEventListener("resize", resize, { passive: true });
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Live updates
  useEffect(() => {
    setLiveOn(true);
    const iv = setInterval(() => {
      const rp =
        apiData.filter((a) => a.risk >= 70).length /
        Math.max(apiData.length, 1);
      const total = rand(2, 10) + Math.round(rp * 8);
      const sanitized = Math.min(total, rand(1, Math.max(1, total)));
      rtPush(total, sanitized);
      if (Math.random() > 0.7) {
        setApiData((prev) => {
          const next = [...prev];
          const idx = rand(0, next.length - 1);
          next[idx] = makeApi(next[idx].id, next[idx].endpoint);
          return next;
        });
      }
    }, 500);
    return () => clearInterval(iv);
  }, [rtPush]);

  const runScan = () => {
    if (scanning) return;
    setScanning(true);
    setScanReport(null);
    setScanStatus("Initialising scan engine…");
    setScanProgress(0);
    rtPush(rand(10, 30), rand(5, 20));
    const startedAt = Date.now();
    const scanStats = { discovered: 0, analyzed: 0, suspect: 0 };
    let progress = 0;
    const phases = [
      { start: 0, end: 10, label: "Initialising scan engine…" },
      { start: 10, end: 22, label: "Connecting to API gateway…" },
      { start: 22, end: 42, label: "Crawling endpoint registry…" },
      { start: 42, end: 62, label: "Analysing traffic logs…" },
      { start: 62, end: 78, label: "Checking authentication posture…" },
      { start: 78, end: 92, label: "Evaluating risk graph…" },
      { start: 92, end: 99, label: "Classifying zombie APIs…" },
      { start: 99, end: 100, label: "Finalising report…" },
    ];
    const currentPhase = (p) =>
      phases.find((ph) => p >= ph.start && p < ph.end) ||
      phases[phases.length - 1];
    const phaseStep = (p) =>
      p < 20
        ? [2, 4.5]
        : p < 55
          ? [1.2, 3.2]
          : p < 85
            ? [0.8, 2.1]
            : p < 98
              ? [0.3, 1.2]
              : [0.15, 0.45];

    function tick() {
      const [mn, mx] = phaseStep(progress);
      progress += mn + Math.random() * (mx - mn);
      if (progress > 100) progress = 100;
      const traffic = rand(6, 26) + Math.round(progress / 9);
      const san = Math.max(
        1,
        Math.min(traffic, rand(2, Math.floor(traffic * 0.75))),
      );
      rtPush(traffic, san);
      const discoveredTarget = Math.min(
        ENDPOINTS.length,
        Math.floor((progress / 100) * ENDPOINTS.length),
      );
      if (scanStats.discovered < discoveredTarget) {
        scanStats.discovered += rand(0, 2);
        scanStats.discovered = Math.min(
          scanStats.discovered,
          discoveredTarget,
          ENDPOINTS.length,
        );
      }
      const analyzedTarget = Math.max(0, scanStats.discovered - rand(0, 3));
      if (scanStats.analyzed < analyzedTarget) {
        scanStats.analyzed += rand(0, 2);
        scanStats.analyzed = Math.min(
          scanStats.analyzed,
          analyzedTarget,
          ENDPOINTS.length,
        );
      }
      const suspectTarget = Math.max(1, Math.round(scanStats.analyzed * 0.22));
      if (Math.random() > 0.58 && scanStats.suspect < suspectTarget)
        scanStats.suspect += 1;
      setScanProgress(progress);
      setScanStatus(
        `${currentPhase(progress).label} ${Math.floor(progress).toString().padStart(2, "0")}% | endpoints ${scanStats.analyzed}/${ENDPOINTS.length} | suspicious ${scanStats.suspect}`,
      );
      if (progress >= 100) {
        setTimeout(() => {
          const newData = ENDPOINTS.map((ep, i) => makeApi(i + 1, ep));
          setApiData(newData);
          const zombieC = newData.filter((a) => a.status === "zombie").length;
          const highC = newData.filter((a) => a.risk >= 70).length;
          const activeC = newData.filter((a) => a.status === "active").length;
          const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
          setScanReport({
            endpoints: ENDPOINTS.length,
            zombie: zombieC,
            highRisk: highC,
            suspicious: scanStats.suspect,
            active: activeC,
            duration: elapsed,
            stamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          });
          setScanning(false);
          setScanProgress(0);
          setScanStatus(
            `Scan complete | analyzed ${ENDPOINTS.length}/${ENDPOINTS.length} | suspicious ${scanStats.suspect}`,
          );
          showToast(
            `Scan complete — ${zombieC} zombie APIs | ${scanStats.suspect} suspicious`,
          );
          rtPush(rand(18, 40), rand(8, 26));
        }, 420);
        return;
      }
      const jitter = progress > 85 ? rand(160, 280) : rand(120, 240);
      scanRef.current = setTimeout(tick, jitter);
    }
    tick();
  };

  const [realTimeInterception, setRealTimeInterception] = useState(true);
  const [autoKillMode, setAutoKillMode] = useState(false);
  const [liveThreats, setLiveThreats] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedThreat, setSelectedThreat] = useState(null);
  const [isTerminating, setIsTerminating] = useState(false);
  const [attackTriggered, setAttackTriggered] = useState(false);
  const [showSimBtn, setShowSimBtn] = useState(true);

  const filtered =
    filter === "all" ? apiData : apiData.filter((a) => a.status === filter);

  const triggerZombieAttack = () => {
    if (attackTriggered) return;
    setAttackTriggered(true);
    setShowSimBtn(false);
    rtPush(rand(30, 60), rand(5, 15));
    const t = {
      id: Date.now().toString(),
      endpoint: "POST /v1/old-auth",
      type: "ZOMBIE DETECTED",
      timestamp: new Date().toLocaleTimeString(),
      details: {
        method: "POST",
        authentication: "None",
        encryption: "None",
        rateLimit: "None",
        dataExposure: "High",
      },
      aiRecommendations: [
        "Immediately implement OAuth 2.0 authentication with JWT tokens",
        "Enable TLS 1.3 encryption for all data in transit",
        "Configure rate limiting: max 100 requests per minute per IP",
        "Decommission this endpoint and migrate consumers to v3",
      ],
    };
    setLiveThreats((prev) => [t, ...prev]);
    showToast("🧟 Zombie API Detected! Critical threat on POST /v1/old-auth");
  };

  const handleThreatClick = (threat) => {
    setSelectedThreat(threat);
    setModalOpen(true);
  };

  const handleTerminate = () => {
    setIsTerminating(true);
    setTimeout(() => {
      if (selectedThreat)
        setLiveThreats((prev) =>
          prev.filter((t) => t.id !== selectedThreat.id),
        );
      showToast("✅ Endpoint Terminated — Zombie API neutralised");
      setIsTerminating(false);
      setModalOpen(false);
      setSelectedThreat(null);
      setTimeout(() => {
        setAttackTriggered(false);
        setShowSimBtn(true);
      }, 2000);
    }, 2000);
  };

  return (
    <main
      style={{
        padding: "2.5rem 320px 4rem 2.5rem",
        maxWidth: 1400,
        margin: "0 auto",
      }}
    >
      {/* Metrics */}
      <SectionTitle>Live Metrics</SectionTitle>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: "1.2rem",
          marginBottom: "2.2rem",
        }}
      >
        {[
          {
            label: "Total APIs",
            val: totalCount,
            sub: "Tracked endpoints",
            variant: "purple",
          },
          {
            label: "Active APIs",
            val: activeCount,
            sub: "Healthy & responding",
            variant: "green",
          },
          {
            label: "Zombie APIs",
            val: zombieCount,
            sub: "Inactive & unmonitored",
            variant: "red",
          },
          {
            label: "High Risk",
            val: highRiskCount,
            sub: "Risk score ≥ 70",
            variant: "orange",
          },
        ].map(({ label, val, sub, variant }) => {
          const vc = {
            purple: C.info,
            green: C.success,
            red: C.danger,
            orange: C.warning,
          };
          return (
            <div
              key={label}
              style={{
                position: "relative",
                background: C.bgCard,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: "1.4rem 1.6rem",
                overflow: "hidden",
                transition: "all 0.3s",
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow =
                  "0 4px 12px rgba(65,155,209,0.15)";
                e.currentTarget.style.borderColor = C.borderHot;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "";
                e.currentTarget.style.borderColor = C.border;
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: vc[variant],
                  borderRadius: "12px 12px 0 0",
                }}
              />
              <div
                style={{
                  fontFamily: "'Fira Code',monospace",
                  fontSize: "0.65rem",
                  letterSpacing: "0.06em",
                  color: C.textMuted,
                  textTransform: "uppercase",
                  marginBottom: "0.8rem",
                  fontWeight: 500,
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontFamily: "'Inter',sans-serif",
                  fontSize: "2.2rem",
                  fontWeight: 700,
                  lineHeight: 1,
                  color: vc[variant],
                  marginBottom: "0.5rem",
                  animation:
                    variant === "red"
                      ? "pulse-danger 2s cubic-bezier(0.4,0,0.6,1) infinite"
                      : "",
                }}
              >
                {val}
              </div>
              <div style={{ fontSize: "0.74rem", color: C.textMuted }}>
                {sub}
              </div>
            </div>
          );
        })}
      </div>

      {/*Pie Chart*/}
      <div style={{ marginBottom: "1.8rem" }}>
        <SectionTitle>API Status Distribution</SectionTitle>
        <APIPieChart data={pieData} />
      </div>

      {/* Scan Control */}

      <SectionTitle>Scan Control</SectionTitle>
      <Panel style={{ marginBottom: "1.8rem" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 120,
              height: 120,
            }}
          >
            {scanning &&
              [
                { s: 1.8, o: 0.15, d: 0 },
                { s: 2.4, o: 0.1, d: 0.3 },
                { s: 3, o: 0.06, d: 0.6 },
              ].map(({ s, o, d }, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    border: `1px solid ${C.primaryLight}`,
                    borderRadius: "50%",
                    transform: `scale(${s})`,
                    opacity: o,
                    animation: `pulse-alert ${1.8 + d}s ease-in-out infinite`,
                    animationDelay: `${d}s`,
                  }}
                />
              ))}
            <Btn
              variant="primary"
              onClick={runScan}
              disabled={scanning}
              style={{ padding: "0.6rem 1.4rem", fontSize: "0.8rem" }}
            >
              {scanning ? (
                <>
                  <span
                    style={{
                      display: "inline-block",
                      animation: "spin 1s linear infinite",
                      marginRight: 4,
                    }}
                  >
                    ⟳
                  </span>
                  SCANNING…
                </>
              ) : (
                <>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  Start Scan
                </>
              )}
            </Btn>
          </div>
          {scanning && (
            <div
              style={{
                width: "100%",
                maxWidth: 400,
                height: 4,
                background: "rgba(255,255,255,0.06)",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  background: `linear-gradient(90deg,${C.primary},${C.primaryLight})`,
                  width: `${scanProgress}%`,
                  transition: "width 0.3s ease",
                  borderRadius: 2,
                }}
              />
            </div>
          )}
          <span
            style={{
              fontFamily: "'Fira Code',monospace",
              fontSize: "0.72rem",
              color: scanning
                ? C.primaryLight
                : scanReport
                  ? C.success
                  : C.textMuted,
              textAlign: "center",
            }}
          >
            {scanStatus}
          </span>
          {scanReport && (
            <div
              style={{
                width: "100%",
                maxWidth: 600,
                borderTop: `1px solid ${C.border}`,
                paddingTop: "1rem",
                animation: "pageIn 0.4s ease both",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.8rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: C.success,
                      display: "inline-block",
                      boxShadow: `0 0 6px ${C.success}`,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "'Fira Code',monospace",
                      fontSize: "0.72rem",
                      color: C.textMuted,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Last Scan Report
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: "'Fira Code',monospace",
                    fontSize: "0.7rem",
                    color: C.textMuted,
                  }}
                >
                  Completed {scanReport.stamp}
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3,1fr)",
                  gap: "0.8rem",
                  marginBottom: "1rem",
                }}
              >
                {[
                  { label: "Endpoints", val: scanReport.endpoints },
                  { label: "Zombie APIs", val: scanReport.zombie },
                  { label: "High Risk", val: scanReport.highRisk },
                  { label: "Suspicious", val: scanReport.suspicious },
                  { label: "Healthy Active", val: scanReport.active },
                  { label: "Duration", val: `${scanReport.duration}s` },
                ].map(({ label, val }) => (
                  <div
                    key={label}
                    style={{
                      background: "rgba(18,24,40,0.5)",
                      borderRadius: 6,
                      padding: "0.6rem 0.8rem",
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'Fira Code',monospace",
                        fontSize: "0.6rem",
                        color: C.textMuted,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Inter',sans-serif",
                        fontSize: "1rem",
                        fontWeight: 700,
                        color: C.primaryLight,
                      }}
                    >
                      {val}
                    </div>
                  </div>
                ))}
              </div>
              <Btn
                variant="primary"
                onClick={() => onNavigate("detail")}
                style={{ fontSize: "0.72rem" }}
              >
                View Detailed Reports →
              </Btn>
            </div>
          )}
        </div>
      </Panel>

      {/* Chart + Stats */}
      <SectionTitle>Analytics Overview</SectionTitle>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "1.4rem",
          marginBottom: "1.8rem",
        }}
      >
        <Panel style={{ marginBottom: 0 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.8rem",
            }}
          >
            <span
              style={{
                fontFamily: "'Fira Code',monospace",
                fontSize: "0.7rem",
                color: C.textMuted,
                fontWeight: 500,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Realtime Traffic Sanitization
            </span>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "0.2rem 0.7rem",
                borderRadius: 99,
                border: `1px solid ${C.border}`,
                fontFamily: "'Fira Code',monospace",
                fontSize: "0.6rem",
                fontWeight: 600,
                letterSpacing: "0.05em",
                color: liveOn ? C.success : C.textMuted,
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: liveOn ? C.success : C.textMuted,
                  display: "inline-block",
                  boxShadow: liveOn ? `0 0 6px ${C.success}` : "none",
                }}
              />
              LIVE
            </span>
          </div>
          <div
            style={{ display: "flex", gap: "1.2rem", marginBottom: "0.8rem" }}
          >
            {[
              { label: "Requests", val: counters.total },
              { label: "Sanitized", val: counters.san },
            ].map(({ label, val }) => (
              <div
                key={label}
                style={{
                  background: "rgba(18,24,40,0.5)",
                  borderRadius: 6,
                  padding: "0.5rem 0.8rem",
                  border: `1px solid ${C.border}`,
                  flex: 1,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Fira Code',monospace",
                    fontSize: "0.6rem",
                    color: C.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontFamily: "'Inter',sans-serif",
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    color: C.primaryLight,
                  }}
                >
                  {val.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
          <div
            ref={wrapRef}
            style={{ position: "relative", height: 140, width: "100%" }}
          >
            <canvas
              ref={canvasRef}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
              }}
            />
          </div>
        </Panel>
        <Panel style={{ marginBottom: 0 }}>
          <div
            style={{
              fontFamily: "'Fira Code',monospace",
              fontSize: "0.7rem",
              color: C.textMuted,
              fontWeight: 500,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              marginBottom: "1rem",
            }}
          >
            System Status
          </div>
          {[
            {
              label: "Last Full Scan",
              val: "2 hrs ago",
              valStyle: {
                fontFamily: "'Fira Code',monospace",
                fontSize: "0.75rem",
              },
            },
            {
              label: "Coverage",
              val: "94%",
              valStyle: { color: C.primaryLight },
            },
            { label: "Alerts Today", val: "7", valStyle: { color: C.danger } },
            {
              label: "Auto-Block",
              val: "ENABLED",
              valStyle: {
                color: C.success,
                fontFamily: "'Fira Code',monospace",
                fontSize: "0.78rem",
              },
            },
            {
              label: "Avg Risk Score",
              val: "42",
              valStyle: { color: C.warning },
            },
          ].map(({ label, val, valStyle }) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.7rem 1rem",
                background: "rgba(18,24,40,0.5)",
                borderRadius: 8,
                border: `1px solid ${C.border}`,
                fontSize: "0.82rem",
                marginBottom: "0.7rem",
                transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = C.borderHot)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = C.border)
              }
            >
              <span style={{ color: C.textMuted, fontSize: "0.76rem" }}>
                {label}
              </span>
              <span
                style={{
                  fontFamily: "'Inter',sans-serif",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  color: C.primaryLight,
                  ...valStyle,
                }}
              >
                {val}
              </span>
            </div>
          ))}
        </Panel>
      </div>

      {/* API Table */}
      <SectionTitle>API Registry</SectionTitle>
      <Panel>
        <div
          style={{
            display: "flex",
            gap: "0.4rem",
            marginBottom: "1rem",
            flexWrap: "wrap",
          }}
        >
          {["all", "active", "zombie", "deprecated", "orphaned"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "0.35rem 0.9rem",
                border: `1px solid ${filter === f ? C.primaryLight : C.border}`,
                borderRadius: 6,
                background:
                  filter === f ? "rgba(65,155,209,0.08)" : "transparent",
                color: filter === f ? C.primaryLight : C.textMuted,
                fontFamily: "'Fira Code',monospace",
                fontSize: "0.68rem",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "all 0.25s",
                fontWeight: 500,
              }}
            >
              {f}
            </button>
          ))}
        </div>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: "'Inter',sans-serif",
              fontSize: "0.82rem",
            }}
          >
            <thead>
              <tr>
                {[
                  "Endpoint",
                  "Status",
                  "Last Used",
                  "Auth Type",
                  "Risk Score",
                  "Action",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "0.7rem 1rem",
                      fontFamily: "'Fira Code',monospace",
                      fontSize: "0.62rem",
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: C.textMuted,
                      borderBottom: `1px solid ${C.border}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((api, idx) => (
                <tr
                  key={api.id}
                  style={{
                    animation: `tableRowIn 0.25s ${Math.min(idx * 20, 400)}ms ease both`,
                    borderBottom: `1px solid ${C.border}`,
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(65,155,209,0.04)")
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <td
                    style={{
                      padding: "0.8rem 1rem",
                      fontFamily: "'Fira Code',monospace",
                      fontSize: "0.76rem",
                      color: C.primaryLight,
                    }}
                  >
                    {api.endpoint}
                  </td>
                  <td style={{ padding: "0.8rem 1rem" }}>
                    <Badge status={api.status} />
                  </td>
                  <td
                    style={{
                      padding: "0.8rem 1rem",
                      color: C.textMuted,
                      fontFamily: "'Fira Code',monospace",
                      fontSize: "0.76rem",
                    }}
                  >
                    {api.lastUsed}
                  </td>
                  <td
                    style={{
                      padding: "0.8rem 1rem",
                      fontFamily: "'Fira Code',monospace",
                      fontSize: "0.76rem",
                      color: api.authType === "None" ? C.danger : C.textPrimary,
                    }}
                  >
                    {api.authType}
                  </td>
                  <td style={{ padding: "0.8rem 1rem" }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <div
                        style={{
                          flex: 1,
                          height: 4,
                          background: "rgba(255,255,255,0.06)",
                          borderRadius: 2,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${api.risk}%`,
                            background: riskColor(api.risk),
                            borderRadius: 2,
                            transition: "width 0.5s ease",
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontFamily: "'Fira Code',monospace",
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          color: riskColor(api.risk),
                          minWidth: 24,
                        }}
                      >
                        {api.risk}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "0.8rem 1rem" }}>
                    <Btn
                      variant="primary"
                      onClick={() => onNavigate("detail", api)}
                      style={{ padding: "0.35rem 0.9rem", fontSize: "0.65rem" }}
                    >
                      View
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ── DASHBOARD RIGHT PANEL ── */}
      <div
        style={{
          position: "fixed",
          right: 0,
          top: 64,
          bottom: 0,
          width: 300,
          background: "rgba(10,14,26,0.96)",
          borderLeft: `1px solid ${C.border}`,
          display: "flex",
          flexDirection: "column",
          zIndex: 50,
          overflowY: "auto",
        }}
      >
        {/* Action & Control */}
        <div
          style={{ padding: "1.2rem", borderBottom: `1px solid ${C.border}` }}
        >
          <div
            style={{
              fontFamily: "'Fira Code',monospace",
              fontSize: "0.68rem",
              color: C.primaryLight,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontWeight: 600,
              marginBottom: "1rem",
            }}
          >
            Action &amp; Control
          </div>
          {[
            {
              label: "Real-Time Interception",
              val: realTimeInterception,
              set: () => {
                setRealTimeInterception((p) => !p);
                showToast(
                  `Interception ${realTimeInterception ? "disabled" : "enabled"}`,
                );
              },
            },
            {
              label: "Auto-Kill Mode",
              val: autoKillMode,
              set: () => {
                setAutoKillMode((p) => !p);
                showToast(`Auto-Kill ${autoKillMode ? "disabled" : "enabled"}`);
              },
              danger: true,
            },
          ].map(({ label, val, set, danger }) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.8rem",
              }}
            >
              <span style={{ fontSize: "0.78rem", color: C.textPrimary }}>
                {label}
              </span>
              <button
                onClick={set}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  background: val
                    ? danger
                      ? C.danger
                      : C.success
                    : "rgba(255,255,255,0.08)",
                  border: "none",
                  cursor: "pointer",
                  position: "relative",
                  transition: "background 0.25s",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    left: val ? 22 : 2,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "#fff",
                    transition: "left 0.25s",
                    display: "block",
                  }}
                />
              </button>
            </div>
          ))}
        </div>
        {/* Live Threat Feed */}
        <div style={{ padding: "1.2rem", flex: 1 }}>
          <div
            style={{
              fontFamily: "'Fira Code',monospace",
              fontSize: "0.68rem",
              color: C.primaryLight,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontWeight: 600,
              marginBottom: "1rem",
            }}
          >
            Live Threat Feed
          </div>
          {liveThreats.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: C.textMuted,
                fontSize: "0.78rem",
                padding: "2rem 0",
              }}
            >
              No threats detected
            </div>
          ) : (
            liveThreats.map((threat) => (
              <div
                key={threat.id}
                onClick={() => handleThreatClick(threat)}
                style={{
                  background: "rgba(239,68,68,0.06)",
                  border: `1px solid rgba(239,68,68,0.3)`,
                  borderRadius: 8,
                  padding: "0.8rem",
                  marginBottom: "0.6rem",
                  cursor: "pointer",
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = C.danger)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)")
                }
              >
                <div
                  style={{ display: "flex", alignItems: "flex-start", gap: 8 }}
                >
                  <span
                    style={{ color: C.danger, fontSize: "1rem", marginTop: 1 }}
                  >
                    ⚠
                  </span>
                  <div>
                    <div
                      style={{
                        fontFamily: "'Fira Code',monospace",
                        fontSize: "0.72rem",
                        color: C.textPrimary,
                        wordBreak: "break-all",
                      }}
                    >
                      {threat.endpoint}
                    </div>
                    <div
                      style={{
                        fontSize: "0.68rem",
                        color: C.danger,
                        marginTop: 3,
                      }}
                    >
                      {threat.type}
                    </div>
                    <div
                      style={{
                        fontSize: "0.65rem",
                        color: C.textMuted,
                        marginTop: 2,
                      }}
                    >
                      {threat.timestamp}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Simulate button */}
      {showSimBtn && (
        <div
          style={{
            position: "fixed",
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 60,
          }}
        >
          <button
            onClick={triggerZombieAttack}
            style={{
              background: "linear-gradient(135deg,#ef4444,#f97316)",
              color: "#fff",
              border: "none",
              borderRadius: 40,
              padding: "0.9rem 2.2rem",
              fontSize: "0.9rem",
              fontWeight: 700,
              fontFamily: "'Inter',sans-serif",
              cursor: "pointer",
              boxShadow: "0 4px 24px rgba(239,68,68,0.5)",
              letterSpacing: "0.03em",
              display: "flex",
              alignItems: "center",
              gap: 10,
              transition: "transform 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.transform = "scale(1.04)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.transform = "")}
          >
            ⚡ Simulate Zombie Attack
          </button>
        </div>
      )}

      {/* Threat Modal */}
      {modalOpen && selectedThreat && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{
              background: "#0f1420",
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: "2rem",
              maxWidth: 560,
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow: "0 16px 48px rgba(0,0,0,0.7)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: "0.5rem",
              }}
            >
              <span style={{ color: C.danger, fontSize: "1.4rem" }}>⚠</span>
              <div
                style={{
                  fontFamily: "'Inter',sans-serif",
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: C.textPrimary,
                }}
              >
                Zombie API Detected
              </div>
            </div>
            <div
              style={{
                fontSize: "0.78rem",
                color: C.textMuted,
                marginBottom: "1.5rem",
              }}
            >
              Critical security vulnerability identified
            </div>
            {/* Endpoint Info */}
            <div
              style={{
                background: "rgba(18,24,40,0.7)",
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "1rem",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  fontFamily: "'Fira Code',monospace",
                  fontSize: "0.68rem",
                  color: C.primaryLight,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "0.8rem",
                  fontWeight: 600,
                }}
              >
                Endpoint Details
              </div>
              {[
                ["URL", selectedThreat.endpoint, C.danger],
                ["Method", selectedThreat.details.method, C.textPrimary],
                ["Type", selectedThreat.type, C.danger],
                ["Detected", selectedThreat.timestamp, C.textPrimary],
              ].map(([k, v, col]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.76rem",
                    fontFamily: "'Fira Code',monospace",
                    padding: "0.3rem 0",
                  }}
                >
                  <span style={{ color: C.textMuted }}>{k}:</span>
                  <span style={{ color: col }}>{v}</span>
                </div>
              ))}
            </div>
            {/* Security Posture */}
            <div
              style={{
                background: "rgba(18,24,40,0.7)",
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "1rem",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  fontFamily: "'Fira Code',monospace",
                  fontSize: "0.68rem",
                  color: "#fbbf24",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "0.8rem",
                  fontWeight: 600,
                }}
              >
                Security Posture
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.5rem",
                  fontSize: "0.76rem",
                }}
              >
                {[
                  ["Authentication", selectedThreat.details.authentication],
                  ["Encryption", selectedThreat.details.encryption],
                  ["Rate Limiting", selectedThreat.details.rateLimit],
                  ["Data Exposure", selectedThreat.details.dataExposure],
                ].map(([k, v]) => (
                  <div key={k}>
                    <span style={{ color: C.textMuted }}>{k}: </span>
                    <span
                      style={{
                        color:
                          v === "None" || v === "High" ? C.danger : C.success,
                        fontWeight: 600,
                        fontFamily: "'Fira Code',monospace",
                      }}
                    >
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {/* AI Recommendations */}
            <div
              style={{
                background: "rgba(65,155,209,0.08)",
                border: `1px solid rgba(65,155,209,0.25)`,
                borderRadius: 8,
                padding: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              <div
                style={{
                  fontFamily: "'Fira Code',monospace",
                  fontSize: "0.68rem",
                  color: C.primaryLight,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "0.8rem",
                  fontWeight: 600,
                }}
              >
                🧠 AI Security Advisor
              </div>
              {selectedThreat.aiRecommendations.map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 8,
                    fontSize: "0.76rem",
                    color: C.textPrimary,
                    marginBottom: "0.5rem",
                    lineHeight: 1.5,
                  }}
                >
                  <span style={{ color: C.primaryLight, flexShrink: 0 }}>
                    ⚡
                  </span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
            {/* Terminate button */}
            <button
              onClick={handleTerminate}
              disabled={isTerminating}
              style={{
                width: "100%",
                padding: "1rem",
                background: "linear-gradient(135deg,#dc2626,#ef4444)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: "1rem",
                fontWeight: 700,
                fontFamily: "'Inter',sans-serif",
                cursor: isTerminating ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                letterSpacing: "0.04em",
                boxShadow: "0 4px 16px rgba(239,68,68,0.4)",
                opacity: isTerminating ? 0.7 : 1,
              }}
            >
              {isTerminating ? "⏳ Terminating…" : "⚡ TERMINATE ENDPOINT"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

/* ── DETAIL PAGE ── */
function DetailPage({ api, showToast }) {
  if (!api)
    return (
      <div
        style={{
          padding: "4rem",
          textAlign: "center",
          color: C.textMuted,
          fontFamily: "'Fira Code',monospace",
          fontSize: "0.8rem",
        }}
      >
        No API selected.
      </div>
    );

  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const size = 100,
      cx = 50,
      cy = 50,
      r = 38,
      score = api.risk;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    const color = score >= 75 ? "#ef4444" : score >= 50 ? "#f97316" : "#fbbf24";
    const pct = score / 100;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI * 2 - Math.PI / 2);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, pct * Math.PI * 2 - Math.PI / 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.stroke();
  }, [api]);

  const aiMsg =
    api.status === "zombie"
      ? `THREAT LEVEL: CRITICAL. This endpoint has been inactive for ${api.daysAgo} days with no authentication. Recommend immediate decommissioning. Leaving this API active exposes a lateral attack vector with a risk score of ${api.risk}/100. Priority: URGENT.`
      : api.status === "deprecated"
        ? `This API is deprecated and should be retired. Risk score: ${api.risk}/100. Migrate consumers to v3 endpoints. Schedule decommission within 30 days to reduce attack surface.`
        : api.status === "orphaned"
          ? `No owner assigned. Risk score: ${api.risk}/100. Assign ownership or block immediately. Unmonitored endpoints are common entry points for lateral movement.`
          : `API appears healthy. Risk score: ${api.risk}/100. Continue standard monitoring. Verify rate limiting is configured and review auth tokens quarterly.`;

  const checks = [
    {
      id: "auth",
      label:
        api.authType !== "None"
          ? `Authenticated (${api.authType})`
          : "No Authentication",
      pass: api.authType !== "None",
    },
    {
      id: "https",
      label: api.https ? "HTTPS Enabled" : "HTTP Only",
      pass: api.https,
    },
    {
      id: "rate",
      label: api.rateLimit ? "Rate Limiting Active" : "No Rate Limiting",
      pass: api.rateLimit,
    },
    {
      id: "sensitive",
      label: !api.sensitiveData
        ? "No Sensitive Exposure"
        : "Sensitive Data Exposed",
      pass: !api.sensitiveData,
    },
  ];

  const reasons = [];
  if (api.daysAgo > 30)
    reasons.push(`No traffic detected for ${api.daysAgo} days`);
  if (api.authType === "None") reasons.push("No authentication configured");
  if (api.status === "zombie")
    reasons.push("Not referenced in active codebase");
  if (api.sensitiveData)
    reasons.push("Potential sensitive data exposure detected");
  if (!api.rateLimit) reasons.push("Rate limiting not enforced");
  if (api.status === "deprecated")
    reasons.push("Marked deprecated in API registry");
  if (api.status === "orphaned") reasons.push("No known owner or maintainer");
  if (reasons.length === 0) reasons.push("API appears healthy and active");

  return (
    <main
      style={{
        padding: "2.5rem 2.5rem 4rem",
        maxWidth: 1400,
        margin: "0 auto",
      }}
    >
      {/* Hero */}
      <Panel style={{ marginBottom: "1.6rem" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "2rem" }}>
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontFamily: "'Fira Code',monospace",
                fontSize: "0.68rem",
                color: C.textMuted,
                letterSpacing: ".05em",
                textTransform: "uppercase",
                marginBottom: ".5rem",
                fontWeight: 500,
              }}
            >
              API Endpoint
            </p>
            <div
              style={{
                fontFamily: "'Fira Code',monospace",
                fontSize: "1.4rem",
                fontWeight: 700,
                color: C.primaryLight,
                marginBottom: ".7rem",
                wordBreak: "break-all",
              }}
            >
              {api.endpoint}
            </div>
            <div style={{ marginBottom: "1.2rem" }}>
              <Badge status={api.status} />
            </div>
            <div
              style={{
                fontSize: ".8rem",
                color: C.textMuted,
                fontFamily: "'Fira Code',monospace",
                fontWeight: 500,
              }}
            >
              Detected & classified by Zombie API Defender engine v2.4
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: ".4rem",
              minWidth: 110,
            }}
          >
            <p
              style={{
                fontFamily: "'Inter',sans-serif",
                fontSize: ".6rem",
                letterSpacing: ".05em",
                color: C.textMuted,
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              Risk Score
            </p>
            <canvas ref={canvasRef} width="100" height="100" />
            <div
              style={{
                fontFamily: "'Inter',sans-serif",
                fontSize: "1.5rem",
                fontWeight: 800,
                color: riskColor(api.risk),
                lineHeight: 1,
              }}
            >
              {api.risk}
            </div>
            <p
              style={{
                fontFamily: "'Fira Code',monospace",
                fontSize: ".6rem",
                color: C.textMuted,
                fontWeight: 500,
              }}
            >
              / 100
            </p>
          </div>
        </div>
      </Panel>

      {/* Actions + AI */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1.4rem",
          marginBottom: "1.6rem",
        }}
      >
        <Panel style={{ marginBottom: 0 }}>
          <div
            style={{
              fontFamily: "'Inter',sans-serif",
              fontSize: "0.68rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: C.primaryLight,
              marginBottom: "1rem",
              fontWeight: 600,
            }}
          >
            Action Panel
          </div>
          <p
            style={{
              fontSize: ".78rem",
              color: C.textMuted,
              marginBottom: "1.2rem",
              fontFamily: "'Inter',sans-serif",
              lineHeight: 1.6,
            }}
          >
            Execute remediation actions on this endpoint:
          </p>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}
          >
            {[
              { label: "Mark for Decommission", v: "danger" },
              { label: "Add Authentication", v: "warning" },
              { label: "Block API", v: "purple" },
            ].map(({ label, v }) => (
              <Btn
                key={label}
                variant={v}
                onClick={() => showToast(`Action: ${label} — ${api.endpoint}`)}
              >
                {label}
              </Btn>
            ))}
          </div>
        </Panel>
        <Panel style={{ marginBottom: 0 }}>
          <div
            style={{
              fontFamily: "'Inter',sans-serif",
              fontSize: "0.68rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: C.primaryLight,
              marginBottom: "1rem",
              fontWeight: 600,
            }}
          >
            AI Recommendation
          </div>
          <div
            style={{
              background: "rgba(10,16,30,0.7)",
              borderRadius: 8,
              padding: "1rem",
              border: `1px solid ${C.border}`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.8rem",
              }}
            >
              <span
                style={{
                  fontFamily: "'Fira Code',monospace",
                  fontSize: "0.6rem",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  padding: "0.2rem 0.6rem",
                  borderRadius: 4,
                  background: "rgba(65,155,209,0.12)",
                  color: C.primaryLight,
                  fontWeight: 600,
                }}
              >
                AI ENGINE v2
              </span>
              <span
                style={{
                  fontFamily: "'Fira Code',monospace",
                  fontSize: "0.63rem",
                  color: C.textMuted,
                }}
              >
                Threat model: ZombieNet-GPT
              </span>
            </div>
            <div
              style={{
                fontFamily: "'Fira Code',monospace",
                fontSize: "0.76rem",
                color: C.textPrimary,
                lineHeight: 1.7,
              }}
            >
              {aiMsg}
            </div>
          </div>
        </Panel>
      </div>

      {/* Three cols */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "1.2rem",
        }}
      >
        <Panel style={{ marginBottom: 0 }}>
          <div
            style={{
              fontFamily: "'Inter',sans-serif",
              fontSize: "0.68rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: C.primaryLight,
              marginBottom: "1rem",
              fontWeight: 600,
            }}
          >
            API Details
          </div>
          {[
            ["Last Used", api.lastUsed],
            ["Source", api.source],
            ["Owner", api.owner],
            ["Auth Type", api.authType],
            ["Risk Score", `${api.risk} / 100`],
            ["Status", api.status],
          ].map(([k, v]) => (
            <div
              key={k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0.5rem 0",
                borderBottom: `1px solid ${C.border}`,
              }}
            >
              <span
                style={{
                  fontFamily: "'Fira Code',monospace",
                  fontSize: "0.7rem",
                  color: C.textMuted,
                  fontWeight: 500,
                }}
              >
                {k}
              </span>
              <span
                style={{
                  fontFamily: "'Fira Code',monospace",
                  fontSize: "0.7rem",
                  color: C.textPrimary,
                  fontWeight: 600,
                }}
              >
                {v}
              </span>
            </div>
          ))}
        </Panel>
        <Panel style={{ marginBottom: 0 }}>
          <div
            style={{
              fontFamily: "'Inter',sans-serif",
              fontSize: "0.68rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: C.primaryLight,
              marginBottom: "1rem",
              fontWeight: 600,
            }}
          >
            Security Analysis
          </div>
          {checks.map(({ id, label, pass }) => (
            <div
              key={id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.6rem 0",
                borderBottom: `1px solid ${C.border}`,
              }}
            >
              <span style={{ fontSize: "0.78rem", color: C.textPrimary }}>
                {label}
              </span>
              <span
                style={{
                  fontFamily: "'Fira Code',monospace",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  color: pass ? C.success : C.danger,
                }}
              >
                {pass ? "✓" : "✗"}
              </span>
            </div>
          ))}
        </Panel>
        <Panel style={{ marginBottom: 0 }}>
          <div
            style={{
              fontFamily: "'Inter',sans-serif",
              fontSize: "0.68rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: C.primaryLight,
              marginBottom: "1rem",
              fontWeight: 600,
            }}
          >
            Classification
          </div>
          <div
            style={{
              background: "rgba(10,16,30,0.6)",
              borderRadius: 8,
              padding: "1rem",
              border: `1px solid ${C.border}`,
            }}
          >
            <h4
              style={{
                fontSize: "0.76rem",
                fontWeight: 600,
                color: C.textPrimary,
                marginBottom: "0.8rem",
                fontFamily: "'Inter',sans-serif",
              }}
            >
              This API is classified as {api.status.toUpperCase()} because:
            </h4>
            <ul
              style={{
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              {reasons.map((r, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: "0.74rem",
                    color: C.textMuted,
                    fontFamily: "'Inter',sans-serif",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 6,
                  }}
                >
                  <span
                    style={{ color: C.danger, marginTop: 2, flexShrink: 0 }}
                  >
                    ›
                  </span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>
    </main>
  );
}

/* ── TRAPS PAGE ── */
function TrapsPage({ showToast }) {
  const [traps, setTraps] = useState(() =>
    TRAP_ENDPOINTS.map((ep, i) => makeTrap(i, ep)),
  );
  const [manualActions, setManualActions] = useState(0);
  const [lastIp, setLastIp] = useState("None");
  const [lastCmd, setLastCmd] = useState("None");
  const [globalMode, setGlobalMode] = useState("Adaptive");
  const [miTarget, setMiTarget] = useState(0);
  const [miAction, setMiAction] = useState("ban");
  const [miIp, setMiIp] = useState("");
  const [miDuration, setMiDuration] = useState(60);
  const [miReason, setMiReason] = useState("");
  const [activities, setActivities] = useState([
    {
      type: "blocked",
      text: "192.168.1.145 blocked after 7 exploitation attempts on /api/legacy/auth",
      time: "2 min ago",
    },
    {
      type: "armed",
      text: "Trap activated on /api/deprecated/users",
      time: "15 min ago",
    },
    {
      type: "triggered",
      text: "10.45.22.88 triggered trap on /api/v1/private",
      time: "22 min ago",
    },
    {
      type: "blocked",
      text: "172.16.0.50 network-wide IP ban issued",
      time: "31 min ago",
    },
    {
      type: "triggered",
      text: "/api/internal/admin exploit attempt detected",
      time: "45 min ago",
    },
    {
      type: "armed",
      text: "New trap configured for zombie APIs",
      time: "1 hour ago",
    },
    {
      type: "blocked",
      text: "Cascading IPs (12 addresses) banned",
      time: "2 hours ago",
    },
    {
      type: "triggered",
      text: "Anomalous pattern on /api/orphaned/export",
      time: "3 hours ago",
    },
  ]);

  const randomIp = () => {
    const a = rand(1, 223),
      b = rand(0, 255),
      c = rand(0, 255),
      d = rand(0, 255);
    return `${a}.${b}.${c}.${d}`;
  };
  const pushActivity = (type, text) =>
    setActivities((prev) =>
      [{ type, text, time: "just now" }, ...prev].slice(0, 12),
    );
  const toggleTrap = (id) => {
    setTraps((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              armed: !t.armed,
              lastTriggered: !t.armed ? t.lastTriggered : "Never",
            }
          : t,
      ),
    );
  };

  const metrics = {
    active: traps.filter((t) => t.armed).length,
    ipBans: traps.reduce((s, t) => s + t.bans, 0),
    threats: traps.reduce((s, t) => s + t.triggered, 0),
    avgLatency: Math.round(
      traps.reduce((s, t) => s + t.latency, 0) / Math.max(1, traps.length),
    ),
  };

  const handleExecute = () => {
    const trap = traps[miTarget];
    if (!trap) return;
    const ip = miIp || randomIp();
    if (miAction === "ban") {
      setTraps((prev) =>
        prev.map((t) =>
          t.id === trap.id
            ? {
                ...t,
                bans: t.bans + 1,
                triggered: t.triggered + 1,
                lastTriggered: "Just now",
              }
            : t,
        ),
      );
      setLastIp(ip);
      pushActivity(
        "blocked",
        `${ip} manually blocked on ${trap.endpoint} for ${miDuration}m`,
      );
      setLastCmd("Manual IP Ban");
      showToast(`Manual ban applied to ${ip}`);
    } else if (miAction === "trigger") {
      setTraps((prev) =>
        prev.map((t) =>
          t.id === trap.id
            ? {
                ...t,
                armed: true,
                triggered: t.triggered + 1,
                lastTriggered: "Just now",
              }
            : t,
        ),
      );
      pushActivity(
        "triggered",
        `Forced trigger on ${trap.endpoint} from ${ip}`,
      );
      setLastCmd("Force Trigger");
      showToast(`Trigger fired for ${trap.endpoint}`);
    } else {
      setTraps((prev) =>
        prev.map((t) => (t.id === trap.id ? { ...t, armed: true } : t)),
      );
      pushActivity(
        "armed",
        `Quarantine on ${trap.endpoint} for ${miDuration}m`,
      );
      setLastCmd("Quarantine Endpoint");
      showToast(`Quarantine active on ${trap.endpoint}`);
    }
    setManualActions((p) => p + 1);
  };
  const handleSimulate = () => {
    const armed = traps.filter((t) => t.armed);
    const trap =
      armed[Math.floor(Math.random() * Math.max(1, armed.length))] || traps[0];
    const ip = randomIp();
    setTraps((prev) =>
      prev.map((t) =>
        t.id === trap.id
          ? {
              ...t,
              triggered: t.triggered + 1,
              bans: t.bans + 1,
              lastTriggered: "Just now",
            }
          : t,
      ),
    );
    setLastIp(ip);
    setManualActions((p) => p + 1);
    pushActivity(
      "blocked",
      `Simulation: attacker ${ip} trapped on ${trap.endpoint}`,
    );
    setLastCmd("Simulate Attack");
    showToast("Attack simulation complete");
  };
  const handleLockdown = () => {
    setTraps((prev) => prev.map((t) => ({ ...t, armed: true })));
    setManualActions((p) => p + 1);
    setGlobalMode("Lockdown");
    pushActivity("armed", "Emergency lockdown — all traps armed network-wide");
    setLastCmd("Emergency Lockdown");
    showToast("Emergency lockdown activated");
  };

  const inputStyle = {
    background: "rgba(10,16,30,0.7)",
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: C.textPrimary,
    fontFamily: "'Fira Code',monospace",
    fontSize: "0.76rem",
    padding: "0.6rem 0.7rem",
    outline: "none",
    width: "100%",
  };

  return (
    <main
      style={{
        padding: "2.5rem 2.5rem 4rem",
        maxWidth: 1400,
        margin: "0 auto",
      }}
    >
      {/* Metrics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: "1.2rem",
          marginBottom: "2rem",
        }}
      >
        {[
          {
            label: "Active Traps",
            val: metrics.active,
            sub: "Armed and monitoring",
          },
          { label: "IP Bans", val: metrics.ipBans, sub: "Network-wide blocks" },
          { label: "Threats Caught", val: metrics.threats, sub: "This month" },
          {
            label: "Response Time",
            val: `${metrics.avgLatency}ms`,
            sub: "Average ban latency",
          },
        ].map(({ label, val, sub }) => (
          <div
            key={label}
            style={{
              padding: "1.2rem",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              background: "rgba(18,24,40,0.5)",
            }}
          >
            <div
              style={{
                fontFamily: "'Fira Code',monospace",
                fontSize: "0.7rem",
                color: C.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                marginBottom: "0.5rem",
                fontWeight: 600,
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontSize: "1.8rem",
                fontWeight: 700,
                color: C.primaryLight,
                fontFamily: "'Inter',sans-serif",
              }}
            >
              {val}
            </div>
            <div
              style={{
                fontSize: "0.7rem",
                color: C.textMuted,
                marginTop: "0.4rem",
              }}
            >
              {sub}
            </div>
          </div>
        ))}
      </div>

      {/* Manual Intervention */}
      <SectionTitle>Manual Intervention</SectionTitle>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 0.8fr",
          gap: "1.2rem",
          marginBottom: "2rem",
        }}
      >
        <Panel style={{ marginBottom: 0 }}>
          <div
            style={{
              fontFamily: "'Fira Code',monospace",
              fontSize: "0.72rem",
              color: C.primaryLight,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: "1rem",
              fontWeight: 600,
            }}
          >
            Operator Console
          </div>
          <div
            style={{
              display: "flex",
              gap: "0.7rem",
              marginBottom: "1rem",
              flexWrap: "wrap",
            }}
          >
            <Btn variant="danger" onClick={handleExecute}>
              Execute
            </Btn>
            <Btn variant="warning" onClick={handleSimulate}>
              Simulate Attack
            </Btn>
            <Btn variant="primary" onClick={handleLockdown}>
              Emergency Lockdown
            </Btn>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.8rem",
            }}
          >
            {[
              {
                label: "Target Trap",
                el: (
                  <select
                    value={miTarget}
                    onChange={(e) => setMiTarget(Number(e.target.value))}
                    style={inputStyle}
                  >
                    {traps.map((t, i) => (
                      <option key={i} value={i}>
                        {t.endpoint}
                      </option>
                    ))}
                  </select>
                ),
              },
              {
                label: "Action",
                el: (
                  <select
                    value={miAction}
                    onChange={(e) => setMiAction(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="ban">Manual IP Ban</option>
                    <option value="trigger">Force Trigger</option>
                    <option value="quarantine">Quarantine Endpoint</option>
                  </select>
                ),
              },
              {
                label: "Source IP",
                el: (
                  <input
                    value={miIp}
                    onChange={(e) => setMiIp(e.target.value)}
                    style={inputStyle}
                    placeholder="203.0.113.24"
                  />
                ),
              },
              {
                label: "Duration (min)",
                el: (
                  <input
                    type="number"
                    value={miDuration}
                    onChange={(e) => setMiDuration(Number(e.target.value))}
                    style={inputStyle}
                    min="1"
                    max="1440"
                  />
                ),
              },
            ].map(({ label, el }) => (
              <div key={label}>
                <div
                  style={{
                    fontFamily: "'Fira Code',monospace",
                    fontSize: "0.66rem",
                    color: C.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    fontWeight: 600,
                    marginBottom: "0.35rem",
                  }}
                >
                  {label}
                </div>
                {el}
              </div>
            ))}
            <div style={{ gridColumn: "1/-1" }}>
              <div
                style={{
                  fontFamily: "'Fira Code',monospace",
                  fontSize: "0.66rem",
                  color: C.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  fontWeight: 600,
                  marginBottom: "0.35rem",
                }}
              >
                Reason
              </div>
              <textarea
                value={miReason}
                onChange={(e) => setMiReason(e.target.value)}
                style={{ ...inputStyle, minHeight: 72, resize: "vertical" }}
                placeholder="Suspicious scanner pattern from threat intel feed."
              />
            </div>
          </div>
        </Panel>
        <Panel style={{ marginBottom: 0 }}>
          <div
            style={{
              fontFamily: "'Fira Code',monospace",
              fontSize: "0.72rem",
              color: C.primaryLight,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: "1rem",
              fontWeight: 600,
            }}
          >
            Live Operator Stats
          </div>
          {[
            { label: "Manual Actions Today", val: manualActions },
            { label: "Last Manual Command", val: lastCmd },
            { label: "Last Blocked IP", val: lastIp },
            { label: "Global Mode", val: globalMode },
          ].map(({ label, val }) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                padding: "0.65rem 0.8rem",
                background: "rgba(10,16,30,0.5)",
                fontSize: "0.76rem",
                color: C.textMuted,
                marginBottom: "0.7rem",
              }}
            >
              <span>{label}</span>
              <span
                style={{
                  color: C.primaryLight,
                  fontFamily: "'Fira Code',monospace",
                  fontWeight: 700,
                  fontSize: "0.76rem",
                }}
              >
                {val}
              </span>
            </div>
          ))}
        </Panel>
      </div>

      {/* Trap Cards */}
      <SectionTitle>Configured Traps</SectionTitle>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
          gap: "1.4rem",
          marginBottom: "2rem",
        }}
      >
        {traps.map((trap) => (
          <div
            key={trap.id}
            style={{
              padding: "1.4rem",
              border: `1px solid ${trap.armed ? C.primaryLight : C.border}`,
              borderRadius: 8,
              background: trap.armed
                ? "rgba(65,155,209,0.12)"
                : "rgba(18,24,40,0.5)",
              transition: "all 0.3s",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.6rem",
                padding: "0.4rem 0.9rem",
                borderRadius: 4,
                fontSize: "0.7rem",
                fontFamily: "'Fira Code',monospace",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                marginBottom: "0.9rem",
                background: trap.armed
                  ? "rgba(34,197,94,0.15)"
                  : "rgba(239,68,68,0.15)",
                color: trap.armed ? C.success : C.danger,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "currentColor",
                  display: "inline-block",
                }}
              />
              {trap.armed ? "ARMED" : "DISARMED"}
            </div>
            <div
              style={{
                fontFamily: "'Inter',sans-serif",
                fontSize: "1rem",
                fontWeight: 600,
                color: C.textPrimary,
                marginBottom: "0.7rem",
              }}
            >
              {trap.endpoint}
            </div>
            <div
              style={{
                fontSize: "0.8rem",
                color: C.textMuted,
                lineHeight: 1.5,
                marginBottom: "1.2rem",
              }}
            >
              {trap.armed
                ? "Actively monitoring for exploitation attempts"
                : "Currently inactive"}
            </div>
            <div
              style={{
                borderTop: `1px solid ${C.border}`,
                paddingTop: "0.9rem",
                marginTop: "0.9rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              {[
                { label: "IP Bans", val: trap.bans },
                { label: "Triggers", val: trap.triggered },
                { label: "Avg Latency", val: `${trap.latency}ms` },
                { label: "Last Triggered", val: trap.lastTriggered },
              ].map(({ label, val }) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.75rem",
                    color: C.textMuted,
                  }}
                >
                  <span>{label}</span>
                  <span
                    style={{
                      color: C.primaryLight,
                      fontFamily: "'Fira Code',monospace",
                      fontWeight: 600,
                    }}
                  >
                    {val}
                  </span>
                </div>
              ))}
            </div>
            <div
              style={{ display: "flex", gap: "0.7rem", marginTop: "1.2rem" }}
            >
              <button
                onClick={() => {
                  toggleTrap(trap.id);
                  showToast(`Trap ${trap.armed ? "disarmed" : "armed"}`);
                }}
                style={{
                  flex: 1,
                  padding: "0.5rem 0.8rem",
                  border: `1px solid ${C.border}`,
                  borderRadius: 4,
                  background: "transparent",
                  color: C.textMuted,
                  fontSize: "0.7rem",
                  fontFamily: "'Fira Code',monospace",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(65,155,209,0.1)";
                  e.currentTarget.style.color = C.primaryLight;
                  e.currentTarget.style.borderColor = C.primaryLight;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = C.textMuted;
                  e.currentTarget.style.borderColor = C.border;
                }}
              >
                {trap.armed ? "Disarm" : "Arm"}
              </button>
              <button
                onClick={() => showToast(`Trap details for ${trap.endpoint}`)}
                style={{
                  flex: 1,
                  padding: "0.5rem 0.8rem",
                  border: `1px solid ${C.border}`,
                  borderRadius: 4,
                  background: "transparent",
                  color: C.textMuted,
                  fontSize: "0.7rem",
                  fontFamily: "'Fira Code',monospace",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(65,155,209,0.1)";
                  e.currentTarget.style.color = C.primaryLight;
                  e.currentTarget.style.borderColor = C.primaryLight;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = C.textMuted;
                  e.currentTarget.style.borderColor = C.border;
                }}
              >
                Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Activity Log */}
      <SectionTitle>Recent Activity</SectionTitle>
      <div
        style={{
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          background: "rgba(18,24,40,0.5)",
          overflow: "hidden",
        }}
      >
        {activities.map((act, i) => (
          <div
            key={i}
            style={{
              padding: "1rem 1.2rem",
              borderBottom:
                i < activities.length - 1 ? `1px solid ${C.border}` : "none",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              fontSize: "0.8rem",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                flexShrink: 0,
                background:
                  act.type === "blocked"
                    ? C.danger
                    : act.type === "armed"
                      ? C.success
                      : C.warning,
                boxShadow: `0 0 8px ${act.type === "blocked" ? C.danger : act.type === "armed" ? C.success : C.warning}60`,
              }}
            />
            <div style={{ flex: 1, color: C.textPrimary }}>{act.text}</div>
            <div
              style={{
                fontFamily: "'Fira Code',monospace",
                fontSize: "0.7rem",
                color: C.textMuted,
                whiteSpace: "nowrap",
              }}
            >
              {act.time}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

/* ── THREAT INTELLIGENCE PAGE ── */
function ThreatIntelligencePage({ showToast }) {
  const threats = [
    {
      id: 1,
      endpoint: "/api/v1/legacy-payment",
      status: "Critical",
      lastSeen: "2 hours ago",
      authentication: "None",
      risk: "High",
    },
    {
      id: 2,
      endpoint: "/api/old/user-data",
      status: "High",
      lastSeen: "5 hours ago",
      authentication: "Basic Auth",
      risk: "Medium",
    },
    {
      id: 3,
      endpoint: "/v2/deprecated/transaction",
      status: "Medium",
      lastSeen: "1 day ago",
      authentication: "API Key",
      risk: "Low",
    },
    {
      id: 4,
      endpoint: "/legacy/customer-info",
      status: "Critical",
      lastSeen: "30 minutes ago",
      authentication: "None",
      risk: "High",
    },
    {
      id: 5,
      endpoint: "/api/internal/debug",
      status: "Critical",
      lastSeen: "10 minutes ago",
      authentication: "None",
      risk: "High",
    },
    {
      id: 6,
      endpoint: "/api/v1/auth/token-old",
      status: "High",
      lastSeen: "3 hours ago",
      authentication: "Basic Auth",
      risk: "Medium",
    },
  ];
  const statusColors = {
    Critical: C.danger,
    High: C.warning,
    Medium: "#fbbf24",
  };
  const riskTextColors = { High: C.danger, Medium: C.warning, Low: C.success };
  return (
    <main
      style={{
        padding: "2.5rem 2.5rem 4rem",
        maxWidth: 1400,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: "2rem",
        }}
      >
        <span style={{ fontSize: "1.6rem" }}>🛡️</span>
        <h1
          style={{
            fontFamily: "'Inter',sans-serif",
            fontSize: "1.8rem",
            fontWeight: 700,
            color: C.textPrimary,
          }}
        >
          Threat Intelligence
        </h1>
      </div>
      {/* Stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        {[
          {
            label: "Critical Threats",
            val: threats.filter((t) => t.status === "Critical").length,
            color: C.danger,
          },
          {
            label: "High Severity",
            val: threats.filter((t) => t.status === "High").length,
            color: C.warning,
          },
          {
            label: "No Auth",
            val: threats.filter((t) => t.authentication === "None").length,
            color: C.danger,
          },
          {
            label: "Total Tracked",
            val: threats.length,
            color: C.primaryLight,
          },
        ].map(({ label, val, color }) => (
          <Panel key={label} style={{ padding: "1rem 1.2rem" }}>
            <div
              style={{
                fontFamily: "'Fira Code',monospace",
                fontSize: "0.62rem",
                color: C.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "0.4rem",
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontSize: "2rem",
                fontWeight: 700,
                color,
                fontFamily: "'Inter',sans-serif",
              }}
            >
              {val}
            </div>
          </Panel>
        ))}
      </div>
      <Panel>
        <SectionTitle>Active Threat Registry</SectionTitle>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: "'Inter',sans-serif",
              fontSize: "0.82rem",
            }}
          >
            <thead>
              <tr>
                {[
                  "Endpoint",
                  "Status",
                  "Last Seen",
                  "Authentication",
                  "Risk Level",
                  "Action",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "0.7rem 1rem",
                      fontFamily: "'Fira Code',monospace",
                      fontSize: "0.62rem",
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: C.textMuted,
                      borderBottom: `1px solid ${C.border}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {threats.map((threat) => (
                <tr
                  key={threat.id}
                  style={{
                    borderBottom: `1px solid ${C.border}`,
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(65,155,209,0.04)")
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <td
                    style={{
                      padding: "0.8rem 1rem",
                      fontFamily: "'Fira Code',monospace",
                      fontSize: "0.76rem",
                      color: C.primaryLight,
                    }}
                  >
                    {threat.endpoint}
                  </td>
                  <td style={{ padding: "0.8rem 1rem" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "0.2rem 0.7rem",
                        borderRadius: 99,
                        fontSize: "0.65rem",
                        fontWeight: 600,
                        fontFamily: "'Fira Code',monospace",
                        background: `${statusColors[threat.status]}22`,
                        color: statusColors[threat.status],
                        border: `1px solid ${statusColors[threat.status]}55`,
                      }}
                    >
                      ⚠ {threat.status}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "0.8rem 1rem",
                      color: C.textMuted,
                      fontSize: "0.76rem",
                    }}
                  >
                    {threat.lastSeen}
                  </td>
                  <td
                    style={{
                      padding: "0.8rem 1rem",
                      fontFamily: "'Fira Code',monospace",
                      fontSize: "0.76rem",
                      color:
                        threat.authentication === "None"
                          ? C.danger
                          : C.textMuted,
                    }}
                  >
                    {threat.authentication === "None" ? "✗ " : "✓ "}
                    {threat.authentication}
                  </td>
                  <td
                    style={{
                      padding: "0.8rem 1rem",
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      color: riskTextColors[threat.risk],
                    }}
                  >
                    {threat.risk}
                  </td>
                  <td style={{ padding: "0.8rem 1rem" }}>
                    <Btn
                      variant="danger"
                      onClick={() =>
                        showToast(`Investigating ${threat.endpoint}`)
                      }
                      style={{ padding: "0.35rem 0.9rem", fontSize: "0.65rem" }}
                    >
                      Investigate
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </main>
  );
}

/* ── AI RECOMMENDATIONS PAGE ── */
function AIRecommendationsPage({ showToast }) {
  const [applied, setApplied] = useState({});
  const recs = [
    {
      id: 1,
      title: "Implement API Gateway Authentication",
      description:
        "12 APIs detected without proper authentication mechanisms. Implement OAuth 2.0 with JWT tokens to eliminate unauthorized access vectors.",
      priority: "Critical",
      impact: "Reduces attack surface by 65%",
      endpoints: ["/api/v1/legacy-payment", "/api/old/user-data"],
      priorityColor: C.danger,
    },
    {
      id: 2,
      title: "Enable Rate Limiting",
      description:
        "Configure rate limiting to prevent DDoS attacks and API abuse across 8 vulnerable endpoints. Use token bucket algorithm.",
      priority: "High",
      impact: "Prevents 90% of automated attacks",
      endpoints: ["/v2/deprecated/transaction", "/legacy/customer-info"],
      priorityColor: C.warning,
    },
    {
      id: 3,
      title: "Upgrade TLS Protocol",
      description:
        "5 APIs still using TLS 1.1. Upgrade to TLS 1.3 for enhanced encryption and to eliminate known cipher suite vulnerabilities.",
      priority: "Medium",
      impact: "Improves data security by 40%",
      endpoints: ["/api/v1/secure-data"],
      priorityColor: "#fbbf24",
    },
    {
      id: 4,
      title: "Decommission Unused Endpoints",
      description:
        "15 zombie APIs identified with no legitimate traffic in the last 90 days. These represent unnecessary attack surface.",
      priority: "High",
      impact: "Reduces maintenance overhead by 25%",
      endpoints: ["/old/api/v1", "/deprecated/service"],
      priorityColor: C.warning,
    },
    {
      id: 5,
      title: "Enforce HTTPS Everywhere",
      description:
        "3 internal APIs serving over plain HTTP. All endpoints must enforce HTTPS to prevent MITM attacks and data interception.",
      priority: "Critical",
      impact: "Eliminates MITM attack vectors",
      endpoints: ["/api/internal/debug", "/api/legacy/sync"],
      priorityColor: C.danger,
    },
  ];
  return (
    <main
      style={{
        padding: "2.5rem 2.5rem 4rem",
        maxWidth: 1400,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: "0.5rem",
        }}
      >
        <span style={{ fontSize: "1.6rem" }}>🧠</span>
        <h1
          style={{
            fontFamily: "'Inter',sans-serif",
            fontSize: "1.8rem",
            fontWeight: 700,
            color: C.textPrimary,
          }}
        >
          AI Security Recommendations
        </h1>
      </div>
      <p
        style={{
          color: C.textMuted,
          fontSize: "0.85rem",
          marginBottom: "2rem",
          fontFamily: "'Inter',sans-serif",
        }}
      >
        Powered by ZombieNet-AI engine — analysed {recs.length} actionable
        recommendations
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
        {recs.map((rec) => (
          <Panel key={rec.id} style={{ transition: "border-color 0.3s" }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "1.5rem",
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: "0.6rem",
                  }}
                >
                  <span style={{ fontSize: "1.1rem" }}>💡</span>
                  <h3
                    style={{
                      fontFamily: "'Inter',sans-serif",
                      fontSize: "1rem",
                      fontWeight: 700,
                      color: C.textPrimary,
                    }}
                  >
                    {rec.title}
                  </h3>
                </div>
                <p
                  style={{
                    color: C.textMuted,
                    fontSize: "0.8rem",
                    lineHeight: 1.6,
                    marginBottom: "0.9rem",
                    fontFamily: "'Inter',sans-serif",
                  }}
                >
                  {rec.description}
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: "0.9rem",
                  }}
                >
                  <span
                    style={{
                      padding: "0.2rem 0.7rem",
                      borderRadius: 99,
                      fontSize: "0.65rem",
                      fontWeight: 600,
                      fontFamily: "'Fira Code',monospace",
                      background: `${rec.priorityColor}22`,
                      color: rec.priorityColor,
                      border: `1px solid ${rec.priorityColor}44`,
                    }}
                  >
                    {rec.priority} Priority
                  </span>
                  <span style={{ fontSize: "0.76rem", color: C.success }}>
                    ✓ {rec.impact}
                  </span>
                </div>
                <div
                  style={{
                    background: "rgba(10,14,26,0.6)",
                    borderRadius: 6,
                    padding: "0.7rem 0.9rem",
                    border: `1px solid ${C.border}`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Fira Code',monospace",
                      fontSize: "0.6rem",
                      color: C.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Affected Endpoints:
                  </div>
                  {rec.endpoints.map((ep, i) => (
                    <div
                      key={i}
                      style={{
                        fontFamily: "'Fira Code',monospace",
                        fontSize: "0.74rem",
                        color: C.primaryLight,
                        marginBottom: 2,
                      }}
                    >
                      {ep}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Btn
                  variant={applied[rec.id] ? "primary" : "warning"}
                  onClick={() => {
                    setApplied((p) => ({ ...p, [rec.id]: true }));
                    showToast(`Applied: ${rec.title}`);
                  }}
                  style={{ whiteSpace: "nowrap", fontSize: "0.74rem" }}
                >
                  {applied[rec.id] ? "✓ Applied" : "Apply Fix"}
                </Btn>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </main>
  );
}

/* ── SETTINGS PAGE ── */
function SettingsPage({ showToast }) {
  const [settings, setSettings] = useState({
    emailAlerts: true,
    slackIntegration: false,
    smsNotifications: true,
    autoThreatResponse: true,
    compressLogs: true,
    gatewayUrl: "https://kong-gateway.bank.local",
    scanInterval: "5",
    logRetention: "90",
  });
  const toggle = (key) => setSettings((p) => ({ ...p, [key]: !p[key] }));
  const update = (key, val) => setSettings((p) => ({ ...p, [key]: val }));
  const inputStyle = {
    background: "rgba(10,16,30,0.7)",
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: C.textPrimary,
    fontFamily: "'Fira Code',monospace",
    fontSize: "0.82rem",
    padding: "0.6rem 0.8rem",
    outline: "none",
    width: "100%",
  };
  const ToggleRow = ({ label, desc, k }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.8rem 0",
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div>
        <div
          style={{
            color: C.textPrimary,
            fontSize: "0.85rem",
            fontWeight: 500,
            fontFamily: "'Inter',sans-serif",
          }}
        >
          {label}
        </div>
        {desc && (
          <div
            style={{
              color: C.textMuted,
              fontSize: "0.74rem",
              marginTop: 2,
              fontFamily: "'Inter',sans-serif",
            }}
          >
            {desc}
          </div>
        )}
      </div>
      <button
        onClick={() => toggle(k)}
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          background: settings[k] ? C.success : "rgba(255,255,255,0.08)",
          border: "none",
          cursor: "pointer",
          position: "relative",
          transition: "background 0.25s",
          flexShrink: 0,
          marginLeft: 16,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: settings[k] ? 22 : 2,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#fff",
            transition: "left 0.25s",
            display: "block",
          }}
        />
      </button>
    </div>
  );
  return (
    <main
      style={{ padding: "2.5rem 2.5rem 4rem", maxWidth: 900, margin: "0 auto" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: "2rem",
        }}
      >
        <span style={{ fontSize: "1.6rem" }}>⚙️</span>
        <h1
          style={{
            fontFamily: "'Inter',sans-serif",
            fontSize: "1.8rem",
            fontWeight: 700,
            color: C.textPrimary,
          }}
        >
          Settings
        </h1>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.4rem" }}>
        {/* Notifications */}
        <Panel>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: "1rem",
            }}
          >
            <span style={{ fontSize: "1.1rem" }}>🔔</span>
            <div
              style={{
                fontFamily: "'Inter',sans-serif",
                fontSize: "1rem",
                fontWeight: 700,
                color: C.textPrimary,
              }}
            >
              Notifications
            </div>
          </div>
          <ToggleRow
            label="Email Alerts"
            desc="Receive email notifications for critical threats"
            k="emailAlerts"
          />
          <ToggleRow
            label="Slack Integration"
            desc="Send alerts to Slack channel"
            k="slackIntegration"
          />
          <ToggleRow
            label="SMS Notifications"
            desc="Send SMS for severe threats"
            k="smsNotifications"
          />
        </Panel>
        {/* Security Config */}
        <Panel>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: "1rem",
            }}
          >
            <span style={{ fontSize: "1.1rem" }}>🛡️</span>
            <div
              style={{
                fontFamily: "'Inter',sans-serif",
                fontSize: "1rem",
                fontWeight: 700,
                color: C.textPrimary,
              }}
            >
              Security Configuration
            </div>
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <div
              style={{
                fontFamily: "'Fira Code',monospace",
                fontSize: "0.66rem",
                color: C.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                fontWeight: 600,
                marginBottom: "0.4rem",
              }}
            >
              API Gateway URL
            </div>
            <input
              value={settings.gatewayUrl}
              onChange={(e) => update("gatewayUrl", e.target.value)}
              style={inputStyle}
              placeholder="https://api-gateway.yourbank.com"
            />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <div
              style={{
                fontFamily: "'Fira Code',monospace",
                fontSize: "0.66rem",
                color: C.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                fontWeight: 600,
                marginBottom: "0.4rem",
              }}
            >
              Scan Interval (minutes)
            </div>
            <input
              type="number"
              value={settings.scanInterval}
              onChange={(e) => update("scanInterval", e.target.value)}
              style={inputStyle}
              min="1"
            />
          </div>
          <ToggleRow
            label="Automatic Threat Response"
            desc="Enable AI-powered automated threat mitigation"
            k="autoThreatResponse"
          />
        </Panel>
        {/* Data Retention */}
        <Panel>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: "1rem",
            }}
          >
            <span style={{ fontSize: "1.1rem" }}>🗄️</span>
            <div
              style={{
                fontFamily: "'Inter',sans-serif",
                fontSize: "1rem",
                fontWeight: 700,
                color: C.textPrimary,
              }}
            >
              Data Retention
            </div>
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <div
              style={{
                fontFamily: "'Fira Code',monospace",
                fontSize: "0.66rem",
                color: C.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                fontWeight: 600,
                marginBottom: "0.4rem",
              }}
            >
              Log Retention Period (days)
            </div>
            <input
              type="number"
              value={settings.logRetention}
              onChange={(e) => update("logRetention", e.target.value)}
              style={inputStyle}
              min="1"
            />
          </div>
          <ToggleRow
            label="Compress Old Logs"
            desc="Automatically compress logs older than 30 days"
            k="compressLogs"
          />
        </Panel>
        {/* Save */}
        <Btn
          variant="primary"
          onClick={() => showToast("Settings saved successfully ✓")}
          style={{
            padding: "0.8rem 2rem",
            fontSize: "0.85rem",
            justifyContent: "center",
            width: "100%",
          }}
        >
          Save Settings
        </Btn>
      </div>
    </main>
  );
}

/* ── ROOT APP ── */
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [selectedApi, setSelectedApi] = useState(null);
  const [toast, setToast] = useState({ msg: "", show: false });
  const toastTimer = useRef(null);

  const showToast = (msg) => {
    setToast({ msg, show: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(
      () => setToast((p) => ({ ...p, show: false })),
      3000,
    );
  };
  const navigate = (p, api) => {
    if (p === "detail" && api) setSelectedApi(api);
    setPage(p);
  };

  return (
    <>
      <style>{globalCss}</style>
      <BgCanvas />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "row",
          animation: "pageIn 0.5s cubic-bezier(0.23,1,0.32,1) both",
        }}
      >
        <Header page={page} onNavigate={navigate} />
        <div style={{ flex: 1, minWidth: 5 }}>
          {page === "dashboard" && (
            <Dashboard onNavigate={navigate} showToast={showToast} />
          )}
          {page === "detail" && (
            <DetailPage api={selectedApi} showToast={showToast} />
          )}
          {page === "traps" && <TrapsPage showToast={showToast} />}
          {page === "threat" && (
            <ThreatIntelligencePage showToast={showToast} />
          )}
          {page === "ai-recs" && (
            <AIRecommendationsPage showToast={showToast} />
          )}
          {page === "settings" && <SettingsPage showToast={showToast} />}
        </div>
      </div>
      <Toast msg={toast.msg} show={toast.show} />
    </>
  );
}
