import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DoctorPicker } from './DoctorPicker';

// FLAG-056 — the optional picker's blank option read "No doctor available right
// now" directly above an "On duty" group that had a doctor in it. The blank
// choice means "admit without naming a doctor", which is what it now says.
describe('FLAG-056 — the optional doctor picker\'s blank option', () => {
  const doctors = [
    { id: 'd1', full_name: 'Emeka Okafor', staff_id: 'S1', is_on_duty: true },
    { id: 'd2', full_name: 'Yemi Adewale', staff_id: 'S2', is_on_duty: false },
  ];

  it('says no doctor is named yet, not that none is available', () => {
    render(<DoctorPicker doctors={doctors} loading={false} error={null} value="" onChange={() => {}} />);
    expect(screen.getByRole('option', { name: 'No attending doctor yet' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /No doctor available/ })).not.toBeInTheDocument();
  });

  it('keeps "Select a doctor…" when a doctor is required', () => {
    render(<DoctorPicker doctors={doctors} loading={false} error={null} value="" onChange={() => {}} required />);
    expect(screen.getByRole('option', { name: 'Select a doctor…' })).toBeInTheDocument();
  });
});
