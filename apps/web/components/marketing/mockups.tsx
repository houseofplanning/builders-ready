/**
 * Inline SVG mockups of the mobile app and the web dashboard.
 *
 * These are illustrative — not literal screenshots — so they look polished
 * in marketing layouts without requiring a real device export, and they
 * stay aligned with the live product even when we tweak colours.
 *
 * Colours match the design tokens: --br-primary (#0F4C5C teal),
 * --br-accent (#E07A5F terracotta). Use Tailwind currentColor for body
 * text so the mockup can sit on light or dark backgrounds.
 */

interface PhoneProps {
  className?: string;
}

/** Mobile home: project grid view (owner with multiple projects). */
export function MockupProjectGrid({ className }: PhoneProps) {
  return (
    <svg
      viewBox="0 0 320 640"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Builders Ready mobile app — list of projects with progress bars"
    >
      <defs>
        <linearGradient id="progGrad1" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#0F4C5C" />
          <stop offset="100%" stopColor="#E07A5F" />
        </linearGradient>
      </defs>
      {/* Device shell */}
      <rect width="320" height="640" rx="40" fill="#0B1418" />
      <rect x="6" y="6" width="308" height="628" rx="34" fill="#F4F6F7" />
      {/* Notch */}
      <rect x="120" y="18" width="80" height="22" rx="11" fill="#0B1418" />

      {/* Status bar */}
      <text x="32" y="52" fontSize="10" fill="#5F7480" fontWeight="600">
        9:41
      </text>

      {/* Page header */}
      <text x="24" y="92" fontSize="20" fill="#0B1418" fontWeight="800">
        Your projects
      </text>
      <text x="24" y="110" fontSize="10" fill="#5F7480">
        Tap a project to open it.
      </text>

      {/* Project cards */}
      <ProjectCard
        x={16}
        y={130}
        title="Hammersmith Townhouse"
        location="London · W6 9AB"
        progress={62}
        status="ACTIVE"
        statusFill="#E5EEEF"
        statusText="#0F4C5C"
      />
      <ProjectCard
        x={16}
        y={290}
        title="Notting Hill Mews"
        location="London · W11 4PN"
        progress={94}
        status="ON HOLD"
        statusFill="#FDEEDB"
        statusText="#8B4F2F"
      />
      <ProjectCard
        x={16}
        y={450}
        title="Highgate Loft Extension"
        location="London · N6 5HE"
        progress={4}
        status="ACTIVE"
        statusFill="#E5EEEF"
        statusText="#0F4C5C"
      />

      {/* Bottom indicator */}
      <rect x="120" y="620" width="80" height="3" rx="2" fill="#0B1418" opacity="0.3" />
    </svg>
  );
}

function ProjectCard({
  x,
  y,
  title,
  location,
  progress,
  status,
  statusFill,
  statusText,
}: {
  x: number;
  y: number;
  title: string;
  location: string;
  progress: number;
  status: string;
  statusFill: string;
  statusText: string;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width="288"
        height="145"
        rx="14"
        fill="#FFFFFF"
        stroke="#E1E6E9"
      />
      <text x={x + 16} y={y + 26} fontSize="13" fill="#0B1418" fontWeight="800">
        {title}
      </text>
      <text x={x + 16} y={y + 44} fontSize="10" fill="#5F7480">
        {location}
      </text>

      {/* status pill */}
      <rect
        x={x + 200}
        y={y + 16}
        width="72"
        height="18"
        rx="9"
        fill={statusFill}
      />
      <text
        x={x + 236}
        y={y + 29}
        fontSize="8"
        fontWeight="700"
        textAnchor="middle"
        fill={statusText}
      >
        {status}
      </text>

      {/* progress section */}
      <text x={x + 16} y={y + 80} fontSize="22" fill="#0B1418" fontWeight="800">
        {progress}%
      </text>
      <rect
        x={x + 70}
        y={y + 68}
        width="200"
        height="6"
        rx="3"
        fill="#F4F6F7"
      />
      <rect
        x={x + 70}
        y={y + 68}
        width={(200 * progress) / 100}
        height="6"
        rx="3"
        fill="url(#progGrad1)"
      />

      {/* Open project CTA */}
      <text
        x={x + 200}
        y={y + 124}
        fontSize="10"
        fontWeight="700"
        fill="#0F4C5C"
      >
        Open project →
      </text>
    </g>
  );
}

