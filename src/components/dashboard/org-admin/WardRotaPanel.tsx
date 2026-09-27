'use client';

import { useState } from 'react';
import { SlidePanel } from '@/components/ui/SlidePanel';
import { FormField, formInputClass } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAllPages, usePaginatedList, apiAction } from '@/hooks/use-api';
import { useToast } from '@/store/toast';
import { formatDateTime, localDateTimeToISOString } from '@/lib/utils';
import { ENDPOINTS } from '@/lib/config';
import type { Shift, ShiftInput, OrgStaffMember } from '@/types/dashboard';

// ─── Org Admin: the ward rota (build 6, FLAG-046) ─────────────────
//
// Per-ward shift history — who is on the ward, who is in charge, when. This
// is deliberately the FULL history (upcoming AND past), per the owner's
// 2026-09-17 decision: "so 'who was in charge of the emergency ward that
// night?' can be answered months later" — the list is not filtered to
// current/upcoming only, and shifts are never deleted by the passage of
// time, only by an explicit admin action.
//
// Times are sent as ISO strings WITH AN OFFSET (`localDateTimeToISOString`,
// the FLAG-242 lesson already shipped in DischargePanel's
// toDischargePayloadValue) — a `datetime-local` input carries no timezone,
// and the backend is UTC.

const EMPTY_FORM: ShiftInput = { ward: '', nurse: '', starts_at: '', ends_at: '', is_in_charge: false };

function isNurse(s: OrgStaffMember): boolean {
  return s.role.toLowerCase() === 'nurse' && s.is_active;
}

