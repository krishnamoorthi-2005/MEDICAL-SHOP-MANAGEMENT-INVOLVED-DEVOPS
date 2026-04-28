import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Receipt, Package, ShoppingCart,
  ClipboardCheck, BarChart3, Settings, Search, Bell,
  Plus, ChevronDown, User, LogOut, Activity, Menu, X,
  Sparkles, Users, AlertTriangle, Clock, AlertOctagon
} from 'lucide-react';
import { getDashboardAnalytics } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', activeColor: 'text-violet-300', activeBg: 'bg-violet-500/20' },
  { id: 'billing', label: 'Billing', icon: Receipt, path: '/billing', activeColor: 'text-emerald-300', activeBg: 'bg-emerald-500/20' },
  { id: 'customers', label: 'Customers', icon: Users, path: '/customers', activeColor: 'text-teal-300', activeBg: 'bg-teal-500/20' },
  { id: 'inventory', label: 'Inventory', icon: Package, path: '/inventory', activeColor: 'text-sky-300', activeBg: 'bg-sky-500/20' },
  { id: 'purchases', label: 'Purchases', icon: ShoppingCart, path: '/purchases', activeColor: 'text-amber-300', activeBg: 'bg-amber-500/20' },
  { id: 'audit', label: 'Audit', icon: ClipboardCheck, path: '/audit', activeColor: 'text-rose-300', activeBg: 'bg-rose-500/20' },
  { id: 'reports', label: 'Reports', icon: BarChart3, path: '/reports', activeColor: 'text-pink-300', activeBg: 'bg-pink-500/20' },
  { id: 'transaction-lookup', label: 'Transaction Lookup', icon: Search, path: '/admin/transaction-lookup', activeColor: 'text-indigo-300', activeBg: 'bg-indigo-500/20' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings', activeColor: 'text-slate-300', activeBg: 'bg-slate-500/20' },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface Notification {
  type: 'low-stock' | 'expiring' | 'expired';
  message: string;
  icon: any;
  link?: string;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);



  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const data = await getDashboardAnalytics();
        const notifs: Notification[] = [];
        
        // Add low stock notifications
        if (data.lowStockItems && data.lowStockItems.length > 0) {
          data.lowStockItems.forEach((item: any) => {
            notifs.push({
              type: 'low-stock',
              message: `${item.name} - Only ${item.stock} units left`,
              icon: AlertTriangle,
              link: '/inventory?filter=low'
            });
          });
        }
        
        // Add expiring soon notifications
        if (data.expiringSoonItems && data.expiringSoonItems.length > 0) {
          data.expiringSoonItems.forEach((item: any) => {
            notifs.push({
              type: 'expiring',
              message: `${item.name} - ${item.batches} batch(es) expiring soon`,
              icon: Clock,
              link: '/inventory'
            });
          });
        }

        // Add expired notifications
        if (data.expiredItems && data.expiredItems.length > 0) {
          data.expiredItems.forEach((item: any) => {
            notifs.push({
              type: 'expired',
              message: `${item.name} - ${item.quantity} unit(s) already expired`,
              icon: AlertOctagon,
              link: '/inventory'
            });
          });
        }
        
        setNotifications(notifs);
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    };
    
    loadNotifications();
    // Refresh every 5 minutes
    const interval = setInterval(loadNotifications, 300000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userFullName');
    localStorage.removeItem('token');
    // Must use replace (full reload) — not navigate().
    // The `storage` event only fires in OTHER tabs, so navigate('/login') leaves
    // isAuthenticated=true in App.tsx state → /login redirects back to /dashboard
    // → ProtectedRoute finds no token → redirects back to /login → infinite loop.
    window.location.replace('/login');
  };

  const currentPage = navigationItems.find(item => location.pathname === item.path)?.label || 'Dashboard';
  const userEmail = localStorage.getItem('userEmail') || 'admin@specialaccesspharma.com';

  return (
    <div className="min-h-screen flex" style={{ background: 'hsl(220, 25%, 96%)' }}>

      {/* ─── Sidebar ──────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 flex-shrink-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{
          background: 'linear-gradient(180deg,#070b14 0%,#0d1426 30%,#0b1e38 60%,#06121f 100%)',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Sidebar Header – Brand */}
        <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="relative flex-shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl shadow-lg"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}>
              <Activity className="h-5 w-5 text-white" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 border-2" style={{ borderColor: '#070b14' }} />
            </span>
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-extrabold text-white tracking-tight truncate">Special Access Pharma</div>
            <div className="text-[11px] font-semibold truncate" style={{ color: '#5eead4' }}>Pharmacy System</div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto text-white/40 hover:text-white lg:hidden transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav section label */}
        <div className="px-5 pt-5 pb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(99,102,241,0.5)' }}>
            Main Menu
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5">
          {navigationItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.id}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                  isActive
                    ? "text-white"
                    : "text-slate-400 hover:text-white"
                )}
                style={isActive ? {
                  background: 'linear-gradient(90deg,rgba(99,102,241,0.18),rgba(139,92,246,0.08))',
                  boxShadow: 'inset 3px 0 0 #6366f1',
                } : {}}
              >
                {/* Hover bg for inactive */}
                {!isActive && (
                  <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ background: 'rgba(255,255,255,0.04)' }} />
                )}

                {/* Icon container */}
                <div className={cn(
                  'relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-all duration-200',
                  isActive ? item.activeBg : 'bg-white/5 group-hover:bg-white/10'
                )}>
                  <item.icon className={cn(
                    'h-4 w-4 transition-colors',
                    isActive ? item.activeColor : 'text-slate-500 group-hover:text-white'
                  )} />
                </div>

                <span className="truncate font-semibold flex-1">{item.label}</span>



                {/* Active indicator pulse */}
                {isActive && (
                  <div className="absolute right-3 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: '#6366f1' }} />
                    <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }} />
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-white/8 p-3">
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer group"
            style={{ transition: 'background .2s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.06)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white truncate">Admin</div>
              <div className="text-[11px] text-slate-400 truncate">{userEmail}</div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="flex-shrink-0 p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* ─── Main content ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">

        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 flex items-center gap-4 px-6 bg-white/85 backdrop-blur-xl border-b border-slate-200/70"
          style={{ boxShadow: '0 1px 0 rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.04)' }}>

          {/* Mobile hamburger */}
          <button onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumb */}
          <div className="hidden lg:flex items-center gap-2 text-sm">
            <span className="text-muted-foreground font-medium">Special Access Pharma</span>
            <span className="text-muted-foreground/40 text-base">/</span>
            <span className="font-semibold text-foreground">{currentPage}</span>
          </div>

          <div className="flex-1" />

          {/* Search */}
          <div className="relative hidden md:block w-60">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              placeholder="Search medicines…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm bg-slate-50/80 border-slate-200 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/15"
            />
          </div>

          {/* New Bill */}
          <Link
            to="/billing"
            className="hidden sm:flex items-center gap-1.5 h-9 px-4 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 3px 12px rgba(99,102,241,0.35)' }}
          >
            <Plus className="h-3.5 w-3.5" />
            New Bill
          </Link>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"
                className="relative h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-slate-100 rounded-lg">
                <Bell className="h-4.5 w-4.5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {notifications.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
              <DropdownMenuLabel className="flex items-center gap-2">
                <Bell className="h-4 w-4" /> Notifications
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No new notifications</div>
              ) : (
                <div className="py-1">
                  {notifications.map((notif, index) => {
                    const Icon = notif.icon;
                    return (
                      <Link key={index} to={notif.link || '#'}>
                        <DropdownMenuItem className="flex items-start gap-3 p-3 cursor-pointer">
                          <div className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0",
                            notif.type === 'low-stock'
                              ? 'bg-amber-100 text-amber-600'
                              : notif.type === 'expiring'
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-red-100 text-red-600'
                          )}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-snug">{notif.message}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {notif.type === 'low-stock'
                                ? 'Low Stock Alert'
                                : notif.type === 'expiring'
                                ? 'Expiring Soon'
                                : 'Expired Product Alert'}
                            </p>
                          </div>
                        </DropdownMenuItem>
                      </Link>
                    );
                  })}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm"
                className="gap-2 h-9 text-muted-foreground hover:text-foreground hover:bg-slate-100 rounded-lg">
                <div className="flex h-6 w-6 items-center justify-center rounded-full text-white text-xs"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                  <User className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-medium hidden sm:block">Admin</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>
                <div className="font-semibold">My Account</div>
                <div className="text-xs font-normal text-muted-foreground mt-0.5 truncate">{userEmail}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center w-full">
                  <Settings className="mr-2 h-4 w-4" /> Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                <LogOut className="mr-2 h-4 w-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="flex-1 px-5 py-6 lg:px-8 lg:py-8">
          <div className="animate-fade-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}