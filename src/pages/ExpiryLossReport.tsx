import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getExpiryLossDetails, ExpiryLossItem } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface ExpiryLossResponse {
  range: { start: string; end: string };
  summary: { totalLoss: number; totalItems: number };
  items: ExpiryLossItem[];
}

export default function ExpiryLossReport() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ExpiryLossResponse | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const result = await getExpiryLossDetails({ range: '7days' });
        setData(result);
      } catch (e) {
        console.error('Failed to load expiry loss report:', e);
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const items = data?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expiry Loss Report</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Detailed breakdown of all expired items and financial loss.
          </p>
          {data && (
            <p className="text-xs text-muted-foreground mt-1">
              Period: {data.range.start} to {data.range.end}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-sm text-right">
            <div className="text-xs text-slate-300 font-medium">Total items expired</div>
            <div className="text-xl font-bold">{data ? data.summary.totalItems : '…'}</div>
          </div>
          <div className="p-4 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-sm text-right">
            <div className="text-xs text-red-100 font-medium">Total expiry loss</div>
            <div className="text-xl font-bold">
              {data ? `₹${data.summary.totalLoss.toLocaleString()}` : '…'}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border/40 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-foreground">Expired Items</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Each row represents a write-off entry from stock ledger.</p>
          </div>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="h-72 flex items-center justify-center text-muted-foreground">Loading expiry loss…</div>
          ) : items.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-muted-foreground">
              No expired items recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Showing last {items.length} expiry write-offs.</span>
              </div>
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80">
                      {['Medicine', 'Batch', 'Expired Date', 'Qty', 'Purchase Price', 'Total Loss', 'Supplier', 'Purchase Date', 'Action'].map(h => (
                        <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => (
                      <TableRow key={`${item.medicineId}-${item.batchId}-${idx}`} className="hover:bg-slate-50/60">
                        <TableCell className="font-medium">{item.medicineName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.batchNumber}</TableCell>
                        <TableCell className="text-sm">
                          {item.expiryDate ? format(new Date(item.expiryDate), 'dd MMM yyyy') : '-'}
                        </TableCell>
                        <TableCell className="text-sm font-semibold">{item.quantityExpired}</TableCell>
                        <TableCell className="text-sm">₹{(item.unitPrice || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-sm font-semibold text-red-600">
                          ₹{(item.totalLoss || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.supplierName || 'Unknown'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.purchaseDate ? format(new Date(item.purchaseDate), 'dd MMM yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">View Details</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
