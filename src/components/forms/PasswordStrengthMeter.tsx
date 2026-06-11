'use client';

interface Props {
  password: string;
}

function score(pw: string): { value: number; label: string; color: string } {
  let n = 0;
  if (pw.length >= 8) n++;
  if (pw.length >= 12) n++;
  if (/[A-Z]/.test(pw)) n++;
  if (/[0-9]/.test(pw)) n++;
  if (/[^A-Za-z0-9]/.test(pw)) n++;
  if (n <= 1) return { value: n, label: 'Weak', color: 'bg-red-400' };
  if (n <= 2) return { value: n, label: 'Fair', color: 'bg-yellow-400' };
  if (n <= 3) return { value: n, label: 'Good', color: 'bg-blue-400' };
  return { value: n, label: 'Strong', color: 'bg-green-500' };
}

export function PasswordStrengthMeter({ password }: Props) {
  if (!password) return null;
  const { value, label, color } = score(password);

  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
              i <= value ? color : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}