/** Mobile decision-detail with two photo options + accept buttons. */
export function MockupDecision({ className }: PhoneProps) {
  return (
    <svg
      viewBox="0 0 320 640"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Builders Ready mobile app — decision detail screen with two photo options for the client to accept"
    >
      {/* Device shell */}
      <rect width="320" height="640" rx="40" fill="#0B1418" />
      <rect x="6" y="6" width="308" height="628" rx="34" fill="#F4F6F7" />
      <rect x="120" y="18" width="80" height="22" rx="11" fill="#0B1418" />

      <text x="32" y="52" fontSize="10" fill="#5F7480" fontWeight="600">
        9:41
      </text>

      {/* Back nav */}
      <text x="24" y="80" fontSize="11" fill="#0F4C5C" fontWeight="700">
        ← Decisions
      </text>

      <text x="24" y="108" fontSize="18" fill="#0B1418" fontWeight="800">
        Splashback tile choice
      </text>
      <text x="24" y="126" fontSize="10" fill="#5F7480">
        Posted by Sam Patterson · 2 days ago
      </text>

      <text x="24" y="152" fontSize="11" fill="#0B1418">
        <tspan x="24" dy="0">
          Two finalists from your samples. Pick one
        </tspan>
        <tspan x="24" dy="16">
          before Friday so we can order on time.
        </tspan>
      </text>

      {/* Option A */}
      <g>
        <rect x="16" y="200" width="288" height="170" rx="14" fill="#FFFFFF" stroke="#E1E6E9" />
        <rect x="28" y="212" width="76" height="76" rx="10" fill="#E1E6E9" />
        <rect x="40" y="232" width="52" height="6" rx="3" fill="#C7D0D6" />
        <rect x="40" y="246" width="40" height="6" rx="3" fill="#C7D0D6" />
        <text x="120" y="232" fontSize="13" fill="#0B1418" fontWeight="800">
          Calacatta marble
        </text>
        <text x="120" y="250" fontSize="10" fill="#5F7480">
          Matte finish, sample 1A
        </text>
        <text x="120" y="276" fontSize="16" fill="#0B1418" fontWeight="800">
          £950
        </text>
        <rect x="120" y="320" width="172" height="32" rx="10" fill="#0F4C5C" />
        <text x="206" y="340" fontSize="11" fontWeight="700" fill="#fff" textAnchor="middle">
          Accept this option
        </text>
      </g>

      {/* Option B */}
      <g>
        <rect x="16" y="386" width="288" height="170" rx="14" fill="#FFFFFF" stroke="#E1E6E9" />
        <rect x="28" y="398" width="76" height="76" rx="10" fill="#D9E5E7" />
        <rect x="38" y="416" width="56" height="6" rx="3" fill="#A4BFC4" />
        <rect x="38" y="432" width="44" height="6" rx="3" fill="#A4BFC4" />
        <text x="120" y="418" fontSize="13" fill="#0B1418" fontWeight="800">
          Brushed brass
        </text>
        <text x="120" y="436" fontSize="10" fill="#5F7480">
          Herringbone, sample 1B
        </text>
        <text x="120" y="462" fontSize="16" fill="#0B1418" fontWeight="800">
          £620
        </text>
        <rect x="120" y="506" width="172" height="32" rx="10" fill="#FFFFFF" stroke="#0F4C5C" />
        <text x="206" y="526" fontSize="11" fontWeight="700" fill="#0F4C5C" textAnchor="middle">
          Accept this option
        </text>
      </g>

      {/* Bottom indicator */}
      <rect x="120" y="620" width="80" height="3" rx="2" fill="#0B1418" opacity="0.3" />
    </svg>
  );
}

