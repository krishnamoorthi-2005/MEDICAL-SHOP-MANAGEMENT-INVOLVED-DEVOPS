import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LogOut, User, ClipboardList, FileText, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserLayoutProps {
    children: React.ReactNode;
}

export function UserLayout({ children }: UserLayoutProps) {
    const navigate = useNavigate();
    const location = useLocation();

    const userEmail = localStorage.getItem('userEmail') || 'user@specialaccesspharma.com';
    const userName = localStorage.getItem('userFullName') || userEmail.split('@')[0];

    const handleLogout = () => {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userFullName');
        localStorage.removeItem('token');
        window.location.replace('/login');
    };

    const navigationItems = [
        { label: 'Submit Request', path: '/submit-prescription', icon: FileText },
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Navigation Header */}
            <nav className="sticky top-0 z-50 h-16 border-b border-border/60 bg-white/95 backdrop-blur-md"
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
                                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                                    location.pathname === item.path
                                        ? "bg-indigo-50 text-indigo-700"
                                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    {/* User Info & Logout */}
                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                            <div className="h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                                {userName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-semibold text-slate-700">{userName}</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-150"
                        >
                            <LogOut className="h-4 w-4" />
                            <span className="hidden md:inline">Logout</span>
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main>{children}</main>

            {/* Footer */}
            <footer className="border-t bg-slate-50">
                <div className="mx-auto max-w-7xl px-6 py-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-lg"
                                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                                <Activity className="h-3.5 w-3.5 text-white" />
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
