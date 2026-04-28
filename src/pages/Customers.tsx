import { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, Mail, Phone, Calendar, Search, Lock, User, ReceiptIndianRupee, X } from 'lucide-react';
import {
    getCustomers,
    getCustomerHistory,
    getSaleByIdOrInvoice,
    createCustomer,
    deleteCustomer,
    getUsers,
    createUser,
    deleteUser,
    updateUserStatus,
    type Customer,
    type AppUser,
    type CustomerSale,
} from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import InvoiceModal, { type InvoiceData } from '@/components/InvoiceModal';

export default function Customers() {
    const { toast } = useToast();

    // -- Customers State --
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loadingCustomers, setLoadingCustomers] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddCustomerDialog, setShowAddCustomerDialog] = useState(false);
    const [newCustomer, setNewCustomer] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        dateOfBirth: '',
        notes: ''
    });

    // -- System Users State --
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [showAddUserDialog, setShowAddUserDialog] = useState(false);
    const [newUser, setNewUser] = useState({
        name: '',
        email: '',
        password: '',
        role: 'Staff'
    });

    // Customer detail & invoice state
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerHistory, setCustomerHistory] = useState<CustomerSale[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);

    const loadCustomers = async (search?: string) => {
        setLoadingCustomers(true);
        try {
            const result = await getCustomers({ search });
            const data = Array.isArray(result) ? result : (result.customers || result.data || []);
            setCustomers(data);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to load customers',
                variant: 'destructive',
            });
        } finally {
            setLoadingCustomers(false);
        }
    };

    const loadUsers = async () => {
        setLoadingUsers(true);
        try {
            const u = await getUsers();
            setUsers(u || []);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to load users',
                variant: 'destructive',
            });
        } finally {
            setLoadingUsers(false);
        }
    };

    useEffect(() => {
        loadCustomers();
        loadUsers();
    }, [toast]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            loadCustomers(searchQuery);
        }, 500);
        return () => clearTimeout(timeout);
    }, [searchQuery]);

    // Derived states
    const displayUsers = users.filter((u) => u.role.toLowerCase() !== 'user' && u.role.toLowerCase() !== 'patient');
    const customerUsers = users.filter((u) => u.role.toLowerCase() === 'user' || u.role.toLowerCase() === 'patient');

    // Attach AppUser flags to existing customers
    let displayCustomers: (Customer & { isAppUser?: boolean })[] = customers.map(c => {
        const isAppUser = customerUsers.some(u => u.email && c.email && u.email.toLowerCase() === c.email.toLowerCase());
        return { ...c, isAppUser: c.isAppUser || isAppUser };
    });

    // Also include app users who don't yet have a Customer record (e.g. signed up but no purchase yet)
    customerUsers.forEach(u => {
        const alreadyInList = displayCustomers.some(
            c => c.email && u.email && c.email.toLowerCase() === u.email.toLowerCase()
        );
        if (!alreadyInList) {
            displayCustomers.push({
                _id: u.id,
                name: u.name,
                email: u.email,
                phone: '',
                isActive: u.status === 'active',
                totalSpent: 0,
                totalVisits: 0,
                isAppUser: true,
            } as any);
        }
    });

    if (searchQuery) {
        displayCustomers = displayCustomers.filter((c) =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (c.phone && c.phone.includes(searchQuery))
        );
    }

    // -- Customers Handlers --
    const handleViewCustomer = async (customer: Customer & { isAppUser?: boolean }) => {
        setSelectedCustomer(customer);
        setCustomerHistory([]);
        setLoadingHistory(true);
        try {
            if (customer._id) {
                const history = await getCustomerHistory(customer._id);
                setCustomerHistory(history.sales || []);
            }
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to load purchase history',
                variant: 'destructive',
            });
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleOpenInvoice = async (sale: CustomerSale) => {
        try {
            const data = await getSaleByIdOrInvoice(sale._id || sale.invoiceNumber);
            const items = (data.items || []).map((it: any) => ({
                medicineName: it.medicineName,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                lineTotal: it.lineTotal,
            }));

            const invoice: InvoiceData = {
                _id: data._id,
                invoiceNumber: data.invoiceNumber,
                customerName: data.customerName,
                paymentMethod: data.paymentMethod,
                paymentStatus: data.paymentStatus || 'paid',
                items,
                subtotal: data.subtotal ?? data.total,
                taxAmount: data.taxAmount ?? 0,
                discountAmount: data.discountAmount ?? 0,
                total: data.total,
                createdAt: data.createdAt,
            };

            setSelectedInvoice(invoice);
            setInvoiceModalOpen(true);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to load invoice',
                variant: 'destructive',
            });
        }
    };
    const handleAddCustomer = async () => {
        if (!newCustomer.name || !newCustomer.phone) {
            toast({
                title: 'Error',
                description: 'Please fill all required fields (Name and Phone)',
                variant: 'destructive'
            });
            return;
        }

        try {
            await createCustomer(newCustomer);
            await loadCustomers(searchQuery);
            setShowAddCustomerDialog(false);
            setNewCustomer({ name: '', email: '', phone: '', address: '', dateOfBirth: '', notes: '' });

            toast({
                title: 'Customer Added',
                description: `${newCustomer.name} has been added successfully`,
            });
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to add customer',
                variant: 'destructive',
            });
        }
    };

    const handleDeleteCustomer = async (customerId: string) => {
        try {
            await deleteCustomer(customerId);
            setCustomers(customers.filter((c) => c._id !== customerId));
            window.dispatchEvent(new CustomEvent('customer-updated'));
            toast({
                title: 'Customer Deleted',
                description: 'Customer has been removed successfully',
            });
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to delete customer',
                variant: 'destructive',
            });
        }
    };

    // -- System Users Handlers --
    const handleAddUser = async () => {
        if (!newUser.name || !newUser.email || !newUser.password) {
            toast({
                title: 'Error',
                description: 'Please fill all required fields',
                variant: 'destructive'
            });
            return;
        }

        try {
            await createUser({
                name: newUser.name,
                email: newUser.email,
                password: newUser.password,
                role: newUser.role,
            });
            const updated = await getUsers();
            setUsers(updated || []);
            setShowAddUserDialog(false);
            setNewUser({ name: '', email: '', password: '', role: 'Staff' });

            toast({
                title: 'User Added',
                description: `${newUser.name} has been added successfully`,
            });
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to add user',
                variant: 'destructive',
            });
        }
    };

    const handleDeleteUser = async (userId: string) => {
        const target = users.find((u) => u.id === userId);
        if (target?.role === 'Admin') {
            toast({
                title: 'Cannot Delete',
                description: 'Cannot delete the main admin user',
                variant: 'destructive'
            });
            return;
        }

        try {
            await deleteUser(userId);
            setUsers(users.filter((u) => u.id !== userId));
            toast({
                title: 'User Deleted',
                description: 'User has been removed successfully',
            });
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to delete user',
                variant: 'destructive',
            });
        }
    };

    const handleToggleUserStatus = async (userId: string) => {
        const user = users.find((u) => u.id === userId);
        if (!user) return;
        if (user.role === 'Admin') {
            toast({
                title: 'Cannot Update',
                description: 'Cannot change status of main admin user',
                variant: 'destructive',
            });
            return;
        }

        const nextStatus: 'active' | 'inactive' = user.status === 'active' ? 'inactive' : 'active';
        try {
            await updateUserStatus(userId, nextStatus);
            setUsers(users.map((u) => (u.id === userId ? { ...u, status: nextStatus } : u)));
            toast({
                title: 'Status Updated',
                description: 'User status has been changed',
            });
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to update user status',
                variant: 'destructive',
            });
        }
    };

    return (
        <div className="space-y-6 max-w-6xl">
            {/* Page Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Users className="h-6 w-6 text-indigo-500" /> Users & Customers
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Manage your store customers and system staff
                    </p>
                </div>
            </div>

            <Tabs defaultValue="customers" className="w-full space-y-4">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="customers">Store Customers</TabsTrigger>
                    <TabsTrigger value="users">System Users</TabsTrigger>
                </TabsList>

                <TabsContent value="customers" className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search customers..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Button onClick={() => setShowAddCustomerDialog(true)} className="flex items-center gap-2">
                            <UserPlus className="h-4 w-4" /> Add Customer
                        </Button>
                    </div>


                    <div className="grid lg:grid-cols-1 gap-4 items-start">
                        <Card className="border border-border/60 shadow-sm overflow-hidden rounded-xl">
                            <CardContent className="p-0">
                                <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-border/60">
                                        <TableHead className="pl-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 py-3">Name</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 py-3">Contact</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 py-3">Status</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 py-3">Visits</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 py-3">Total Spent</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 py-3">Next Visit</TableHead>
                                        <TableHead className="text-right pr-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 py-3">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingCustomers || loadingUsers ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="h-8 w-8 rounded-full border-2 border-indigo-300 border-t-indigo-600 animate-spin" />
                                                    <span className="text-sm">Loading customers...</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : displayCustomers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Users className="h-10 w-10 text-muted-foreground/30" />
                                                    <span className="text-sm font-medium">No customers found</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        displayCustomers.map((customer) => (
                                            <TableRow key={customer._id} className="border-b border-border/30 hover:bg-slate-50/60 transition-colors">
                                                <TableCell className="font-medium pl-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold flex-shrink-0">
                                                            {customer.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-sm flex items-center gap-1.5">
                                                                {customer.name}
                                                                {customer.isAppUser && <Badge variant="secondary" className="text-[10px] uppercase px-1.5 py-0 bg-indigo-50 text-indigo-600 border-indigo-200">App User</Badge>}
                                                            </div>
                                                            {customer.dateOfBirth && (
                                                                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                                    <Calendar className="h-3 w-3" />
                                                                    {format(new Date(customer.dateOfBirth), 'PPP')}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="cursor-pointer" onClick={() => handleViewCustomer(customer)}>
                                                    <div className="space-y-1 text-sm">
                                                        <div className="flex items-center gap-1.5 text-slate-700">
                                                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                                            {customer.phone}
                                                        </div>
                                                        {customer.email && (
                                                            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                                                <Mail className="h-3 w-3" />
                                                                {customer.email}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={customer.isActive ? 'badge-success' : 'badge-neutral'}>
                                                        {customer.isActive ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-semibold text-sm">{customer.totalVisits || 0}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Last: {customer.lastVisit ? format(new Date(customer.lastVisit), 'PP') : 'N/A'}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-semibold text-emerald-600">₹{customer.totalSpent?.toFixed(2) || '0.00'}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-xs text-muted-foreground">
                                                        {customer.nextPurchaseDate
                                                            ? format(new Date(customer.nextPurchaseDate), 'PP')
                                                            : 'Not set'}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-6 space-x-1">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleViewCustomer(customer)}
                                                        className="mr-1"
                                                    >
                                                        View
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteCustomer(customer._id)}
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                        </Card>

                        {/* Customer Details Modal with Glass Backdrop */}
                        <Dialog open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
                            <DialogContent className="max-w-2xl border-0 shadow-2xl bg-white/95 backdrop-blur-md">
                                <DialogHeader className="border-b border-border/20 pb-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                                <Users className="h-6 w-6 text-indigo-500" />
                                                {selectedCustomer?.name}
                                            </DialogTitle>
                                            <DialogDescription className="mt-2 text-sm">
                                                Purchase history & next visit details
                                            </DialogDescription>
                                        </div>
                                    </div>
                                </DialogHeader>

                                <div className="space-y-4 py-4">
                                    {selectedCustomer?.nextPurchaseDate && (
                                        <div className="p-4 bg-gradient-to-r from-emerald-50 to-emerald-100/50 rounded-lg border border-emerald-200/60">
                                            <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Next Visit</div>
                                            <div className="text-lg font-bold text-emerald-900 mt-1">
                                                {format(new Date(selectedCustomer.nextPurchaseDate), 'PPP')}
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-indigo-500" />
                                            Purchase History
                                        </h3>
                                        <div className="border border-border/40 rounded-lg overflow-hidden">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-slate-50/60 hover:bg-slate-50/60  border-b border-border/30">
                                                        <TableHead className="pl-4 text-xs font-semibold">Date</TableHead>
                                                        <TableHead className="text-xs font-semibold">Invoice</TableHead>
                                                        <TableHead className="text-xs font-semibold">Payment</TableHead>
                                                        <TableHead className="text-right pr-4 text-xs font-semibold">Total</TableHead>
                                                        <TableHead className="text-right pr-4 text-xs font-semibold">View</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {loadingHistory ? (
                                                        <TableRow>
                                                            <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                                                                <div className="flex justify-center">
                                                                    <div className="h-5 w-5 rounded-full border-2 border-indigo-300 border-t-indigo-600 animate-spin" />
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : customerHistory.length === 0 ? (
                                                        <TableRow>
                                                            <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                                                                No purchases found for this customer yet.
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : (
                                                        customerHistory.map((sale) => (
                                                            <TableRow key={sale._id} className="border-b border-border/20 hover:bg-slate-50/40 transition-colors">
                                                                <TableCell className="pl-4 text-xs">
                                                                    {format(new Date(sale.createdAt), 'PP p')}
                                                                </TableCell>
                                                                <TableCell className="text-xs font-mono text-muted-foreground">
                                                                    {sale.invoiceNumber || sale._id.slice(0, 8)}
                                                                </TableCell>
                                                                <TableCell className="text-xs capitalize">
                                                                    {sale.paymentMethod}
                                                                </TableCell>
                                                                <TableCell className="text-right pr-4 text-xs font-semibold text-emerald-700">
                                                                    ₹{sale.total.toFixed(2)}
                                                                </TableCell>
                                                                <TableCell className="text-right pr-4">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 hover:bg-indigo-50"
                                                                        onClick={() => handleOpenInvoice(sale)}
                                                                    >
                                                                        <ReceiptIndianRupee className="h-4 w-4 text-indigo-600" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </TabsContent>

                <TabsContent value="users" className="space-y-4">
                    <div className="flex items-center justify-end gap-4">
                        <Button onClick={() => setShowAddUserDialog(true)} className="flex items-center gap-2">
                            <UserPlus className="h-4 w-4" /> Add System User
                        </Button>
                    </div>

                    <Card className="border border-border/60 shadow-sm overflow-hidden rounded-xl">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-border/60">
                                        <TableHead className="pl-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 py-3">Name</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 py-3">Email</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 py-3">Role</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 py-3">Status</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 py-3">Created</TableHead>
                                        <TableHead className="text-right pr-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 py-3">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingUsers ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                                Loading users...
                                            </TableCell>
                                        </TableRow>
                                    ) : displayUsers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                                No users found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        displayUsers.map((user) => (
                                            <TableRow key={user.id}>
                                                <TableCell className="font-medium pl-6">{user.name}</TableCell>
                                                <TableCell>{user.email}</TableCell>
                                                <TableCell>
                                                    <Badge variant={user.role === 'Admin' ? 'default' : 'secondary'}>
                                                        {user.role}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={user.status === 'active' ? 'default' : 'secondary'}
                                                        className={user.status === 'active' ? 'bg-green-100 text-green-700' : ''}
                                                    >
                                                        {user.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {new Date(user.createdAt).toLocaleDateString('en-IN')}
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleToggleUserStatus(user.id)}
                                                        >
                                                            {user.status === 'active' ? 'Deactivate' : 'Activate'}
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => handleDeleteUser(user.id)}
                                                            disabled={user.role === 'Admin'}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Add Customer Dialog */}
            <Dialog open={showAddCustomerDialog} onOpenChange={setShowAddCustomerDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Add New Customer</DialogTitle>
                        <DialogDescription>
                            Create a new customer profile
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="cust-name">Full Name *</Label>
                            <Input
                                id="cust-name"
                                placeholder="e.g. John Doe"
                                value={newCustomer.name}
                                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="cust-phone">Phone Number *</Label>
                                <Input
                                    id="cust-phone"
                                    placeholder="e.g. 9876543210"
                                    value={newCustomer.phone}
                                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="cust-dob">Date of Birth</Label>
                                <Input
                                    id="cust-dob"
                                    type="date"
                                    value={newCustomer.dateOfBirth}
                                    onChange={(e) => setNewCustomer({ ...newCustomer, dateOfBirth: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="cust-email">Email Address</Label>
                            <Input
                                id="cust-email"
                                type="email"
                                placeholder="user@example.com"
                                value={newCustomer.email}
                                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="cust-address">Address</Label>
                            <Input
                                id="cust-address"
                                placeholder="123 Main St..."
                                value={newCustomer.address}
                                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="cust-notes">Notes</Label>
                            <Input
                                id="cust-notes"
                                placeholder="Any additional information..."
                                value={newCustomer.notes}
                                onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddCustomerDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddCustomer}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Add Customer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add User Dialog */}
            <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Add New System User</DialogTitle>
                        <DialogDescription>
                            Create a new user account for the system staff
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="user-name">Full Name *</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="user-name"
                                    placeholder="John Doe"
                                    value={newUser.name}
                                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="user-email">Email Address *</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="user-email"
                                    type="email"
                                    placeholder="user@example.com"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="user-password">Password *</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="user-password"
                                    type="password"
                                    placeholder="Enter password"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="user-role">Role</Label>
                            <Select
                                value={newUser.role}
                                onValueChange={(v) => setNewUser({ ...newUser, role: v })}
                            >
                                <SelectTrigger id="user-role">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Admin">Admin</SelectItem>
                                    <SelectItem value="Manager">Manager</SelectItem>
                                    <SelectItem value="Staff">Staff</SelectItem>
                                    <SelectItem value="Cashier">Cashier</SelectItem>
                                    <SelectItem value="patient">Patient</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddUserDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddUser}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Add User
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Invoice Modal */}
            <InvoiceModal
                open={invoiceModalOpen}
                onClose={() => {
                    setInvoiceModalOpen(false);
                    setSelectedInvoice(null);
                }}
                invoice={selectedInvoice}
            />
        </div>
    );
}
