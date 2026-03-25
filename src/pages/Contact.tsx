import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createCallRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Phone, Mail, Clock, MessageCircle, Send, Activity } from 'lucide-react';

export default function Contact() {
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email) return;
    setIsSubmitting(true);
    try {
      await createCallRequest({ name: contactForm.name, phone: contactForm.phone || contactForm.email, message: contactForm.message });
      toast({ title: 'Message Sent', description: 'We will get back to you within 24 hours.' });
      setContactForm({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      toast({ title: 'Submission Error', description: error instanceof Error ? error.message : 'Failed to send message.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-0" style={{ background: '#065f46' }}>
      {/* Hero */}
      <section className="relative overflow-hidden py-20 px-6" style={{ background: '#065f46', borderBottom: '1px solid #10b981' }}>
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-6"
            style={{ background: '#10b98130', color: '#86efac', border: '1px solid #10b98150' }}>
            <Activity className="h-3 w-3" /> We're here to help
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-5 tracking-tight">Contact Us</h1>
          <p className="text-lg text-emerald-100 max-w-2xl mx-auto leading-relaxed">
            Have questions about our services or need assistance? Reach out to our friendly team — we're always here.
          </p>
        </div>
      </section>

      {/* Contact Info + Form */}
      <section className="py-20 px-6" style={{ background: '#065f46' }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-10">
            {/* Info */}
            <div className="space-y-5">
              <div className="mb-8">
                <h2 className="text-2xl font-extrabold text-white mb-3 tracking-tight">Get in Touch</h2>
                <p className="text-emerald-100 leading-relaxed">
                  Our customer care team is available to assist you with any questions about medications, health consultations, or our services.
                </p>
              </div>
              {[
                { icon: Phone, title: 'Phone', value: '+91 9876543210', sub: 'Mon-Sun: 24/7 Available', color: '#6366f1', bg: '#eef2ff' },
                { icon: Mail, title: 'Email', value: 'specialaccesspharma2021@gmail.com', sub: "We'll respond within 4 hours", color: '#10b981', bg: '#f0fdfa' },
                { icon: MapPin, title: 'Visit Us', value: 'Ammal Yeri Road, Dadagapatty, Salem - 636006', sub: 'Open 24/7', color: '#f59e0b', bg: '#fffbeb' },
                { icon: MessageCircle, title: 'Emergency Hotline', value: '+91 9876543210', sub: '24/7 Emergency Support', color: '#ef4444', bg: '#fef2f2' },
              ].map((c, i) => (
                <div key={i} className="flex items-center gap-4 rounded-2xl bg-white border border-border/50 p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="h-12 w-12 flex-shrink-0 rounded-xl flex items-center justify-center"
                    style={{ background: c.bg }}>
                    <c.icon className="h-5 w-5" style={{ color: c.color }} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">{c.title}</p>
                    <p className="font-semibold text-foreground text-sm mt-0.5">{c.value}</p>
                    <p className="text-xs text-muted-foreground">{c.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Form */}
            <div className="rounded-3xl bg-white border border-border/60 shadow-xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(99,102,241,0.1)' }}>
                  <Send className="h-5 w-5" style={{ color: '#6366f1' }} />
                </div>
                <div>
                  <h3 className="font-extrabold text-foreground">Send us a Message</h3>
                  <p className="text-xs text-muted-foreground">We'll get back to you as soon as possible</p>
                </div>
              </div>

              <div className="h-1 w-full rounded-full mb-6"
                style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6,#14b8a6)' }} />

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Name *</Label>
                    <Input value={contactForm.name} onChange={(e) => setContactForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="Your full name" required
                      className="mt-1.5 h-11 rounded-xl border-2 border-border/60 focus:border-primary/50" />
                  </div>
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Email *</Label>
                    <Input type="email" value={contactForm.email} onChange={(e) => setContactForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="your@email.com" required
                      className="mt-1.5 h-11 rounded-xl border-2 border-border/60 focus:border-primary/50" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Phone (Optional)</Label>
                  <Input type="tel" value={contactForm.phone} onChange={(e) => setContactForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+91 9876543210"
                    className="mt-1.5 h-11 rounded-xl border-2 border-border/60 focus:border-primary/50" />
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Message</Label>
                  <Textarea value={contactForm.message} onChange={(e) => setContactForm(p => ({ ...p, message: e.target.value }))}
                    placeholder="How can we help you today?"
                    rows={4}
                    className="mt-1.5 rounded-xl border-2 border-border/60 focus:border-primary/50 resize-none" />
                </div>
                <button type="submit" disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl text-white text-sm font-bold transition-all duration-200 disabled:opacity-70 hover:-translate-y-0.5 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}>
                  {isSubmitting ? (
                    <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="h-4 w-4" /> Send Message</>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6" style={{ background: '#065f46' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-foreground mb-3 tracking-tight">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">Quick answers to common questions</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {[
              { q: 'What are your hours?', a: "We're open 24/7 for your convenience. Our pharmacy staff is always available to assist with your medication needs." },
              { q: 'Do you offer home delivery?', a: 'Home delivery is coming soon! Currently, please visit our pharmacy to collect your medicines.' },
              { q: 'Do you accept insurance?', a: 'We accept most major insurance plans. Our team can help verify your coverage and maximize your benefits.' },
              { q: 'Can I transfer my prescriptions?', a: 'Absolutely! We make prescription transfers easy and fast. Just call us with your current pharmacy information.' },
            ].map((faq, i) => (
              <div key={i} className="rounded-2xl bg-white border border-border/50 p-6 shadow-sm hover:shadow-md transition-all">
                <h4 className="font-extrabold text-foreground mb-2">{faq.q}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hours Banner */}
      <section className="py-16 px-6" style={{ background: '#065f46', borderTop: '1px solid #10b981' }}>
        <div className="max-w-2xl mx-auto text-center">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(99,102,241,0.2)' }}>
            <Clock className="h-7 w-7" style={{ color: '#a5b4fc' }} />
          </div>
          <h3 className="text-2xl font-extrabold text-white mb-3">We're Always Open</h3>
          <p className="text-slate-400 mb-4">Special Access Pharma is proud to serve you 24 hours a day, 7 days a week, 365 days a year.</p>
          <div className="text-lg font-extrabold" style={{ color: '#a5b4fc' }}>24/7 · Every Day · All Year Round</div>
        </div>
      </section>
    </div>
  );
}
