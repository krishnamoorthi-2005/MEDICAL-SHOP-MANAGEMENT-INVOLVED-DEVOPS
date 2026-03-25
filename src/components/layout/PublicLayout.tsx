import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const location = useLocation();

  const navigationItems = [
    { label: 'Home', path: '/' },
    { label: 'About', path: '/about' },
    { label: 'Services', path: '/services' },
    { label: 'Contact', path: '/contact' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Public Navigation Header */}
      <nav className="sticky top-0 z-50 h-16 border-b border-border/60 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/90"
        style={{ boxShadow: '0 1px 0 rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.04)' }}>
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl shadow-md"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 3px 10px rgba(99,102,241,.35)' }}>
              <Activity className="h-5 w-5 text-white" />
            </div>
            <span className="text-base font-extrabold tracking-tight"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Special Access Pharma
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navigationItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                  location.pathname === item.path
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="text-slate-600 hover:text-slate-900">
              <Link to="/login">Login</Link>
            </Button>
            <Button size="sm" asChild
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 2px 8px rgba(99,102,241,.3)' }}>
              <Link to="/signup">Sign Up Free</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                <Activity className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-bold text-slate-700">Special Access Pharma</span>
            </div>
            <p className="text-sm text-slate-500">© 2026 Special Access Pharma. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}