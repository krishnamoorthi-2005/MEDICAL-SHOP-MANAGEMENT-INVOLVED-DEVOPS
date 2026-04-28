import { Link } from 'react-router-dom';
import { Pill, Heart, Shield, Clock, Phone, FileText, Users, Stethoscope, Calculator, AlertTriangle, Smartphone, CheckCircle2, ArrowRight, Activity, Star } from 'lucide-react';

export default function Services() {
  return (
    <div className="space-y-0">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 px-6 border-b"
        style={{ background: '#a7f3d0', borderColor: '#6ee7b7' }}>
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-6"
            style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #dcfce7' }}>
            <Star className="h-3 w-3 fill-current" /> Comprehensive Healthcare
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-5 tracking-tight">Our Services</h1>
          <p className="text-lg text-slate-700 max-w-2xl mx-auto leading-relaxed">
            Comprehensive healthcare solutions designed to meet all your pharmaceutical and wellness needs
          </p>
        </div>
      </section>

      {/* Core Services */}
      <section className="py-20 px-6 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-4"
              style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.15)' }}>
              Core Services
            </div>
            <h2 className="text-3xl font-extrabold text-foreground mb-3 tracking-tight">Essential Pharmacy Services</h2>
            <p className="text-muted-foreground">Essential services for your daily healthcare needs</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Pill, title: 'Prescription Fulfillment', desc: 'Fast and accurate prescription processing with quality medications from trusted manufacturers.', color: '#6366f1', bg: '#eef2ff', cta: 'Submit Prescription', link: '/submit-prescription' },
              { icon: Heart, title: 'Health Consultations', desc: 'One-on-one consultations with certified pharmacists for medication advice and health guidance.', color: '#ef4444', bg: '#fef2f2', cta: 'Request Callback', link: '/#contact' },
              { icon: Phone, title: 'Home Delivery', desc: 'Convenient doorstep delivery of your medications with secure packaging and tracking.', color: '#10b981', bg: '#f0fdfa', cta: 'Coming Soon', link: '#' },
            ].map((s, i) => (
              <div key={i} className="group rounded-3xl bg-white border border-border/50 p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
                <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-5 transition-transform duration-200 group-hover:scale-110"
                  style={{ background: s.bg }}>
                  <s.icon className="h-7 w-7" style={{ color: s.color }} />
                </div>
                <h3 className="text-lg font-extrabold text-foreground mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">{s.desc}</p>
                <Link to={s.link}
                  className="inline-flex items-center gap-1.5 text-xs font-bold transition-colors"
                  style={{ color: s.color }}>
                  {s.cta} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Specialized Services */}
      <section className="py-20 px-6 border-b" style={{ background: '#a7f3d0', borderColor: '#6ee7b7' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-4"
              style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #dcfce7' }}>
              Specialized
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">Specialized Services</h2>
            <p className="text-slate-700">Advanced healthcare solutions for specific needs</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: FileText, title: 'Medication Reviews', desc: 'Comprehensive review of all your medications to check for interactions.', color: '#6366f1', bg: '#eef2ff' },
              { icon: Users, title: 'Family Health Plans', desc: 'Customized health management plans for your entire family.', color: '#10b981', bg: '#f0fdfa' },
              { icon: Stethoscope, title: 'Health Screenings', desc: 'Regular health check-ups and basic diagnostic services.', color: '#f59e0b', bg: '#fffbeb' },
              { icon: Calculator, title: 'Insurance Assistance', desc: 'Help with insurance claims and coverage optimization.', color: '#8b5cf6', bg: '#faf5ff' },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl bg-white border border-border/50 p-6 shadow-sm hover:shadow-md transition-all text-center">
                <div className="h-12 w-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: s.bg }}>
                  <s.icon className="h-6 w-6" style={{ color: s.color }} />
                </div>
                <h4 className="font-extrabold text-foreground mb-2">{s.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Digital Services */}
      <section className="py-20 px-6 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-4"
              style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.15)' }}>
              <Activity className="h-3 w-3" /> Digital Health
            </div>
            <h2 className="text-3xl font-extrabold text-foreground mb-3 tracking-tight">Digital Health Solutions</h2>
            <p className="text-muted-foreground">Modern technology for better healthcare management</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Smartphone, title: 'Patient Portal', desc: 'Track prescriptions, set reminders, and view order history through our secure portal.', color: '#6366f1', bg: '#eef2ff' },
              { icon: AlertTriangle, title: 'Medication Alerts', desc: 'Automated reminders for medication times, refills, and important health updates.', color: '#f59e0b', bg: '#fffbeb' },
              { icon: Clock, title: '24/7 Support', desc: 'Round-the-clock customer support for urgent medication questions and emergencies.', color: '#10b981', bg: '#f0fdfa' },
            ].map((s, i) => (
              <div key={i} className="group rounded-3xl bg-white border border-border/50 p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
                <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-5 transition-transform duration-200 group-hover:scale-110"
                  style={{ background: s.bg }}>
                  <s.icon className="h-7 w-7" style={{ color: s.color }} />
                </div>
                <h3 className="text-lg font-extrabold text-foreground mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Promise */}
      <section className="py-16 px-6" style={{ background: '#a7f3d0' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold text-slate-900 mb-10 tracking-tight">Our Service Promise</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: 'Quality Guaranteed', desc: 'All medications sourced from certified manufacturers with strict quality checks.', color: '#0891b2', bg: '#cffafe' },
              { icon: Clock, title: 'Fast Service', desc: 'Most prescriptions ready within 15 minutes, with express options available.', color: '#15803d', bg: '#dcfce7' },
              { icon: Heart, title: 'Personalized Care', desc: 'Every customer receives individual attention and customized health solutions.', color: '#dc2626', bg: '#fee2e2' },
            ].map((p, i) => (
              <div key={i} className="rounded-2xl p-6 text-center bg-white"
                style={{ border: `1px solid ${p.color}30` }}>
                <div className="h-12 w-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: p.bg }}>
                  <p.icon className="h-6 w-6" style={{ color: p.color }} />
                </div>
                <h4 className="font-extrabold text-slate-900 mb-2">{p.title}</h4>
                <p className="text-sm text-slate-600 leading-relaxed">{p.desc}</p>
                <CheckCircle2 className="h-5 w-5 mx-auto mt-4" style={{ color: p.color }} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
