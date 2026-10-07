'use client';

import { useEffect, useState } from 'react';
import { SlidePanel } from '@/components/ui/SlidePanel';
import { FormField, formInputClass } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { apiAction } from '@/hooks/use-api';
import { dataGet, ClientApiError } from '@/lib/client-api';
import { ENDPOINTS } from '@/lib/config';
import { useToast } from '@/store/toast';

/**
 * FLAG-072 — the org admin sets up the wards (owner, 6 Oct: "follow normal
 * practice"). Before this, the Wards & Beds page could only show wards and
 * manage their rota; nobody could add one in the browser. Backend FLAG-624
 * makes the set-up the org admin's alone (a nurse keeps a bed's status).
 *
 * Contract (apps/ward/serializers.py WardCreateUpdateSerializer):
 * `POST /ward/` and `PATCH /ward/<id>/` take {name, category, category_other,
 * gender, total_beds}. `total_beds` drives the beds themselves: creating a ward
 * numbers that many beds (e.g. "CH-001"), raising it adds more, and lowering it
 * removes free beds only (an occupied bed refuses with 400 {error}).
 * `DELETE /ward/<id>/` refuses while any bed is occupied. The name is unique
 * per organisation (details.name).
 */

export const WARD_CATEGORIES = [
  { value: 'MEDICAL', label: 'Medical' },
  { value: 'SURGICAL', label: 'Surgical' },
  { value: 'EMERGENCY', label: 'Emergency' },
  { value: 'GYNAECOLOGY', label: 'Gynaecology' },
  { value: 'PAEDIATRIC', label: 'Paediatric' },
  { value: 'ICU', label: 'Intensive care (ICU)' },
  { value: 'MATERNITY', label: 'Maternity' },
  { value: 'OTHER', label: 'Other' },
] as const;

// Backend Ward.GenderChoices: 'O' is a mixed ward that accepts every patient.
export const WARD_PATIENTS = [
  { value: 'O', label: 'Anyone (mixed ward)' },
  { value: 'F', label: 'Women only' },
  { value: 'M', label: 'Men only' },
] as const;

export type WardSetupTarget = { kind: 'add' } | { kind: 'edit'; id: string; name: string };

interface WardForm {
  name: string;
  category: string;
  category_other: string;
  gender: string;
  total_beds: string;
}

const EMPTY: WardForm = { name: '', category: 'MEDICAL', category_other: '', gender: 'O', total_beds: '0' };
const MAX_BEDS = 200;

type Field = keyof WardForm;

/** The backend's words for a refusal: a field message from `details`, or its flat `error`. */
function readError(err: unknown): { field: Field | null; message: string } {
  if (err instanceof ClientApiError) {
    const body = err.data as { error?: unknown; details?: Record<string, unknown> } | null;
    const details = body?.details;
    if (details) {
      for (const f of ['name', 'category', 'category_other', 'gender', 'total_beds'] as Field[]) {
        const v = details[f];
        if (v != null) return { field: f, message: Array.isArray(v) ? String(v[0]) : String(v) };
      }
    }
    if (typeof body?.error === 'string' && body.error) return { field: null, message: body.error };
  }
  return { field: null, message: err instanceof Error ? err.message : 'Could not save the ward.' };
}

