'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { PROJECT_TEMPLATES, type ProjectTemplate } from '@br/shared';

/**
 * Searchable project-type / stage-template picker. Type to filter across
 * trades and job types, or browse the grouped dropdown. Controlled: the parent
 * holds the selected template key.
 */
export function TemplatePicker({
  value,
  onChange,
  label = 'Project type',
  hint,
}: {
  value: string;
  onChange: (key: string) => void;
  label?: string;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = PROJECT_TEMPLATES.find((t) => t.key === value);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list: ProjectTemplate[] = q
      ? PROJECT_TEMPLATES.filter((t) =>
          `${t.label} ${t.group} ${(t.keywords ?? []).join(' ')}`
            .toLowerCase()
            .includes(q),
        )
      : [...PROJECT_TEMPLATES];
    const out: Record<string, ProjectTemplate[]> = {};
    for (const t of list) (out[t.group] ??= []).push(t);
    return out;
  }, [query]);

  const empty = Object.keys(groups).length === 0;

  return (
    <div className="block" ref={wrapRef}>
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
        {label}
      </span>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-lg border border-hairline bg-white px-3 py-2 text-left text-sm focus:border-primary focus:outline-none"
        >
          <span className={selected ? 'text-ink' : 'text-ink-muted'}>
            {selected ? selected.label : 'Choose a project type'}
          </span>
          <svg
            className={`h-4 w-4 text-ink-muted transition ${open ? 'rotate-180' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.3 7.3a1 1 0 011.4 0L10 10.6l3.3-3.3a1 1 0 011.4 1.4l-4 4a1 1 0 01-1.4 0l-4-4a1 1 0 010-1.4z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {open && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-hairline bg-white shadow-lg">
            <div className="border-b border-hairline p-2">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search trades &amp; job types…"
                className="block w-full rounded-md border border-hairline bg-canvas px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="max-h-72 overflow-auto py-1">
              {empty ? (
                <div className="px-3 py-6 text-center text-xs text-ink-muted">
                  No match. Pick “Custom” to build your own timeline.
                </div>
              ) : (
                Object.entries(groups).map(([group, items]) => (
                  <div key={group}>
                    <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                      {group}
                    </div>
                    {items.map((t) => {
                      const isSel = t.key === value;
                      const steps =
                        t.stages.length === 0
                          ? 'Custom'
                          : `${t.stages.length} step${t.stages.length === 1 ? '' : 's'}`;
                      return (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => {
                            onChange(t.key);
                            setOpen(false);
                            setQuery('');
                          }}
                          className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-canvas ${
                            isSel ? 'bg-primary/5 font-semibold text-primary' : 'text-ink'
                          }`}
                        >
                          <span>{t.label}</span>
                          <span className="ml-3 shrink-0 text-[10px] text-ink-muted">
                            {steps}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      {hint && <p className="mt-1 text-[11px] text-ink-muted">{hint}</p>}
    </div>
  );
}
