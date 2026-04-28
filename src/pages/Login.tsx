import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuthContext } from '@/contexts/AuthContext';
import { Eye, EyeOff, Lock, Mail, Activity, BarChart3, Shield, Package, CheckCircle2, Sparkles, ArrowLeft } from 'lucide-react';
import { loginUser } from '@/lib/api';

const features = [
  { icon: BarChart3, title: 'Real-time Analytics', desc: 'Sales, profit & inventory at a glance' },
  { icon: Package, title: 'Smart Inventory', desc: 'Automated stock & expiry management' },
  { icon: Shield, title: 'Enterprise Security', desc: 'JWT authentication, fully encrypted' },
];

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuthContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (isLoading || !isAuthenticated || hasRedirectedRef.current) {
      return;
    }

    hasRedirectedRef.current = true;
    const role = (localStorage.getItem('userRole') || '').toLowerCase();

    if (role === 'staff') {
      navigate('/staff', { replace: true });
      return;
    }

    if (role === 'patient' || role === 'user') {
      // Patient/user roles now land on the prescription submission page instead of a dashboard
      navigate('/submit-prescription', { replace: true });
      return;
    }

    navigate('/dashboard', { replace: true });
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (isAuthenticated) {
    return <div className="flex items-center justify-center min-h-screen">Redirecting...</div>;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await loginUser(email, password);
      localStorage.setItem('token', result.token);
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userEmail', result.user?.email || email);
      localStorage.setItem('userRole', result.user?.role || 'user');
      localStorage.setItem('userFullName', result.user?.fullName || '');
      if (result.user?.phone) {
        localStorage.setItem('userPhone', result.user.phone);
      }
      toast({ title: '✅ Login Successful', description: 'Welcome back to Special Access Pharma!' });
      // Role-based redirect with replace: true to prevent back button issues
      const role = (result.user?.role || '').toLowerCase();
      if (role === 'staff') {
        navigate('/staff', { replace: true });
      } else if (role === 'patient' || role === 'user') {
        // Patient/user roles now go directly to prescription submission instead of a user dashboard
        navigate('/submit-prescription', { replace: true });
      } else {
        navigate('/dashboard', { replace: true }); // admin, manager, cashier, auditor
      }
    } catch (error: any) {
      toast({ title: '❌ Login Failed', description: error?.message || 'Invalid email or password.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Left branding panel ──────────────────────── */}
      <div className="hidden lg:flex w-[46%] flex-col justify-between p-14 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #4f46e5 0%, #5b21b6 50%, #6d28d9 100%)' }}>

        {/* Orbs */}
        <div className="absolute top-1/3 right-0 h-72 w-72 rounded-full blur-3xl opacity-25 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #10b981, transparent)' }} />
        <div className="absolute bottom-1/4 left-1/4 h-60 w-60 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #60a5fa, transparent)' }} />
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(79,70,229,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(79,70,229,.6) 1px, transparent 1px)',
            backgroundSize: '48px 48px'
          }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)', boxShadow: '0 4px 16px rgba(16,185,129,.4)' }}>
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-xl font-bold text-white">Special Access Pharma</div>
            <div className="text-xs font-medium" style={{ color: '#c084fc' }}>Pharmacy Management System</div>
          </div>
        </div>

        {/* Main content */}
        <div className="relative z-10 space-y-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold mb-5"
              style={{ background: 'rgba(16,185,129,.2)', color: '#86efac' }}>
              <CheckCircle2 className="h-3 w-3" /> Trusted by 10,000+ pharmacies
            </div>
            <h2 className="text-4xl font-bold text-white leading-tight mb-4">
              Streamline Your<br />
              <span style={{ background: 'linear-gradient(90deg, #86efac, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Pharmacy Operations</span>
            </h2>
            <p className="text-slate-300 text-base leading-relaxed max-w-sm">
              Comprehensive inventory, billing, analytics, and reporting — one premium platform for modern healthcare.
            </p>
          </div>

          <div className="space-y-3">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl transition-colors hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(134,239,172,.12)' }}>
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(16,185,129,.25)' }}>
                  <f.icon className="h-5 w-5" style={{ color: '#86efac' }} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-white">{f.title}</div>
                  <div className="text-xs text-slate-300 mt-0.5">{f.desc}</div>
                </div>
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-slate-300">© 2026 Special Access Pharma</div>
      </div>

      {/* ── Right form panel ─────────────────────────── */}
      <div className="w-full lg:w-[54%] flex items-center justify-center p-8"
        style={{ background: 'linear-gradient(160deg, #fafffe 0%, #f3e8ff 50%, #f0fdf4 100%)' }}>
        <div className="w-full max-w-md animate-slide-up">

          {/* Back to Home Button */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors mb-6 group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </button>

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #a855f7)' }}>
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-lg text-foreground">Special Access Pharma</div>
              <div className="text-xs text-muted-foreground">Pharmacy System</div>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2 lg:mt-0 mt-2">Welcome back</h1>
            <p className="text-muted-foreground">Sign in to access your pharmacy dashboard</p>
          </div>

          {/* Form card */}
          <div className="rounded-3xl bg-white/90 backdrop-blur-md p-8 md:p-9 border border-slate-100/50"
            style={{ boxShadow: '0 20px 60px rgba(79,70,229,.15), 0 4px 20px rgba(0,0,0,.08), 0 0 0 1px rgba(79,70,229,.08)' }}>

            {/* Top accent */}
            <div className="h-1.5 w-full rounded-full mb-7"
              style={{ background: 'linear-gradient(90deg, #4f46e5, #8b5cf6, #ec4899)' }} />

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#4f46e5' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="specialaccesspharma2021@gmail.com"
                    required
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-slate-200 text-sm focus:outline-none transition-all bg-slate-50 focus:bg-white font-medium"
                    style={{ focusBorderColor: '#c084fc' }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#4f46e5' }} />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full pl-11 pr-12 py-3.5 rounded-xl border-2 border-slate-200 text-sm focus:outline-none transition-all bg-slate-50 focus:bg-white font-medium"
                    style={{ focusBorderColor: '#c084fc' }}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-foreground transition-colors">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Remember / Forgot */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-slate-300 font-medium accent-indigo-600" />
                  <span className="text-muted-foreground font-medium">Remember me</span>
                </label>
                <Link to="/forgot-password" className="font-semibold hover:underline transition-colors" style={{ color: '#4f46e5' }}>Forgot password?</Link>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl text-white text-base font-bold transition-all duration-200 disabled:opacity-70 mt-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                style={{
                  background: 'linear-gradient(135deg, #4f46e5 0%, #5b21b6 100%)',
                }}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </div>
                ) : 'Sign In →'}
              </button>
            </form>

            {/* Sign up link */}
            <div className="mt-6 pt-6 border-t border-slate-100 text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link to="/signup" className="font-bold hover:underline transition-colors" style={{ color: '#4f46e5' }}>
                Sign Up
              </Link>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Use your credentials created during setup.
          </p>
        </div>
      </div>
    </div>
  );
}
