import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Receipt, Package, Calendar, CreditCard, User, CheckCircle2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3004/api';

const getAuthHeaders = (): HeadersInit => {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

interface SaleItem {
    medicineName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
}

interface SaleRecord {
    _id: string;
    invoiceNumber: string;
    customerName?: string;
    paymentMethod: string;
    paymentStatus: string;
    items: SaleItem[];
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    total: number;
    createdAt: string;
}

const PAYMENT_LABELS: Record<string, string> = {
    cash: '💵 Cash',
    upi: '📱 UPI',
    card: '💳 Card',
};

export default function TransactionLookup() {
    const { toast } = useToast();
    const [searchParams] = useSearchParams();
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [sale, setSale] = useState<SaleRecord | null>(null);
    const [notFound, setNotFound] = useState(false);
    const hasAutoLoaded = useRef(false);

    const lookupSaleByInvoice = useCallback(async (invoiceNumber: string) => {
        if (!invoiceNumber.trim()) return;
        setLoading(true);
        setNotFound(false);
        setSale(null);

        try {
            const res = await fetch(`${API_BASE_URL}/sales/${encodeURIComponent(invoiceNumber.trim())}`, {
                headers: getAuthHeaders(),
            });

            if (!res.ok) { setNotFound(true); return; }

            const result = await res.json();
            if (result.success && result.data) {
                setSale(result.data);
            } else {
                setNotFound(true);
            }
        } catch {
            toast({ title: 'Error', description: 'Failed to fetch transaction', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    // Auto-lookup if invoice parameter is present (only once)
    useEffect(() => {
        const invoice = searchParams.get('invoice');
        if (invoice && !hasAutoLoaded.current) {
            hasAutoLoaded.current = true;
            setQuery(invoice);
            lookupSaleByInvoice(invoice);
        }
    }, [searchParams, lookupSaleByInvoice]);

    const lookupSale = async () => {
        await lookupSaleByInvoice(query);
    };

    const handlePrint = () => {
        if (!sale) return;
        const win = window.open('', '_blank', 'width=800,height=900');
        if (!win) return;
        const dateStr = new Date(sale.createdAt).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });
        win.document.write(`
      <html><head><title>Transaction ${sale.invoiceNumber}</title>
      <style>
        body { font-family: sans-serif; padding: 40px; color: #111; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px 12px; text-align: left; font-size: 13px; }
        th { background: #f3f4f6; font-weight: 600; }
        tr:not(:last-child) td { border-bottom: 1px solid #e5e7eb; }
      </style>
      </head><body>
        <h2 style="margin-bottom:4px">Special Access Pharma – Tax Invoice</h2>
        <p style="color:#6b7280;font-size:13px">${dateStr}</p>
        <hr style="margin:16px 0"/>
        <p><strong>Invoice:</strong> ${sale.invoiceNumber}</p>
        <p><strong>Transaction ID:</strong> ${sale._id}</p>
        <p><strong>Customer:</strong> ${sale.customerName || 'Walk-in'}</p>
        <p><strong>Payment:</strong> ${sale.paymentMethod.toUpperCase()}</p>
        <hr style="margin:16px 0"/>
        <table>
          <thead><tr><th>#</th><th>Medicine</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
          <tbody>
            ${sale.items.map((it, i) => `<tr><td>${i + 1}</td><td>${it.medicineName}</td><td>${it.quantity}</td><td>₹${it.unitPrice.toFixed(2)}</td><td>₹${it.lineTotal.toFixed(2)}</td></tr>`).join('')}
          </tbody>
        </table>
        <hr style="margin:16px 0"/>
        <p style="text-align:right;font-size:13px">Subtotal: ₹${sale.subtotal.toFixed(2)}</p>
        <p style="text-align:right;font-size:13px">GST: ₹${sale.taxAmount.toFixed(2)}</p>
        <p style="text-align:right;font-weight:700;font-size:16px">Total Paid: ₹${sale.total.toFixed(2)}</p>
      </body></html>
    `);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); win.close(); }, 400);
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-8">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl">
                    <Receipt className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Transaction Lookup</h1>
                    <p className="text-sm text-muted-foreground">Enter a Transaction ID or Invoice Number to view purchase details</p>
                </div>
            </div>

            {/* Search */}
            <Card className="border-border/60 shadow-sm">
                <CardContent className="pt-5 pb-5">
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                            <Input
                                placeholder="Transaction ID or Invoice No. (e.g. INV-2026-0001)"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && lookupSale()}
                                className="pl-9 h-11"
                            />
                        </div>
                        <Button className="h-11 px-6" onClick={lookupSale} disabled={loading || !query.trim()}>
                            {loading ? 'Searching...' : 'Search'}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 pl-1">
                        💡 Your Transaction ID is printed on every invoice after a payment is completed.
                    </p>
                </CardContent>
            </Card>

            {/* Not found */}
            {notFound && (
                <Card className="border-destructive/30 bg-destructive/5">
                    <CardContent className="pt-5 pb-5 text-center text-muted-foreground">
                        <p className="font-medium">No transaction found for <span className="text-foreground font-mono">"{query}"</span></p>
                        <p className="text-sm mt-1">Double-check the Transaction ID or Invoice Number from the receipt.</p>
                    </CardContent>
                </Card>
            )}

            {/* Result */}
            {sale && (
                <Card className="border-border/60 shadow-sm overflow-hidden">
                    <CardHeader className="bg-muted/20 border-b border-border/40 pb-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <CardTitle className="text-lg font-bold">{sale.invoiceNumber}</CardTitle>
                                <p className="text-xs text-muted-foreground font-mono mt-1">{sale._id}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-full px-3 py-1 text-xs font-bold tracking-widest">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> PAID
                                </div>
                                <Button size="sm" variant="outline" onClick={handlePrint}>
                                    <Printer className="h-3.5 w-3.5 mr-1.5" /> Print
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-5 space-y-5">
                        {/* Meta */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground/60" />
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Date</p>
                                    <p className="text-sm font-semibold">{new Date(sale.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-muted-foreground/60" />
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Payment</p>
                                    <p className="text-sm font-semibold">{PAYMENT_LABELS[sale.paymentMethod] || sale.paymentMethod}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground/60" />
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Customer</p>
                                    <p className="text-sm font-semibold truncate">{sale.customerName || 'Walk-in'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-muted-foreground/60" />
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Items</p>
                                    <p className="text-sm font-semibold">{sale.items.length} item{sale.items.length !== 1 ? 's' : ''}</p>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Items */}
                        <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Items Purchased</p>
                            <div className="rounded-lg border border-border/40 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/30">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">#</th>
                                            <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Medicine</th>
                                            <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground">Qty</th>
                                            <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">Unit</th>
                                            <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                        {sale.items.map((item, i) => (
                                            <tr key={i} className="hover:bg-muted/20 transition-colors">
                                                <td className="px-4 py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                                                <td className="px-4 py-2.5 font-medium">{item.medicineName}</td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <Badge variant="secondary" className="text-xs px-2">{item.quantity}</Badge>
                                                </td>
                                                <td className="px-4 py-2.5 text-right text-muted-foreground">₹{item.unitPrice.toFixed(2)}</td>
                                                <td className="px-4 py-2.5 text-right font-semibold">₹{item.lineTotal.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <Separator />

                        {/* Totals */}
                        <div className="flex justify-end">
                            <div className="w-56 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span className="font-medium">₹{sale.subtotal.toFixed(2)}</span>
                                </div>
                                {sale.taxAmount > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">GST (5%)</span>
                                        <span className="font-medium">₹{sale.taxAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                {sale.discountAmount > 0 && (
                                    <div className="flex justify-between text-emerald-600">
                                        <span>Discount</span>
                                        <span>−₹{sale.discountAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                <Separator />
                                <div className="flex justify-between font-bold text-base">
                                    <span>Total Paid</span>
                                    <span className="text-primary">₹{sale.total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
