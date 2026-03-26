import { useState, useEffect, useCallback } from 'react';
import {
    ClipboardList, Search, CheckCircle, XCircle, Clock, Eye,
    RefreshCw, FileText, Phone, Pill,
    AlertTriangle, X, MessageSquare,
    CheckCheck, Loader2, Trash2, ScanText
} from 'lucide-react';
import {
    listPrescriptions, updatePrescriptionStatus, deletePrescription,
    type PrescriptionRequest
} from '@/lib/api';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3004/api';

/* ── status helpers ─────────────────────────────────────── */
const STATUS = {
    pending: { label: 'Pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: Clock },
    under_review: { label: 'Under Review', color: '#6366f1', bg: 'rgba(99,102,241,0.1)', icon: Eye },
    approved: { label: 'Approved', color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: CheckCircle },
    rejected: { label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: XCircle },
    collected: { label: 'Collected', color: '#64748b', bg: 'rgba(100,116,139,0.1)', icon: CheckCheck },
} as const;

type RxStatus = keyof typeof STATUS;
const FILTERS: { key: string; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'under_review', label: 'Under Review' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'collected', label: 'Collected' },
];

/* ══════════════════════════════════════════════════════ */
export default function PrescriptionRequests() {
    const { toast } = useToast();
    const [requests, setRequests] = useState<PrescriptionRequest[]>([]);
    const [pending, setPending] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [selected, setSelected] = useState<PrescriptionRequest | null>(null);
    const [adminNotes, setAdminNotes] = useState('');
    const [updating, setUpdating] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    /* ── load ─────────────────────────────────────────────── */
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await listPrescriptions({ status: filter === 'all' ? undefined : filter, search });
            setRequests(data.requests || []);
            setPending(data.pending || 0);
        } catch {
            toast({ title: 'Error loading prescriptions', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [filter, search]);

    useEffect(() => { load(); }, [filter]);
    useEffect(() => {
        const t = setTimeout(() => load(), 400);
        return () => clearTimeout(t);
    }, [search]);

    /* ── update status ────────────────────────────────────── */
    const changeStatus = async (id: string, status: string) => {
        setUpdating(true);
        try {
            const updated = await updatePrescriptionStatus(id, status, adminNotes);
            setRequests(prev => prev.map(r => r._id === updated._id ? updated : r));
            if (selected?._id === updated._id) setSelected(updated);
            toast({ title: `✅ Status changed to ${STATUS[status as RxStatus]?.label}` });
            setAdminNotes('');
        } catch (e: any) {
            toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
        } finally {
            setUpdating(false);
        }
    };

    /* ── delete prescription ──────────────────────────────── */
    const handleDelete = async () => {
        if (!selected) return;
        
        setDeleting(true);
        try {
            await deletePrescription(selected._id);
            setRequests(prev => prev.filter(r => r._id !== selected._id));
            setSelected(null);
            setShowDeleteConfirm(false);
            toast({ title: '✅ Prescription deleted successfully' });
        } catch (e: any) {
            toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
        } finally {
            setDeleting(false);
        }
    };

    /* ── UI ─────────────────────────────────────────────────── */
    return (
        <>
        <div className="flex gap-5 h-full min-h-0" style={{ maxHeight: 'calc(100vh - 80px)' }}>

            {/* ── Left: list ──────────────────────────────────── */}
            <div className={`flex flex-col min-w-0 transition-all duration-300 ${selected ? 'w-full lg:w-[52%]' : 'w-full'}`}>

                {/* Header */}
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <div>
                        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                            <ClipboardList className="h-5 w-5 text-indigo-500" /> Prescription Requests
                            {pending > 0 && (
                                <span className="text-xs font-extrabold text-white px-2 py-0.5 rounded-full" style={{ background: '#ef4444' }}>
                                    {pending} new
                                </span>
                            )}
                        </h1>
                        <p className="text-sm text-slate-400 mt-0.5">{requests.length} request{requests.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button onClick={load} className="p-2 rounded-xl border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 transition-all">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Filters */}
                <div className="flex gap-1.5 mb-3 flex-wrap">
                    {FILTERS.map(f => (
                        <button key={f.key} onClick={() => setFilter(f.key)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                            style={filter === f.key
                                ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }
                                : { background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}>
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search by patient name or phone…"
                        className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10 transition-all" />
                    {search && <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>}
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {loading ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />) :
                        requests.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                <ClipboardList className="h-12 w-12 opacity-20 mb-3" />
                                <p className="text-sm font-semibold">No prescription requests found</p>
                            </div>
                        ) : requests.map(r => {
                            const st = STATUS[r.status as RxStatus];
                            const isSelected = selected?._id === r._id;
                            return (
                                <div key={r._id} onClick={() => { setSelected(r); setAdminNotes(r.adminNotes || ''); }}
                                    className="group flex items-start gap-4 p-4 rounded-2xl bg-white cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
                                    style={{
                                        border: isSelected ? '2px solid #6366f1' : '1px solid #f1f5f9',
                                        boxShadow: isSelected ? '0 0 0 4px rgba(99,102,241,0.08)' : '0 1px 4px rgba(0,0,0,0.04)',
                                    }}>

                                    {/* Status dot */}
                                    <div className="mt-1 h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-xl" style={{ background: st.bg }}>
                                        <st.icon className="h-4 w-4" style={{ color: st.color }} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-extrabold text-sm text-slate-800">{r.patientName}</span>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: st.color, background: st.bg }}>
                                                {st.label}
                                            </span>
                                            {r.extractedText && (
                                                <span className="flex items-center gap-0.5 text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">
                                                    <ScanText className="h-2.5 w-2.5" /> OCR Text
                                                </span>
                                            )}
                                            {r.ocrStatus === 'failed' && (
                                                <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                                    <AlertTriangle className="h-2.5 w-2.5" /> OCR Failed
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                            <span className="flex items-center gap-1 text-xs text-slate-400"><Phone className="h-3 w-3" />{r.patientPhone}</span>
                                            <span className="flex items-center gap-1 text-xs text-slate-400"><Pill className="h-3 w-3" />{r.medicines.length} medicine{r.medicines.length !== 1 ? 's' : ''}</span>
                                            <span className="text-xs text-slate-400">{format(new Date(r.createdAt), 'dd MMM, HH:mm')}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>

            {/* ── Right: detail panel ──────────────────────────── */}
            {selected && (
                <div className="hidden lg:flex flex-col w-[45%] flex-shrink-0 rounded-3xl bg-white overflow-hidden"
                    style={{ border: '1px solid #e8eaf0', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', maxHeight: 'calc(100vh - 80px)' }}>

                    {/* Detail header */}
                    <div className="flex-shrink-0 p-5 border-b border-slate-100">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="font-extrabold text-slate-900 text-base">{selected.patientName}</div>
                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                    <span className="flex items-center gap-1 text-xs text-slate-500"><Phone className="h-3 w-3" />{selected.patientPhone}</span>
                                    {selected.patientEmail && <span className="text-xs text-slate-400">{selected.patientEmail}</span>}
                                </div>
                            </div>
                            <button onClick={() => setSelected(null)} className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 transition-all">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        {/* Status pill */}
                        {(() => {
                            const st = STATUS[selected.status as RxStatus];
                            return (
                                <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl" style={{ background: st.bg }}>
                                    <st.icon className="h-4 w-4 flex-shrink-0" style={{ color: st.color }} />
                                    <span className="text-sm font-bold" style={{ color: st.color }}>{st.label}</span>
                                    <span className="text-xs text-slate-400 ml-auto">{format(new Date(selected.createdAt), 'dd MMM yyyy, HH:mm')}</span>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Scrollable body */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-5">

                        {/* Medicines list */}
                        {selected.medicines && selected.medicines.length > 0 ? (
                            <div>
                                <div className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Pill className="h-3.5 w-3.5 text-indigo-400" /> Requested Medicines (User specified)
                                </div>
                                <div className="space-y-2">
                                    {selected.medicines.map((m, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                            <div className="h-7 w-7 flex items-center justify-center rounded-lg text-xs font-bold text-white" style={{ background: '#6366f1' }}>{i + 1}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-bold text-slate-800 truncate">{m.name}</div>
                                                {m.notes && <div className="text-xs text-slate-400">{m.notes}</div>}
                                            </div>
                                            <div className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded-lg">Qty: {m.quantity}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-sm font-bold text-amber-800 mb-1">No medicine list provided</div>
                                    <p className="text-xs text-amber-700 leading-relaxed">
                                        The patient uploaded only the prescription image. Please review the image below to identify required medicines.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* OCR Extracted Text */}
                        <div>
                            <div className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <ScanText className="h-3.5 w-3.5 text-indigo-400" /> Prescription Text (OCR Extracted)
                            </div>
                            {selected.ocrStatus === 'done' && selected.extractedText ? (
                                <div className="p-4 rounded-2xl border-2 border-indigo-100 bg-indigo-50/50">
                                    <pre className="text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed">
                                        {selected.extractedText}
                                    </pre>
                                </div>
                            ) : selected.ocrStatus === 'failed' ? (
                                <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                                    <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <div className="text-sm font-bold text-amber-800 mb-1">OCR extraction failed</div>
                                        <p className="text-xs text-amber-700 leading-relaxed">
                                            Could not extract text from the uploaded prescription image.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                                    <ScanText className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-slate-500">No prescription text available.</p>
                                </div>
                            )}
                        </div>

                        {/* Doctor info */}
                        {selected.doctorName && (
                            <div>
                                <div className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-2">Doctor Details</div>
                                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                                    <div className="text-sm font-bold text-slate-800">{selected.doctorName}</div>
                                    {selected.doctorPhone && <div className="text-xs text-slate-500 mt-0.5">{selected.doctorPhone}</div>}
                                </div>
                            </div>
                        )}

                        {/* Admin notes input */}
                        <div>
                            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <MessageSquare className="h-3.5 w-3.5 text-indigo-400" /> Admin Notes (sent to patient)
                            </label>
                            <textarea
                                value={adminNotes}
                                onChange={e => setAdminNotes(e.target.value)}
                                placeholder="e.g. The medicines you need are available in our medical shop. You can visit and buy them."
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm resize-none focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10 transition-all"
                            />
                        </div>

                        {/* Previous review info */}
                        {selected.reviewedBy && (
                            <div className="text-xs text-slate-400 flex items-center gap-1.5">
                                <CheckCircle className="h-3 w-3" />
                                Reviewed by <strong className="text-slate-600">{selected.reviewedBy}</strong>
                                {selected.reviewedAt && <> on {format(new Date(selected.reviewedAt), 'dd MMM yyyy')}</>}
                            </div>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex-shrink-0 p-4 border-t border-slate-100">
                        <div className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wide">Update Status</div>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { status: 'under_review', label: 'Mark Under Review', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
                                { status: 'approved', label: '✅ Approve', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
                                { status: 'rejected', label: '❌ Reject', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
                                { status: 'collected', label: '📦 Mark Collected', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
                            ].map(btn => (
                                <button key={btn.status}
                                    onClick={() => changeStatus(selected._id, btn.status)}
                                    disabled={updating || selected.status === btn.status}
                                    className="py-2.5 px-3 rounded-xl text-xs font-bold transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                                    style={{ color: btn.color, background: btn.bg, border: `1px solid ${btn.color}30` }}>
                                    {updating ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : btn.label}
                                </button>
                            ))}
                        </div>
                        
                        {/* Delete button */}
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={deleting}
                                className="w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
                                style={{ color: '#dc2626', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)' }}>
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete Request
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <DialogContent className="max-w-md bg-white">
                <DialogHeader className="pb-4">
                    <DialogTitle className="flex items-center gap-2 text-lg text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        Delete Prescription Request
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                        Are you sure you want to delete this prescription request? This action cannot be undone.
                    </p>
                    {selected && (
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm">
                            <div className="font-semibold text-slate-900">{selected.customerName}</div>
                            <div className="text-slate-500 text-xs mt-1">{selected.phone}</div>
                        </div>
                    )}
                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={() => setShowDeleteConfirm(false)}
                            disabled={deleting}
                            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {deleting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
        </>
    );
}