/** Mobile variation with signature, accepted state. */
export function MockupVariation({ className }: PhoneProps) {
  return (
    <svg
      viewBox="0 0 320 640"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Builders Ready mobile app — accepted variation V002 with client signature, cost delta and time impact"
    >
      <rect width="320" height="640" rx="40" fill="#0B1418" />
      <rect x="6" y="6" width="308" height="628" rx="34" fill="#F4F6F7" />
      <rect x="120" y="18" width="80" height="22" rx="11" fill="#0B1418" />

      <text x="32" y="52" fontSize="10" fill="#5F7480" fontWeight="600">
        9:41
      </text>

      <text x="24" y="80" fontSize="11" fill="#0F4C5C" fontWeight="700">
        ← Variations
      </text>

      <text x="24" y="108" fontSize="12" fill="#5F7480" fontWeight="700" letterSpacing="2">
        V002
      </text>
      <text x="24" y="130" fontSize="18" fill="#0B1418" fontWeight="800">
        Upgrade kitchen taps
      </text>
      <text x="24" y="148" fontSize="10" fill="#5F7480">
        Proposed by Sam Patterson · 3 days ago
      </text>

      {/* Accepted pill */}
      <rect x="220" y="118" width="70" height="20" rx="10" fill="#E5EEEF" />
      <text x="255" y="132" fontSize="9" fontWeight="700" textAnchor="middle" fill="#0F4C5C">
        ACCEPTED
      </text>

      <text x="24" y="184" fontSize="11" fill="#0B1418">
        <tspan x="24" dy="0">
          Quooker Fusion instead of the Franke
        </tspan>
        <tspan x="24" dy="16">
          originally specified. Includes tank and
        </tspan>
        <tspan x="24" dy="16">
          hot-water unit.
        </tspan>
      </text>

      {/* Cost / time cards */}
      <rect x="16" y="240" width="138" height="74" rx="12" fill="#FFFFFF" stroke="#E1E6E9" />
      <text x="28" y="260" fontSize="8" fill="#5F7480" fontWeight="700" letterSpacing="1">
        AMOUNT
      </text>
      <text x="28" y="290" fontSize="22" fill="#0B1418" fontWeight="800">
        +£1,290
      </text>

      <rect x="166" y="240" width="138" height="74" rx="12" fill="#FFFFFF" stroke="#E1E6E9" />
      <text x="178" y="260" fontSize="8" fill="#5F7480" fontWeight="700" letterSpacing="1">
        TIME IMPACT
      </text>
      <text x="178" y="290" fontSize="22" fill="#0B1418" fontWeight="800">
        +0 days
      </text>

      {/* Signature card */}
      <rect x="16" y="334" width="288" height="190" rx="14" fill="#FFFFFF" stroke="#0F4C5C" strokeWidth="1.5" />
      <text x="28" y="360" fontSize="9" fill="#0F4C5C" fontWeight="700" letterSpacing="1.5">
        CLIENT SIGNATURE
      </text>
      {/* squiggly signature */}
      <path
        d="M40 440 Q60 410, 80 430 T 120 430 Q 140 400 160 430 T 200 430 Q 220 405 240 425"
        stroke="#0B1418"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <line x1="28" y1="475" x2="290" y2="475" stroke="#E1E6E9" />
      <text x="28" y="494" fontSize="11" fill="#0B1418" fontWeight="800">
        Lara Henderson
      </text>
      <text x="28" y="510" fontSize="10" fill="#5F7480">
        Signed 17 May 2026 at 14:32
      </text>

      <rect x="120" y="620" width="80" height="3" rx="2" fill="#0B1418" opacity="0.3" />
    </svg>
  );
}

