import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    ClipboardList, Upload, CheckCircle,
    Phone, User, Stethoscope, X, Loader2,
    FileText, ArrowLeft, Search, Image as ImageIcon, Clock
} from 'lucide-react';
import { submitPrescription, getMyPrescriptions, type PrescriptionRequest, type PrescriptionMedicine } from '@/lib/api';
import { format } from 'date-fns';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string; desc: string }> = {
    pending: { label: 'Pending Review', color: '#f59e0b', bg: '#fef3c7', desc: 'Your request has been received. Please wait for admin reply.' },
    under_review: { label: 'Under Review', color: '#6366f1', bg: '#ede9fe', desc: 'Our pharmacist is reviewing your prescription image.' },
    approved: { label: '✅ Approved', color: '#10b981', bg: '#d1fae5', desc: 'Good news! The medicines you need are available in our shop. You can visit and buy them.' },
    rejected: { label: '❌ Rejected', color: '#ef4444', bg: '#fee2e2', desc: 'Sorry, we cannot fulfill this prescription. Please see admin notes below.' },
    collected: { label: '📦 Collected', color: '#64748b', bg: '#f1f5f9', desc: 'Medicines have been collected. Thank you!' },
};

export default function SubmitPrescription() {
    /* form state */
    const [step, setStep] = useState<'form' | 'track' | 'success'>('form');
    const [patientName, setName] = useState('');
    const [patientPhone, setPhone] = useState('');
    const [patientEmail, setEmail] = useState('');
    const [doctorName, setDoctor] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImgPre] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState<PrescriptionRequest | null>(null);

    /* track state */
    const [trackPhone, setTrackPhone] = useState('');
    const [trackResults, setTrackResults] = useState<PrescriptionRequest[] | null>(null);
    const [tracking, setTracking] = useState(false);

    const fileRef = useRef<HTMLInputElement>(null);

    /* ── Pre-fill form with user data ──────────────────── */
    useEffect(() => {
        const userFullName = localStorage.getItem('userFullName');
        const userEmail = localStorage.getItem('userEmail');
        const userPhone = localStorage.getItem('userPhone');
        
        if (userFullName) setName(userFullName);
        if (userEmail) setEmail(userEmail);
        if (userPhone) setPhone(userPhone);
    }, []);

    /* ── image pick ────────────────────────────────────── */
    const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setImageFile(f);
        const url = URL.createObjectURL(f);
        setImgPre(url);
    };

    /* ── submit ────────────────────────────────────────── */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patientName.trim()) return alert('Please enter your name');
        if (!patientPhone.trim()) return alert('Please enter your phone number');
        if (!imageFile) return alert('Please upload a prescription image');

        setSubmitting(true);
        try {
            const req = await submitPrescription({
                patientName, patientPhone, patientEmail,
                medicines: [],
                doctorName,
                imageFile: imageFile,
            });
            
            // Store phone number for future reference
            if (patientPhone) {
                localStorage.setItem('userPhone', patientPhone);
                localStorage.setItem('lastPrescriptionPhone', patientPhone);
            }
            if (patientEmail) {
                localStorage.setItem('lastPrescriptionEmail', patientEmail);
            }
            
            setSubmitted(req.request);
            setStep('success');
        } catch (e: any) {
            alert(e.message || 'Failed to submit. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    /* ── track ─────────────────────────────────────────── */
    const handleTrack = async () => {
        if (!trackPhone.trim()) return;
        setTracking(true);
        try {
            const results = await getMyPrescriptions(trackPhone.trim());
            setTrackResults(results);
        } catch {
            setTrackResults([]);
        } finally {
            setTracking(false);
        }
    };

    /* ── UI ─────────────────────────────────────────────── */
    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(135deg,#f0f4ff 0%,#faf5ff 50%,#f0fdf4 100%)' }}>
            <div className="max-w-xl mx-auto px-4 py-10">

                {/* Top nav */}
                <div className="flex items-center justify-between mb-8">
                    <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors">
                        <ArrowLeft className="h-4 w-4" /> Back to Home
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="h-7 w-7 flex items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                            <ClipboardList className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-sm font-extrabold text-slate-800">Special Access Pharma Rx</span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-1 rounded-2xl mb-6 bg-white shadow-sm border border-slate-200">
                    {[
                        { key: 'form', label: '📋 Submit Request', icon: FileText },
                        { key: 'track', label: '🔍 Track Status', icon: Search },
                    ].map(t => (
                        <button key={t.key} onClick={() => setStep(t.key as any)}
                            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                            style={step === t.key || (step === 'success' && t.key === 'form')
                                ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', boxShadow: '0 2px 10px rgba(99,102,241,0.3)' }
                                : { color: '#64748b' }}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ── SUCCESS ─────────────────────────────────── */}
                {step === 'success' && submitted && (
                    <div className="bg-white rounded-3xl p-8 shadow-lg border border-slate-100 text-center">
                        <div className="h-16 w-16 mx-auto mb-4 flex items-center justify-center rounded-full" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                            <CheckCircle className="h-8 w-8 text-white" />
                        </div>
                        <h2 className="text-xl font-extrabold text-slate-900 mb-2">Prescription Submitted!</h2>
                        <p className="text-sm text-slate-500 mb-6">
                            Please wait for admin to review your prescription. You will be notified when your medicines are available in our shop.
                        </p>
                        <div className="p-4 rounded-2xl mb-6 text-left" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                            <div className="text-xs font-bold text-slate-500 mb-2">Your request details</div>
                            <div className="text-sm font-bold text-slate-800">{submitted.patientName}</div>
                            <div className="text-xs text-slate-500">{submitted.patientPhone}</div>
                            <div className="flex items-center gap-1.5 mt-2 text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                                <Clock className="h-3.5 w-3.5" />
                                <span className="text-xs font-bold">Waiting for admin review</span>
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 mb-4">
                            Track your request status anytime using your phone number in the <strong>Track Status</strong> tab.
                        </p>
                        <button onClick={() => { setStep('form'); setSubmitted(null); setName(''); setPhone(''); setEmail(''); setDoctor(''); setImageFile(null); setImgPre(null); }}
                            className="w-full py-3 rounded-2xl text-white text-sm font-bold"
                            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                            Submit Another Request
                        </button>
                    </div>
                )}

                {/* ── FORM ─────────────────────────────────────── */}
                {(step === 'form') && (
                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Hero card */}
                        <div className="p-5 rounded-3xl text-white mb-2" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 8px 32px rgba(99,102,241,0.3)' }}>
                            <div className="flex items-center gap-3 mb-2">
                                <ClipboardList className="h-6 w-6 opacity-90" />
                                <h1 className="text-lg font-extrabold">Prescription Request</h1>
                            </div>
                            <p className="text-sm opacity-80 leading-relaxed">
                                Upload your doctor's prescription image. Our pharmacist will identify the medicines and let you know what's available for pickup.
                            </p>
                        </div>

                        {/* Patient info */}
                        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                            <div className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <User className="h-3.5 w-3.5 text-indigo-400" /> Patient Information
                            </div>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 mb-1 block">Full Name *</label>
                                        <input value={patientName} onChange={e => setName(e.target.value)} required
                                            placeholder="Your full name"
                                            className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10 transition-all" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 mb-1 block">Phone *</label>
                                        <input value={patientPhone} onChange={e => setPhone(e.target.value)} required
                                            placeholder="Mobile number"
                                            className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10 transition-all" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-600 mb-1 block">Email (for tracking your requests)</label>
                                    <input type="email" value={patientEmail} onChange={e => setEmail(e.target.value)}
                                        placeholder="Your email address"
                                        className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10 transition-all bg-blue-50" />
                                    <p className="text-xs text-gray-500 mt-1">💡 Keep this to track your requests in the dashboard</p>
                                </div>
                            </div>
                        </div>

                        {/* Doctor info */}
                        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                            <div className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Stethoscope className="h-3.5 w-3.5 text-emerald-400" /> Doctor Information (optional)
                            </div>
                            <input value={doctorName} onChange={e => setDoctor(e.target.value)}
                                placeholder="Doctor's name"
                                className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10 transition-all" />
                        </div>

                        {/* Prescription image */}
                        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                            <div className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <ImageIcon className="h-3.5 w-3.5 text-indigo-400" /> Upload Prescription *
                            </div>
                            <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={handleImage} className="hidden" />
                            {imagePreview ? (
                                <div className="relative">
                                    <img src={imagePreview} alt="Prescription preview" className="w-full h-40 object-cover rounded-xl border border-slate-200" />
                                    <button type="button" onClick={() => { setImageFile(null); setImgPre(null); }}
                                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors">
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ) : (
                                <button type="button" onClick={() => fileRef.current?.click()}
                                    className="w-full py-8 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center gap-2 text-slate-500 hover:border-indigo-400 hover:text-indigo-500 transition-all">
                                    <Upload className="h-6 w-6" />
                                    <span className="text-sm font-semibold">Click to upload prescription image</span>
                                    <span className="text-xs text-slate-400">JPG, PNG or PDF • max 5MB</span>
                                </button>
                            )}
                            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                                🔒 Your image is processed for text extraction and not stored on our servers.
                            </p>
                        </div>

                        {/* Safety notice */}
                        <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 border border-blue-200">
                            <span className="text-xl">ℹ️</span>
                            <p className="text-xs text-blue-700 leading-relaxed font-medium">
                                <strong>How it works:</strong> Upload your prescription image. Our system automatically reads the text from your prescription and securely stores only the text — the original image is never saved. Our pharmacist will then review and let you know which medicines are available for pickup.
                            </p>
                        </div>

                        {/* Submit */}
                        <button type="submit" disabled={submitting}
                            className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all hover:-translate-y-0.5 disabled:opacity-60"
                            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 6px 24px rgba(99,102,241,0.35)' }}>
                            {submitting ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</span> : '📋 Submit Prescription Request'}
                        </button>
                    </form>
                )}

                {/* ── TRACK ────────────────────────────────────── */}
                {step === 'track' && (
                    <div className="space-y-4">
                        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                            <h2 className="text-sm font-extrabold text-slate-800 mb-3">Track Your Prescription Status</h2>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input value={trackPhone} onChange={e => setTrackPhone(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleTrack()}
                                        placeholder="Enter your phone number"
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10 transition-all" />
                                </div>
                                <button onClick={handleTrack} disabled={tracking}
                                    className="px-5 py-3 rounded-xl text-white font-bold text-sm transition-all hover:-translate-y-0.5"
                                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                                    {tracking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Track'}
                                </button>
                            </div>
                        </div>

                        {trackResults !== null && (
                            trackResults.length === 0 ? (
                                <div className="text-center py-10 text-slate-400">
                                    <ClipboardList className="h-10 w-10 opacity-20 mx-auto mb-2" />
                                    <p className="text-sm font-semibold">No prescription requests found for this number</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {trackResults.map(r => {
                                        const st = STATUS_LABELS[r.status];
                                        return (
                                            <div key={r._id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div>
                                                        <div className="text-sm font-extrabold text-slate-800">{r.medicines.length} medicine{r.medicines.length !== 1 ? 's' : ''} requested</div>
                                                        <div className="text-xs text-slate-400 mt-0.5">{format(new Date(r.createdAt), 'dd MMM yyyy, HH:mm')}</div>
                                                    </div>
                                                    <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ color: st.color, background: st.bg }}>
                                                        {st.label}
                                                    </span>
                                                </div>

                                                <div className="p-3 rounded-xl text-sm" style={{ background: st.bg }}>
                                                    <p className="font-semibold" style={{ color: st.color }}>{st.desc}</p>
                                                    {r.adminNotes && <p className="text-xs text-slate-600 mt-1 italic">"{r.adminNotes}"</p>}
                                                </div>

                                                <div className="mt-3 flex flex-wrap gap-1.5">
                                                    {r.medicines.map((m, i) => (
                                                        <span key={i} className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                                                            {m.name} ×{m.quantity}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
