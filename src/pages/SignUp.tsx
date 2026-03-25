import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuthContext } from '@/contexts/AuthContext';
import { Eye, EyeOff, Lock, Mail, User, Activity, CheckCircle2, BarChart3, Package, Shield, ArrowRight, Phone, ArrowLeft } from 'lucide-react';
import { signupUser } from '@/lib/api';

const perks = [
  { icon: BarChart3, label: 'Real-time Analytics', desc: 'Live sales & profit dashboards' },
  { icon: Package, label: 'Smart Inventory', desc: 'Automated stock & expiry alerts' },
  { icon: Shield, label: 'Enterprise Security', desc: 'JWT auth, fully encrypted data' },
];

export default function SignUp() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuthContext();
  const [form, setForm] = useState({ 
    username: '', 
    fullName: '', 
    email: '', 
    phone: '', 
    password: '', 
    confirmPassword: '' 
  });
  const [show, setShow] = useState({ pw: false, cpw: false });
  const [loading, setLoading] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [usernameExists, setUsernameExists] = useState(false);

  // Redirect authenticated users away from signup page
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const role = (localStorage.getItem('userRole') || '').toLowerCase();
      if (role === 'staff') {
        navigate('/staff', { replace: true });
      } else if (role === 'patient' || role === 'user') {
        navigate('/user-dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(p => ({ ...p, [field]: e.target.value }));
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailExists(false);
    setUsernameExists(false);
    
    // Validations
    if (!form.username.trim()) {
      toast({ title: 'Username Required', description: 'Please enter a username.', variant: 'destructive' });
      return;
    }
    if (form.username.length < 3) {
      toast({ title: 'Username Too Short', description: 'Username must be at least 3 characters.', variant: 'destructive' });
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast({ title: 'Password Mismatch', description: 'Passwords do not match.', variant: 'destructive' });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: 'Too Short', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }
    
    if (form.phone && !/^[0-9]{10}$/.test(form.phone.replace(/\D/g, ''))) {
      toast({ title: 'Invalid Phone', description: 'Phone number must be 10 digits.', variant: 'destructive' });
      return;
    }
    
    setLoading(true);
    try {
      const result = await signupUser({
        username: form.username.trim(),
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password
      });
      localStorage.setItem('token', result.token);
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userEmail', result.user.email || form.email);
      localStorage.setItem('userRole', result.user?.role || 'user');
      localStorage.setItem('userFullName', result.user?.fullName || form.fullName);
      if (result.user?.phone || form.phone) {
        localStorage.setItem('userPhone', result.user.phone || form.phone);
      }
      toast({ title: '✅ Account Created', description: 'Welcome to Special Access Pharma!' });
      // Role-aware redirect
      const role = (result.user?.role || '').toLowerCase();
      if (role === 'staff') navigate('/staff');
      else if (role === 'patient' || role === 'user') navigate('/user-dashboard');
      else navigate('/dashboard'); // admin, manager, cashier, auditor
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('email') && (msg.includes('already exists') || msg.includes('already in use') || msg.includes('duplicate'))) {
        setEmailExists(true);
      } else if (msg.includes('username') && (msg.includes('already exists') || msg.includes('already in use') || msg.includes('duplicate'))) {
        setUsernameExists(true);
      } else {
        toast({ title: 'Sign Up Failed', description: err?.message || 'Could not create account.', variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Left branding panel ───────────────────────────── */}
      <div
        className="hidden lg:flex w-[44%] flex-col justify-between p-14 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #4f46e5 0%, #5b21b6 50%, #6d28d9 100%)' }}
      >
        {/* Orbs */}
        <div className="absolute top-1/4 right-0 h-80 w-80 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #10b981, transparent)' }} />
        <div className="absolute bottom-1/3 left-1/4 h-60 w-60 rounded-full blur-3xl opacity-15 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #06b6d4, transparent)' }} />
        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(79,70,229,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(79,70,229,.8) 1px, transparent 1px)',
            backgroundSize: '52px 52px'
          }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)', boxShadow: '0 4px 16px rgba(16,185,129,.4)' }}>
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-white tracking-tight">Special Access Pharma</div>
            <div className="text-xs font-medium" style={{ color: '#c084fc' }}>Pharmacy Management System</div>
          </div>
        </div>

        {/* Central copy */}
        <div className="relative z-10 space-y-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold mb-5"
              style={{ background: 'rgba(16,185,129,.15)', color: '#86efac', border: '1px solid rgba(16,185,129,.25)' }}>
              ✨ Join our growing community
            </div>
            <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">
              Start Managing<br />
              <span style={{ background: 'linear-gradient(90deg, #86efac, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Smarter Today</span>
            </h2>
            <p className="text-slate-300 text-base leading-relaxed max-w-sm">
              Everything you need to run a modern, efficient pharmacy — in one beautifully crafted platform.
            </p>
          </div>
          <div className="space-y-3">
            {perks.map((p, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/10 transition-all"
                style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(165,180,252,.15)' }}>
                <div className="h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-xl"
                  style={{ background: 'rgba(16,185,129,.25)' }}>
                  <p.icon className="h-5 w-5" style={{ color: '#86efac' }} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-white">{p.label}</div>
                  <div className="text-xs text-slate-300 mt-0.5">{p.desc}</div>
                </div>
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-300">© 2026 Special Access Pharma</div>
      </div>

      {/* ── Right form panel ─────────────────────────────── */}
      <div
        className="w-full lg:w-[56%] flex items-center justify-center p-8"
        style={{ background: 'linear-gradient(160deg, #fafffe 0%, #f3e8ff 50%, #f0fdf4 100%)' }}
      >
        <div className="w-full max-w-md animate-fade-up">

          {/* Back to Home Button */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors mb-6 group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </button>

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #a855f7)' }}>
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-extrabold text-lg text-slate-900">Special Access Pharma</div>
              <div className="text-xs text-slate-600">Pharmacy System</div>
            </div>
          </div>

          <div className="mb-7">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1">Create account</h1>
            <p className="text-slate-600 font-medium text-sm">Get started with our platform today.</p>
          </div>

          {/* Form card */}
          <div
            className="rounded-3xl bg-white/90 backdrop-blur-md p-8 md:p-9 border border-slate-100/50"
            style={{ boxShadow: '0 20px 60px rgba(79,70,229,.15), 0 4px 20px rgba(0,0,0,.08), 0 0 0 1px rgba(79,70,229,.08)' }}
          >
            {/* Top accent bar */}
            <div className="h-1.5 w-full rounded-full mb-7"
              style={{ background: 'linear-gradient(90deg, #10b981, #4f46e5, #ec4899)' }} />

            <form onSubmit={handleSignUp} className="space-y-4">
              {/* Username */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Username</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={form.username}
                    onChange={e => { update('username')(e); if (usernameExists) setUsernameExists(false); }}
                    placeholder="Choose a unique username"
                    required
                    minLength={3}
                    className={`w-full pl-11 pr-4 py-3.5 rounded-xl border-2 text-sm font-medium focus:outline-none focus:ring-4 transition-all ${
                      usernameExists
                        ? 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-400/10'
                        : 'border-slate-200 bg-slate-50 focus:border-indigo-500 focus:bg-white focus:ring-indigo-100'
                    }`}
                  />
                </div>
                {usernameExists && (
                  <div className="flex items-center gap-2 mt-1.5 px-3 py-2 rounded-xl" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                    <span className="text-xs font-medium text-red-600 flex-1">
                      Username already taken. Please choose another.
                    </span>
                  </div>
                )}
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={update('fullName')}
                    placeholder="Your full name"
                    required
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm font-medium focus:outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-400/10 transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => { update('email')(e); if (emailExists) setEmailExists(false); }}
                    placeholder="specialaccesspharma2021@gmail.com"
                    required
                    className={`w-full pl-11 pr-4 py-3.5 rounded-xl border-2 text-sm font-medium focus:outline-none focus:ring-4 transition-all ${
                      emailExists
                        ? 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-400/10'
                        : 'border-slate-200 bg-slate-50 focus:border-indigo-400 focus:bg-white focus:ring-indigo-400/10'
                    }`}
                  />
                </div>
                {emailExists && (
                  <div className="flex items-center gap-2 mt-1.5 px-3 py-2 rounded-xl" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                    <span className="text-xs font-medium text-red-600 flex-1">
                      An account with this email already exists.
                    </span>
                    <Link to="/login" className="text-xs font-extrabold text-indigo-600 hover:underline whitespace-nowrap">
                      Sign In →
                    </Link>
                  </div>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Phone Number (Optional)
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={update('phone')}
                    placeholder="1234567890"
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm font-medium focus:outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-400/10 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={show.pw ? 'text' : 'password'}
                    value={form.password}
                    onChange={update('password')}
                    placeholder="Min. 6 characters"
                    required
                    className="w-full pl-11 pr-12 py-3.5 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm font-medium focus:outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-400/10 transition-all"
                  />
                  <button type="button" onClick={() => setShow(s => ({ ...s, pw: !s.pw }))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors">
                    {show.pw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={show.cpw ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={update('confirmPassword')}
                    placeholder="Re-enter password"
                    required
                    className="w-full pl-11 pr-12 py-3.5 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm font-medium focus:outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-400/10 transition-all"
                  />
                  <button type="button" onClick={() => setShow(s => ({ ...s, cpw: !s.cpw }))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors">
                    {show.cpw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-base font-bold text-white transition-all duration-200 disabled:opacity-70 mt-2 hover:-translate-y-0.5 shadow-lg hover:shadow-xl"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #5b21b6)' }}
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating account…
                  </>
                ) : (
                  <>Create Account <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100 text-center text-sm">
              <span className="text-slate-600">Already have an account? </span>
              <Link to="/login" className="font-bold hover:underline transition-colors" style={{ color: '#4f46e5' }}>Sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}