import { useState, useEffect } from 'react';
import { Search, Plus, Filter, MoreHorizontal, Eye, Package, Edit, AlertTriangle, Ban, ChevronsUpDown, Check, IndianRupee } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createMedicine, getMedicines, adjustStock, addBatch, discontinueMedicine, updateRackLocation, updateMedicinePrices } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { sampleMedicines, categories, manufacturers, adjustmentReasons, type Medicine } from '@/data/pharmacyData';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';

export default function Inventory() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [medicines, setMedicines] = useState<Medicine[]>(sampleMedicines);
  const [isLoading, setIsLoading] = useState(false);
  const mapApiMedicinesToMedicines = (apiMedicines: any[]): Medicine[] => {
    return apiMedicines.map((med: any) => {
      const batches = (med.batches || []).map((b: any) => ({
        id: String(b.id || b._id),
        batchNumber: b.batchNumber,
        expiryDate: b.expiryDate,
        quantity: typeof b.quantity === 'number' ? b.quantity : 0,
        purchasePrice: typeof b.purchasePrice === 'number' ? b.purchasePrice : 0,
        receivedDate: b.receivedDate || b.createdAt || new Date().toISOString(),
      }));

      const firstBatch = batches[0];

      return {
        id: String(med.id || med._id),
        name: med.name,
        category: med.category,
        manufacturer: med.manufacturer || med.manufacturerId?.name || 'Unknown',
        stock: typeof med.stock === 'number' ? med.stock : 0,
        minStock: typeof med.minStockLevel === 'number' ? med.minStockLevel : 0,
        maxStock: typeof med.maxStockLevel === 'number' ? med.maxStockLevel : 0,
        purchasePrice: firstBatch?.purchasePrice ?? 0,
        sellingPrice: med.mrp || 0,
        rack: med.rackLocation || 'Not Assigned',
        batches,
        discontinued: !!(med.discontinued || med.isActive === false),
      };
    });
  };

  const loadMedicines = async () => {
    try {
      setIsLoading(true);
      const apiMedicines = await getMedicines();
      const transformedMedicines: Medicine[] = mapApiMedicinesToMedicines(apiMedicines || []);
      setMedicines(transformedMedicines);
    } catch (error: any) {
      console.error('Failed to load medicines:', error);
      toast({
        title: 'Error',
        description: 'Failed to load medicines. Using sample data.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load medicines from API on mount and when global stock-affecting events occur
  useEffect(() => {
    loadMedicines();

    const handleRefresh = () => {
      loadMedicines();
    };

    window.addEventListener('sale-completed', handleRefresh);
    window.addEventListener('purchase-completed', handleRefresh);
    window.addEventListener('stock-adjusted', handleRefresh);

    return () => {
      window.removeEventListener('sale-completed', handleRefresh);
      window.removeEventListener('purchase-completed', handleRefresh);
      window.removeEventListener('stock-adjusted', handleRefresh);
    };
  }, []);

  // Modal states
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showViewItemSheet, setShowViewItemSheet] = useState(false);
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [showAdjustStockModal, setShowAdjustStockModal] = useState(false);
  const [showAdjustPriceModal, setShowAdjustPriceModal] = useState(false);
  const [showEditRackModal, setShowEditRackModal] = useState(false);
  const [showDiscontinueDialog, setShowDiscontinueDialog] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);

  const syncSelectedMedicine = (nextMedicines: Medicine[]) => {
    setSelectedMedicine((current) => {
      if (!current) return current;
      return nextMedicines.find((m) => m.id === current.id) || current;
    });
  };

  // Filter states
  const [filters, setFilters] = useState({
    lowStock: false,
    nearExpiry: false,
    category: '',
    manufacturer: ''
  });

  const ALL_FILTER_VALUE = '__all__';

  // Support quick filters from URL (e.g. /inventory?filter=low)
  useEffect(() => {
    const quickFilter = (searchParams.get('filter') || '').toLowerCase();
    if (!quickFilter) return;

    if (quickFilter === 'low') {
      setFilters((f) => ({ ...f, lowStock: true }));
    } else if (quickFilter === 'expiry' || quickFilter === 'near-expiry') {
      setFilters((f) => ({ ...f, nearExpiry: true }));
    }

    // Consume the param so the user can clear filters without it reapplying.
    const next = new URLSearchParams(searchParams);
    next.delete('filter');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // Form states
  const [addStockForm, setAddStockForm] = useState({
    medicineId: '',
    batchNumber: '',
    expiryDate: undefined as Date | undefined,
    quantity: '',
    purchasePrice: '',
    sellingPrice: ''
  });
  const [comboboxOpen, setComboboxOpen] = useState(false);

  const [adjustStockForm, setAdjustStockForm] = useState({
    reason: '',
    quantity: ''
  });

  const [adjustPriceForm, setAdjustPriceForm] = useState({
    purchasePrice: '',
    sellingPrice: ''
  });

  const [editRackForm, setEditRackForm] = useState('');

  const [addProductForm, setAddProductForm] = useState({
    name: '',
    genericName: '',
    strength: '',
    category: '',
    unit: '',
    manufacturer: '',
    hsnCode: '',
    gst: '',
    purchasePrice: '',
    sellingPrice: '',
    minStock: '',
    rack: ''
  });

  // Filter medicines
  const filteredMedicines = medicines.filter(med => {
    if (searchQuery && !med.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filters.lowStock && med.stock >= med.minStock) return false;
    if (filters.nearExpiry) {
      const nearestExpiry = med.batches.length > 0
        ? new Date(Math.min(...med.batches.map(b => new Date(b.expiryDate).getTime())))
        : null;
      if (!nearestExpiry || nearestExpiry > new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) return false;
    }
    if (filters.category && med.category !== filters.category) return false;
    if (filters.manufacturer && med.manufacturer !== filters.manufacturer) return false;
    return !med.discontinued;
  });

  const selectableMedicines = medicines.filter((m) => !m.discontinued);

  // If a medicine gets discontinued while Add Stock is open, clear selection
  useEffect(() => {
    if (!showAddStockModal) return;
    setAddStockForm((current) => {
      if (!current.medicineId) return current;
      const stillSelectable = selectableMedicines.some((m) => m.id === current.medicineId);
      return stillSelectable ? current : { ...current, medicineId: '' };
    });
  }, [showAddStockModal, medicines]);

  const getStockStatus = (med: Medicine) => {
    // First priority: Check for expired or expiring batches that still have stock
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Only consider batches that still have quantity > 0
    const batchesWithStock = med.batches.filter(batch => (batch.quantity ?? 0) > 0);

    // Check if any in-stock batches are expired
    const hasExpiredBatches = batchesWithStock.some(batch => {
      const expiryDate = new Date(batch.expiryDate);
      expiryDate.setHours(0, 0, 0, 0);
      return expiryDate < today;
    });

    if (hasExpiredBatches) {
      return { label: 'Expired', variant: 'destructive' as const };
    }

    // Check if any in-stock batches are expiring within 30 days
    const hasExpiringSoonBatches = batchesWithStock.some(batch => {
      const expiryDate = new Date(batch.expiryDate);
      expiryDate.setHours(0, 0, 0, 0);
      return expiryDate >= today && expiryDate <= thirtyDaysFromNow;
    });

    if (hasExpiringSoonBatches) {
      return { label: 'Expiring Soon', variant: 'destructive' as const };
    }

    // Then check stock levels
    if (med.stock <= 0) return { label: 'Out of Stock', variant: 'secondary' as const };
    if (med.stock < med.minStock) return { label: 'Low Stock', variant: 'destructive' as const };
    if (med.stock > med.maxStock * 0.8) return { label: 'Healthy', variant: 'default' as const };
    return { label: 'Normal', variant: 'secondary' as const };
  };

  const handleAddStock = async () => {
    if (!addStockForm.medicineId || !addStockForm.batchNumber || !addStockForm.expiryDate || !addStockForm.quantity) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    const quantityNum = parseInt(addStockForm.quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      toast({ title: 'Error', description: 'Quantity must be a positive number', variant: 'destructive' });
      return;
    }

    try {
      setIsLoading(true);
      await addBatch({
        medicineId: addStockForm.medicineId,
        batchNumber: addStockForm.batchNumber,
        expiryDate: addStockForm.expiryDate.toISOString(),
        quantity: quantityNum,
        purchasePrice: addStockForm.purchasePrice ? parseFloat(addStockForm.purchasePrice) : undefined,
        mrp: addStockForm.sellingPrice ? parseFloat(addStockForm.sellingPrice) : undefined
      });

      toast({ 
        title: 'Stock Added', 
        description: `Batch ${addStockForm.batchNumber} with ${quantityNum} units added successfully` 
      });

      // Reload medicines to show updated stock
      await loadMedicines();
      syncSelectedMedicine(medicines);

      setShowAddStockModal(false);
      setAddStockForm({ medicineId: '', batchNumber: '', expiryDate: undefined, quantity: '', purchasePrice: '', sellingPrice: '' });
      setComboboxOpen(false);
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to add batch', 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdjustStock = async () => {
    if (!adjustStockForm.reason || !adjustStockForm.reason.trim()) {
      toast({ title: 'Error', description: 'Please select a reason', variant: 'destructive' });
      return;
    }
    if (!adjustStockForm.quantity || adjustStockForm.quantity.trim() === '' || parseFloat(adjustStockForm.quantity) === 0) {
      toast({ title: 'Error', description: 'Please enter a valid quantity', variant: 'destructive' });
      return;
    }

    if (!selectedMedicine) {
      toast({ title: 'Error', description: 'No medicine selected', variant: 'destructive' });
      return;
    }

    // Interpret quantity based on reason: for write-off style reasons (Expired, Damaged, Lost, Return to Supplier),
    // treat a positive quantity as a reduction to make the UX simpler.
    const rawQuantity = parseFloat(adjustStockForm.quantity);
    const reasonLower = adjustStockForm.reason.toLowerCase();
    const isWriteOffReason =
      reasonLower.includes('expir') ||
      reasonLower.includes('damag') ||
      reasonLower.includes('lost') ||
      reasonLower.includes('return');

    const quantityForServer = isWriteOffReason && rawQuantity > 0 ? -rawQuantity : rawQuantity;

    try {
      setIsLoading(true);
      await adjustStock({
        medicineId: selectedMedicine.id,
        quantity: quantityForServer,
        reason: adjustStockForm.reason
      });

      const absQty = Math.abs(quantityForServer);
      const directionText = quantityForServer < 0 ? 'reduced by' : 'increased by';

      toast({ 
        title: 'Stock Adjusted', 
        description: `Stock ${directionText} ${absQty} units` 
      });

      // Reload medicines to show updated stock
      await loadMedicines();
      syncSelectedMedicine(medicines);

      // Broadcast global stock-adjusted event so Dashboard/Reports can refresh
      window.dispatchEvent(new CustomEvent('stock-adjusted'));

      setShowAdjustStockModal(false);
      setAdjustStockForm({ reason: '', quantity: '' });
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to adjust stock', 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditRack = async () => {
    if (!editRackForm) {
      toast({ title: 'Error', description: 'Please enter rack location', variant: 'destructive' });
      return;
    }

    if (!selectedMedicine) {
      toast({ title: 'Error', description: 'No medicine selected', variant: 'destructive' });
      return;
    }

    try {
      await updateRackLocation(selectedMedicine.id, editRackForm);
      
      // Update local state
      setMedicines(medicines.map(m => 
        m.id === selectedMedicine.id 
          ? { ...m, rack: editRackForm }
          : m
      ));

      toast({ 
        title: 'Rack Updated', 
        description: `Rack location updated to ${editRackForm}` 
      });
      
      setShowEditRackModal(false);
      setEditRackForm('');
      setSelectedMedicine(null);
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to update rack location',
        variant: 'destructive' 
      });
    }
  };

  const handleAddProduct = async () => {
    if (!addProductForm.name || !addProductForm.category) {
      toast({ title: 'Error', description: 'Please fill required fields: Medicine Name and Category', variant: 'destructive' });
      return;
    }

    try {
      await createMedicine({
        name: addProductForm.name,
        genericName: addProductForm.genericName || addProductForm.name,
        category: addProductForm.category,
        manufacturer: addProductForm.manufacturer || 'Generic',
        rack: addProductForm.rack || 'Not Assigned'
      });

      // Refresh medicines list
      const apiMedicines = await getMedicines();
      const transformedMedicines: Medicine[] = mapApiMedicinesToMedicines(apiMedicines || []);
      setMedicines(transformedMedicines);

      toast({ title: 'Product Added', description: `${addProductForm.name} has been added successfully` });
      setShowAddProductModal(false);
      setAddProductForm({
        name: '',
        genericName: '',
        strength: '',
        category: '',
        unit: '',
        manufacturer: '',
        hsnCode: '',
        gst: '',
        purchasePrice: '',
        sellingPrice: '',
        minStock: '',
        rack: ''
      });
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to add product', 
        variant: 'destructive' 
      });
    }
  };

  const handleDiscontinue = async () => {
    if (!selectedMedicine) {
      return;
    }

    try {
      setIsLoading(true);
      await discontinueMedicine(selectedMedicine.id);

      toast({ 
        title: 'Medicine Discontinued', 
        description: `${selectedMedicine.name} has been marked as discontinued` 
      });

      // Reload medicines to show updated list
      const apiMedicines = await getMedicines();
      const transformedMedicines: Medicine[] = mapApiMedicinesToMedicines(apiMedicines || []);
      setMedicines(transformedMedicines);

      setShowDiscontinueDialog(false);
      setSelectedMedicine(null);
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to discontinue medicine', 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdjustPrice = async () => {
    if (!selectedMedicine) {
      toast({ title: 'Error', description: 'No medicine selected', variant: 'destructive' });
      return;
    }

    const hasPurchase = adjustPriceForm.purchasePrice.trim() !== '';
    const hasSelling = adjustPriceForm.sellingPrice.trim() !== '';

    if (!hasPurchase && !hasSelling) {
      toast({ title: 'Error', description: 'Enter at least one price to update', variant: 'destructive' });
      return;
    }

    const payload: { purchasePrice?: number; mrp?: number } = {};
    if (hasPurchase) {
      const val = parseFloat(adjustPriceForm.purchasePrice);
      if (Number.isNaN(val) || val < 0) {
        toast({ title: 'Error', description: 'Purchase price must be a non-negative number', variant: 'destructive' });
        return;
      }
      payload.purchasePrice = val;
    }
    if (hasSelling) {
      const val = parseFloat(adjustPriceForm.sellingPrice);
      if (Number.isNaN(val) || val < 0) {
        toast({ title: 'Error', description: 'Selling price must be a non-negative number', variant: 'destructive' });
        return;
      }
      payload.mrp = val;
    }

    try {
      setIsLoading(true);
      await updateMedicinePrices(selectedMedicine.id, payload);

      // Refresh medicines so Inventory reflects new prices
      const apiMedicines = await getMedicines();
      const transformedMedicines: Medicine[] = mapApiMedicinesToMedicines(apiMedicines || []);
      setMedicines(transformedMedicines);
      syncSelectedMedicine(transformedMedicines);

      toast({ title: 'Price Updated', description: 'Medicine prices have been updated successfully' });

      setShowAdjustPriceModal(false);
      setAdjustPriceForm({ purchasePrice: '', sellingPrice: '' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update prices', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Inventory</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your stock and medicines</p>
      </div>

      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search medicines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowFilterSheet(true)} className="gap-2 whitespace-nowrap">
            <Filter className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Filters</span>
            {(filters.lowStock || filters.nearExpiry || filters.category || filters.manufacturer) && (
              <Badge variant="secondary" className="ml-1">Active</Badge>
            )}
          </Button>
          <Button variant="outline" onClick={() => setShowAddProductModal(true)} className="gap-2 whitespace-nowrap">
            <Plus className="h-4 w-4 shrink-0" />
            <span className="hidden md:inline">New Product</span>
          </Button>
          <Button onClick={() => setShowAddStockModal(true)} className="gap-2 whitespace-nowrap">
            <Plus className="h-4 w-4 shrink-0" />
            <span className="hidden md:inline">Add Stock</span>
          </Button>
        </div>
      </div>

      {/* Inventory Table or Empty State */}
      {medicines.length === 0 ? (
        <div className="rounded-3xl bg-white border border-border/50 shadow-sm flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 mb-5">
            <Package className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-xl font-extrabold text-foreground mb-2">No products added yet</h3>
          <p className="text-muted-foreground max-w-sm mb-6 text-sm">
            Start by adding your first product to manage inventory, track stock levels, and monitor expiry dates.
          </p>
          <Button onClick={() => setShowAddProductModal(true)} size="lg" className="rounded-xl font-bold"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Product
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="w-[200px] sm:w-[250px] text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Medicine Name</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Category</TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Stock Qty</TableHead>
                  <TableHead className="hidden md:table-cell text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Expiry Date</TableHead>
                  <TableHead className="hidden lg:table-cell text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Rack</TableHead>
                  <TableHead className="hidden lg:table-cell text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Min/Max</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Purchase ₹</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Selling ₹</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMedicines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                    No results found matching your filters.
                    <Button
                      variant="link"
                      onClick={() => {
                        setFilters({ lowStock: false, nearExpiry: false, category: '', manufacturer: '' });
                        setSearchQuery('');
                      }}
                      className="ml-2"
                    >
                      Clear Filters
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                filteredMedicines.map((medicine) => {
                  const stockStatus = getStockStatus(medicine);
                  // Only consider batches that still have stock when showing nearest expiry
                  const batchesWithStock = medicine.batches.filter(b => (b.quantity ?? 0) > 0);
                  const nearestExpiry = batchesWithStock.length > 0
                    ? format(new Date(Math.min(...batchesWithStock.map(b => new Date(b.expiryDate).getTime()))), 'dd MMM yyyy')
                    : '-';

                  return (
                    <TableRow key={medicine.id} className="h-14 table-row-hover group">
                      <TableCell>
                        <div className="font-medium text-sm group-hover:text-primary transition-colors">{medicine.name}</div>
                        <div className="text-xs text-muted-foreground">{medicine.manufacturer}</div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className="text-xs">{medicine.category}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2 flex-wrap sm:flex-nowrap">
                          <span className={cn(
                            "font-semibold text-sm",
                            medicine.stock < medicine.minStock && "text-destructive"
                          )}>
                            {medicine.stock}
                          </span>
                          <Badge variant={stockStatus.variant} className="text-xs shrink-0">
                            {stockStatus.label}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{nearestExpiry}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{medicine.rack}</TableCell>
                      <TableCell className="hidden lg:table-cell text-center text-muted-foreground text-sm">
                        {medicine.minStock} / {medicine.maxStock}
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm">₹{medicine.purchasePrice}</TableCell>
                      <TableCell className="text-right font-medium text-sm">₹{medicine.sellingPrice}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedMedicine(medicine);
                              setShowViewItemSheet(true);
                            }}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Item
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedMedicine(medicine);
                              setShowAddBatchModal(true);
                            }}>
                              <Package className="mr-2 h-4 w-4" />
                              Add Batch
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedMedicine(medicine);
                              setShowAdjustStockModal(true);
                            }}>
                              <Edit className="mr-2 h-4 w-4" />
                              Adjust Stock
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedMedicine(medicine);
                              setAdjustPriceForm({
                                purchasePrice: medicine.purchasePrice?.toString() || '',
                                sellingPrice: medicine.sellingPrice?.toString() || '',
                              });
                              setShowAdjustPriceModal(true);
                            }}>
                              <IndianRupee className="mr-2 h-4 w-4" />
                              Adjust Price
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedMedicine(medicine);
                              setEditRackForm(medicine.rack);
                              setShowEditRackModal(true);
                            }}>
                              <AlertTriangle className="mr-2 h-4 w-4" />
                              Edit Rack
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setSelectedMedicine(medicine);
                                setShowDiscontinueDialog(true);
                              }}
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              Mark Discontinued
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
            </div>
        </div>
      )}

      {/* Add Stock Modal */}
      <Dialog open={showAddStockModal} onOpenChange={setShowAddStockModal}>
        <DialogContent className="sm:max-w-[500px] shadow-2xl">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-semibold">Add Stock</DialogTitle>
            <DialogDescription className="text-sm">Add a new batch of medicine to your inventory</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-5">
            {/* Medicine Information Section */}
            <div className="space-y-4">
              <div className="grid gap-2.5">
                <Label htmlFor="medicine" className="text-sm font-medium text-foreground">Medicine *</Label>
                <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="medicine"
                      variant="outline"
                      role="combobox"
                      aria-expanded={comboboxOpen}
                      className="h-10 w-full justify-between font-normal hover:bg-accent/50 transition-all duration-150 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <span className={cn(!addStockForm.medicineId && "text-muted-foreground")}>
                        {addStockForm.medicineId
                          ? selectableMedicines.find((m) => m.id === addStockForm.medicineId)?.name
                          : "Search and select medicine..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[450px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Type to search medicines..." className="h-10" />
                      <CommandList>
                        <CommandEmpty>No medicine found.</CommandEmpty>
                        <CommandGroup>
                          {selectableMedicines.map((medicine) => (
                            <CommandItem
                              key={medicine.id}
                              value={medicine.name}
                              onSelect={() => {
                                setAddStockForm(f => ({ ...f, medicineId: medicine.id }));
                                setComboboxOpen(false);
                              }}
                              className="flex items-center justify-between py-2.5 cursor-pointer"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{medicine.name}</span>
                                <span className="text-xs text-muted-foreground">{medicine.manufacturer} | {medicine.category}</span>
                              </div>
                              <Check
                                className={cn(
                                  "ml-2 h-4 w-4",
                                  addStockForm.medicineId === medicine.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">Search by name or scroll to select</p>
              </div>
              <div className="grid gap-2.5">
                <Label htmlFor="batch" className="text-sm font-medium text-foreground">Batch Number *</Label>
                <Input
                  id="batch"
                  value={addStockForm.batchNumber}
                  onChange={(e) => setAddStockForm(f => ({ ...f, batchNumber: e.target.value }))}
                  placeholder="e.g., PCM2024A1"
                  className="h-10 transition-all duration-150 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <p className="text-xs text-muted-foreground">Enter manufacturer batch code</p>
              </div>
            </div>

            {/* Expiry & Quantity Section */}
            <div className="space-y-4 pt-2 border-t border-border/40">
              <div className="grid gap-2.5">
                <Label htmlFor="expiry" className="text-sm font-medium text-foreground">Expiry Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="expiry"
                      variant="outline"
                      className={cn(
                        "h-10 justify-start text-left font-normal transition-all duration-150 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                        !addStockForm.expiryDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {addStockForm.expiryDate ? format(addStockForm.expiryDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={addStockForm.expiryDate}
                      onSelect={(d) => setAddStockForm(f => ({ ...f, expiryDate: d }))}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">Required for expiry tracking</p>
              </div>
              <div className="grid gap-2.5">
                <Label htmlFor="quantity" className="text-sm font-medium text-foreground">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={addStockForm.quantity}
                  onChange={(e) => setAddStockForm(f => ({ ...f, quantity: e.target.value }))}
                  placeholder="0"
                  className="h-10 transition-all duration-150 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <p className="text-xs text-muted-foreground">Enter units to add to inventory</p>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="space-y-4 pt-2 border-t border-border/40">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2.5">
                  <Label htmlFor="price" className="text-sm font-medium text-foreground">Purchase Price (₹)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={addStockForm.purchasePrice}
                    onChange={(e) => setAddStockForm(f => ({ ...f, purchasePrice: e.target.value }))}
                    placeholder="0.00"
                    step="0.01"
                    className="h-10 transition-all duration-150 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <p className="text-xs text-muted-foreground">Optional: Cost price per unit</p>
                </div>
                <div className="grid gap-2.5">
                  <Label htmlFor="selling-price" className="text-sm font-medium text-foreground">Selling Price (₹)</Label>
                  <Input
                    id="selling-price"
                    type="number"
                    value={addStockForm.sellingPrice}
                    onChange={(e) => setAddStockForm(f => ({ ...f, sellingPrice: e.target.value }))}
                    placeholder="0.00"
                    step="0.01"
                    className="h-10 transition-all duration-150 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <p className="text-xs text-muted-foreground">Optional: MRP / selling price per unit</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddStockModal(false);
                setComboboxOpen(false);
              }}
              className="h-10 border-2"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddStock}
              disabled={!addStockForm.medicineId || !addStockForm.batchNumber || !addStockForm.expiryDate || !addStockForm.quantity}
              className="h-10 font-medium"
            >
              Add Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

        {/* Adjust Price Modal */}
        <Dialog open={showAdjustPriceModal} onOpenChange={setShowAdjustPriceModal}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">Adjust Price</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Update purchase and/or selling price for {selectedMedicine?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2.5">
                <Label htmlFor="adj-purchase" className="text-sm font-medium text-foreground">Purchase Price (₹)</Label>
                <Input
                  id="adj-purchase"
                  type="number"
                  value={adjustPriceForm.purchasePrice}
                  onChange={(e) => setAdjustPriceForm(f => ({ ...f, purchasePrice: e.target.value }))}
                  placeholder="Leave blank to keep unchanged"
                  step="0.01"
                  className="h-10"
                />
              </div>
              <div className="grid gap-2.5">
                <Label htmlFor="adj-selling" className="text-sm font-medium text-foreground">Selling Price (₹)</Label>
                <Input
                  id="adj-selling"
                  type="number"
                  value={adjustPriceForm.sellingPrice}
                  onChange={(e) => setAdjustPriceForm(f => ({ ...f, sellingPrice: e.target.value }))}
                  placeholder="Leave blank to keep unchanged"
                  step="0.01"
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">This is the MRP used in billing.</p>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAdjustPriceModal(false);
                  setAdjustPriceForm({ purchasePrice: '', sellingPrice: '' });
                }}
                className="h-10 border-2"
              >
                Cancel
              </Button>
              <Button onClick={handleAdjustPrice} disabled={isLoading} className="h-10 font-medium">
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      {/* New Product Modal */}
      <Dialog open={showAddProductModal} onOpenChange={setShowAddProductModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto shadow-2xl">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-semibold">Add New Product</DialogTitle>
            <DialogDescription className="text-sm">Add a new medicine or product to your inventory</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-5">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <div className="grid gap-2.5">
                <Label htmlFor="prod-name" className="text-sm font-medium text-foreground">Medicine Name *</Label>
                <Input
                  id="prod-name"
                  value={addProductForm.name}
                  onChange={(e) => setAddProductForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Paracetamol"
                  className="h-10 transition-all duration-150 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <p className="text-xs text-muted-foreground">Brand or trade name</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2.5">
                  <Label htmlFor="prod-generic" className="text-sm font-medium text-foreground">Salt / Generic Name</Label>
                  <Input
                    id="prod-generic"
                    value={addProductForm.genericName}
                    onChange={(e) => setAddProductForm(f => ({ ...f, genericName: e.target.value }))}
                    placeholder="e.g., Acetaminophen"
                    className="h-10 transition-all duration-150 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div className="grid gap-2.5">
                  <Label htmlFor="prod-strength" className="text-sm font-medium text-foreground">Strength</Label>
                  <Input
                    id="prod-strength"
                    value={addProductForm.strength}
                    onChange={(e) => setAddProductForm(f => ({ ...f, strength: e.target.value }))}
                    placeholder="e.g., 500mg"
                    className="h-10 transition-all duration-150 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2.5">
                  <Label htmlFor="prod-category" className="text-sm font-medium text-foreground">Category *</Label>
                  <Select value={addProductForm.category} onValueChange={(v) => setAddProductForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger id="prod-category" className="h-10 transition-all duration-150 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2.5">
                  <Label htmlFor="prod-unit" className="text-sm font-medium text-foreground">Unit *</Label>
                  <Select value={addProductForm.unit} onValueChange={(v) => setAddProductForm(f => ({ ...f, unit: v }))}>
                    <SelectTrigger id="prod-unit" className="h-10 transition-all duration-150 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tablet">Tablet</SelectItem>
                      <SelectItem value="Capsule">Capsule</SelectItem>
                      <SelectItem value="Strip">Strip</SelectItem>
                      <SelectItem value="Bottle">Bottle</SelectItem>
                      <SelectItem value="Vial">Vial</SelectItem>
                      <SelectItem value="Tube">Tube</SelectItem>
                      <SelectItem value="Box">Box</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Additional Details Section */}
            <div className="space-y-4 pt-2 border-t border-border/40">
              <div className="grid gap-2.5">
                <Label htmlFor="prod-manufacturer" className="text-sm font-medium text-foreground">Manufacturer</Label>
                <Select value={addProductForm.manufacturer} onValueChange={(v) => setAddProductForm(f => ({ ...f, manufacturer: v }))}>
                  <SelectTrigger id="prod-manufacturer" className="h-10 transition-all duration-150 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                    <SelectValue placeholder="Select manufacturer" />
                  </SelectTrigger>
                  <SelectContent>
                    {manufacturers.map(mfr => (
                      <SelectItem key={mfr} value={mfr}>{mfr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2.5">
                  <Label htmlFor="prod-hsn" className="text-sm font-medium text-foreground">HSN Code</Label>
                  <Input
                    id="prod-hsn"
                    value={addProductForm.hsnCode}
                    onChange={(e) => setAddProductForm(f => ({ ...f, hsnCode: e.target.value }))}
                    placeholder="e.g., 30049011"
                    className="h-10 transition-all duration-150 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div className="grid gap-2.5">
                  <Label htmlFor="prod-gst" className="text-sm font-medium text-foreground">GST %</Label>
                  <Input
                    id="prod-gst"
                    type="number"
                    value={addProductForm.gst}
                    onChange={(e) => setAddProductForm(f => ({ ...f, gst: e.target.value }))}
                    placeholder="e.g., 12"
                    className="h-10 transition-all duration-150 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="space-y-4 pt-2 border-t border-border/40">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2.5">
                  <Label htmlFor="prod-purchase" className="text-sm font-medium text-foreground">Default Purchase Price (₹)</Label>
                  <Input
                    id="prod-purchase"
                    type="number"
                    value={addProductForm.purchasePrice}
                    onChange={(e) => setAddProductForm(f => ({ ...f, purchasePrice: e.target.value }))}
                    placeholder="0.00"
                    step="0.01"
                    className="h-10 transition-all duration-150 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div className="grid gap-2.5">
                  <Label htmlFor="prod-selling" className="text-sm font-medium text-foreground">Default Selling Price (₹)</Label>
                  <Input
                    id="prod-selling"
                    type="number"
                    value={addProductForm.sellingPrice}
                    onChange={(e) => setAddProductForm(f => ({ ...f, sellingPrice: e.target.value }))}
                    placeholder="0.00"
                    step="0.01"
                    className="h-10 transition-all duration-150 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Inventory Management Section */}
            <div className="space-y-4 pt-2 border-t border-border/40">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2.5">
                  <Label htmlFor="prod-minstock" className="text-sm font-medium text-foreground">Minimum Stock Level</Label>
                  <Input
                    id="prod-minstock"
                    type="number"
                    value={addProductForm.minStock}
                    onChange={(e) => setAddProductForm(f => ({ ...f, minStock: e.target.value }))}
                    placeholder="10"
                    className="h-10 transition-all duration-150 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <p className="text-xs text-muted-foreground">Alert when stock falls below this</p>
                </div>
                <div className="grid gap-2.5">
                  <Label htmlFor="prod-rack" className="text-sm font-medium text-foreground">Rack / Shelf Location</Label>
                  <Input
                    id="prod-rack"
                    value={addProductForm.rack}
                    onChange={(e) => setAddProductForm(f => ({ ...f, rack: e.target.value }))}
                    placeholder="e.g., A1, B2"
                    className="h-10 transition-all duration-150 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowAddProductModal(false)}
              className="h-10 border-2"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddProduct}
              disabled={!addProductForm.name || !addProductForm.category || !addProductForm.unit}
              className="h-10 font-medium"
            >
              Add Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Item Sheet */}
      <Sheet open={showViewItemSheet} onOpenChange={setShowViewItemSheet}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selectedMedicine?.name}</SheetTitle>
            <SheetDescription>{selectedMedicine?.manufacturer}</SheetDescription>
          </SheetHeader>
          {selectedMedicine && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Category</div>
                  <div className="font-medium">{selectedMedicine.category}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Rack Location</div>
                  <div className="font-medium">{selectedMedicine.rack}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Current Stock</div>
                  <div className="font-medium">{selectedMedicine.stock}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Min / Max</div>
                  <div className="font-medium">{selectedMedicine.minStock} / {selectedMedicine.maxStock}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Purchase Price</div>
                  <div className="font-medium">₹{selectedMedicine.purchasePrice}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Selling Price</div>
                  <div className="font-medium">₹{selectedMedicine.sellingPrice}</div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Batches</h4>
                <div className="space-y-2">
                  {selectedMedicine.batches.map(batch => (
                    <Card key={batch.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{batch.batchNumber}</div>
                            <div className="text-sm text-muted-foreground">
                              Qty: {batch.quantity} · Expires: {format(new Date(batch.expiryDate), 'dd MMM yyyy')}
                            </div>
                          </div>
                          <Badge variant="outline">₹{batch.purchasePrice}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Batch Modal */}
      <Dialog open={showAddBatchModal} onOpenChange={setShowAddBatchModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Batch - {selectedMedicine?.name}</DialogTitle>
            <DialogDescription>Add a new batch for this medicine</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Batch Number</Label>
              <Input placeholder="e.g., PCM2024A2" />
            </div>
            <div className="grid gap-2">
              <Label>Expiry Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal text-muted-foreground">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Pick a date
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Quantity</Label>
                <Input type="number" placeholder="0" />
              </div>
              <div className="grid gap-2">
                <Label>Purchase Price (₹)</Label>
                <Input type="number" placeholder="0.00" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddBatchModal(false)}>Cancel</Button>
            <Button onClick={() => {
              toast({ title: 'Batch Added', description: 'New batch has been added successfully' });
              setShowAddBatchModal(false);
            }}>Add Batch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Modal */}
      <Dialog open={showAdjustStockModal} onOpenChange={setShowAdjustStockModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock - {selectedMedicine?.name}</DialogTitle>
            <DialogDescription>Record stock adjustment with reason</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Reason</Label>
              <Select value={adjustStockForm.reason} onValueChange={(v) => setAdjustStockForm(f => ({ ...f, reason: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {adjustmentReasons.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Quantity (use negative for reduction)</Label>
              <Input
                type="number"
                value={adjustStockForm.quantity}
                onChange={(e) => setAdjustStockForm(f => ({ ...f, quantity: e.target.value }))}
                placeholder="e.g., -1 to reduce, 5 to add"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjustStockModal(false)}>Cancel</Button>
            <Button onClick={handleAdjustStock}>Adjust Stock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Rack Modal */}
      <Dialog open={showEditRackModal} onOpenChange={setShowEditRackModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Rack Location</DialogTitle>
            <DialogDescription>Update rack location for {selectedMedicine?.name}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Rack Location</Label>
              <Input
                value={editRackForm}
                onChange={(e) => setEditRackForm(e.target.value)}
                placeholder="e.g., A1-01"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditRackModal(false)}>Cancel</Button>
            <Button onClick={handleEditRack}>Update Rack</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discontinue Confirmation */}
      <Dialog open={showDiscontinueDialog} onOpenChange={setShowDiscontinueDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Discontinued</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark "{selectedMedicine?.name}" as discontinued?
              This will hide it from the active inventory list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDiscontinueDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDiscontinue}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filter Sheet */}
      <Sheet open={showFilterSheet} onOpenChange={setShowFilterSheet}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Filter Inventory</SheetTitle>
            <SheetDescription>Apply filters to narrow down results</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="lowStock"
                checked={filters.lowStock}
                onCheckedChange={(c) => setFilters(f => ({ ...f, lowStock: !!c }))}
              />
              <Label htmlFor="lowStock">Low Stock Items Only</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="nearExpiry"
                checked={filters.nearExpiry}
                onCheckedChange={(c) => setFilters(f => ({ ...f, nearExpiry: !!c }))}
              />
              <Label htmlFor="nearExpiry">Near Expiry (30 days)</Label>
            </div>
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select
                value={filters.category || ALL_FILTER_VALUE}
                onValueChange={(v) => setFilters(f => ({ ...f, category: v === ALL_FILTER_VALUE ? '' : v }))}
              >
                <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>All Categories</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Manufacturer</Label>
              <Select
                value={filters.manufacturer || ALL_FILTER_VALUE}
                onValueChange={(v) => setFilters(f => ({ ...f, manufacturer: v === ALL_FILTER_VALUE ? '' : v }))}
              >
                <SelectTrigger><SelectValue placeholder="All Manufacturers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>All Manufacturers</SelectItem>
                  {manufacturers.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => {
                setFilters({ lowStock: false, nearExpiry: false, category: '', manufacturer: '' });
              }}>
                Clear All
              </Button>
              <Button className="flex-1" onClick={() => setShowFilterSheet(false)}>
                Apply Filters
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