export function WardSetupPanel({
  target, onClose, onSaved,
}: { target: WardSetupTarget | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState<WardForm>(EMPTY);
  const [loadingWard, setLoadingWard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ field: Field | null; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const editingId = target?.kind === 'edit' ? target.id : null;

  useEffect(() => {
    setError(null);
    setConfirmDelete(false);
    if (!target) return;
    if (target.kind === 'add') { setForm(EMPTY); return; }
    let cancelled = false;
    setLoadingWard(true);
    dataGet<{ name: string; category?: string; category_other?: string; gender?: string; total_beds?: number }>(ENDPOINTS.WARD(target.id))
      .then((w) => {
        if (cancelled) return;
        setForm({
          name: w.name ?? '',
          category: w.category ?? 'MEDICAL',
          category_other: w.category_other ?? '',
          gender: w.gender ?? 'O',
          total_beds: String(w.total_beds ?? 0),
        });
      })
      .catch((err) => { if (!cancelled) setError(readError(err)); })
      .finally(() => { if (!cancelled) setLoadingWard(false); });
    return () => { cancelled = true; };
  }, [target]);

  function set<K extends Field>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (error?.field === key) setError(null);
  }

  const beds = Number(form.total_beds);
  const localError: { field: Field; message: string } | null =
    !form.name.trim() ? { field: 'name', message: 'Give the ward a name.' }
      : form.category === 'OTHER' && !form.category_other.trim() ? { field: 'category_other', message: 'Say what kind of ward this is.' }
        : !Number.isInteger(beds) || beds < 0 || beds > MAX_BEDS ? { field: 'total_beds', message: `Enter a whole number from 0 to ${MAX_BEDS}.` }
          : null;

  async function save() {
    if (localError) { setError(localError); return; }
    setSaving(true);
    setError(null);
    const body = {
      name: form.name.trim(),
      category: form.category,
      category_other: form.category === 'OTHER' ? form.category_other.trim() : '',
      gender: form.gender,
      total_beds: beds,
    };
    try {
      if (editingId) {
        await apiAction(ENDPOINTS.WARD(editingId), 'PATCH', body);
        toast.success(`${body.name} saved`);
      } else {
        await apiAction(ENDPOINTS.WARDS, 'POST', body);
        toast.success(`${body.name} added with ${beds} ${beds === 1 ? 'bed' : 'beds'}`);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(readError(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!editingId) return;
    setSaving(true);
    setError(null);
    try {
      await apiAction(ENDPOINTS.WARD(editingId), 'DELETE');
      toast.success(`${form.name || 'Ward'} deleted`);
      onSaved();
      onClose();
    } catch (err) {
      setError(readError(err));
      setConfirmDelete(false);
    } finally {
      setSaving(false);
    }
  }

  const fieldError = (f: Field) =>
    error?.field === f ? <span role="alert" className="text-[11.5px] text-danger">{error.message}</span> : null;

  return (
    <SlidePanel
      open={target !== null}
      onClose={onClose}
      title={editingId ? `Edit ${target?.kind === 'edit' ? target.name : 'ward'}` : 'Add ward'}
      subtitle={editingId ? 'Change the ward or its number of beds' : 'Set up a ward and its beds'}
      footer={
        <>
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button className="flex-1" onClick={() => void save()} loading={saving} disabled={loadingWard}>
            {editingId ? 'Save ward' : 'Add ward'}
          </Button>
        </>
      }
    >
      {loadingWard ? (
        <p className="text-sm text-text-soft">Loading the ward…</p>
      ) : (
        <>
          {error && error.field === null && (
            <p role="alert" className="mb-4 text-xs font-semibold text-danger bg-danger-bg rounded-lg px-3 py-2.5">{error.message}</p>
          )}
          <FormField label="Ward name *">
            <input id="ward-name" className={formInputClass} value={form.name} maxLength={100}
              onChange={(e) => set('name', e.target.value)} aria-invalid={error?.field === 'name' || undefined} />
            {fieldError('name')}
          </FormField>
          <FormField label="Type of ward *">
            <select id="ward-category" className={formInputClass} value={form.category} onChange={(e) => set('category', e.target.value)}>
              {WARD_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </FormField>
          {form.category === 'OTHER' && (
            <FormField label="What kind of ward? *">
              <input id="ward-category-other" className={formInputClass} value={form.category_other} maxLength={100}
                onChange={(e) => set('category_other', e.target.value)} aria-invalid={error?.field === 'category_other' || undefined} />
              {fieldError('category_other')}
            </FormField>
          )}
          <FormField label="Patients *">
            <select id="ward-gender" className={formInputClass} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
              {WARD_PATIENTS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </FormField>
          <FormField label="Number of beds *">
            <input id="ward-total-beds" type="number" inputMode="numeric" min={0} max={MAX_BEDS} step={1}
              className={formInputClass} value={form.total_beds}
              onChange={(e) => set('total_beds', e.target.value)} aria-invalid={error?.field === 'total_beds' || undefined} />
            <span className="text-[11px] text-text-soft">
              Beds are numbered for you. Lowering the number removes free beds only; a bed with a patient in it stays.
            </span>
            {fieldError('total_beds')}
          </FormField>

          {editingId && (
            <div className="mt-6 pt-4 border-t border-border">
              {!confirmDelete ? (
                <button type="button" onClick={() => setConfirmDelete(true)} disabled={saving}
                  className="text-xs font-semibold text-danger hover:underline">
                  Delete this ward
                </button>
              ) : (
                <div role="alertdialog" aria-label="Confirm deleting the ward" className="rounded-lg bg-danger-bg px-3 py-3 space-y-2">
                  <p className="text-xs text-ink">
                    Delete {form.name || 'this ward'} and all its free beds? A ward with a patient in any bed can&apos;t be deleted.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setConfirmDelete(false)} disabled={saving}>Keep it</Button>
                    <Button variant="danger" onClick={() => void remove()} loading={saving}>Delete ward</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </SlidePanel>
  );
}
