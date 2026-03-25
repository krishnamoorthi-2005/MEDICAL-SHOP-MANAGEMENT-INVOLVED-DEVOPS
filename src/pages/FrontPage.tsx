import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { searchMedicinesPublic, createCallRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Search, Phone, Mail, MapPin, Clock, Shield, Pill, Heart, Star, CheckCircle2, ArrowRight, Sparkles, Activity, Package, Users, TrendingUp, AlertCircle, Lock, Zap, BarChart3, Brain } from 'lucide-react';

export default function FrontPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [callRequestForm, setCallRequestForm] = useState({ name: '', phone: '', message: '' });
  const [isSubmittingCall, setIsSubmittingCall] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const trimmedQuery = searchQuery.trim();
    let cancelled = false;

    if (trimmedQuery.length < 2) {
      setSearchSuggestions([]);
      setIsSuggesting(false);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setIsSuggesting(true);

      try {
        const results = await searchMedicinesPublic(trimmedQuery);
        if (!cancelled) {
          setSearchSuggestions(results.slice(0, 5));
        }
      } catch {
        if (!cancelled) {
          setSearchSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setIsSuggesting(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  const handleMedicineSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchMedicinesPublic(searchQuery);
      setSearchResults(results);
      if (results.length === 0) {
        toast({ title: 'No Results', description: 'No medicines found matching your search.' });
      }
    } catch {
      toast({ title: 'Search Error', description: 'Failed to search medicines. Please try again.', variant: 'destructive' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleCallRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callRequestForm.name || !callRequestForm.phone) return;
    setIsSubmittingCall(true);
    try {
      await createCallRequest({ name: callRequestForm.name, phone: callRequestForm.phone, message: callRequestForm.message });
      toast({ title: 'Call Request Submitted', description: 'We will contact you shortly.' });
      setCallRequestForm({ name: '', phone: '', message: '' });
    } catch (error) {
      toast({ title: 'Submission Error', description: error instanceof Error ? error.message : 'Failed to submit.', variant: 'destructive' });
    } finally {
      setIsSubmittingCall(false);
    }
  };

  return (
    <div className="space-y-0">
      {/* ════ HERO SECTION ════════════════════════════════════ */}
      <section className="relative py-24 px-6 overflow-hidden" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #f3e8ff 50%, #fef2f2 100%)' }}>
        {/* Decorative blur elements */}
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ background: '#4f46e5' }} />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ background: '#10b981' }} />
        
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center space-y-8">
            {/* Trust Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold backdrop-blur-sm"
              style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1.5px solid rgba(16, 185, 129, 0.3)' }}>
              <CheckCircle2 className="h-4 w-4" />
              <span>Trusted by 500+ Pharmacies</span>
            </div>

            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="text-6xl md:text-7xl font-black text-slate-900 leading-tight tracking-tight">
                Your Pharmacy,<br />
                <span style={{ background: 'linear-gradient(120deg, #4f46e5, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  Perfectly Managed
                </span>
              </h1>
              <p className="text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto font-medium">
                Modern inventory management, real-time medicine tracking, and compliance made simple. Built for pharmacies that care about excellence.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap justify-center gap-4 pt-6">
              <Button size="lg" asChild className="h-13 px-8 font-bold rounded-xl text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #5b21b6)', border: 'none' }}>
                <Link to="/login" className="flex items-center gap-2">
                  Get Started <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-13 px-8 font-bold rounded-xl border-2 transition-all hover:shadow-lg"
                style={{ borderColor: '#4f46e5', color: '#4f46e5', background: 'rgba(79, 70, 229, 0.05)' }}>
                <Link to="/about" className="flex items-center gap-2">Learn More</Link>
              </Button>
            </div>

            {/* Key Stats */}
            <div className="pt-14 grid grid-cols-3 gap-6 max-w-2xl mx-auto">
              {[
                { value: '500+', label: 'Pharmacies', color: '#10b981' },
                { value: '50K+', label: 'Medicines', color: '#4f46e5' },
                { value: '24/7', label: 'Support', color: '#c2410c' },
              ].map((s, i) => (
                <div key={i} className="text-center group">
                  <div className="text-4xl font-black text-slate-900 transition-all duration-300 group-hover:scale-110" style={{ color: s.color }}>
                    {s.value}
                  </div>
                  <div className="text-sm font-semibold text-slate-600 mt-2">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════ MEDICINE SEARCH - MAIN FEATURE ═════════════════════════════ */}
      <section className="py-32 px-6 relative overflow-hidden">
        {/* Background gradient with animated orbs */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #f3e8ff 40%, #fef2f2 100%)' }} />
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl opacity-30" style={{ background: 'linear-gradient(135deg, #4f46e5, #5b21b6)' }} />
        <div className="absolute -bottom-32 -left-32 w-72 h-72 rounded-full blur-3xl opacity-25" style={{ background: '#10b981' }} />
        
        <div className="max-w-5xl mx-auto relative z-10">
          {/* Primary Feature Badge */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-extrabold mb-6" style={{ background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.15), rgba(16, 185, 129, 0.15))', color: '#4f46e5' }}>
              <Sparkles className="h-4 w-4" />
              🎯 MAIN FEATURE - Real-Time Availability
            </div>
          </div>

          {/* Main Heading */}
          <div className="text-center mb-16">
            <h2 className="text-6xl font-black text-slate-900 mb-4 leading-tight">
              Find Your Medicine
              <br />
              <span style={{ 
                background: 'linear-gradient(135deg, #4f46e5, #10b981, #ec4899)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>Instantly & Accurately</span>
            </h2>
            <p className="text-xl text-slate-600 font-semibold max-w-3xl mx-auto">
              Check real-time availability, competitive pricing, and stock status for over 10,000+ medicines. Never miss out on availability again.
            </p>
          </div>

          {/* Search Form - Enhanced */}
          <form onSubmit={handleMedicineSearch} className="flex gap-4 mb-8 backdrop-blur-sm">
            <div className="flex-1 relative group">
              <div className="absolute inset-0 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.2), rgba(16, 185, 129, 0.2))' }} />
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 z-10" style={{ color: '#4f46e5' }} />
              <Input
                type="text"
                placeholder="Try: Aspirin, Paracetamol, Cough Syrup, Amoxicillin..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-16 h-16 rounded-2xl border-3 border-white focus:border-indigo-300 text-base font-medium transition-all duration-300 focus:shadow-2xl relative"
                style={{ background: '#ffffff', color: '#1f2937' }}
              />
            </div>
            <Button type="submit" disabled={isSearching} size="lg" className="h-16 px-10 font-extrabold rounded-2xl text-white shadow-2xl hover:shadow-2xl transition-all hover:-translate-y-1 text-lg"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}>
              {isSearching ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  Searching
                </div>
              ) : (
                <>Search Now</>
              )}
            </Button>
          </form>

          {searchQuery.trim().length >= 2 && (
            <div className="mb-8 rounded-2xl border-3 border-indigo-200 bg-white/80 backdrop-blur-xl p-8 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.2), rgba(16, 185, 129, 0.2))' }}>
                    <Sparkles className="h-5 w-5" style={{ color: '#4f46e5' }} />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-slate-900">🎯 Recommended Matches</p>
                    <p className="text-xs text-slate-500">Select any to see availability details</p>
                  </div>
                </div>
                {isSuggesting && <span className="text-xs font-extrabold text-indigo-700 animate-pulse flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: '#4f46e5' }} />
                  Finding matches...
                </span>}
              </div>

              {searchSuggestions.length === 0 && !isSuggesting ? (
                <div className="text-center py-8">
                  <p className="text-base text-slate-600 font-semibold">🔍 No close matches yet</p>
                  <p className="text-sm text-slate-500 mt-2">Try a different spelling or a brand name</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-3 max-h-72 overflow-y-auto">
                  {searchSuggestions.map((medicine) => (
                    <button
                      key={medicine._id}
                      type="button"
                      onClick={() => setSearchQuery(medicine.name)}
                      className="flex justify-between items-center p-4 rounded-xl border-2 border-slate-200 bg-white hover:bg-indigo-50/80 hover:border-indigo-400 transition-all duration-300 text-left shadow-md hover:shadow-lg group hover:-translate-y-1"
                    >
                      <div className="flex-1">
                        <p className="font-bold text-slate-900 text-sm group-hover:text-indigo-900">{medicine.name}</p>
                        <p className="text-xs text-slate-500 mt-1 group-hover:text-slate-600">{medicine.manufacturerId?.name || 'Unknown manufacturer'}</p>
                      </div>
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ml-3 ${
                        medicine.stock > 10 ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-200' : medicine.stock > 0 ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-200' : 'bg-red-100 text-red-700 ring-2 ring-red-200'
                      }`}>
                        {medicine.stock > 10 ? '✓ In Stock' : medicine.stock > 0 ? '⚠ Limited' : '✗ Out of Stock'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div className="sticky top-0 bg-white/80 backdrop-blur-sm pb-3 z-10">
                <p className="text-sm font-extrabold text-slate-900">
                  ✓ Results Found: <span style={{ color: '#4f46e5' }}>{searchResults.length}</span> medicines
                </p>
              </div>
              {searchResults.slice(0, 8).map((medicine) => (
                <div key={medicine._id} className="flex justify-between items-center p-5 rounded-xl border-2 border-slate-200 bg-white hover:bg-indigo-50/80 transition-all duration-300 shadow-md hover:shadow-lg group hover:border-indigo-300 hover:-translate-y-1">
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 text-base group-hover:text-indigo-900">{medicine.name}</p>
                    <p className="text-xs text-slate-500 mt-1.5 font-medium group-hover:text-slate-600">{medicine.manufacturerId?.name || 'Unknown'} • SKU: {medicine._id.slice(0, 8)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ring-2 ${
                      medicine.stock > 10 ? 'bg-emerald-100 text-emerald-700 ring-emerald-200' : medicine.stock > 0 ? 'bg-amber-100 text-amber-700 ring-amber-200' : 'bg-red-100 text-red-700 ring-red-200'
                    }`}>
                      {medicine.stock > 10 ? '✓ In Stock' : medicine.stock > 0 ? '⚠ Limited' : '✗ Out of Stock'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      <section className="py-24 px-6 relative" style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #f0fdf4 50%, #fef2f2 100%)' }}>
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ background: '#5b21b6' }} />
        
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full text-sm font-bold mb-4" style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5' }}>✨ Features</span>
            <h2 className="text-4xl font-black text-slate-900 mb-4">Everything You Need</h2>
            <p className="text-lg text-slate-600 font-medium">Smart tools built for modern pharmacies</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Package, title: 'Inventory Management', desc: 'Real-time stock tracking with expiry alerts and automated reordering' },
              { icon: Heart, title: 'Prescription Tracking', desc: 'Digital prescriptions and refill management with customer history' },
              { icon: BarChart3, title: 'Analytics & Reports', desc: 'Sales trends, profitability insights, and detailed reporting' },
            ].map((f, i) => (
              <div key={i} className="group rounded-2xl bg-white border-2 border-slate-200 p-8 hover:border-indigo-300 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                <div className="h-14 w-14 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
                  style={{ background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.15), rgba(16, 185, 129, 0.15))' }}>
                  <f.icon className="h-7 w-7 transition-all duration-300" style={{ color: i === 0 ? '#4f46e5' : i === 1 ? '#10b981' : '#c2410c' }} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-indigo-900 transition-colors">{f.title}</h3>
                <p className="text-slate-600 text-base leading-relaxed">{f.desc}</p>
                <div className="mt-6 flex items-center gap-2 text-sm font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Learn more <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════ COMPLIANCE ════════════════════════════ */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full text-sm font-bold mb-4" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>🔒 Security & Compliance</span>
            <h2 className="text-3xl font-black text-slate-900 mb-3">Trusted & Secure</h2>
            <p className="text-slate-600 font-medium">Enterprise-grade security and full regulatory compliance</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: CheckCircle2, label: 'ISO Certified', desc: 'Security & Standards', color: '#10b981' },
              { icon: Lock, label: 'FDA Compliant', desc: 'Medicine Safety', color: '#4f46e5' },
              { icon: Shield, label: 'GST Ready', desc: 'Tax Compliance', color: '#c2410c' },
            ].map((c, i) => (
              <div key={i} className="group rounded-2xl bg-gradient-to-br from-white to-slate-50 border-2 border-slate-200 p-8 hover:border-indigo-300 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="h-12 w-12 flex-shrink-0 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110"
                  style={{ background: `${c.color}15` }}>
                  <c.icon className="h-6 w-6 transition-all duration-300" style={{ color: c.color }} />
                </div>
                <p className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-1">{c.label}</p>
                <p className="font-semibold text-slate-900 text-base">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════ GET IN TOUCH ════════════════════════════ */}
      <section className="py-24 px-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #fef2f2 100%)' }}>
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-15" style={{ background: '#10b981' }} />
        
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full text-sm font-bold mb-4" style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5' }}>📞 Support</span>
            <h2 className="text-4xl font-black text-slate-900 mb-3">Get In Touch</h2>
            <p className="text-lg text-slate-600 font-medium">Our team is here to help you succeed</p>
          </div>

          <div className="grid md:grid-cols-2 gap-10">
            {/* Form */}
            <div className="rounded-2xl bg-white border-2 border-slate-200 p-8 shadow-lg hover:shadow-xl transition-shadow">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Request a Callback</h3>
              <form onSubmit={handleCallRequest} className="space-y-5">
                <div>
                  <Label className="text-sm font-bold text-slate-700 mb-2 block">Your Name</Label>
                  <Input
                    value={callRequestForm.name}
                    onChange={(e) => setCallRequestForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Enter your name"
                    required
                    className="h-11 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-indigo-100 font-medium"
                  />
                </div>
                <div>
                  <Label className="text-sm font-bold text-slate-700 mb-2 block">Phone Number</Label>
                  <Input
                    type="tel"
                    value={callRequestForm.phone}
                    onChange={(e) => setCallRequestForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="Enter phone number"
                    required
                    className="h-11 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-indigo-100 font-medium"
                  />
                </div>
                <div>
                  <Label className="text-sm font-bold text-slate-700 mb-2 block">Message (Optional)</Label>
                  <Textarea
                    value={callRequestForm.message}
                    onChange={(e) => setCallRequestForm(p => ({ ...p, message: e.target.value }))}
                    placeholder="Tell us how we can help..."
                    className="rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-indigo-100 resize-none font-medium"
                    rows={3}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmittingCall}
                  className="w-full py-3.5 rounded-xl text-white text-base font-bold transition-all hover:shadow-lg hover:-translate-y-1 disabled:opacity-70 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #5b21b6)' }}>
                  {isSubmittingCall ? 'Sending...' : 'Request Callback'}
                </button>
              </form>
            </div>

            {/* Contact Info */}
            <div className="space-y-4 flex flex-col justify-center">
              {[
                { icon: Phone, title: 'Call Us', value: '+91 9876543210', color: '#4f46e5' },
                { icon: Mail, title: 'Email', value: 'specialaccesspharma2021@gmail.com', color: '#10b981' },
                { icon: MapPin, title: 'Visit Us', value: 'Ammal Yeri Road, Salem - 636006', color: '#c2410c' },
              ].map((c, i) => (
                <div key={i} className="group rounded-2xl bg-white border-2 border-slate-200 p-6 hover:border-indigo-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 flex-shrink-0 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                      style={{ background: `${c.color}15` }}>
                      <c.icon className="h-6 w-6" style={{ color: c.color }} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">{c.title}</p>
                      <p className="font-semibold text-slate-900 text-base mt-0.5 group-hover:text-indigo-900 transition-colors">{c.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════ FINAL CTA ════════════════════════════ */}
      <section className="py-20 px-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #f3e8ff 50%, #fef2f2 100%)' }}>
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-15" style={{ background: '#4f46e5' }} />
        
        <div className="max-w-3xl mx-auto text-center space-y-8 relative z-10">
          <div className="space-y-4">
            <span className="inline-block px-4 py-1.5 rounded-full text-sm font-bold" style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5' }}>🚀 Ready?</span>
            <h2 className="text-4xl font-black text-slate-900">
              Ready to Get Started?
            </h2>
            <p className="text-lg text-slate-600 font-medium">
              Join 500+ pharmacies using our platform to manage inventory, prescriptions, and compliance with ease.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Button size="lg" asChild className="h-13 px-8 font-bold rounded-xl text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #5b21b6)' }}>
              <Link to="/login" className="flex items-center gap-2">
                Get Started Now <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-13 px-8 font-bold rounded-xl border-2 transition-all hover:shadow-lg"
              style={{ borderColor: '#10b981', color: '#10b981', background: 'rgba(16, 185, 129, 0.05)' }}>
              <Link to="/about" className="flex items-center gap-2">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
