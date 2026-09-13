import { requireDashboardUser } from '@/lib/auth-server';
import { serverFetch } from '@/lib/server-fetch';
import { ENDPOINTS, ROLES } from '@/lib/config';
import { PatientDashboard } from '@/components/dashboard/patient/PatientDashboard';
import type { PatientDashboardData } from '@/types/dashboard';

/**
 * The patient portal — deliberately NOT org-scoped (FLAG-210).
 *
 * `GET /auth/me/` returns `organization: null` for a patient, and that is the
 * correct answer rather than missing data: records move WITH the patient between
 * facilities (`CLAUDE.md` §1), so a patient belongs to no single organisation.
 * The old route was `/[slug]/patient`, so signin had nowhere to send them and
 * refused the login outright — patients could not sign in at all.
 *
 * Architecture settled 2026-08-28: the apex (`healthclouda.com`) is marketing
 * **plus** the patient portal; organisation staff use `beta.`. Hence no slug
 * here, and `patient` is in `RESERVED_PATHS` so no org can shadow it.
 *
 * No tenant check either — there is no tenant to check. `requireDashboardUser`
 * is called without a slug, so it asserts the role alone, from `/auth/me/`.
 */
export default async function PatientPage() {
  const user = await requireDashboardUser(ROLES.PATIENT);

  const stats = await serverFetch<PatientDashboardData>(ENDPOINTS.PATIENT_DASHBOARD);

  return <PatientDashboard user={user} initialStats={stats} />;
}
