interface AuthCardProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  logo?: string;
  orgName?: string;
}

export function AuthCard({ children, title, subtitle, logo, orgName }: AuthCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {orgName && (
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
            {logo && (
              <img src={logo} alt={orgName} className="h-10 w-10 rounded-lg object-contain" />
            )}
            <span className="font-medium text-gray-800">{orgName}</span>
          </div>
        )}
        <div className="mb-7">
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}