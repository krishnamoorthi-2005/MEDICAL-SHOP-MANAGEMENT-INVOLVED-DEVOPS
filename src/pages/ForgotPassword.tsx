import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({ title: 'Error', description: 'Please enter your email address', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send reset email');
      }

      setSubmitted(true);
      toast({ 
        title: '✅ Success', 
        description: 'Password reset instructions have been sent to your email' 
      });
    } catch (error: any) {
      toast({ 
        title: '❌ Error', 
        description: error.message || 'Failed to send reset email',
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(160deg, #fafffe 0%, #f0fdf7 100%)' }}>
        <div className="w-full max-w-md">
          <div className="rounded-3xl bg-white p-8 md:p-9 text-center"
            style={{ boxShadow: '0 20px 60px rgba(99,102,241,.12)' }}>
            
            <div className="flex justify-center mb-6">
              <div className="h-16 w-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(16,185,129,.1)' }}>
                <CheckCircle2 className="h-8 w-8" style={{ color: '#10b981' }} />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-foreground mb-2">Check your email</h2>
            <p className="text-muted-foreground mb-6">
              We've sent password reset instructions to <strong>{email}</strong>
            </p>

            <div className="bg-slate-50 rounded-2xl p-4 mb-6 text-left">
              <h3 className="font-semibold text-sm text-foreground mb-2">What's next?</h3>
              <ol className="text-sm text-muted-foreground space-y-1">
                <li>✓ Check your email inbox</li>
                <li>✓ Click the reset link (expires in 1 hour)</li>
                <li>✓ Create a new password</li>
              </ol>
            </div>

            <p className="text-xs text-muted-foreground mb-6">
              Don't see the email? Check your spam folder or <button onClick={() => { setSubmitted(false); setEmail(''); }} className="font-semibold hover:underline" style={{ color: '#6366f1' }}>try another email</button>
            </p>

            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 rounded-xl text-white font-semibold transition-all"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(160deg, #fafffe 0%, #f0fdf7 100%)' }}>
      <div className="w-full max-w-md animate-slide-up">
        
        {/* Back button */}
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors mb-6 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Sign In
        </button>

        {/* Form card */}
        <div className="rounded-3xl bg-white p-8 md:p-9"
          style={{ boxShadow: '0 20px 60px rgba(99,102,241,.12), 0 4px 20px rgba(0,0,0,.06)' }}>
          
          <div className="h-1 w-full rounded-full mb-7"
            style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7)' }} />

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Reset Password</h1>
            <p className="text-muted-foreground">Enter your email and we'll send you a reset link</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="specialaccesspharma2021@gmail.com"
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-slate-200 text-sm focus:outline-none focus:border-indigo-400 transition-colors bg-slate-50 focus:bg-white"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                We'll send you a link to reset your password
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl text-white text-base font-bold transition-all duration-200 disabled:opacity-70 mt-6"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: '0 4px 16px rgba(99,102,241,.4)',
              }}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </div>
              ) : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center text-sm text-muted-foreground">
            Remember your password? <a href="/login" className="font-bold hover:underline" style={{ color: '#6366f1' }}>Sign In</a>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          This service is secure and confidential.
        </p>
      </div>
    </div>
  );
}
