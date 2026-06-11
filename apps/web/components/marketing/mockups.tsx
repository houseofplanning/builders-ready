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

/** Web dashboard — 4 KPI tiles + outstanding items panels. */
export function MockupDashboard({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 720 480"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Builders Ready web admin dashboard — cross-project KPIs and outstanding items for the owner"
    >
      <defs>
        <linearGradient id="progGrad2" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#0F4C5C" />
          <stop offset="100%" stopColor="#E07A5F" />
        </linearGradient>
      </defs>

      {/* Browser chrome */}
      <rect width="720" height="480" rx="14" fill="#F4F6F7" />
      <rect width="720" height="40" rx="14" fill="#FFFFFF" />
      <rect y="26" width="720" height="14" fill="#FFFFFF" />
      <circle cx="20" cy="20" r="5" fill="#E07A5F" />
      <circle cx="36" cy="20" r="5" fill="#E5C46F" />
      <circle cx="52" cy="20" r="5" fill="#80B384" />
      <rect x="80" y="12" width="240" height="16" rx="8" fill="#F4F6F7" />
      <text x="92" y="23" fontSize="9" fill="#5F7480">
        app.buildersready.uk/heritage/dashboard
      </text>

      {/* Top bar inside app */}
      <rect y="40" width="720" height="44" fill="#FFFFFF" />
      <text x="24" y="68" fontSize="11" fill="#0B1418" fontWeight="800" letterSpacing="2">
        HERITAGE BUILD CO
      </text>
      <text x="640" y="68" fontSize="10" fill="#5F7480" fontWeight="600">
        Sam Patterson
      </text>

      {/* Heading */}
      <text x="24" y="116" fontSize="9" fill="#5F7480" fontWeight="700" letterSpacing="2">
        TENANT · HERITAGE BUILD CO
      </text>
      <text x="24" y="138" fontSize="20" fill="#0B1418" fontWeight="800">
        Welcome back
      </text>

      {/* Operational KPI tiles */}
      {[
        { x: 24, label: 'ACTIVE PROJECTS', value: '3', sub: 'of 50 on Pro' },
        { x: 196, label: 'TEAM', value: '4', sub: 'across all roles' },
        { x: 368, label: 'OPEN DECISIONS', value: '2', sub: 'awaiting response' },
        { x: 540, label: 'AWAITING SIGNATURE', value: '1', sub: 'variations' },
      ].map((t) => (
        <g key={t.label}>
          <rect x={t.x} y="156" width="156" height="64" rx="12" fill="#FFFFFF" stroke="#E1E6E9" />
          <text x={t.x + 14} y="174" fontSize="8" fill="#5F7480" fontWeight="700" letterSpacing="1.5">
            {t.label}
          </text>
          <text x={t.x + 14} y="200" fontSize="20" fill="#0B1418" fontWeight="800">
            {t.value}
          </text>
          <text x={t.x + 14} y="214" fontSize="8" fill="#5F7480">
            {t.sub}
          </text>
        </g>
      ))}

      {/* Finance tiles */}
      {[
        { x: 24, label: 'TOTAL CONTRACTED', value: '£867k' },
        { x: 196, label: 'INVOICED', value: '£412k' },
        { x: 368, label: 'PAID', value: '£298k' },
        { x: 540, label: 'OUTSTANDING', value: '£114k' },
      ].map((t) => (
        <g key={t.label}>
          <rect x={t.x} y="232" width="156" height="60" rx="12" fill="#FFFFFF" stroke="#E1E6E9" />
          <text x={t.x + 14} y="250" fontSize="8" fill="#5F7480" fontWeight="700" letterSpacing="1.5">
            {t.label}
          </text>
          <text x={t.x + 14} y="276" fontSize="18" fill="#0B1418" fontWeight="800">
            {t.value}
          </text>
        </g>
      ))}

      {/* Project list card */}
      <rect x="24" y="308" width="672" height="148" rx="12" fill="#FFFFFF" stroke="#E1E6E9" />
      <text x="40" y="332" fontSize="11" fill="#0B1418" fontWeight="800">
        Recent projects
      </text>
      <line x1="24" y1="346" x2="696" y2="346" stroke="#E1E6E9" />

      {[
        { y: 366, name: 'Hammersmith Townhouse', addr: 'W6 9AB · PM Sam P.', progress: 62 },
        { y: 396, name: 'Notting Hill Mews', addr: 'W11 4PN · PM Sam P.', progress: 94 },
        { y: 426, name: 'Highgate Loft Extension', addr: 'N6 5HE · PM Sam P.', progress: 4 },
      ].map((row) => (
        <g key={row.name}>
          <text x={40} y={row.y} fontSize="11" fill="#0B1418" fontWeight="700">
            {row.name}
          </text>
          <text x={40} y={row.y + 13} fontSize="8" fill="#5F7480">
            {row.addr}
          </text>
          <rect x="460" y={row.y - 6} width="160" height="5" rx="2.5" fill="#F4F6F7" />
          <rect
            x="460"
            y={row.y - 6}
            width={(160 * row.progress) / 100}
            height="5"
            rx="2.5"
            fill="url(#progGrad2)"
          />
          <text x="630" y={row.y - 1} fontSize="9" fill="#5F7480" fontWeight="600">
            {row.progress}%
          </text>
          <text x="660" y={row.y + 4} fontSize="9" fill="#0F4C5C" fontWeight="700">
            Open →
          </text>
        </g>
      ))}
    </svg>
  );
}
