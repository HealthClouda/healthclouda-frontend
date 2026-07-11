'use client';

import { useState } from 'react';
import { DashboardShell, type NavItem } from '@/components/layout/DashboardShell';
import { StatCard } from '@/components/dashboard/StatCard';
import { DutyToggle } from '@/components/dashboard/DutyToggle';
import { useApi, apiAction, usePaginatedList } from '@/hooks/use-api';
import { useToast } from '@/store/toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Pagination } from '@/components/ui/Pagination';
import { ShimmerRows } from '@/components/ui/Shimmer';
import { Avatar } from '@/components/ui/Avatar';
import { formatDate, timeAgo } from '@/lib/utils';
import { ENDPOINTS } from '@/lib/config';
import type { User } from '@/types/auth';
import type { NurseStats, NurseAdmission, PatientVitals, Ward, Paginated } from '@/types/dashboard';

function GridIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>; }
function UserIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>; }
function HeartIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>; }
function BedIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>; }
function QueueIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>; }
function PlusIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 4.5v15m7.5-7.5h-15" /></svg>; }

const NAV: NavItem[] = [
  { id: 'overview', label: 'Overview',     icon: <GridIcon /> },
  { id: 'patients', label: 'My Patients',  icon: <UserIcon /> },
  { id: 'vitals',   label: 'Vitals',       icon: <HeartIcon /> },
  { id: 'wards',    label: 'Ward Overview',icon: <BedIcon /> },
];

