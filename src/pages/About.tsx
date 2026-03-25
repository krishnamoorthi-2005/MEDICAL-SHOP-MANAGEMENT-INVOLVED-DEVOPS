import { Heart, Shield, Clock, MapPin, Phone, Mail, Activity, Users, Package, Star } from 'lucide-react';

export default function About() {
  return (
    <div className="space-y-0">
      {/* Hero */}
      <section className="relative overflow-hidden py-24 px-6" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #5b21b6 50%, #6d28d9 100%)' }}>
        {/* Decorative orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: '#10b981' }} />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: '#06b6d4' }} />
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-6"
            style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#86efac', border: '1.5px solid rgba(16, 185, 129, 0.3)' }}>
            <Heart className="h-3.5 w-3.5" /> Est. 2014 · Salem, Tamil Nadu
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 tracking-tight leading-tight">
            About Special Access Pharma
          </h1>
          <p className="text-xl text-slate-100 max-w-2xl mx-auto leading-relaxed font-medium">
            Your trusted healthcare partner, committed to providing quality medicines and exceptional care to our community for over a decade.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-6 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { value: '10+', label: 'Years of Service', icon: Clock, color: '#4f46e5', bg: '#eef2ff' },
            { value: '50K+', label: 'Patients Served', icon: Users, color: '#10b981', bg: '#f0fdfa' },
            { value: '5K+', label: 'Medicines Available', icon: Package, color: '#c2410c', bg: '#fef3c7' },
            { value: '24/7', label: 'Support Available', icon: Star, color: '#5b21b6', bg: '#faf5ff' },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl bg-white border-2 border-slate-200 p-7 text-center shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
              <div className="h-14 w-14 rounded-xl flex items-center justify-center mx-auto mb-4 transition-all duration-300 group-hover:scale-110"
                style={{ background: s.bg }}>
                <s.icon className="h-7 w-7" style={{ color: s.color }} />
              </div>
              <div className="text-3xl font-extrabold mb-2" style={{ color: s.color }}>{s.value}</div>
              <div className="text-sm font-semibold text-slate-600">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Story */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-14 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-6"
                style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5', border: '1.5px solid rgba(79, 70, 229, 0.2)' }}>
                📖 Our Story
              </div>
              <h2 className="text-4xl font-extrabold text-slate-900 mb-6 tracking-tight">Built on Trust & Care</h2>
              <p className="text-slate-600 leading-relaxed mb-5 text-lg">
                Founded in 2014, Special Access Pharma began with a simple mission: to make healthcare accessible and affordable for everyone in our community. What started as a small neighborhood pharmacy has grown into a comprehensive healthcare solution provider.
              </p>
              <p className="text-slate-600 leading-relaxed text-lg">
                We combine traditional pharmaceutical expertise with modern technology to ensure our patients receive the best possible care. Our team of qualified pharmacists and healthcare professionals are dedicated to your health and wellbeing.
              </p>
            </div>
            <div className="space-y-4">
              {[
                { icon: Heart, title: 'Care & Compassion', desc: 'Every customer is treated with genuine care and respect for their unique healthcare needs.', color: '#ef4444', bg: '#fef2f2' },
                { icon: Shield, title: 'Quality & Safety', desc: 'We maintain the highest standards, ensuring every medicine meets strict quality requirements.', color: '#4f46e5', bg: '#eef2ff' },
                { icon: Clock, title: 'Accessibility', desc: 'Making healthcare accessible 24/7 through our platform and knowledgeable support team.', color: '#10b981', bg: '#f0fdfa' },
              ].map((v, i) => (
                <div key={i} className="flex items-start gap-4 rounded-2xl bg-slate-50 border-2 border-slate-200 p-6 shadow-sm hover:shadow-lg hover:bg-white transition-all duration-300 group">
                  <div className="h-12 w-12 flex-shrink-0 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                    style={{ background: v.bg }}>
                    <v.icon className="h-6 w-6" style={{ color: v.color }} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 mb-2 text-lg">{v.title}</h4>
                    <p className="text-sm text-slate-600 leading-relaxed">{v.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 px-6 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-4"
              style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1.5px solid rgba(16, 185, 129, 0.2)' }}>
              👥 Our Team
            </div>
            <h2 className="text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">Meet Our Experts</h2>
            <p className="text-lg text-slate-600">Experienced professionals dedicated to your health</p>
          </div>
          <div className="flex justify-center">
            <div className="rounded-3xl bg-white border-2 border-slate-200 p-8 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-center max-w-xs">
              <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mx-auto mb-6 text-5xl shadow-md">
                👨‍⚕️
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 mb-2">Shiva</h3>
              <p className="text-base text-slate-600 mb-4">Owner of the Shop</p>
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold" style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5', border: '1.5px solid rgba(79, 70, 229, 0.2)' }}>
                ✓ 12 years experience
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Info */}
      <section className="py-20 px-6 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none" style={{ background: '#4f46e5' }} />
        
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">Get In Touch</h2>
            <p className="text-lg text-slate-600">We're always here for you</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Phone, title: 'Phone', value: '+91 9876543210', sub: '24/7 Available', color: '#4f46e5', bg: '#eef2ff' },
              { icon: Mail, title: 'Email', value: 'specialaccesspharma2021@gmail.com', sub: 'Reply within 4 hours', color: '#10b981', bg: '#f0fdfa' },
              { icon: MapPin, title: 'Address', value: 'Ammal Yeri Road, Dadagapatty, Salem - 636006', sub: 'Open 24/7', color: '#c2410c', bg: '#fef3c7' },
            ].map((c, i) => (
              <div key={i} className="rounded-2xl bg-gradient-to-br from-white to-slate-50 border-2 border-slate-200 p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-center group">
                <div className="h-14 w-14 rounded-xl flex items-center justify-center mx-auto mb-5 transition-all duration-300 group-hover:scale-110"
                  style={{ background: c.bg }}>
                  <c.icon className="h-6 w-6" style={{ color: c.color }} />
                </div>
                <h4 className="font-extrabold text-slate-900 mb-2 text-lg">{c.title}</h4>
                <p className="text-base text-slate-600 mb-2 font-medium">{c.value}</p>
                <p className="text-xs text-slate-500 font-semibold">{c.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
