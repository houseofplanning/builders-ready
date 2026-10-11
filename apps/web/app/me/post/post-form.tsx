'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { TRADE_CATEGORIES, JOB_TIMING_OPTIONS, PROPERTY_TYPES } from '@br/shared';
import { createJobRequest } from '@/lib/server-actions/marketplace';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

async function uploadPhotos(files: File[]): Promise<string[]> {
  if (files.length === 0) return [];
  const supabase = getSupabaseBrowser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Please sign in again.');
  const urls: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${user.id}/${Date.now()}-${i}.${ext}`;
    const { error } = await supabase.storage
      .from('job-photos')
      .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false });
    if (error) throw new Error(`Photo upload failed: ${error.message}`);
    urls.push(supabase.storage.from('job-photos').getPublicUrl(path).data.publicUrl);
  }
  return urls;
}

function poundsToPence(v: FormDataEntryValue | null): number | undefined {
  const s = String(v ?? '').trim();
  if (!s) return undefined;
  const n = Number(s.replace(/[£,]/g, ''));
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n * 100);
}

export function PostJobForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);

  function onPickPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    setPhotos((prev) => [...prev, ...picked].slice(0, 8));
    e.target.value = '';
  }
  function removePhoto(idx: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      let photoUrls: string[] = [];
      try {
        photoUrls = await uploadPhotos(photos);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not upload photos.');
        return;
      }
      const payload = {
        trade_category: String(fd.get('trade_category') ?? ''),
        title: String(fd.get('title') ?? ''),
        description: String(fd.get('description') ?? '') || undefined,
        city: String(fd.get('city') ?? '') || undefined,
        postcode: String(fd.get('postcode') ?? ''),
        budget_min_pence: poundsToPence(fd.get('budget_min')),
        budget_max_pence: poundsToPence(fd.get('budget_max')),
        budget_note: String(fd.get('budget_note') ?? '') || undefined,
        photos: photoUrls,
        timing: String(fd.get('timing') ?? '') || undefined,
        property_type: String(fd.get('property_type') ?? '') || undefined,
        preferred_start_date: String(fd.get('preferred_start_date') ?? '') || undefined,
        access_notes: String(fd.get('access_notes') ?? '') || undefined,
      };
      const res = await createJobRequest(payload);
      if (!res.ok) {
        setError(res.error ?? 'Something went wrong.');
        return;
      }
      router.push(res.redirectTo ?? '/me');
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-card border border-hairline bg-white p-6"
    >
      <Label text="What do you need?">
        <select
          name="trade_category"
          required
          defaultValue=""
          className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="" disabled>
            Choose a trade…
          </option>
          {TRADE_CATEGORIES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Label>

      <Label text="Job title">
        <input
          name="title"
          required
          maxLength={120}
          placeholder="e.g. Boiler replacement"
          className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </Label>

      <Label text="Describe the job">
        <textarea
          name="description"
          rows={4}
          maxLength={4000}
          placeholder="What needs doing, any detail, and when you'd like it done."
          className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </Label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Label text="How soon do you need it?">
          <select
            name="timing"
            defaultValue=""
            className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            <option value="">No preference</option>
            {JOB_TIMING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Label>
        <Label text="Property type">
          <select
            name="property_type"
            defaultValue=""
            className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            <option value="">Not specified</option>
            {PROPERTY_TYPES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Label>
      </div>

      <Label text="Preferred start date (optional)">
        <input
          name="preferred_start_date"
          maxLength={20}
          placeholder="e.g. Early August"
          className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </Label>

      <Label text="Access & availability (optional)">
        <textarea
          name="access_notes"
          rows={2}
          maxLength={1000}
          placeholder="Parking, when you're home, pets, gate codes, etc."
          className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </Label>

      <div>
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Photos (optional)
        </span>
        <p className="mb-2 text-xs text-ink-muted">
          Photos help trades quote accurately — add up to 8.
        </p>
        <div className="flex flex-wrap gap-2">
          {photos.map((f, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={URL.createObjectURL(f)}
                alt=""
                className="h-20 w-20 rounded-lg border border-hairline object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-error text-xs font-bold text-white"
              >
                ×
              </button>
            </div>
          ))}
          {photos.length < 8 && (
            <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-primary text-xs font-semibold text-primary">
              + Add
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={onPickPhotos}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Label text="Postcode">
          <input
            name="postcode"
            required
            maxLength={10}
            placeholder="SW19 8HP"
            className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm uppercase focus:border-primary focus:outline-none"
          />
        </Label>
        <Label text="Town / city (optional)">
          <input
            name="city"
            maxLength={120}
            placeholder="London"
            className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </Label>
      </div>

      <div>
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Budget (optional)
        </span>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center rounded-lg border border-hairline bg-white px-3">
            <span className="text-sm text-ink-muted">£</span>
            <input
              name="budget_min"
              inputMode="numeric"
              placeholder="Min"
              className="block w-full bg-transparent px-2 py-2 text-sm focus:outline-none"
            />
          </div>
          <div className="flex items-center rounded-lg border border-hairline bg-white px-3">
            <span className="text-sm text-ink-muted">£</span>
            <input
              name="budget_max"
              inputMode="numeric"
              placeholder="Max"
              className="block w-full bg-transparent px-2 py-2 text-sm focus:outline-none"
            />
          </div>
        </div>
        <input
          name="budget_note"
          maxLength={200}
          placeholder="Or a note, e.g. “open to quotes”"
          className="mt-2 block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-error bg-error/5 px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {pending ? 'Posting…' : 'Post job'}
      </button>
    </form>
  );
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
        {text}
      </span>
      {children}
    </label>
  );
}
