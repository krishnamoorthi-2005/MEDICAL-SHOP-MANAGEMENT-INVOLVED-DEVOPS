import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Home, ShoppingCart, User, Bell, Clock, 
    Package, Heart, Calendar, TrendingUp,
    AlertCircle, CheckCircle2, FileText,
    Settings, LogOut, Menu, X, ChevronRight, Star
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
    getMyCustomerInfo,
    getMyPrescriptions,
    type PrescriptionRequest,
} from '@/lib/api';

interface Medicine {
    id: string;
    name: string;
    genericName: string;
    price: number;
    stock: number;
    category: string;
}

interface Order {
    id: string;
    date: string;
    total: number;
    items: number;
    status: 'completed' | 'pending' | 'processing';
    invoiceNumber?: string;
}

export default function NewUserDashboard() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<'home' | 'orders' | 'profile'>('home');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    const [customerData, setCustomerData] = useState<any>(null);
    const [nextPurchaseDate, setNextPurchaseDate] = useState<string | null>(null);
    const [hasCustomerRecord, setHasCustomerRecord] = useState<boolean>(false);
    const [prescriptions, setPrescriptions] = useState<PrescriptionRequest[]>([]);
    const [prescriptionsLoading, setPrescriptionsLoading] = useState(false);

    const userName = localStorage.getItem('userFullName') || 'User';
    const userEmail = localStorage.getItem('userEmail') || '';
    const userPhone = localStorage.getItem('userPhone') || '';

    // Edit Profile State
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [editFormData, setEditFormData] = useState({
        fullName: userName,
        phone: userPhone || '',
        address: localStorage.getItem('userAddress') || '',
    });

    const handleUpdateProfile = () => {
        if (!editFormData.fullName.trim()) {
            toast({ title: 'Error', description: 'Full name is required!' });
            return;
        }
        
        localStorage.setItem('userFullName', editFormData.fullName);
        if (editFormData.phone) localStorage.setItem('userPhone', editFormData.phone);
        if (editFormData.address) localStorage.setItem('userAddress', editFormData.address);
        
        setShowEditProfile(false);
        toast({ title: 'Success! ✓', description: 'Profile updated successfully!' });
        window.location.reload();
    };

    useEffect(() => {
        loadDashboardData();
        
        // Listen for sale completion to refresh dashboard
        const handleSaleCompleted = () => {
            loadDashboardData();
        };
        window.addEventListener('sale-completed', handleSaleCompleted);
        
        return () => {
            window.removeEventListener('sale-completed', handleSaleCompleted);
        };
    }, []);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const customerEmail = userEmail || undefined;
            const customerPhone = userPhone || undefined;

            // Load customer data from API
            const response = await getMyCustomerInfo(customerEmail, customerPhone);
            
            if (response.success && response.customer) {
                setCustomerData(response.customer);
                setHasCustomerRecord(true);
                
                // Set next purchase date
                if (response.customer.nextPurchaseDate) {
                    const date = new Date(response.customer.nextPurchaseDate);
                    setNextPurchaseDate(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
                } else {
                    setNextPurchaseDate(null);
                }
                
                // Map sales to orders format
                if (response.sales && response.sales.length > 0) {
                    const mappedOrders = response.sales.map((sale: any) => ({
                        id: sale.invoiceNumber || sale._id,
                        date: new Date(sale.createdAt).toLocaleDateString('en-US'),
                        total: sale.total || 0,
                        items: sale.items?.length || 0,
                        status: 'completed' as const,
                        invoiceNumber: sale.invoiceNumber
                    }));
                    setOrders(mappedOrders);
                } else {
                    setOrders([]);
                }
                
                // Load prescription requests using phone number
                if (response.customer.phone) {
                    loadPrescriptions(response.customer.phone);
                } else if (userEmail) {
                    // Fallback to email if no phone
                    loadPrescriptions(userEmail);
                }
            } else {
                // No customer record yet (new user)
                setHasCustomerRecord(false);
                setCustomerData(null);
                setNextPurchaseDate(null);
                setOrders([]);
                
                // Always try to load prescriptions using phone or email
                if (userPhone) {
                    loadPrescriptions(userPhone);
                } else if (userEmail) {
                    loadPrescriptions(userEmail);
                } else {
                    setPrescriptions([]);
                }
            }
        } catch (error: any) {
            console.error('Failed to load dashboard data:', error);
            setHasCustomerRecord(false);
            setCustomerData(null);
            setNextPurchaseDate(null);
            setOrders([]);
            
            // Still try to load prescriptions even if customer info failed
            if (userPhone) {
                loadPrescriptions(userPhone);
            } else if (userEmail) {
                loadPrescriptions(userEmail);
            } else {
                setPrescriptions([]);
            }
        } finally {
            setLoading(false);
        }
    };

    const loadPrescriptions = async (phoneOrEmail: string) => {
        setPrescriptionsLoading(true);
        try {
            const candidates = [
                phoneOrEmail,
                userEmail,
                userPhone,
                localStorage.getItem('lastPrescriptionEmail') || '',
                localStorage.getItem('lastPrescriptionPhone') || '',
            ].filter(Boolean);

            const seen = new Set<string>();
            const merged: PrescriptionRequest[] = [];

            for (const candidate of candidates) {
                const result = await getMyPrescriptions(candidate);
                for (const item of result || []) {
                    if (!seen.has(item._id)) {
                        seen.add(item._id);
                        merged.push(item);
                    }
                }
            }

            setPrescriptions(merged);
        } catch (error: any) {
            console.error('Failed to load prescriptions:', error);
            setPrescriptions([]);
        } finally {
            setPrescriptionsLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return '🌅 Good Morning';
        if (hour < 18) return '☀️ Good Afternoon';
        return '🌙 Good Evening';
    };

    // Home Tab Content
    const renderHomeTab = () => (
        <div className="space-y-5">
            {/* Welcome Card */}
            <div className="relative overflow-hidden rounded-3xl p-6 text-white"
                style={{ background: 'linear-gradient(135deg,#0f0c29 0%,#1a1040 55%,#0d1a30 100%)', boxShadow: '0 8px 32px rgba(99,102,241,0.2)' }}>
                <div className="absolute top-0 right-0 h-40 w-40 rounded-full blur-3xl opacity-20 pointer-events-none"
                    style={{ background: 'radial-gradient(circle,#6366f1,transparent)' }} />
                <div className="relative z-10">
                    <p className="text-xs font-bold mb-1" style={{ color: '#a5b4fc' }}>{getGreeting()},</p>
                    <h2 className="text-2xl font-extrabold mb-1 tracking-tight">{userName}</h2>
                    <p className="text-sm mb-5" style={{ color: '#94a3b8' }}>Here's your health summary today</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(165,180,252,0.15)' }}>
                            <p className="text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>Next Purchase</p>
                            <p className="text-lg font-extrabold text-white">
                                {hasCustomerRecord ? (nextPurchaseDate || 'Not set') : 'Visit store'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                        { label: 'Submit Prescription', icon: FileText, action: () => navigate('/submit-prescription'), color: 'indigo' },
                        { label: 'Order History', icon: ShoppingCart, action: () => setActiveTab('orders'), color: 'green' },
                        { label: 'My Profile', icon: User, action: () => setActiveTab('profile'), color: 'orange' },
                    ].map((action, i) => (
                        <button
                            key={i}
                            onClick={action.action}
                            className={`p-4 bg-white rounded-xl border-2 border-gray-100 hover:border-${action.color}-200 hover:shadow-lg transition-all group`}
                        >
                            <div className={`h-12 w-12 rounded-xl bg-${action.color}-50 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                                <action.icon className={`h-6 w-6 text-${action.color}-600`} />
                            </div>
                            <p className="text-sm font-semibold text-gray-900">{action.label}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* New User Notice */}
            {!hasCustomerRecord && prescriptions.length === 0 && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                            <Package className="h-6 w-6 text-amber-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Welcome to Special Access Pharma!</h3>
                            <p className="text-gray-700 mb-3">
                                Submit your prescription to get started. Our staff will review it and you can visit the store to collect your medicines.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => navigate('/submit-prescription')}
                                    className="px-6 py-2 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors"
                                >
                                    Submit Prescription
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Prescription Status Notice for users with pending prescriptions */}
            {!hasCustomerRecord && prescriptions.length > 0 && prescriptions.some(p => p.status === 'pending' || p.status === 'under_review') && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                            <Clock className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Prescription Under Review</h3>
                            <p className="text-gray-700 mb-3">
                                Our staff is reviewing your prescription. Once approved, you'll receive a notification and can visit our store to collect your medicines.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Approved Prescription Notice */}
            {!hasCustomerRecord && prescriptions.length > 0 && prescriptions.some(p => p.status === 'approved') && !prescriptions.some(p => p.status === 'pending' || p.status === 'under_review') && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">All Medicines Are Available!</h3>
                            <p className="text-gray-700 mb-3">
                                Great news! Your prescription has been approved and all medicines are in stock. Visit our store to collect your medicines and make payment.
                            </p>
                            <p className="text-sm text-gray-600 bg-white/50 px-3 py-2 rounded-lg inline-block">
                                💡 Online delivery coming soon - For now, please visit our pharmacy
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Orders */}
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-blue-600" />
                        Recent Orders
                    </h3>
                    <button
                        onClick={() => setActiveTab('orders')}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                        View All <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
                {orders.length === 0 ? (
                    <div className="text-center py-8">
                        <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">No orders yet</p>
                        <p className="text-gray-400 text-xs mt-2">Your in-store purchase history will appear here</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {orders.slice(0, 3).map(order => (
                            <div 
                                key={order.id} 
                                onClick={() => order.invoiceNumber && navigate(`/transaction-lookup?invoice=${order.invoiceNumber}`)}
                                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors group"
                            >
                                <div>
                                    <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">Order #{order.id}</p>
                                    <p className="text-sm text-gray-500">{order.date} • {order.items} items</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-gray-900">₹{order.total}</p>
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                        order.status === 'completed' ? 'bg-green-100 text-green-700' :
                                        order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                                        'bg-yellow-100 text-yellow-700'
                                    }`}>
                                        {order.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Prescription Requests */}
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-indigo-600" />
                        Prescription Requests
                    </h3>
                    {prescriptions.length > 0 && (
                        <span className="text-sm font-medium text-gray-500">
                            {prescriptions.length} total
                        </span>
                    )}
                </div>
                {prescriptionsLoading ? (
                    <div className="text-center py-8">
                        <p className="text-gray-500 text-sm">Loading prescriptions...</p>
                    </div>
                ) : prescriptions.length === 0 ? (
                    <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm mb-2">No prescription requests yet</p>
                        <button
                            onClick={() => navigate('/submit-prescription')}
                            className="mt-4 px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            Submit Prescription
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {prescriptions.slice(0, 3).map(prescription => (
                            <div key={prescription._id} className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-100">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-900">{prescription.patientName}</p>
                                        <p className="text-sm text-gray-600">
                                            {prescription.medicines.length} medicine{prescription.medicines.length > 1 ? 's' : ''}
                                            {prescription.doctorName && ` • Dr. ${prescription.doctorName}`}
                                        </p>
                                        {prescription.status === 'approved' && (
                                            <div className="mt-2 flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-md w-fit">
                                                <CheckCircle2 className="h-3 w-3" />
                                                All medicines are available - Visit store to collect
                                            </div>
                                        )}
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                                        prescription.status === 'approved' ? 'bg-green-100 text-green-700' :
                                        prescription.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                        prescription.status === 'under_review' ? 'bg-blue-100 text-blue-700' :
                                        prescription.status === 'collected' ? 'bg-gray-100 text-gray-700' :
                                        'bg-yellow-100 text-yellow-700'
                                    }`}>
                                        {prescription.status === 'under_review' ? 'REVIEWING' : prescription.status.toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-gray-500 mt-2 pt-2 border-t border-indigo-100">
                                    <span>{new Date(prescription.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    {prescription.adminNotes && (
                                        <span className="text-indigo-600 flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3" />
                                            Has notes
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                        {prescriptions.length > 3 && (
                            <button
                                onClick={() => navigate('/submit-prescription')}
                                className="w-full py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center justify-center gap-1"
                            >
                                View all {prescriptions.length} prescriptions <ChevronRight className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                )}
            </div>

        </div>
    );

    // Orders Tab Content
    const renderOrdersTab = () => (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Order History</h2>
                <p className="text-gray-600">Track all your medicine purchases</p>
            </div>

            {orders.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
                    <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 mb-2">No Orders Yet</h3>
                    <p className="text-gray-600 mb-4">Your in-store purchase history will appear here</p>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 max-w-md mx-auto">
                        <p className="text-sm text-amber-800">
                            💡 Online ordering coming soon! Submit your prescription and visit our store to collect.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/submit-prescription')}
                        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Submit Prescription
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map(order => (
                        <div 
                            key={order.id} 
                            onClick={() => order.invoiceNumber && navigate(`/transaction-lookup?invoice=${order.invoiceNumber}`)}
                            className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Order #{order.id}</h3>
                                    <p className="text-sm text-gray-500">{order.date}</p>
                                </div>
                                <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                                    order.status === 'completed' ? 'bg-green-100 text-green-700' :
                                    order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                                    'bg-yellow-100 text-yellow-700'
                                }`}>
                                    {order.status.toUpperCase()}
                                </span>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                <p className="text-gray-600">{order.items} items</p>
                                <div className="flex items-center gap-3">
                                    <p className="text-xl font-bold text-gray-900">₹{order.total}</p>
                                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {/* Online Ordering Notice */}
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-6 text-center">
                        <Package className="h-10 w-10 text-amber-600 mx-auto mb-3" />
                        <h4 className="text-lg font-bold text-gray-900 mb-2">Online Ordering Coming Soon</h4>
                        <p className="text-gray-700 text-sm max-w-md mx-auto">
                            We're adding online ordering and home delivery soon. Currently, all orders are in-store purchases.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );

    // Profile Tab Content
    const renderProfileTab = () => (
        <div className="space-y-6">
            {/* Profile Header Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-8 text-white shadow-2xl">
                {/* Decorative Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
                </div>
                
                <div className="relative">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        {/* Avatar */}
                        <div className="relative">
                            <div className="h-28 w-28 rounded-3xl bg-white/20 backdrop-blur-sm border-4 border-white/50 flex items-center justify-center shadow-2xl">
                                <span className="text-5xl font-black text-white">
                                    {userName.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div className="absolute -bottom-2 -right-2 h-10 w-10 bg-green-400 rounded-full border-4 border-white flex items-center justify-center shadow-lg">
                                <CheckCircle2 className="h-5 w-5 text-white" />
                            </div>
                        </div>
                        
                        {/* User Info */}
                        <div className="flex-1 text-center md:text-left">
                            <h2 className="text-3xl font-black mb-2 drop-shadow-lg">{userName}</h2>
                            <p className="text-blue-100 text-lg font-medium mb-3">{userEmail}</p>
                            <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
                                <span className="px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm font-bold border border-white/30">
                                    🏥 Patient Member
                                </span>
                                {hasCustomerRecord && (
                                    <span className="px-4 py-1.5 bg-emerald-400/30 backdrop-blur-sm rounded-full text-sm font-bold border border-emerald-300/50">
                                        ⭐ Regular Customer
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            {hasCustomerRecord && customerData && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border-2 border-purple-200 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <div className="h-12 w-12 rounded-xl bg-purple-500 flex items-center justify-center shadow-lg">
                                <Package className="h-6 w-6 text-white" />
                            </div>
                            <Star className="h-5 w-5 text-purple-600 fill-purple-600" />
                        </div>
                        <p className="text-sm font-semibold text-purple-700 mb-1">Total Orders</p>
                        <p className="text-3xl font-black text-purple-900">{customerData.totalVisits || 0}</p>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 border-2 border-emerald-200 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <div className="h-12 w-12 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg">
                                <Calendar className="h-6 w-6 text-white" />
                            </div>
                            <Clock className="h-5 w-5 text-emerald-600" />
                        </div>
                        <p className="text-sm font-semibold text-emerald-700 mb-1">Last Visit</p>
                        <p className="text-lg font-black text-emerald-900">
                            {customerData.lastVisit 
                                ? new Date(customerData.lastVisit).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) 
                                : 'N/A'}
                        </p>
                    </div>
                </div>
            )}

            {/* Profile Information Card */}
            <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b-2 border-gray-100">
                    <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                        <User className="h-6 w-6 text-blue-600" />
                        Personal Information
                    </h3>
                </div>
                
                <div className="p-6 space-y-4">
                    <div className="group hover:bg-blue-50 p-5 rounded-xl transition-all border-2 border-transparent hover:border-blue-200">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <User className="h-5 w-5 text-blue-600" />
                            </div>
                            <label className="text-sm font-bold text-gray-500 uppercase tracking-wide">Full Name</label>
                        </div>
                        <p className="text-lg font-bold text-gray-900 ml-13">{userName}</p>
                    </div>

                    <div className="group hover:bg-indigo-50 p-5 rounded-xl transition-all border-2 border-transparent hover:border-indigo-200">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                                <Settings className="h-5 w-5 text-indigo-600" />
                            </div>
                            <label className="text-sm font-bold text-gray-500 uppercase tracking-wide">Email Address</label>
                        </div>
                        <p className="text-lg font-bold text-gray-900 ml-13">{userEmail}</p>
                    </div>

                    <div className={`group p-5 rounded-xl transition-all border-2 ${
                        localStorage.getItem('userPhone') 
                            ? 'hover:bg-purple-50 border-transparent hover:border-purple-200' 
                            : 'bg-amber-50 border-amber-200'
                    }`}>
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                                localStorage.getItem('userPhone') 
                                    ? 'bg-purple-100' 
                                    : 'bg-amber-100'
                            }`}>
                                <Bell className={`h-5 w-5 ${
                                    localStorage.getItem('userPhone') 
                                        ? 'text-purple-600' 
                                        : 'text-amber-600'
                                }`} />
                            </div>
                            <label className="text-sm font-bold text-gray-500 uppercase tracking-wide">Phone Number</label>
                        </div>
                        <p className={`text-lg font-bold ml-13 ${
                            localStorage.getItem('userPhone') 
                                ? 'text-gray-900' 
                                : 'text-amber-700'
                        }`}>
                            {localStorage.getItem('userPhone') || '📱 Add phone number to get SMS notifications'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                {/* Edit Profile Card */}
                <button
                    onClick={() => setShowEditProfile(true)}
                    className="group bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-2xl p-6 text-white text-left shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-14 w-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30 group-hover:scale-110 transition-transform">
                            <Settings className="h-7 w-7" />
                        </div>
                        <ChevronRight className="h-6 w-6 opacity-60 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <h3 className="text-xl font-black mb-2">Edit Profile</h3>
                    <p className="text-blue-100 text-sm font-medium">Update your personal information</p>
                </button>
            </div>

            {/* Logout Card */}
            <div className="bg-white rounded-2xl border-2 border-red-100 shadow-lg overflow-hidden">
                <div className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-gray-900 mb-1">Sign Out</h3>
                            <p className="text-sm text-gray-600">You'll need to sign in again to access your account</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-black rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                        <LogOut className="h-5 w-5" />
                        Logout from Account
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
            {/* Fixed Header */}
            <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="md:hidden p-2 rounded-lg hover:bg-gray-100"
                            >
                                <Menu className="h-6 w-6" />
                            </button>
                            <div className="flex items-center gap-2">
                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                                    <span className="text-white font-bold text-lg">M</span>
                                </div>
                                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                    Special Access Pharma
                                </span>
                            </div>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-1">
                            {[
                                { id: 'home', label: 'Home', icon: Home },
                                { id: 'orders', label: 'Orders', icon: ShoppingCart },
                                { id: 'profile', label: 'Profile', icon: User },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as 'home' | 'orders' | 'profile')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                                        activeTab === tab.id
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <tab.icon className="h-5 w-5" />
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* User Menu */}
                        <button
                            onClick={() => setActiveTab('profile')}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100"
                        >
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-sm font-bold text-white">
                                {userName.charAt(0).toUpperCase()}
                            </div>
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Sidebar */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
                    <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl">
                        <div className="p-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <span className="text-lg font-bold">Menu</span>
                                <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg hover:bg-gray-100">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                        <nav className="p-4 space-y-2">
                            {[
                                { id: 'home', label: 'Home', icon: Home },
                                { id: 'orders', label: 'Orders', icon: ShoppingCart },
                                { id: 'profile', label: 'Profile', icon: User },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveTab(tab.id as 'home' | 'orders' | 'profile');
                                        setSidebarOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                                        activeTab === tab.id
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <tab.icon className="h-5 w-5" />
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {activeTab === 'home' && renderHomeTab()}
                {activeTab === 'orders' && renderOrdersTab()}
                {activeTab === 'profile' && renderProfileTab()}
            </main>

            {/* Edit Profile Modal */}
            {showEditProfile && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
                        <h2 className="text-2xl font-black text-gray-900 mb-6">Edit Profile</h2>
                        
                        <div className="space-y-5">
                            {/* Full Name */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Full Name *</label>
                                <input
                                    type="text"
                                    value={editFormData.fullName}
                                    onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                    placeholder="Your full name"
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                                <input
                                    type="tel"
                                    value={editFormData.phone}
                                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                    placeholder="Your phone number"
                                />
                            </div>

                            {/* Address */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Address</label>
                                <textarea
                                    value={editFormData.address}
                                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                    placeholder="Your address"
                                    rows={3}
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setShowEditProfile(false)}
                                className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateProfile}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
                            >
                                Save Changes ✓
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-30">
                <div className="grid grid-cols-4 h-16">
                    {[
                        { id: 'home', label: 'Home', icon: Home },
                        { id: 'orders', label: 'Orders', icon: ShoppingCart },
                        { id: 'profile', label: 'Profile', icon: User },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as 'home' | 'orders' | 'profile')}
                            className={`flex flex-col items-center justify-center gap-1 ${
                                activeTab === tab.id ? 'text-blue-600' : 'text-gray-600'
                            }`}
                        >
                            <tab.icon className="h-5 w-5" />
                            <span className="text-xs font-medium">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </nav>
        </div>
    );
}