export function WardRotaPanel({ ward, onClose }: { ward: { id: string; name: string } | null; onClose: () => void }) {
  const { toast } = useToast();
  const { items: shifts, count, page, setPage, totalPages, loading, error, refetch } =
    usePaginatedList<Shift>(ward ? `${ENDPOINTS.SHIFTS}?ward_id=${ward.id}` : null);
  // Full nurse roster for the picker — a dropdown needs every nurse, not one
  // page of the org's staff list.
  const { data: staff } = useAllPages<OrgStaffMember>(ENDPOINTS.ORG_ADMIN_STAFF);
  const nurses = (staff ?? []).filter(isNurse);

  const [editing, setEditing] = useState<Shift | 'new' | null>(null);
  const [form, setForm] = useState<ShiftInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Shift | null>(null);
  const [working, setWorking] = useState(false);

  function openNew() {
    setForm({ ...EMPTY_FORM, ward: ward?.id ?? '' });
    setFormError(null);
    setEditing('new');
  }

  function openEdit(s: Shift) {
    setForm({
      ward: s.ward,
      nurse: s.nurse,
      // Trim the trailing 'Z'/offset back to a datetime-local-friendly
      // "YYYY-MM-DDTHH:mm" in the browser's own zone (what the <input> needs
      // to redisplay it), then localDateTimeToISOString() undoes exactly
      // this on submit — so an unedited field round-trips to the same instant.
      starts_at: toDatetimeLocalValue(s.starts_at),
      ends_at: toDatetimeLocalValue(s.ends_at),
      is_in_charge: s.is_in_charge,
    });
    setFormError(null);
    setEditing(s);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ward || saving) return;
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        ward: form.ward || ward.id,
        nurse: form.nurse,
        starts_at: localDateTimeToISOString(form.starts_at),
        ends_at: localDateTimeToISOString(form.ends_at),
        is_in_charge: form.is_in_charge,
      };
      if (editing === 'new') {
        await apiAction(ENDPOINTS.SHIFTS, 'POST', payload);
        toast.success('Shift added');
      } else if (editing) {
        await apiAction(ENDPOINTS.SHIFT(editing.id), 'PATCH', payload);
        toast.success('Shift updated');
      }
      setEditing(null);
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save this shift');
    } finally {
      setSaving(false);
    }
  }

  async function confirmRemove() {
    if (!removing) return;
    setWorking(true);
    try {
      await apiAction(ENDPOINTS.SHIFT(removing.id), 'DELETE');
      toast.success('Shift removed');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove this shift');
    } finally {
      setWorking(false);
      setRemoving(null);
    }
  }

  const columns: DataTableColumn<Shift>[] = [
    { key: 'nurse', header: 'Nurse', render: (s) => <span className="text-[13px] font-semibold text-ink">{s.nurse_name}</span> },
    { key: 'starts', header: 'Starts', className: 'whitespace-nowrap', render: (s) => <span className="text-xs text-text-soft">{formatDateTime(s.starts_at)}</span> },
    { key: 'ends', header: 'Ends', className: 'whitespace-nowrap', render: (s) => <span className="text-xs text-text-soft">{formatDateTime(s.ends_at)}</span> },
    { key: 'in_charge', header: 'In charge', render: (s) => (s.is_in_charge ? <StatusBadge status="ACTIVE" label="In charge" /> : <span className="text-xs text-text-soft">—</span>) },
    {
      key: 'actions', header: '',
      render: (s) => (
        <div className="flex gap-2 justify-end">
          <button onClick={() => openEdit(s)} className="text-[11.5px] font-semibold text-primary hover:underline">Edit</button>
          <button onClick={() => setRemoving(s)} className="text-[11.5px] font-semibold text-danger hover:underline">Remove</button>
        </div>
      ),
    },
  ];

  const isFormOpen = editing !== null;

  return (
    <>
      <SlidePanel
        open={!!ward}
        onClose={onClose}
        title="Ward rota"
        subtitle={ward?.name}
        footer={
          <Button className="w-full" onClick={openNew}>Add shift</Button>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-text-soft">
            Upcoming and past shifts for this ward — a full history, so who was in charge and when
            can always be answered later.
          </p>
          <DataTable
            columns={columns}
            data={shifts}
            getRowKey={(s) => s.id}
            loading={loading}
            error={error}
            onRetry={refetch}
            emptyTitle="No shifts"
            emptyDescription="No nurse has been rostered on this ward yet."
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalCount={count}
            pageSize={20}
          />
        </div>
      </SlidePanel>

      <SlidePanel
        open={isFormOpen}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add shift' : 'Edit shift'}
        subtitle={ward?.name}
        footer={
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 text-sm font-medium text-text-soft hover:text-ink">Cancel</button>
            <Button type="submit" form="shift-form" loading={saving} disabled={!form.nurse || !form.starts_at || !form.ends_at || saving}>
              Save
            </Button>
          </div>
        }
      >
        <form id="shift-form" onSubmit={submit} className="space-y-4">
          {formError && (
            <p role="alert" className="text-xs font-semibold text-danger bg-danger-bg border border-danger/30 rounded-lg px-3 py-2.5">
              {formError}
            </p>
          )}
          <FormField label="Nurse *">
            <select className={formInputClass} value={form.nurse} onChange={(e) => setForm((f) => ({ ...f, nurse: e.target.value }))}>
              <option value="">Select a nurse…</option>
              {nurses.map((n) => <option key={n.id} value={n.id}>{n.full_name}</option>)}
            </select>
          </FormField>
          <FormField label="Starts *">
            <input type="datetime-local" className={formInputClass} value={form.starts_at} onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))} />
          </FormField>
          <FormField label="Ends *">
            <input type="datetime-local" className={formInputClass} value={form.ends_at} onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))} />
          </FormField>
          <label className="flex items-center gap-2.5 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.is_in_charge}
              onChange={(e) => setForm((f) => ({ ...f, is_in_charge: e.target.checked }))}
            />
            In charge of this ward for this shift
          </label>
          <p className="text-xs text-text-soft">
            Only one nurse is in charge of a ward at a time — marking this shift moves it here.
          </p>
        </form>
      </SlidePanel>

      <SlidePanel
        open={!!removing}
        onClose={() => setRemoving(null)}
        title="Remove shift"
        subtitle={removing ? `${removing.nurse_name} · ${formatDateTime(removing.starts_at)}` : undefined}
        footer={
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setRemoving(null)} className="px-4 py-2 text-sm font-medium text-text-soft hover:text-ink">Cancel</button>
            <Button variant="danger" onClick={confirmRemove} loading={working}>Remove</Button>
          </div>
        }
      >
        <p className="text-sm text-text-soft">
          This removes the shift from the rota. It will no longer appear on the ward board and, if
          it is the current in-charge shift, nobody will be marked in charge until another shift
          is added.
        </p>
      </SlidePanel>
    </>
  );
}

// Converts an ISO instant (from the server) back to the "YYYY-MM-DDTHH:mm"
// shape a `datetime-local` input expects, in the BROWSER's own zone — the
// exact inverse of `localDateTimeToISOString`. Without this, editing an
// existing shift would redisplay its stored UTC instant as if it were local
// wall-clock time, silently shifting it by the zone offset on every re-save.
function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
