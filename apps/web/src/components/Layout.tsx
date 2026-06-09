import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { isSupabaseConfigured } from "@/lib/supabase";

const nav = [
  { to: "/", label: "Home" },
  { to: "/documents", label: "Documents" },
  { to: "/settings", label: "Settings" },
  { to: "/team", label: "Team" },
];

export function Layout() {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-brand text-lg">
            <span className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center text-white text-sm">
              EI
            </span>
            EasyInvoice
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === item.to
                    ? "bg-blue-50 text-brand"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 text-sm">
            {!isSupabaseConfigured && (
              <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded text-xs">
                Local mode
              </span>
            )}
            {user ? (
              <span className="text-slate-500">{user.email}</span>
            ) : isSupabaseConfigured ? (
              <Link to="/login" className="text-brand font-medium">
                Sign in
              </Link>
            ) : null}
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        EasyInvoice — simple proforma, invoice & receipt generator
      </footer>
    </div>
  );
}
