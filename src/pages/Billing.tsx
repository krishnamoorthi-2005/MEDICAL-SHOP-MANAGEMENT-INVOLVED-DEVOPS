import { useState, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone, X, User, Star, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  createSale,
  searchMedicines as apiSearchMedicines,
  getFrequentItems,
  searchActiveCustomers,
  getCustomers,
  getUsers,
  updateCustomer,
  createCustomer,
  getCustomerHistory,
  type Customer,
  type CustomerSale,
} from '@/lib/api';

interface Medicine {
  _id: string;
  name: string;
  stock: number;
  mrp: number;
  inStock?: boolean;
  genericId?: { name: string };
  manufacturerId?: { name: string };
}

interface CartItem {
  medicine: Medicine;
  quantity: number;
}

export default function Billing() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');

  // Custom Customer Selection States
  const [customerMode, setCustomerMode] = useState<'walk-in' | 'regular'>('walk-in');
  const [customerName, setCustomerName] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [nextPurchaseDate, setNextPurchaseDate] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchResults, setSearchResults] = useState<Medicine[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [frequentItems, setFrequentItems] = useState<Medicine[]>([]);
  const [isLoadingFrequent, setIsLoadingFrequent] = useState(true);

  const [regularCustomers, setRegularCustomers] = useState<(Customer & { isAppUser?: boolean })[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [customerHistory, setCustomerHistory] = useState<CustomerSale[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  const loadRegularCustomers = async () => {
    setIsLoadingCustomers(true);
    try {
      const [custResult, usersResult] = await Promise.all([
        getCustomers({ active: true, limit: 100 }),
        getUsers(),
      ]);

      const custList: Customer[] = Array.isArray(custResult)
        ? custResult
        : (custResult.data || custResult.customers || []);

      const allUsers = usersResult || [];
      const customerUsers = allUsers.filter(
        (u: any) => u.role?.toLowerCase() === 'user' || u.role?.toLowerCase() === 'patient'
      );

      // Start with real Customer records
      const merged: (Customer & { isAppUser?: boolean })[] = custList.map(c => {
        const customerRecord = c as Customer & { isAppUser?: boolean };
        const isAppUser = customerUsers.some(
          (u: any) => u.email && customerRecord.email && u.email.toLowerCase() === customerRecord.email.toLowerCase()
        );
        return { ...customerRecord, isAppUser };
      });

      // Add app-only users who have no Customer record yet
      customerUsers.forEach((u: any) => {
        const exists = merged.some(
          c => c.email && u.email && c.email.toLowerCase() === u.email.toLowerCase()
        );
        if (!exists) {
          merged.push({
            _id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone || '',
            isActive: u.status === 'active',
            totalSpent: 0,
            totalVisits: 0,
            isAppUser: true,
            createdAt: u.createdAt,
            updatedAt: u.createdAt,
          } as any);
        }
      });

      setRegularCustomers(merged.filter(c => c._id && c.name));
    } catch (error) {
      console.error('Customer load failed:', error);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  // Load all active regular customers when tab becomes 'regular'
  useEffect(() => {
    if (customerMode === 'regular' && regularCustomers.length === 0) {
      loadRegularCustomers();
    }
  }, [customerMode, regularCustomers.length]);

  // Load frequently purchased items on mount
  useEffect(() => {
    const loadFrequentItems = async () => {
      try {
        setIsLoadingFrequent(true);
        const items = await getFrequentItems(8);
        setFrequentItems(items);
      } catch (error) {
        console.error('Failed to load frequent items:', error);
      } finally {
        setIsLoadingFrequent(false);
      }
    };
    loadFrequentItems();
  }, []);

  // Search medicines from API with debouncing
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await apiSearchMedicines(searchQuery);
        setSearchResults(results);
        setShowSearchResults(true);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search customers from API with debouncing - Name-based search
  useEffect(() => {
    if (customerSearchQuery.length < 1) {
      setCustomerSearchResults([]);
      setShowCustomerResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingCustomer(true);
      try {
        // Use the dedicated search endpoint that filters for active customers only
        const result = await searchActiveCustomers(customerSearchQuery, 10);
        const list = result.customers || [];

        const searchLower = customerSearchQuery.toLowerCase().trim();

        // Filter: only require basic required fields
        const validCustomers = list.filter((customer: any) => {
          if (!customer._id || !customer.name) return false;
          return true;
        });

        // Remove duplicates based on _id (primary key)
        const uniqueCustomers = validCustomers.filter((customer: Customer, index: number, self: Customer[]) =>
          index === self.findIndex((c: Customer) => c._id === customer._id)
        );

        // Sort by relevance: exact match > starts with > contains
        const sortedCustomers = uniqueCustomers.sort((a, b) => {
          const aName = a.name?.toLowerCase() || '';
          const bName = b.name?.toLowerCase() || '';

          // Exact match
          if (aName === searchLower && bName !== searchLower) return -1;
          if (bName === searchLower && aName !== searchLower) return 1;

          // Starts with
          const aStarts = aName.startsWith(searchLower);
          const bStarts = bName.startsWith(searchLower);
          if (aStarts && !bStarts) return -1;
          if (bStarts && !aStarts) return 1;

          // Sort by total spent (higher spending customers first)
          return (b.totalSpent || 0) - (a.totalSpent || 0);
        });

        // Already limited to top 10 by backend, but sort for UX
        setCustomerSearchResults(sortedCustomers.slice(0, 10));
        setShowCustomerResults(true);
      } catch (error) {
        console.error('Customer search failed:', error);
        setCustomerSearchResults([]);
      } finally {
        setIsSearchingCustomer(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customerSearchQuery]);

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.medicine.mrp * item.quantity, 0);
  const taxRate = 0.05; // 5% GST
  const tax = Math.round(subtotal * taxRate);
  const total = subtotal + tax;

  const addToCart = (medicine: Medicine) => {
    const availableStock = typeof medicine.stock === 'number' ? medicine.stock : 0;
    const isInStock = (medicine.inStock === undefined ? true : medicine.inStock) && availableStock > 0;

    if (!isInStock) {
      toast({ title: 'Out of Stock', description: 'This medicine is not available', variant: 'destructive' });
      return;
    }

    const existing = cart.find(item => item.medicine._id === medicine._id);
    if (existing) {
      if (existing.quantity < availableStock) {
        setCart(prev => prev.map(item =>
          item.medicine._id === medicine._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      } else {
        toast({ title: 'Stock Limit', description: 'Cannot add more than available stock', variant: 'destructive' });
      }
    } else {
      setCart(prev => [...prev, { medicine, quantity: 1 }]);
    }
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const updateQuantity = (medicineId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.medicine._id === medicineId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return item;
        if (newQty > item.medicine.stock) {
          toast({ title: 'Stock Limit', description: 'Cannot exceed available stock', variant: 'destructive' });
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (medicineId: string) => {
    setCart(prev => prev.filter(item => item.medicine._id !== medicineId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setSelectedCustomer(null);
    setCustomerSearchQuery('');
    setNextPurchaseDate('');
    setCustomerHistory([]);
    setPaymentMethod('cash');
  };

  const handleSelectCustomer = async (c: Customer & { isAppUser?: boolean }) => {
    setSelectedCustomer(c);
    setShowCustomerModal(false);
    setCustomerSearchQuery('');

    // Initialize next purchase date from existing customer data when available
    if (c.nextPurchaseDate) {
      const raw = c.nextPurchaseDate;
      const formatted = raw.includes('T') ? new Date(raw).toISOString().split('T')[0] : raw;
      setNextPurchaseDate(formatted);
    } else {
      setNextPurchaseDate('');
    }

    setIsLoadingHistory(true);
    setCustomerHistory([]);
    try {
      if (c._id) {
        const history = await getCustomerHistory(c._id);
        setCustomerHistory(history.sales || []);
      }
    } catch (error) {
      console.error('Failed to load customer history:', error);
      setCustomerHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const processPayment = async () => {
    if (cart.length === 0) {
      toast({ title: 'Empty Cart', description: 'Add items to cart before checkout', variant: 'destructive' });
      return;
    }

    // Validate cart items
    for (let i = 0; i < cart.length; i++) {
      const item = cart[i];
      if (!item.medicine?._id) {
        toast({ title: 'Invalid Cart', description: `Item ${i}: Missing medicine ID`, variant: 'destructive' });
        return;
      }
      if (!item.medicine?.name) {
        toast({ title: 'Invalid Cart', description: `Item ${i}: Missing medicine name`, variant: 'destructive' });
        return;
      }
      if (!item.quantity || item.quantity <= 0) {
        toast({ title: 'Invalid Cart', description: `Item ${i}: Invalid quantity`, variant: 'destructive' });
        return;
      }
    }

    if (customerMode === 'regular' && !selectedCustomer) {
      toast({ title: 'No Customer Selected', description: 'Please search and select a regular customer', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);

    try {
      let finalCustomerId: string | undefined = undefined;
      let finalCustomerName: string | undefined = customerMode === 'walk-in' ? (customerName || undefined) : selectedCustomer?.name;

      let currentSpent = selectedCustomer?.totalSpent || 0;
      let currentVisits = selectedCustomer?.totalVisits || 0;

      // 1. If regular customer, ensure we have a valid Customer _id (resolve AppUsers)
      if (customerMode === 'regular' && selectedCustomer) {
        if ((selectedCustomer as any).isAppUser) {
          const searchTerm = selectedCustomer.email || selectedCustomer.phone;
          const existingSearch = searchTerm ? await getCustomers({ search: searchTerm }) : { data: [], customers: [] };
          const list = Array.isArray(existingSearch) ? existingSearch : (existingSearch.data || []);
          const match = list.find((c: any) => (
            (selectedCustomer.email && c.email && c.email.toLowerCase() === selectedCustomer.email.toLowerCase()) ||
            (selectedCustomer.phone && c.phone === selectedCustomer.phone)
          ));

          if (match) {
            finalCustomerId = match._id;
            currentSpent = match.totalSpent || 0;
            currentVisits = match.totalVisits || 0;
          } else {
            const customerPhone = selectedCustomer.phone && selectedCustomer.phone !== 'N/A'
              ? selectedCustomer.phone
              : `999${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`;

            try {
              const newCustRes = await createCustomer({
                name: selectedCustomer.name,
                phone: customerPhone,
                email: selectedCustomer.email,
              });
              const newCust = newCustRes.data || newCustRes.customer || newCustRes;
              if (newCust && newCust._id) {
                finalCustomerId = newCust._id;
                currentSpent = newCust.totalSpent || 0;
                currentVisits = newCust.totalVisits || 0;
              }
            } catch (createErr: any) {
              // If the phone already exists, reuse the existing customer instead of failing checkout.
              const fallbackSearch = await getCustomers({ search: customerPhone });
              const fallbackList = Array.isArray(fallbackSearch) ? fallbackSearch : (fallbackSearch.data || fallbackSearch.customers || []);
              const existing = fallbackList.find((c: any) => c.phone === customerPhone);
              if (existing) {
                finalCustomerId = existing._id;
                currentSpent = existing.totalSpent || 0;
                currentVisits = existing.totalVisits || 0;
              } else {
                throw createErr;
              }
            }
          }
        } else {
          finalCustomerId = selectedCustomer._id;
        }
      }

      // 2. Prepare sale data for backend
      const saleData = {
        items: cart.map(item => ({
          medicineId: item.medicine._id,
          medicineName: item.medicine.name,
          quantity: item.quantity
        })),
        customerName: finalCustomerName,
        customerId: finalCustomerId,
        paymentMethod,
        taxAmount: typeof tax === 'number' && !isNaN(tax) ? Math.max(0, tax) : 0,
        discountAmount: 0
      };

      console.log('💳 Sending sale data:', {
        itemsCount: saleData.items.length,
        paymentMethod: saleData.paymentMethod,
        taxAmount: saleData.taxAmount,
        subtotal,
        total
      });

      // 3. Call backend API
      const result = await createSale(saleData);

      console.log('✅ Sale created successfully:', result);

      // 4. Update customer metrics
      if (finalCustomerId) {
        try {
          await updateCustomer(finalCustomerId, {
            totalSpent: currentSpent + total,
            totalVisits: currentVisits + 1,
            ...(nextPurchaseDate ? { nextPurchaseDate } : {})
          });
        } catch (e) {
          console.error('Failed to update customer stats in the background:', e);
        }
      }

      toast({
        title: '✅ Payment Successful',
        description: `Invoice ${result.data.invoiceNumber} - ₹${total.toLocaleString()}`
      });

      // Clear cart and close modal
      setShowPaymentModal(false);
      clearCart();

      // Trigger dashboard refresh (if needed)
      window.dispatchEvent(new CustomEvent('sale-completed'));

    } catch (error: any) {
      console.error('❌ Payment error:', error);
      console.error('Error message:', error.message);
      toast({
        title: '❌ Payment Failed',
        description: error.message || 'Failed to process payment',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-auto md:h-[calc(100vh-160px)]">
      {/* Left: Product Search & Cart */}
      <div className="flex-1 flex flex-col min-h-[500px]">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            placeholder="Search medicines by name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(e.target.value.length > 0);
            }}
            onFocus={() => setShowSearchResults(searchQuery.length > 0)}
            className="pl-9 h-12 text-lg border-border/60 transition-all duration-140 focus:border-primary/50"
          />

          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-y-auto border border-border/60 shadow-lg">
              <CardContent className="p-2">
                {searchResults.map(medicine => (
                  <button
                    key={medicine._id}
                    onClick={() => addToCart(medicine)}
                    className="w-full flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-all duration-130 text-left"
                  >
                    <div>
                      <div className="font-semibold">{medicine.name}</div>
                      <div className="text-sm text-muted-foreground/70">
                        {medicine.genericId?.name || 'Generic'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">₹{medicine.mrp}</div>
                      <div className="text-xs text-muted-foreground/70">Stock: {medicine.stock}</div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Medicines / Quick Pick */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            <h3 className="text-sm font-bold text-muted-foreground/70">Frequently Purchased</h3>
          </div>

          {isLoadingFrequent ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-muted/40 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : frequentItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {frequentItems.map((medicine) => (
                <button
                  key={medicine._id}
                  onClick={() => addToCart(medicine)}
                  disabled={!medicine.inStock}
                  className={cn(
                    "p-3 rounded-lg text-left transition-all duration-130 border",
                    medicine.inStock
                      ? "bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary/30 cursor-pointer"
                      : "bg-muted/30 border-muted/40 opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="font-medium text-sm truncate">{medicine.name}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground font-medium">₹{medicine.mrp}</span>
                    {medicine.inStock ? (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
                        Stock: {medicine.stock}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs px-1.5 py-0">
                        Out
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground/70 border rounded-lg border-dashed border-muted/60">
              No frequently purchased items yet
            </div>
          )}
        </div>

        {/* Cart Items */}
        <Card className="flex-1 overflow-hidden flex flex-col border border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold">Current Bill</CardTitle>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCart} className="text-muted-foreground/70 hover:text-foreground transition-colors duration-140">
                  <X className="mr-1 h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto pb-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground/70">
                <Search className="h-12 w-12 mb-3 opacity-30" />
                <p className="font-medium">Search and add medicines to the bill</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.medicine._id} className="flex items-center gap-4 p-3.5 rounded-lg bg-muted/40 border border-border/40 transition-all duration-130 hover:bg-muted/60">
                    <div className="flex-1">
                      <div className="font-semibold">{item.medicine.name}</div>
                      <div className="text-sm text-muted-foreground/70 font-medium">
                        ₹{item.medicine.mrp} × {item.quantity}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 transition-all duration-130"
                        onClick={() => updateQuantity(item.medicine._id, -1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-bold">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 transition-all duration-130"
                        onClick={() => updateQuantity(item.medicine._id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="w-20 text-right font-bold">
                      ₹{(item.medicine.mrp * item.quantity).toLocaleString()}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-130"
                      onClick={() => removeFromCart(item.medicine._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right: Bill Summary */}
      <div className="w-full md:w-80 flex flex-col h-fit md:h-auto rounded-2xl bg-white border border-border/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border/40 bg-slate-50/50">
          <h2 className="font-semibold text-foreground">Bill Summary</h2>
        </div>
        <div className="p-5 flex-1 flex flex-col">
          <div className="space-y-3 flex-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground font-medium">Items ({cart.length})</span>
              <span className="font-semibold">₹{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground font-medium">GST (5%)</span>
              <span className="font-semibold">₹{tax.toLocaleString()}</span>
            </div>
            <div className="h-px bg-border/50" />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-indigo-600">₹{total.toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-3.5 mt-auto pt-6 overflow-visible z-10">
            <Tabs value={customerMode} onValueChange={(v: any) => setCustomerMode(v)} className="w-full overflow-visible">
              <TabsList className="grid w-full grid-cols-2 h-9 place-items-stretch">
                <TabsTrigger value="walk-in" className="text-xs">Walk-in</TabsTrigger>
                <TabsTrigger value="regular" className="text-xs">Regular</TabsTrigger>
              </TabsList>

              <TabsContent value="walk-in" className="mt-4">
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground/70 font-semibold">Walk-in Name (Optional)</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                    <Input
                      placeholder="Enter name..."
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="pl-9 h-10 border-border/60 transition-all duration-140 focus:border-primary/50 text-sm"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="regular" className="mt-4 space-y-3">
                {selectedCustomer ? (
                  /* ── SELECTED CUSTOMER VIEW ── */
                  <div className="space-y-3">
                    {/* Selected Customer Card - Large & Prominent */}
                    <div className="relative rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200/60 shadow-sm overflow-hidden p-5">
                      {/* Background Accent */}
                      <div className="absolute top-0 right-0 h-32 w-32 rounded-full blur-3xl opacity-20" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }} />
                      
                      <div className="relative z-10 space-y-3">
                        {/* Header with Clear Button */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-foreground">{selectedCustomer.name}</h3>
                            <p className="text-sm text-muted-foreground/70 mt-0.5">{selectedCustomer.phone}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="shrink-0 hover:bg-red-50 hover:text-red-600"
                            onClick={() => {
                              setSelectedCustomer(null);
                              setCustomerSearchQuery('');
                              setNextPurchaseDate('');
                              setCustomerHistory([]);
                              setShowCustomerResults(false);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Customer Stats */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white/70 rounded-lg p-3 border border-border/30">
                            <div className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide mb-1">Total Spent</div>
                            <div className="text-2xl font-bold" style={{ color: '#6366f1' }}>₹{selectedCustomer.totalSpent?.toLocaleString() || '0'}</div>
                          </div>
                          <div className="bg-white/70 rounded-lg p-3 border border-border/30">
                            <div className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide mb-1">Visits</div>
                            <div className="text-2xl font-bold text-emerald-600">{selectedCustomer.totalVisits || 0}×</div>
                          </div>
                        </div>

                        {/* Next Purchase Date Section */}
                        <div className="space-y-2 pt-2 border-t border-indigo-200/40">
                          <label className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide">Next Purchase (Optional)</label>
                          
                          {/* Quick Date Buttons */}
                          <div className="grid grid-cols-3 gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-9 text-xs font-semibold"
                              onClick={() => {
                                const tomorrow = new Date();
                                tomorrow.setDate(tomorrow.getDate() + 1);
                                setNextPurchaseDate(tomorrow.toISOString().split('T')[0]);
                              }}
                            >
                              Tomorrow
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-9 text-xs font-semibold"
                              onClick={() => {
                                const nextWeek = new Date();
                                nextWeek.setDate(nextWeek.getDate() + 7);
                                setNextPurchaseDate(nextWeek.toISOString().split('T')[0]);
                              }}
                            >
                              Next Week
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-9 text-xs font-semibold"
                              onClick={() => {
                                const nextMonth = new Date();
                                nextMonth.setDate(nextMonth.getDate() + 30);
                                setNextPurchaseDate(nextMonth.toISOString().split('T')[0]);
                              }}
                            >
                              Next Month
                            </Button>
                          </div>

                          {/* Custom Date Input */}
                          <Input
                            type="date"
                            value={nextPurchaseDate}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={(e) => setNextPurchaseDate(e.target.value)}
                            className="h-9 text-sm border-indigo-200/60"
                          />
                          {/* Recent Orders */}
                          <div className="mt-3 space-y-2">
                            <div className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide">Recent Orders</div>
                            {isLoadingHistory ? (
                              <p className="text-xs text-muted-foreground/70">Loading order history...</p>
                            ) : customerHistory.length === 0 ? (
                              <p className="text-xs text-muted-foreground/70">No previous orders found for this customer.</p>
                            ) : (
                              <div className="space-y-1">
                                {customerHistory.slice(0, 5).map((sale) => (
                                  <div key={sale._id} className="flex justify-between text-xs text-muted-foreground/80">
                                    <span>
                                      {sale.invoiceNumber || sale._id.slice(0, 8)}
                                      {" · "}
                                      {new Date(sale.createdAt).toLocaleDateString('en-IN', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                      })}
                                    </span>
                                    <span className="font-semibold">₹{sale.total.toLocaleString()}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── OPEN CUSTOMER SELECTION MODAL ── */
                  <div className="space-y-3">
                    <Button
                      type="button"
                      onClick={() => {
                        setCustomerSearchQuery('');
                        setShowCustomerModal(true);
                      }}
                      className="w-full h-14 text-base font-semibold transition-all duration-150"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 12px rgba(99,102,241,0.25)' }}
                    >
                      <User className="h-5 w-5 mr-2" />
                      Select Regular Customer
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setNewCustomerName('');
                        setNewCustomerPhone('');
                        setNewCustomerEmail('');
                        setShowAddCustomerModal(true);
                      }}
                      className="w-full h-11 text-sm font-semibold border-dashed"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Regular Customer
                    </Button>
                    <p className="text-center text-sm text-muted-foreground/70 pt-2">
                      Click above to choose from {regularCustomers.length} regular customer{regularCustomers.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <Button
              className="w-full h-12 text-base font-bold transition-all duration-140 mt-4 text-white"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}
              disabled={cart.length === 0 || (customerMode === 'regular' && !selectedCustomer)}
              onClick={() => setShowPaymentModal(true)}
            >
              Proceed to Payment
            </Button>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* CUSTOMER SELECTION MODAL - Glass Effect Border Only */}
      {/* ═════════════════════════════════════════════════════════════ */}
      <Dialog open={showCustomerModal} onOpenChange={setShowCustomerModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col border-0 shadow-2xl bg-white" style={{
          borderRadius: '20px',
          boxShadow: '0 8px 32px rgba(99, 102, 241, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.7)'
        }}>
          <DialogHeader className="pb-4 border-b border-gray-100">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                <User className="h-6 w-6 text-white" />
              </div>
              Select Customer
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground/70 mt-2">
              Choose from <span className="font-semibold text-foreground">{regularCustomers.length}</span> regular customer{regularCustomers.length !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>

          {/* Search Box Inside Modal */}
          <div className="relative px-4 pt-4">
            <Search className="absolute left-5 top-8 h-5 w-5 text-indigo-500/60" />
            <Input
              autoFocus
              placeholder="Search by name or phone..."
              value={customerSearchQuery}
              onChange={(e) => {
                setCustomerSearchQuery(e.target.value);
                // Filter customers by search query
                if (e.target.value.length > 0) {
                  const filtered = regularCustomers.filter(c =>
                    c.name?.toLowerCase().includes(e.target.value.toLowerCase()) ||
                    c.phone?.includes(e.target.value)
                  );
                  setCustomerSearchResults(filtered);
                } else {
                  setCustomerSearchResults([]);
                }
              }}
              className="pl-12 h-12 text-base rounded-xl border-gray-200"
            />
          </div>

          {/* Customer List */}
          <div className="flex-1 overflow-y-auto rounded-xl mt-4 p-2 bg-gray-50 border border-gray-150">
            {isLoadingCustomers ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center space-y-3">
                  <div className="inline-block h-6 w-6 border-3 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                  <p className="text-base text-muted-foreground/70 font-medium">Loading customers...</p>
                </div>
              </div>
            ) : (customerSearchQuery ? customerSearchResults : regularCustomers).length > 0 ? (
              <div className="space-y-2">
                {(customerSearchQuery ? customerSearchResults : regularCustomers).map((c, idx) => (
                  <button
                    key={c._id || idx}
                    onClick={() => {
                      void handleSelectCustomer(c as any);
                    }}
                    className="w-full rounded-lg px-5 py-4 transition-all duration-200 text-left group border-0 bg-white hover:bg-indigo-50 border border-gray-100"
                  >
                    <div className="space-y-3">
                      {/* Customer Name & Phone */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-lg font-bold text-foreground group-hover:text-indigo-600 transition-colors truncate">
                            {c.name}
                          </div>
                          <div className="text-base text-muted-foreground/70 mt-1 truncate">
                            {c.phone || 'No phone'}
                          </div>
                        </div>
                        <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <ChevronRight className="h-5 w-5 text-white" />
                        </div>
                      </div>

                      {/* Stats Row */}
                      <div className="grid grid-cols-3 gap-3 pt-2">
                        <div className="px-3 py-2.5 bg-blue-50 text-blue-700 rounded-lg font-semibold text-center">
                          <div className="text-xs text-blue-600/70 mb-1">Spent</div>
                          <div className="text-lg font-bold">₹{c.totalSpent?.toLocaleString() || '0'}</div>
                        </div>
                        <div className="px-3 py-2.5 bg-emerald-50 text-emerald-700 rounded-lg font-semibold text-center">
                          <div className="text-xs text-emerald-600/70 mb-1">Visits</div>
                          <div className="text-lg font-bold">{c.totalVisits || 0}×</div>
                        </div>
                        {(c as any).isAppUser && (
                          <div className="px-3 py-2.5 bg-purple-50 text-purple-700 rounded-lg font-semibold text-center">
                            <div className="text-xs text-purple-600/70 mb-1">App</div>
                            <div className="text-lg font-bold">User</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <Search className="h-14 w-14 text-indigo-300/50 mb-4" />
                <p className="text-lg text-muted-foreground/70 text-center font-medium">
                  {customerSearchQuery ? 'No customers found' : 'No customers available'}
                </p>
                {!customerSearchQuery && regularCustomers.length === 0 && (
                  <p className="text-base text-muted-foreground/60 mt-2">Try searching by name or phone</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCustomerModal(false);
                setCustomerSearchQuery('');
              }}
              className="h-11 px-6 text-base font-semibold rounded-xl"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Regular Customer Modal */}
      <Dialog open={showAddCustomerModal} onOpenChange={setShowAddCustomerModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bold">Add Regular Customer</DialogTitle>
            <DialogDescription className="text-muted-foreground/70">
              Create a regular customer record. It will appear in the Customers section and in this billing screen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground/80">Name</Label>
              <Input
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="Customer name"
                className="mt-1 h-10 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground/80">Phone</Label>
              <Input
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                placeholder="10-digit phone number"
                className="mt-1 h-10 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground/80">Email (optional)</Label>
              <Input
                type="email"
                value={newCustomerEmail}
                onChange={(e) => setNewCustomerEmail(e.target.value)}
                placeholder="email@example.com"
                className="mt-1 h-10 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddCustomerModal(false)}
              disabled={isSavingCustomer}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (!newCustomerName.trim() || !newCustomerPhone.trim()) {
                  toast({ title: 'Missing Details', description: 'Name and phone are required for a regular customer.', variant: 'destructive' });
                  return;
                }
                setIsSavingCustomer(true);
                try {
                  const result = await createCustomer({
                    name: newCustomerName.trim(),
                    phone: newCustomerPhone.trim(),
                    email: newCustomerEmail.trim() || undefined,
                  });
                  const created = result.customer || result.data || result;
                  toast({ title: 'Customer Added', description: 'Regular customer has been created successfully.' });
                  setShowAddCustomerModal(false);
                  setNewCustomerName('');
                  setNewCustomerPhone('');
                  setNewCustomerEmail('');
                  await loadRegularCustomers();
                  if (created && created._id) {
                    await handleSelectCustomer(created as any);
                  }
                } catch (error: any) {
                  toast({ title: 'Failed to Add Customer', description: error?.message || 'Could not create customer.', variant: 'destructive' });
                } finally {
                  setIsSavingCustomer(false);
                }
              }}
              disabled={isSavingCustomer}
              className="text-white font-semibold"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
            >
              {isSavingCustomer ? 'Saving...' : 'Save Customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bold">Select Payment Method</DialogTitle>
            <DialogDescription className="text-muted-foreground/70">
              Total amount: <span className="font-bold text-foreground">₹{total.toLocaleString()}</span>
            </DialogDescription>
          </DialogHeader>
          <RadioGroup
            value={paymentMethod}
            onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}
            className="grid grid-cols-3 gap-4 py-4"
          >
            <Label
              htmlFor="cash"
              className={cn(
                "flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer transition-all duration-140",
                paymentMethod === 'cash' ? "border-primary bg-primary/5 shadow-sm" : "border-border/60 hover:border-muted-foreground/40 hover:bg-muted/30"
              )}
            >
              <RadioGroupItem value="cash" id="cash" className="sr-only" />
              <Banknote className={cn("h-8 w-8 mb-2 transition-colors duration-140", paymentMethod === 'cash' && "text-primary")} />
              <span className="font-semibold">Cash</span>
            </Label>
            <Label
              htmlFor="upi"
              className={cn(
                "flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer transition-all duration-140",
                paymentMethod === 'upi' ? "border-primary bg-primary/5 shadow-sm" : "border-border/60 hover:border-muted-foreground/40 hover:bg-muted/30"
              )}
            >
              <RadioGroupItem value="upi" id="upi" className="sr-only" />
              <Smartphone className={cn("h-8 w-8 mb-2 transition-colors duration-140", paymentMethod === 'upi' && "text-primary")} />
              <span className="font-semibold">UPI</span>
            </Label>
            <Label
              htmlFor="card"
              className={cn(
                "flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer transition-all duration-140",
                paymentMethod === 'card' ? "border-primary bg-primary/5 shadow-sm" : "border-border/60 hover:border-muted-foreground/40 hover:bg-muted/30"
              )}
            >
              <RadioGroupItem value="card" id="card" className="sr-only" />
              <CreditCard className={cn("h-8 w-8 mb-2 transition-colors duration-140", paymentMethod === 'card' && "text-primary")} />
              <span className="font-semibold">Card</span>
            </Label>
          </RadioGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)} disabled={isProcessing}>Cancel</Button>
            <Button onClick={processPayment} disabled={isProcessing} className="text-white font-semibold" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              {isProcessing ? 'Processing...' : 'Complete Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
