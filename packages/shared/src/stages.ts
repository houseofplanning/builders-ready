/**
 * Project stage templates.
 *
 * A project's timeline is seeded from a template chosen at quote/project
 * creation, so a decorator doing two rooms gets a 2-stage timeline while a
 * full renovation gets eight. Stages remain fully editable per project after
 * seeding — a template is just a sensible starting point.
 *
 * Weights are relative (they don't need to sum to 100); distributeStages
 * normalises by their total when spreading across the project dates.
 */

export interface DefaultStage {
  name: string;
  weight: number;
}

/** Legacy default (full renovation) — kept as the fallback template. */
export const DEFAULT_STAGES: readonly DefaultStage[] = [
  { name: 'Mobilisation', weight: 5 },
  { name: 'Strip-out & Demolition', weight: 10 },
  { name: 'Structure', weight: 20 },
  { name: 'First Fix', weight: 18 },
  { name: 'Plastering', weight: 12 },
  { name: 'Second Fix', weight: 15 },
  { name: 'Decoration & Finishes', weight: 12 },
  { name: 'Snagging & Handover', weight: 8 },
];

export interface ProjectTemplate {
  key: string;
  label: string;
  group: string;
  /** Extra search terms so typing a trade name surfaces the right template. */
  keywords?: string[];
  stages: DefaultStage[];
}

const S = (name: string, weight = 10): DefaultStage => ({ name, weight });