/** Small stroke icon used inside the mockup KPI tiles, matching the live app. */
function MockIcon({ type, x, y }: { type: string; x: number; y: number }) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(0.6667)`}
      stroke="#0F4C5C"
      strokeWidth="1.7"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {type === 'stack' && (
        <>
          <path d="M12 3 3 8l9 5 9-5-9-5Z" />
          <path d="m3 13 9 5 9-5" />
        </>
      )}
      {type === 'pen' && (
        <>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
        </>
      )}
      {type === 'chat' && (
        <path d="M21 11.5a8.4 8.4 0 0 1-12.9 7.5L3 21l1.9-4.5A8.4 8.4 0 1 1 21 11.5Z" />
      )}
      {type === 'cash' && (
        <>
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <circle cx="12" cy="12" r="2.5" />
        </>
      )}
    </g>
  );
}

/** Web dashboard — mirrors the live owner dashboard: greeting, attention
 * strip, KPI cards, cash position bars and the collected ring. Restrained,
 * mono-teal palette; colour is reserved for meaning. */
export function MockupDashboard({ className }: { className?: string }) {
  const kpis = [
    { x: 24, value: '3', label: 'Active projects', chip: 'of unlimited', icon: 'stack' },
    { x: 196, value: '2', label: 'Awaiting signature', chip: '£1,960', icon: 'pen' },
    { x: 368, value: '1', label: 'Open decisions', chip: '1 overdue', icon: 'chat' },
    { x: 540, value: '£0', label: 'Received this month', chip: null, icon: 'cash' },
  ];
  const bars = [
    { y: 338, label: 'Contracted', value: '£870,830', frac: 1, col: '#0F4C5C' },
    { y: 376, label: 'Invoiced', value: '£171,000', frac: 0.196, col: '#3E7C77' },
    { y: 414, label: 'Paid', value: '£128,250', frac: 0.147, col: '#6FA49C' },
    { y: 452, label: 'Outstanding', value: '£42,750', frac: 0.049, col: '#E07A5F' },
  ];
  const chips = [
    { x: 190, w: 120, dot: '#C0392B', t: '1 overdue invoice' },
    { x: 322, w: 150, dot: '#C0862E', t: '1 decision past deadline' },
    { x: 486, w: 190, dot: '#0F4C5C', t: '2 variations awaiting signature' },
  ];
  return (
    <svg
      viewBox="0 0 720 540"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Builders Ready web dashboard — morning greeting, attention items, KPI cards, cash position and collected ring"
    >
      <rect width="720" height="540" rx="14" fill="#F4F6F7" />
      <rect width="720" height="40" rx="14" fill="#FFFFFF" />
      <rect y="26" width="720" height="14" fill="#FFFFFF" />
      <circle cx="20" cy="20" r="5" fill="#D7DCDE" />
      <circle cx="36" cy="20" r="5" fill="#D7DCDE" />
      <circle cx="52" cy="20" r="5" fill="#D7DCDE" />
      <rect x="80" y="12" width="260" height="16" rx="8" fill="#F4F6F7" />
      <text x="92" y="23" fontSize="9" fill="#5F7480">app.buildersready.uk/heritage/dashboard</text>
      <rect y="40" width="720" height="46" fill="#FFFFFF" />
      <rect x="24" y="52" width="24" height="24" rx="6" fill="#0F4C5C" />
      <text x="36" y="68" fontSize="10" fill="#fff" fontWeight="800" textAnchor="middle">HB</text>
      <text x="56" y="61" fontSize="11" fill="#0B1418" fontWeight="800">Heritage Build Co</text>
      <text x="56" y="73" fontSize="7" fill="#5F7480" fontWeight="700" letterSpacing="1">OWNER</text>
      <circle cx="686" cy="63" r="13" fill="#EEF2F1" />
      <text x="686" y="67" fontSize="9" fill="#0F4C5C" fontWeight="800" textAnchor="middle">HB</text>
      <text x="24" y="112" fontSize="8" fill="#5F7480" fontWeight="700" letterSpacing="1.5">HERITAGE BUILD CO</text>
      <text x="24" y="136" fontSize="21" fill="#0B1418" fontWeight="800">Good morning, Sam</text>
      <rect x="600" y="112" width="96" height="26" rx="8" fill="#0F4C5C" />
      <text x="648" y="129" fontSize="10" fill="#fff" fontWeight="700" textAnchor="middle">+ New project</text>
      <rect x="24" y="152" width="672" height="34" rx="10" fill="#FFFFFF" stroke="#E1E6E9" />
      <text x="40" y="173" fontSize="8" fill="#5F7480" fontWeight="700" letterSpacing="1">NEEDS YOUR ATTENTION</text>
      {chips.map((c) => (
        <g key={c.t}>
          <rect x={c.x} y="159" width={c.w} height="20" rx="6" fill="#F4F6F7" />
          <circle cx={c.x + 13} cy="169" r="3.5" fill={c.dot} />
          <text x={c.x + 24} y="173" fontSize="9" fill="#0B1418" fontWeight="600">{c.t}</text>
        </g>
      ))}
      {kpis.map((k) => {
        const cw = k.chip ? k.chip.length * 5.4 + 16 : 0;
        return (
          <g key={k.label}>
            <rect x={k.x} y="198" width="156" height="74" rx="12" fill="#FFFFFF" stroke="#E1E6E9" />
            <rect x={k.x + 14} y="212" width="28" height="28" rx="8" fill="#EEF2F1" />
            <MockIcon type={k.icon} x={k.x + 20} y={218} />
            {k.chip && (
              <>
                <rect x={k.x + 142 - cw} y="214" width={cw} height="18" rx="9" fill="#F4F6F7" />
                <text x={k.x + 142 - cw / 2} y="226" fontSize="9" fill="#5F7480" fontWeight="600" textAnchor="middle">{k.chip}</text>
              </>
            )}
            <text x={k.x + 14} y="256" fontSize="20" fill="#0B1418" fontWeight="800">{k.value}</text>
            <text x={k.x + 14} y="268" fontSize="8.5" fill="#5F7480">{k.label}</text>
          </g>
        );
      })}
      <rect x="24" y="286" width="456" height="238" rx="12" fill="#FFFFFF" stroke="#E1E6E9" />
      <text x="40" y="312" fontSize="11" fill="#0B1418" fontWeight="800">Cash position</text>
      {bars.map((b) => (
        <g key={b.label}>
          <text x="40" y={b.y} fontSize="10" fill="#5F7480">{b.label}</text>
          <text x="456" y={b.y} fontSize="11" fill="#0B1418" fontWeight="700" textAnchor="end">{b.value}</text>
          <rect x="40" y={b.y + 8} width="416" height="8" rx="4" fill="#EEF1F2" />
          <rect x="40" y={b.y + 8} width={Math.round(416 * b.frac)} height="8" rx="4" fill={b.col} />
        </g>
      ))}
      <rect x="496" y="286" width="200" height="238" rx="12" fill="#FFFFFF" stroke="#E1E6E9" />
      <text x="512" y="312" fontSize="11" fill="#0B1418" fontWeight="800">Collected</text>
      <circle cx="596" cy="412" r="48" fill="none" stroke="#EEF2F1" strokeWidth="14" />
      <circle cx="596" cy="412" r="48" fill="none" stroke="#0F4C5C" strokeWidth="14" strokeLinecap="round" strokeDasharray="45.2 256.4" transform="rotate(-90 596 412)" />
      <text x="596" y="408" fontSize="20" fill="#0B1418" fontWeight="800" textAnchor="middle">15%</text>
      <text x="596" y="426" fontSize="8" fill="#5F7480" textAnchor="middle">of contracted</text>
      <text x="596" y="502" fontSize="8" fill="#5F7480" textAnchor="middle">£128,250 of £870,830</text>
    </svg>
  );
}