function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white"><table className="w-full text-sm">{children}</table></div>;
}
function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{children}</th>;
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3.5 text-gray-700 ${className}`}>{children}</td>;
}

function PatientCell({ admission }: { admission: NurseAdmission }) {
  const p = admission.patient;
  return (
    <div className="flex items-center gap-2.5">
      <Avatar firstName={p.first_name} lastName={p.last_name} size="sm" />
      <div>
        <div className="font-medium text-gray-900">{p.first_name} {p.last_name}</div>
        <div className="text-xs text-gray-400 font-mono">{p.healthclouda_id}</div>
      </div>
    </div>
  );
}

function wardBedLabel(a: NurseAdmission): string {
  const parts = [a.ward?.name, a.bed ? `Bed ${a.bed.bed_number}` : null].filter(Boolean);
  return parts.length ? parts.join(' · ') : '—';
}

// ─── Overview ────────────────────────────────────────────────────

function OverviewPage({ stats, onNavigate, onRecordVitals, isOnDuty }: {
  stats: NurseStats | null;
  onNavigate: (p: string) => void;
  onRecordVitals: (a: NurseAdmission) => void;
  isOnDuty: boolean;
}) {
  const { data, loading, error, refetch } =
    useApi<Paginated<NurseAdmission>>(ENDPOINTS.NURSE_MY_PATIENTS + '?page_size=5');
  const admissions = data?.results ?? [];

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${isOnDuty ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'}`}>
        <p className={`text-sm font-medium ${isOnDuty ? 'text-emerald-700' : 'text-gray-500'}`}>
          {isOnDuty ? 'You are currently on duty and visible to the system.' : 'You are currently off duty.'}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard loading={!stats} label="Active Admissions" value={stats?.active_admissions} icon={<UserIcon />} color="purple" onClick={() => onNavigate('patients')} />
        <StatCard loading={!stats} label="Patients in Queue" value={stats?.patients_in_queue} icon={<QueueIcon />} color="amber" />
        <StatCard loading={!stats} label="Bed Occupancy" value={stats ? `${stats.occupancy_rate}%` : undefined} icon={<BedIcon />} color="blue"
          delta={stats ? `${stats.occupied_beds} of ${stats.total_beds} beds occupied` : undefined}
          onClick={() => onNavigate('wards')} />
        <StatCard loading={!stats} label="Admitted Today" value={stats?.todays_admissions} icon={<PlusIcon />} color="green"
          delta={stats ? `${stats.todays_discharges} discharged today` : undefined} />
      </div>

      {/* My patients preview → record vitals */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">My Patients</h2>
          <button onClick={() => onNavigate('patients')} className="text-xs font-medium text-purple-600 hover:text-purple-800">View all →</button>
        </div>
        {loading ? <ShimmerRows count={4} /> : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : !admissions.length ? (
          <EmptyState title="No active admissions" description="Patients admitted at your organization will appear here." />
        ) : (
          <TableWrap>
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr><Th>Patient</Th><Th>Ward / Bed</Th><Th>Complaint</Th><Th>Admitted</Th><Th>Vitals</Th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {admissions.map(a => (
                <tr key={a.id} className="hover:bg-gray-50/60 transition-colors">
                  <Td><PatientCell admission={a} /></Td>
                  <Td className="text-xs whitespace-nowrap">{wardBedLabel(a)}</Td>
                  <Td className="text-xs">{a.episode?.chief_complaint || '—'}</Td>
                  <Td className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(a.admitted_at)}</Td>
                  <Td>
                    <button onClick={() => onRecordVitals(a)}
                      className="text-xs font-medium text-purple-600 hover:text-purple-800 whitespace-nowrap">
                      Record vitals →
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </div>
    </div>
  );
}

// ─── My Patients page ─────────────────────────────────────────────

function MyPatientsPage({ onRecordVitals }: { onRecordVitals: (a: NurseAdmission) => void }) {
  const { items: admissions, count, page, setPage, totalPages, loading, error, refetch } =
    usePaginatedList<NurseAdmission>(ENDPOINTS.NURSE_MY_PATIENTS);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">My Patients</h2>
        {count > 0 && <p className="text-sm text-gray-400 mt-0.5">{count} active admission{count === 1 ? '' : 's'}</p>}
      </div>
      {loading ? <ShimmerRows count={6} /> : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !admissions.length ? (
        <EmptyState title="No active admissions" description="Patients admitted at your organization will appear here." />
      ) : (
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr><Th>Patient</Th><Th>Age / Sex</Th><Th>Ward / Bed</Th><Th>Complaint</Th><Th>Admitted</Th><Th>Vitals</Th></tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {admissions.map(a => (
              <tr key={a.id} className="hover:bg-gray-50/60 transition-colors">
                <Td><PatientCell admission={a} /></Td>
                <Td className="text-xs whitespace-nowrap">
                  {[a.patient.age != null ? `${a.patient.age}y` : null, a.patient.gender, a.patient.blood_type]
                    .filter(Boolean).join(' · ') || '—'}
                </Td>
                <Td className="text-xs whitespace-nowrap">{wardBedLabel(a)}</Td>
                <Td className="text-xs">{a.episode?.chief_complaint || '—'}</Td>
                <Td className="text-xs text-gray-400 whitespace-nowrap">
                  {formatDate(a.admitted_at)}
                  {a.length_of_stay > 0 && <span className="ml-1">({a.length_of_stay}d)</span>}
                </Td>
                <Td>
                  <button onClick={() => onRecordVitals(a)}
                    className="text-xs font-medium text-purple-600 hover:text-purple-800 whitespace-nowrap">
                    Record vitals →
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalCount={count} pageSize={20} />
    </div>
  );
}

// ─── Vitals page ──────────────────────────────────────────────────

// Backend validation bounds — probed live 2026-07-11 (400 {error} outside).
const VITAL_FIELDS = [
  { key: 'temperature',              label: 'Temperature (°C)',       min: 30,  max: 45,  step: 0.1 },
  { key: 'blood_pressure_systolic',  label: 'Systolic (mmHg)',        min: 50,  max: 300, step: 1 },
  { key: 'blood_pressure_diastolic', label: 'Diastolic (mmHg)',       min: 20,  max: 200, step: 1 },
  { key: 'pulse_rate',               label: 'Pulse rate (bpm)',       min: 20,  max: 250, step: 1 },
  { key: 'respiratory_rate',         label: 'Resp. rate (per min)',   min: 5,   max: 60,  step: 1 },
  { key: 'oxygen_saturation',        label: 'SpO2 (%)',               min: 50,  max: 100, step: 1 },
  { key: 'weight',                   label: 'Weight (kg)',            min: 0.5, max: 500, step: 0.1 },
  { key: 'height',                   label: 'Height (cm)',            min: 20,  max: 300, step: 0.1 },
] as const;

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2.5">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-gray-900 mt-0.5 tabular-nums">{value}</p>
    </div>
  );
}

function LatestReading({ vitals }: { vitals: PatientVitals }) {
  const r = vitals.vitals;
  if (!r) {
    return <EmptyState title="No vitals recorded" description="Readings recorded for this patient's active episode will appear here." />;
  }
  const bp = r.blood_pressure_systolic != null || r.blood_pressure_diastolic != null
    ? `${r.blood_pressure_systolic ?? '—'} / ${r.blood_pressure_diastolic ?? '—'}`
    : '—';
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">Latest reading</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Metric label="BP (mmHg)" value={bp} />
        <Metric label="Pulse" value={r.pulse_rate != null ? `${r.pulse_rate} bpm` : '—'} />
        <Metric label="Temp" value={r.temperature != null ? `${r.temperature}°C` : '—'} />
        <Metric label="SpO2" value={r.oxygen_saturation != null ? `${r.oxygen_saturation}%` : '—'} />
        <Metric label="Resp. rate" value={r.respiratory_rate != null ? `${r.respiratory_rate}/min` : '—'} />
        <Metric label="Weight" value={r.weight != null ? `${r.weight} kg` : '—'} />
        <Metric label="Height" value={r.height != null ? `${r.height} cm` : '—'} />
        <Metric label="Recorded" value={timeAgo(r.recorded_at)} />
      </div>
      {r.notes && <p className="text-xs text-gray-500 border-t border-gray-50 pt-2.5">{r.notes}</p>}
      {r.recorded_by_info && (
        <p className="text-xs text-gray-400">Recorded {timeAgo(r.recorded_at)} by {r.recorded_by_info.full_name}</p>
      )}
    </div>
  );
}

function RecordVitalsForm({ patientId, onRecorded }: { patientId: string; onRecorded: () => void }) {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Only send fields the nurse actually filled in — the backend stores a
    // partial body as-is, and an empty body would create an all-null reading.
    const payload: Record<string, number | string> = {};
    for (const f of VITAL_FIELDS) {
      const raw = values[f.key]?.trim();
      if (raw) payload[f.key] = Number(raw);
    }
    if (notes.trim()) payload.notes = notes.trim();
    if (!Object.keys(payload).length) {
      setFormError('Enter at least one measurement or a note before saving.');
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      await apiAction(ENDPOINTS.NURSE_VITALS(patientId), 'PATCH', payload);
      toast.success('Vitals recorded');
      setValues({});
      setNotes('');
      onRecorded();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to record vitals');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">Record new reading</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {VITAL_FIELDS.map(f => (
          <div key={f.key}>
            <label htmlFor={`vital-${f.key}`} className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
            <input
              id={`vital-${f.key}`}
              type="number"
              min={f.min}
              max={f.max}
              step={f.step}
              value={values[f.key] ?? ''}
              onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
            />
          </div>
        ))}
      </div>
      <div>
        <label htmlFor="vital-notes" className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
        <textarea
          id="vital-notes"
          rows={2}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
        />
      </div>
      {formError && <p role="alert" className="text-xs font-medium text-red-600">{formError}</p>}
      <button type="submit" disabled={saving}
        className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-60 transition-colors">
        {saving ? 'Saving…' : 'Record reading'}
      </button>
    </form>
  );
}

function VitalsPanel({ admission }: { admission: NurseAdmission }) {
  const { data, loading, error, refetch } =
    useApi<PatientVitals>(ENDPOINTS.NURSE_VITALS(admission.patient.id));

  return (
    <div className="space-y-4">
      {loading ? <ShimmerRows count={3} /> : error ? (
        // 404 here = no active episode for this patient at your org.
        <ErrorState message={error} onRetry={refetch} />
      ) : data ? (
        <LatestReading vitals={data} />
      ) : null}
      <RecordVitalsForm patientId={admission.patient.id} onRecorded={refetch} />
    </div>
  );
}

function VitalsPage({ selected, onSelect }: {
  selected: NurseAdmission | null;
  onSelect: (a: NurseAdmission) => void;
}) {
  const { items: admissions, loading, error, refetch } =
    usePaginatedList<NurseAdmission>(ENDPOINTS.NURSE_MY_PATIENTS, 50);

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-900">Vitals</h2>
      {loading ? <ShimmerRows count={6} /> : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !admissions.length ? (
        <EmptyState title="No active admissions" description="Admit a patient to record their vitals." />
      ) : (
        <div className="grid lg:grid-cols-[280px_1fr] gap-4 items-start">
          {/* Patient picker */}
          <div className="bg-white rounded-xl border border-gray-100 p-2 space-y-1">
            {admissions.map(a => (
              <button key={a.id} onClick={() => onSelect(a)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                  selected?.patient.id === a.patient.id ? 'bg-purple-50' : 'hover:bg-gray-50'
                }`}>
                <Avatar firstName={a.patient.first_name} lastName={a.patient.last_name} size="sm" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{a.patient.first_name} {a.patient.last_name}</div>
                  <div className="text-xs text-gray-400 truncate">{a.patient.healthclouda_id} · {wardBedLabel(a)}</div>
                </div>
              </button>
            ))}
          </div>
          {selected ? (
            <VitalsPanel key={selected.patient.id} admission={selected} />
          ) : (
            <EmptyState title="Select a patient" description="Choose a patient to view and record their vitals." />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Ward Overview page ───────────────────────────────────────────

function WardsPage() {
  const { data, loading, error, refetch } = useApi<Ward[] | Paginated<Ward>>(ENDPOINTS.NURSE_WARDS_OVERVIEW);
  const wards = Array.isArray(data) ? data : (data as Paginated<Ward> | null)?.results ?? [];

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-900">Ward Overview</h2>
      {loading ? <ShimmerRows count={3} /> : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !wards.length ? (
        <EmptyState title="No wards" description="Ward information will appear here." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wards.map(ward => {
            const pct = ward.total_beds > 0 ? Math.round((ward.occupied_beds / ward.total_beds) * 100) : 0;
            const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-purple-500';
            const badgeColor = pct >= 90 ? 'bg-red-50 text-red-700' : pct >= 70 ? 'bg-amber-50 text-amber-700' : 'bg-purple-50 text-purple-700';
            return (
              <div key={ward.id} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{ward.name}</h3>
                    {ward.category && <p className="text-xs text-gray-400 mt-0.5">{ward.category}</p>}
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>{pct}%</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{ward.occupied_beds} occupied</span>
                    <span className="text-emerald-600 font-medium">{ward.available_beds} free</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-gray-400">{ward.total_beds} total beds</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  overview: 'Overview',
  patients: 'My Patients',
  vitals: 'Vitals',
  wards: 'Ward Overview',
};

interface Props {
  user: User;
  initialStats: NurseStats | null;
  slug: string;
}

export function NurseDashboard({ user, initialStats, slug: _slug }: Props) {
  const [page, setPage] = useState('overview');
  // Patient whose vitals are open — set by "Record vitals" row actions so
  // the Vitals page lands with that patient already selected.
  const [vitalsFor, setVitalsFor] = useState<NurseAdmission | null>(null);
  const [isOnDuty, setIsOnDuty] = useState(user.is_on_duty ?? false);
  // AUTH-6: server render can't refresh an expired session — fall back to a
  // client-side stats fetch instead of shimmering forever.
  const { data: fetchedStats } = useApi<NurseStats>(initialStats ? null : ENDPOINTS.NURSE_STATS);
  const stats = initialStats ?? fetchedStats;

  function openVitals(a: NurseAdmission) {
    setVitalsFor(a);
    setPage('vitals');
  }

  return (
    <DashboardShell
      navItems={NAV}
      activePage={page}
      onPageChange={setPage}
      user={{ ...user, is_on_duty: isOnDuty }}
      pageTitle={PAGE_TITLES[page]}
      dutyToggle={<DutyToggle isOnDuty={isOnDuty} onToggle={setIsOnDuty} />}
    >
      {page === 'overview' && <OverviewPage stats={stats} onNavigate={setPage} onRecordVitals={openVitals} isOnDuty={isOnDuty} />}
      {page === 'patients' && <MyPatientsPage onRecordVitals={openVitals} />}
      {page === 'vitals'   && <VitalsPage selected={vitalsFor} onSelect={setVitalsFor} />}
      {page === 'wards'    && <WardsPage />}
    </DashboardShell>
  );
}