export const PROJECT_TEMPLATES: readonly ProjectTemplate[] = [
  // ---- Whole projects / structural ----
  {
    key: 'full_renovation',
    label: 'Full renovation / refurbishment',
    group: 'Whole projects',
    keywords: ['refurb', 'renovation', 'whole house', 'gut'],
    stages: [...DEFAULT_STAGES],
  },
  {
    key: 'extension',
    label: 'House extension',
    group: 'Whole projects',
    keywords: ['single storey', 'double storey', 'rear extension', 'side return'],
    stages: [
      S('Mobilisation', 5), S('Groundworks & Foundations', 15), S('Structure & Shell', 20),
      S('Roof & Watertight', 12), S('First Fix', 15), S('Plastering', 10),
      S('Second Fix', 13), S('Finishes & Snagging', 10),
    ],
  },
  {
    key: 'new_build',
    label: 'New build',
    group: 'Whole projects',
    keywords: ['new build', 'ground up', 'plot'],
    stages: [
      S('Groundworks & Foundations', 15), S('Structure & Shell', 20), S('Roof & Watertight', 12),
      S('First Fix', 15), S('Plastering', 10), S('Second Fix', 13),
      S('Decoration & Finishes', 8), S('Snagging & Handover', 7),
    ],
  },
  {
    key: 'loft_conversion',
    label: 'Loft conversion',
    group: 'Whole projects',
    keywords: ['loft', 'dormer', 'attic'],
    stages: [
      S('Structural & Floor', 20), S('Roof & Dormer', 20), S('First Fix', 18),
      S('Plastering', 14), S('Second Fix', 16), S('Finishes & Snagging', 12),
    ],
  },
  {
    key: 'garage_conversion',
    label: 'Garage conversion',
    group: 'Whole projects',
    keywords: ['garage'],
    stages: [
      S('Strip-out & Prep', 15), S('Structure & Insulation', 25), S('First Fix', 20),
      S('Plastering', 18), S('Second Fix & Finishes', 22),
    ],
  },
  {
    key: 'basement',
    label: 'Basement / cellar conversion',
    group: 'Whole projects',
    keywords: ['basement', 'cellar', 'tanking'],
    stages: [
      S('Excavation & Tanking', 22), S('Structure', 20), S('First Fix', 16),
      S('Plastering', 12), S('Second Fix', 16), S('Finishes & Snagging', 14),
    ],
  },
  {
    key: 'conservatory',
    label: 'Conservatory / orangery',
    group: 'Whole projects',
    keywords: ['conservatory', 'orangery', 'garden room'],
    stages: [
      S('Base & Groundworks', 30), S('Frame & Glazing', 30), S('Roof', 20),
      S('Electrics & Finishes', 20),
    ],
  },

  // ---- Rooms & fit-out ----
  {
    key: 'kitchen',
    label: 'Kitchen fit-out',
    group: 'Rooms & fit-out',
    keywords: ['kitchen', 'units', 'worktop'],
    stages: [
      S('Strip-out', 15), S('First Fix', 22), S('Plastering', 15),
      S('Units & Worktops', 28), S('Second Fix & Snagging', 20),
    ],
  },
  {
    key: 'bathroom',
    label: 'Bathroom / wet room',
    group: 'Rooms & fit-out',
    keywords: ['bathroom', 'wet room', 'ensuite', 'shower'],
    stages: [
      S('Strip-out', 15), S('First Fix & Tanking', 22), S('Tiling', 22),
      S('Second Fix & Sanitaryware', 25), S('Snagging', 16),
    ],
  },
  {
    key: 'room_refurb',
    label: 'Room refurbishment',
    group: 'Rooms & fit-out',
    keywords: ['bedroom', 'living room', 'single room'],
    stages: [
      S('Strip-out & Prep', 22), S('First Fix', 26), S('Plaster & Finishes', 32),
      S('Snagging', 20),
    ],
  },

  // ---- Trades & finishes ----
  {
    key: 'painting',
    label: 'Painting & decorating',
    group: 'Trades & finishes',
    keywords: ['painter', 'decorator', 'paint', 'wallpaper'],
    stages: [S('Prep & Masking', 30), S('Painting', 50), S('Snagging & Sign-off', 20)],
  },
  {
    key: 'plastering',
    label: 'Plastering / skimming',
    group: 'Trades & finishes',
    keywords: ['plasterer', 'skim', 'plasterboard'],
    stages: [S('Prep', 25), S('Plaster / Skim', 50), S('Dry & Finish', 25)],
  },
  {
    key: 'flooring',
    label: 'Flooring',
    group: 'Trades & finishes',
    keywords: ['floor', 'lvt', 'laminate', 'carpet', 'engineered wood'],
    stages: [S('Subfloor Prep', 30), S('Lay', 45), S('Finish & Trims', 25)],
  },
  {
    key: 'tiling',
    label: 'Tiling',
    group: 'Trades & finishes',
    keywords: ['tiler', 'tiles', 'wall tiles', 'floor tiles'],
    stages: [S('Prep & Set-out', 25), S('Tiling', 45), S('Grout, Seal & Finish', 30)],
  },
  {
    key: 'carpentry',
    label: 'Carpentry / joinery',
    group: 'Trades & finishes',
    keywords: ['carpenter', 'joiner', 'skirting', 'doors', 'wardrobes'],
    stages: [S('Measure & Prep', 25), S('Install', 50), S('Finish & Snagging', 25)],
  },
  {
    key: 'worktops',
    label: 'Worktops / splashbacks',
    group: 'Trades & finishes',
    keywords: ['worktop', 'quartz', 'granite', 'splashback'],
    stages: [S('Template & Prep', 40), S('Fit', 60)],
  },

  // ---- Electrical, plumbing & heating ----
  {
    key: 'rewire',
    label: 'Electrical rewire',
    group: 'Electrical, plumbing & heating',
    keywords: ['electrician', 'rewire', 'consumer unit'],
    stages: [S('First Fix', 35), S('Second Fix', 30), S('Test & Certify', 20), S('Make Good', 15)],
  },
  {
    key: 'electrical_small',
    label: 'Electrical — small works / EICR',
    group: 'Electrical, plumbing & heating',
    keywords: ['electrician', 'eicr', 'sockets', 'lighting', 'fuse board'],
    stages: [S('Works', 65), S('Test & Certify', 35)],
  },
  {
    key: 'plumbing',
    label: 'Plumbing',
    group: 'Electrical, plumbing & heating',
    keywords: ['plumber', 'pipework', 'leak'],
    stages: [S('First Fix', 40), S('Second Fix', 40), S('Test & Finish', 20)],
  },
  {
    key: 'heating',
    label: 'Central heating / boiler',
    group: 'Electrical, plumbing & heating',
    keywords: ['boiler', 'heating', 'radiators', 'gas'],
    stages: [S('Strip-out', 15), S('First Fix', 35), S('Install & Commission', 35), S('Test & Certify', 15)],
  },
  {
    key: 'underfloor_heating',
    label: 'Underfloor heating',
    group: 'Electrical, plumbing & heating',
    keywords: ['ufh', 'underfloor'],
    stages: [S('Prep & Lay', 45), S('Screed', 35), S('Commission', 20)],
  },
  {
    key: 'solar_ev',
    label: 'Solar / EV charger',
    group: 'Electrical, plumbing & heating',
    keywords: ['solar', 'pv', 'ev charger', 'battery'],
    stages: [S('Survey & Prep', 25), S('Install', 50), S('Commission & Certify', 25)],
  },

  // ---- External & groundworks ----
  {
    key: 'driveway',
    label: 'Driveway',
    group: 'External & groundworks',
    keywords: ['driveway', 'block paving', 'resin', 'tarmac'],
    stages: [S('Excavation', 25), S('Sub-base', 25), S('Laying', 35), S('Pointing & Seal', 15)],
  },
  {
    key: 'patio',
    label: 'Patio / paving',
    group: 'External & groundworks',
    keywords: ['patio', 'paving', 'slabs', 'flags'],
    stages: [S('Excavation', 25), S('Base', 25), S('Laying', 35), S('Pointing & Finish', 15)],
  },
  {
    key: 'landscaping',
    label: 'Landscaping / garden',
    group: 'External & groundworks',
    keywords: ['landscaper', 'garden', 'turf', 'planting'],
    stages: [S('Clearance & Prep', 22), S('Groundworks', 28), S('Build & Planting', 32), S('Finish & Tidy', 18)],
  },
  {
    key: 'fencing',
    label: 'Fencing / gates',
    group: 'External & groundworks',
    keywords: ['fence', 'fencing', 'gate'],
    stages: [S('Posts & Prep', 55), S('Panels & Finish', 45)],
  },
  {
    key: 'decking',
    label: 'Decking',
    group: 'External & groundworks',
    keywords: ['deck', 'decking', 'composite'],
    stages: [S('Base & Frame', 40), S('Deck Boards', 40), S('Finish', 20)],
  },
  {
    key: 'brickwork',
    label: 'Brickwork / masonry',
    group: 'External & groundworks',
    keywords: ['bricklayer', 'brickwork', 'blockwork', 'wall'],
    stages: [S('Foundations', 30), S('Build', 50), S('Point & Finish', 20)],
  },
  {
    key: 'groundworks',
    label: 'Groundworks / drainage',
    group: 'External & groundworks',
    keywords: ['groundworks', 'drainage', 'foundations', 'excavation'],
    stages: [S('Excavation', 30), S('Install', 30), S('Backfill & Test', 22), S('Reinstate', 18)],
  },
  {
    key: 'retaining_wall',
    label: 'Retaining wall',
    group: 'External & groundworks',
    keywords: ['retaining wall', 'sleepers', 'gabion'],
    stages: [S('Excavation & Base', 35), S('Build', 45), S('Backfill & Finish', 20)],
  },

  // ---- Roofing & exterior ----
  {
    key: 'roofing',
    label: 'Roofing (new / replacement)',
    group: 'Roofing & exterior',
    keywords: ['roofer', 'roof', 're-roof', 'tiles', 'slate'],
    stages: [S('Strip', 25), S('Felt & Batten', 20), S('Cover', 35), S('Flashings & Finish', 20)],
  },
  {
    key: 'roof_repair',
    label: 'Roof repair',
    group: 'Roofing & exterior',
    keywords: ['roof repair', 'leak', 'flat roof'],
    stages: [S('Inspect & Strip', 45), S('Repair & Make Good', 55)],
  },
  {
    key: 'guttering',
    label: 'Guttering / fascias / soffits',
    group: 'Roofing & exterior',
    keywords: ['gutter', 'fascia', 'soffit'],
    stages: [S('Strip', 45), S('Install & Finish', 55)],
  },
  {
    key: 'rendering',
    label: 'Rendering / cladding',
    group: 'Roofing & exterior',
    keywords: ['render', 'rendering', 'k-rend', 'cladding'],
    stages: [S('Prep & Beading', 30), S('Base Coat', 35), S('Top Coat & Finish', 35)],
  },

  // ---- Windows & doors ----
  {
    key: 'windows_doors',
    label: 'Windows & doors',
    group: 'Windows & doors',
    keywords: ['windows', 'doors', 'upvc', 'glazing'],
    stages: [S('Survey & Prep', 30), S('Install', 45), S('Finish & Make Good', 25)],
  },
  {
    key: 'bifold',
    label: 'Bi-fold / patio doors',
    group: 'Windows & doors',
    keywords: ['bifold', 'bi-fold', 'patio doors', 'sliding doors'],
    stages: [S('Survey & Prep', 30), S('Install', 45), S('Adjust & Finish', 25)],
  },

  // ---- Specialist ----
  {
    key: 'damp',
    label: 'Damp proofing / tanking',
    group: 'Specialist',
    keywords: ['damp', 'dpc', 'tanking', 'waterproofing'],
    stages: [S('Strip & Prep', 30), S('Treatment', 35), S('Re-plaster & Finish', 35)],
  },
  {
    key: 'insulation',
    label: 'Insulation (loft / cavity)',
    group: 'Specialist',
    keywords: ['insulation', 'loft insulation', 'cavity wall'],
    stages: [S('Prep', 40), S('Install', 60)],
  },
  {
    key: 'structural_steel',
    label: 'Structural (steel / RSJ)',
    group: 'Specialist',
    keywords: ['steel', 'rsj', 'beam', 'load bearing'],
    stages: [S('Props & Prep', 25), S('Install Steel', 30), S('Build In', 25), S('Make Good', 20)],
  },
  {
    key: 'chimney',
    label: 'Chimney works',
    group: 'Specialist',
    keywords: ['chimney', 'stack', 'flue'],
    stages: [S('Access & Strip', 35), S('Repair / Rebuild', 45), S('Flaunch & Finish', 20)],
  },

  // ---- Small works / custom ----
  {
    key: 'small_works',
    label: 'Single job / small works',
    group: 'Small works',
    keywords: ['handyman', 'small job', 'odd jobs', 'repair', 'one day'],
    stages: [S('In Progress', 100)],
  },
  {
    key: 'custom',
    label: 'Custom (build your own)',
    group: 'Small works',
    keywords: ['blank', 'custom', 'none'],
    stages: [],
  },
];

