/* global React */
// Golgoro — Emergency legal/expert connect app
// 3 screens: SOS input → AI analysis + recommendations → Expert profile
// Styled with Starbucks Design System (cream canvas, green CTAs, pill buttons, soft shadows)

const G = {
  // Greens (mapped to roles per Starbucks DS)
  starbucksGreen: '#006241', // headings
  greenAccent:    '#00754A', // CTAs
  houseGreen:     '#1E3932', // dark surfaces
  greenUplift:    '#2b5148',
  greenLight:     '#d4e9e2',
  // Surfaces
  cream:          '#f2f0eb',
  ceramic:        '#edebe9',
  white:          '#ffffff',
  neutralCool:    '#f9f9f9',
  // Text
  textBlack:      'rgba(0,0,0,0.87)',
  textSoft:       'rgba(0,0,0,0.58)',
  // Semantic
  red:            '#c82014',
  gold:           '#cba258',
  hairline:       '#e7e7e7',
  inputBorder:    '#d6dbde',
};

const SHADOW_CARD = '0 0 0.5px 0 rgba(0,0,0,0.14), 0 1px 1px 0 rgba(0,0,0,0.24)';
const SHADOW_NAV  = '0 1px 3px rgba(0,0,0,0.10), 0 2px 2px rgba(0,0,0,0.06), 0 0 2px rgba(0,0,0,0.07)';
const SHADOW_FRAP = '0 0 6px rgba(0,0,0,0.24), 0 8px 12px rgba(0,0,0,0.14)';

// ─── Icon helpers (Lucide-style stroke) ─────────────────────────
const Icon = ({ d, size = 20, stroke = 'currentColor', sw = 1.8, fill = 'none', children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke}
       strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {children || <path d={d} />}
  </svg>
);

const IconChevronLeft = (p) => <Icon {...p}><polyline points="15 18 9 12 15 6"/></Icon>;
const IconMic = (p) => (
  <Icon {...p}>
    <rect x="9" y="2" width="6" height="12" rx="3"/>
    <path d="M5 10v2a7 7 0 0 0 14 0v-2"/>
    <line x1="12" y1="21" x2="12" y2="19"/>
  </Icon>
);
const IconPhone = (p) => (
  <Icon {...p}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"/>
  </Icon>
);
const IconClipboard = (p) => (
  <Icon {...p}>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1"/>
    <line x1="9" y1="12" x2="15" y2="12"/>
    <line x1="9" y1="16" x2="13" y2="16"/>
  </Icon>
);
const IconBolt = (p) => <Icon {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></Icon>;
const IconCheck = (p) => <Icon {...p}><polyline points="20 6 9 17 4 12"/></Icon>;
const IconPlay = (p) => <Icon {...p} fill="currentColor" sw={0}><polygon points="6 4 20 12 6 20 6 4"/></Icon>;
const IconArrowRight = (p) => <Icon {...p}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></Icon>;
const IconShield = (p) => <Icon {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></Icon>;
const IconStar = (p) => <Icon {...p} fill="currentColor" sw={0}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></Icon>;
const IconSOS = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
    <circle cx="14" cy="14" r="13" fill={G.red}/>
    <text x="14" y="16.5" textAnchor="middle" fontSize="8.5" fontWeight="800"
          fontFamily="'NanumSquareNeo', 'Inter', sans-serif"
          fill="#fff" letterSpacing="0.3">SOS</text>
  </svg>
);

// ─── Pill button (Starbucks signature) ────────────────────────
function Pill({ variant = 'filled', size = 'md', children, onClick, full, leadIcon, style = {}, dark = false }) {
  const [pressed, setPressed] = React.useState(false);
  const bases = {
    filled:  { bg: G.greenAccent, fg: '#fff',          bd: G.greenAccent },
    outline: { bg: 'transparent', fg: dark ? '#fff' : G.textBlack, bd: dark ? 'rgba(255,255,255,0.6)' : G.textBlack },
    ghost:   { bg: 'transparent', fg: G.greenAccent,   bd: 'transparent' },
    danger:  { bg: G.red,         fg: '#fff',          bd: G.red },
    light:   { bg: '#fff',        fg: G.textBlack,     bd: '#fff' },
  }[variant];
  const sizes = {
    sm: { pad: '8px 16px', fs: 13 },
    md: { pad: '12px 24px', fs: 14 },
    lg: { pad: '16px 28px', fs: 15 },
  }[size];
  return (
    <button
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        background: bases.bg,
        color: bases.fg,
        border: `1.5px solid ${bases.bd}`,
        borderRadius: 50,
        padding: sizes.pad,
        fontSize: sizes.fs,
        fontWeight: 700,
        fontFamily: 'inherit',
        letterSpacing: '-0.16px',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: full ? '100%' : 'auto',
        transform: pressed ? 'scale(0.95)' : 'scale(1)',
        transition: 'transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease',
        ...style,
      }}>
      {leadIcon}
      {children}
    </button>
  );
}

// ─── Top bar (in-app, below status bar) ──────────────────────
function TopBar({ left, right, title, onBack, dark = false }) {
  return (
    <div style={{
      paddingTop: 54, // clear iOS status bar (absolutely positioned)
      paddingBottom: 8, paddingLeft: 16, paddingRight: 16,
      minHeight: 56, boxSizing: 'border-box',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: dark ? G.houseGreen : G.cream,
      color: dark ? '#fff' : G.textBlack,
      borderBottom: dark ? 'none' : `1px solid ${G.hairline}`,
      flex: '0 0 auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 80 }}>
        {onBack && (
          <button onClick={onBack} aria-label="Back" style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'inherit', padding: 4, display: 'flex', alignItems: 'center',
          }}>
            <IconChevronLeft size={24} sw={2.2}/>
          </button>
        )}
        {left}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.16px' }}>{title}</div>
      <div style={{ minWidth: 80, display: 'flex', justifyContent: 'flex-end' }}>{right}</div>
    </div>
  );
}

window.GolgoroTokens = G;
window.SHADOW_CARD = SHADOW_CARD;
window.SHADOW_NAV  = SHADOW_NAV;
window.SHADOW_FRAP = SHADOW_FRAP;
Object.assign(window, {
  Pill, TopBar,
  IconChevronLeft, IconMic, IconPhone, IconClipboard, IconBolt,
  IconCheck, IconPlay, IconArrowRight, IconShield, IconStar, IconSOS,
});