/** The template used when none is chosen / an unknown key is supplied. */
export const DEFAULT_TEMPLATE_KEY = 'full_renovation';

export function stagesForTemplate(key?: string | null): DefaultStage[] {
  if (!key) return [...DEFAULT_STAGES];
  const t = PROJECT_TEMPLATES.find((x) => x.key === key);
  return t ? [...t.stages] : [...DEFAULT_STAGES];
}

export function templateLabel(key?: string | null): string {
  const t = key ? PROJECT_TEMPLATES.find((x) => x.key === key) : undefined;
  return t?.label ?? 'Full renovation / refurbishment';
}

export interface StageRange {
  position: number;
  name: string;
  start_date: string; // YYYY-MM-DD
  target_end_date: string;
}

/**
 * Spread a set of stages proportionally across the project's start and end
 * dates. Defaults to the full-renovation template for back-compat; pass a
 * template's stages (via stagesForTemplate) to seed a different timeline.
 * Returns [] for an empty stage list (the "custom" template).
 */
export function distributeStages(
  startISO: string,
  endISO: string,
  stages: readonly DefaultStage[] = DEFAULT_STAGES,
): StageRange[] {
  if (stages.length === 0) return [];
  const start = new Date(startISO + 'T00:00:00Z').getTime();
  const end = new Date(endISO + 'T00:00:00Z').getTime();
  const span = Math.max(0, end - start);
  const totalWeight = stages.reduce((s, d) => s + d.weight, 0) || 1;

  let cursor = start;
  return stages.map((s, i) => {
    const stageMs = (s.weight / totalWeight) * span;
    const stageStart = i === 0 ? start : cursor;
    const stageEnd =
      i === stages.length - 1 ? end : Math.round(stageStart + stageMs);
    cursor = stageEnd;
    return {
      position: i + 1,
      name: s.name,
      start_date: isoDate(stageStart),
      target_end_date: isoDate(stageEnd),
    };
  });
}

function isoDate(ms: number): string {
  const d = new Date(ms);
  return d.toISOString().slice(0, 10);
}
