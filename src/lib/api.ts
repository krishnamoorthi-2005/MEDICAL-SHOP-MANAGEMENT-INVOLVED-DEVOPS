const DEFAULT_API_BASE_URL = 'http://localhost:3004/api';
export const API_BASE_URL = import.meta.env.VITE_API_URL || DEFAULT_API_BASE_URL;

export const getApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

const getAuthHeaders = (extraHeaders: HeadersInit = {}): HeadersInit => {
  // Only attempt to read localStorage in browser environments
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
  if (!token) return extraHeaders;
  return {
    ...extraHeaders,
    Authorization: `Bearer ${token}`,
  };
};

const handleAuthError = async (response: Response, fallbackMessage: string) => {
  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('token');
      window.localStorage.removeItem('isAuthenticated');
      window.localStorage.removeItem('userEmail');
      // Force re-login for expired/invalid sessions
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  }

  let message = fallbackMessage;
  try {
    const data = await response.json();
    if (data && typeof data.message === 'string') {
      message = data.message;
    }
  } catch {
    // ignore JSON parse errors, use fallback
  }

  throw new Error(message);
};

export interface SaleItem {
  medicineId: string;
  medicineName: string;
  quantity: number;
}

export interface CreateSaleRequest {
  items: SaleItem[];
  customerName?: string;
  customerId?: string;
  paymentMethod: 'cash' | 'upi' | 'card';
  discountAmount?: number;
  taxAmount?: number;
}

export interface DailySummary {
  totalSales: number;
  totalRevenue: number;
  billCount: number;
  itemsSold: number;
  profit: number;
  date: string;
  updatedAt: string;
}

// Create sale
export const createSale = async (data: CreateSaleRequest) => {
  const response = await fetch(`${API_BASE_URL}/sales`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create sale');
  }

  return response.json();
};

// Get today's summary (instant, precomputed)
export const getTodaySummary = async (): Promise<DailySummary> => {
  const response = await fetch(`${API_BASE_URL}/sales/summary/today`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    await handleAuthError(response, 'Failed to fetch summary');
    throw new Error('Failed to fetch summary');
  }

  const result = await response.json();
  return result.data;
};

// Search medicines (authenticated)
export const searchMedicines = async (query: string) => {
  const response = await fetch(`${API_BASE_URL}/medicines/search?q=${encodeURIComponent(query)}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    await handleAuthError(response, 'Failed to search medicines');
    throw new Error('Failed to search medicines');
  }

  const result = await response.json();
  return result.data;
};

// Search medicines (public - no authentication required for front page)
export const searchMedicinesPublic = async (query: string) => {
  const response = await fetch(`${API_BASE_URL}/medicines/search?q=${encodeURIComponent(query)}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to search medicines');
  }

  const result = await response.json();
  return result.data || [];
};

// Get all medicines
export const getMedicines = async () => {
  const response = await fetch(`${API_BASE_URL}/medicines`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    await handleAuthError(response, 'Failed to fetch medicines');
    throw new Error('Failed to fetch medicines');
  }

  const result = await response.json();
  return result.data;
};

// Get dashboard analytics
export const getDashboardAnalytics = async () => {
  const response = await fetch(`${API_BASE_URL}/sales/analytics/dashboard`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    await handleAuthError(response, 'Failed to fetch dashboard analytics');
    throw new Error('Failed to fetch dashboard analytics');
  }

  const result = await response.json();
  return result.data;
};

export const sendTelegramInventoryAlerts = async (payload?: { limit?: number; sendWhenEmpty?: boolean }) => {
  const response = await fetch(`${API_BASE_URL}/sales/analytics/alerts/telegram`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload || {}),
  });

  if (!response.ok) {
    await handleAuthError(response, 'Failed to send Telegram inventory alert');
    throw new Error('Failed to send Telegram inventory alert');
  }

  return response.json();
};

// Reports analytics
export const getReportsAnalytics = async (params?: { range?: '7days' | '30days' | '90days'; startDate?: string; endDate?: string }) => {
  const queryParams = new URLSearchParams();
  if (params?.range) queryParams.append('range', params.range);
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);

  const url = `${API_BASE_URL}/reports/analytics${queryParams.toString() ? `?${queryParams}` : ''}`;
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    await handleAuthError(response, 'Failed to fetch reports analytics');
    throw new Error('Failed to fetch reports analytics');
  }

  const result = await response.json();
  return result.data;
};

// Detailed expiry loss items for a period
export interface ExpiryLossItem {
  medicineId: string;
  batchId: string;
  medicineName: string;
  batchNumber: string;
  expiryDate: string;
  quantityExpired: number;
  unitPrice: number;
  totalLoss: number;
  reason?: string;
  createdAt: string;
  authorizedBy?: string;
  poNumber?: string;
  supplierName?: string;
  supplierPhone?: string;
  purchaseDate?: string;
  purchaseQuantity?: number;
  purchaseUnitPrice?: number;
}

export const getExpiryLossDetails = async (params?: { range?: '7days' | '30days' | '90days'; startDate?: string; endDate?: string }) => {
  const queryParams = new URLSearchParams();
  if (params?.range) queryParams.append('range', params.range);
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);

  const url = `${API_BASE_URL}/reports/expiry-loss${queryParams.toString() ? `?${queryParams}` : ''}`;
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    await handleAuthError(response, 'Failed to fetch expiry loss details');
    throw new Error('Failed to fetch expiry loss details');
  }

  const result = await response.json();
  return result.data as { range: { start: string; end: string }; summary: { totalLoss: number; totalItems: number }; items: ExpiryLossItem[] };
};

// Reset all expiry loss entries in the ledger (admin utility)
export const resetExpiryLoss = async () => {
  const response = await fetch(`${API_BASE_URL}/reports/expiry-loss/reset`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
  });

  if (!response.ok) {
    await handleAuthError(response, 'Failed to reset expiry loss');
    throw new Error('Failed to reset expiry loss');
  }

  return response.json();
};

// Generate test data for reports (development only)
export const generateTestData = async () => {
  const response = await fetch(`${API_BASE_URL}/reports/generate-test-data`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
  });

  if (!response.ok) {
    await handleAuthError(response, 'Failed to generate test data');
    throw new Error('Failed to generate test data');
  }

  return response.json();
};

// Detailed dead stock report
export interface DeadStockItem {
  batchId: string;
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  expiryDate: string | null;
  quantity: number;
  purchasePrice: number;
  totalValue: number;
  lastSoldDate: string | null;
  daysUnsold: number | 'Never Sold';
  supplierName?: string;
  rackLocation?: string;
}

export const getDeadStockReport = async () => {
  const response = await fetch(`${API_BASE_URL}/reports/dead-stock`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    await handleAuthError(response, 'Failed to fetch dead stock report');
    throw new Error('Failed to fetch dead stock report');
  }

  const result = await response.json();
  console.log('Dead stock API response:', result);
  // Backend returns data at top level: { success: true, totalValue, totalItems, batches }
  return {
    totalValue: result.totalValue || 0,
    totalItems: result.totalItems || 0,
    batches: result.batches || []
  } as { totalValue: number; totalItems: number; batches: DeadStockItem[] };
};

// AI demand prediction (per-medicine)
export interface DemandPredictionItem {
  medicineId: string;
  month: number;
  predictedDemand: number;
  currentStock: number;
  previousSales?: number;
  recommendedPurchase: number;
  medicineName?: string;
  manufacturerId?: string | null;
  confidence?: number | null;
}

export interface DemandPredictionResponse {
  success: boolean;
  data: DemandPredictionItem[];
  metadata?: {
    month: number;
    monthName: string;
    previousYear: number;
  };
}

export const getDemandPrediction = async (month?: number): Promise<DemandPredictionResponse> => {
  const query = typeof month === 'number' ? `?month=${month}` : '';
  const response = await fetch(`${API_BASE_URL}/prediction${query}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    await handleAuthError(response, 'Failed to fetch demand prediction');
    throw new Error('Failed to fetch demand prediction');
  }

  const result = await response.json();
  return result as DemandPredictionResponse;
};

export const downloadDemandPredictionCsv = async (): Promise<Blob> => {
  const response = await fetch(`${API_BASE_URL}/prediction/export`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    await handleAuthError(response, 'Failed to download prediction CSV');
    throw new Error('Failed to download prediction CSV');
  }

  return await response.blob();
};

export const downloadPredictionDataset = async (): Promise<Blob> => {
  const response = await fetch(`${API_BASE_URL}/prediction/dataset`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    await handleAuthError(response, 'Failed to download training dataset');
    throw new Error('Failed to download training dataset');
  }

  return await response.blob();
};

export const uploadPredictionDataset = async (file: File): Promise<{ success: boolean; message: string; details?: string }> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/prediction/dataset`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!response.ok) {
    // For auth errors, reuse the global handler to log out, etc.
    if (response.status === 401) {
      await handleAuthError(response, 'Failed to upload training dataset');
    }

    // For training or validation failures, surface backend details
    let message = 'Failed to upload training dataset';
    let details = '';
    try {
      const data = await response.json();
      if (data && typeof data.message === 'string') {
        message = data.message;
        if (typeof data.details === 'string' && data.details.trim()) {
          details = data.details.trim();
        }
      }
    } catch {
      // ignore JSON parse issues, keep fallback message
    }

    const error: any = new Error(message);
    error.details = details;
    throw error;
  }

  const result = await response.json();
  return {
    success: !!result?.success,
    message: result?.message || 'Dataset uploaded successfully',
  };
};

// Create medicine
export const createMedicine = async (data: {
  name: string;
  genericName?: string;
  category: string;
  manufacturer: string;
  batchNumber?: string;
  expiryDate?: string;
  quantity?: number;
  purchasePrice?: number;
  mrp?: number;
  rack?: string;
}) => {
  const response = await fetch(`${API_BASE_URL}/medicines`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create medicine');
  }

  return response.json();
};

// Get sales list
export const getSales = async (params?: { page?: number; limit?: number; startDate?: string; endDate?: string }) => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);

  const response = await fetch(`${API_BASE_URL}/sales?${queryParams}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch sales');
  }

  return response.json();
};

// Adjust stock
export const adjustStock = async (data: {
  medicineId: string;
  batchId?: string;
  quantity: number;
  reason: string;
}) => {
  const response = await fetch(`${API_BASE_URL}/medicines/adjust-stock`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to adjust stock');
  }

  return response.json();
};

// Add batch (add stock)
export const addBatch = async (data: {
  medicineId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  purchasePrice?: number;
  mrp?: number;
}) => {
  const response = await fetch(`${API_BASE_URL}/medicines/add-batch`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to add batch');
  }

  return response.json();
};

// Discontinue medicine
export const discontinueMedicine = async (medicineId: string) => {
  const response = await fetch(`${API_BASE_URL}/medicines/${medicineId}/discontinue`, {
    method: 'PATCH',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to discontinue medicine');
  }

  return response.json();
};

// Update rack location
export const updateRackLocation = async (medicineId: string, rackLocation: string) => {
  const response = await fetch(`${API_BASE_URL}/medicines/${medicineId}/rack`, {
    method: 'PATCH',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ rackLocation })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update rack location');
  }

  return response.json();
};

// Update medicine prices (purchase and/or selling MRP)
export const updateMedicinePrices = async (
  medicineId: string,
  data: { purchasePrice?: number; mrp?: number },
) => {
  const response = await fetch(`${API_BASE_URL}/medicines/${medicineId}/prices`, {
    method: 'PATCH',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update prices');
  }

  return response.json();
};

// Get frequently purchased items
export const getFrequentItems = async (limit: number = 10) => {
  const response = await fetch(`${API_BASE_URL}/sales/analytics/frequent-items?limit=${limit}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch frequent items');
  }

  const result = await response.json();
  return result.data;
};

// ============ USERS ============

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export const getUsers = async (): Promise<AppUser[]> => {
  const response = await fetch(`${API_BASE_URL}/users`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    await handleAuthError(response, 'Failed to fetch users');
    throw new Error('Failed to fetch users');
  }

  const result = await response.json();
  return result.data;
};

export const createUser = async (data: { name: string; email: string; password: string; role: string }) => {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to create user');
  }

  return response.json();
};

export const updateUserStatus = async (userId: string, status: 'active' | 'inactive') => {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to update user status');
  }

  return response.json();
};

export const deleteUser = async (userId: string) => {
  const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to delete user');
  }

  return response.json();
};

// ============ BACKUPS ============

export interface BackupRecord {
  _id: string;
  createdAt: string;
  createdBy: string;
  note?: string;
  counts: Record<string, number>;
}

export const createBackup = async (payload?: { createdBy?: string; note?: string }) => {
  const response = await fetch(`${API_BASE_URL}/backups`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload || {}),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to create backup');
  }

  return response.json();
};

export const listBackups = async (limit: number = 20): Promise<BackupRecord[]> => {
  const response = await fetch(`${API_BASE_URL}/backups?limit=${limit}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    await handleAuthError(response, 'Failed to fetch backups');
    throw new Error('Failed to fetch backups');
  }

  const result = await response.json();
  return result.data;
};

export const getBackupDetails = async (backupId: string) => {
  const response = await fetch(`${API_BASE_URL}/backups/${backupId}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    await handleAuthError(response, 'Failed to fetch backup details');
    throw new Error('Failed to fetch backup details');
  }

  return response.json();
};

export const deleteBackup = async (backupId: string) => {
  const response = await fetch(`${API_BASE_URL}/backups/${backupId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to delete backup');
  }

  return response.json();
};

// ============ CUSTOMERS ============

export interface Customer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  dateOfBirth?: string;
  notes?: string;
  isActive: boolean;
  totalSpent: number;
  totalVisits: number;
  lastVisit?: string;
  nextPurchaseDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerSale {
  _id: string;
  invoiceNumber: string;
  total: number;
  paymentMethod: string;
  createdAt: string;
  items?: Array<{
    medicineName: string;
    quantity: number;
    price: number;
  }>;
}

// Get customers
export const getCustomers = async (params?: { search?: string; page?: number; limit?: number; active?: boolean }) => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.active !== undefined) queryParams.append('active', params.active.toString());

  const response = await fetch(`${API_BASE_URL}/customers?${queryParams}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    await handleAuthError(response, 'Failed to fetch customers');
    throw new Error('Failed to fetch customers');
  }

  const result = await response.json();
  return result;
};

// Search active customers only (for billing/checkout)
export const searchActiveCustomers = async (query: string, limit: number = 10) => {
  if (!query || query.trim().length < 1) {
    return { success: true, customers: [] };
  }

  const queryParams = new URLSearchParams();
  queryParams.append('query', query.trim());
  queryParams.append('limit', limit.toString());

  const response = await fetch(`${API_BASE_URL}/customers/search?${queryParams}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    await handleAuthError(response, 'Failed to search customers');
    throw new Error('Failed to search customers');
  }

  const result = await response.json();
  return result;
};

// Create customer
export const createCustomer = async (data: {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  dateOfBirth?: string;
  notes?: string;
}) => {
  const response = await fetch(`${API_BASE_URL}/customers`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create customer');
  }

  return response.json();
};

// Update customer
export const updateCustomer = async (id: string, data: {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  dateOfBirth?: string;
  notes?: string;
  isActive?: boolean;
  totalSpent?: number;
  totalVisits?: number;
  nextPurchaseDate?: string;
}) => {
  const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update customer');
  }

  return response.json();
};

// Delete customer (soft delete)
export const deleteCustomer = async (id: string) => {
  const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete customer');
  }

  return response.json();
};

// Delete all customers (admin only - use with caution!)
export const deleteAllCustomers = async () => {
  const response = await fetch(`${API_BASE_URL}/customers/all`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete all customers');
  }

  return response.json();
};

// Get customer history
export const getCustomerHistory = async (id: string): Promise<{ sales: CustomerSale[]; totalSpent: number; count: number }> => {
  const response = await fetch(`${API_BASE_URL}/customers/${id}/history`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    await handleAuthError(response, 'Failed to fetch customer history');
    throw new Error('Failed to fetch customer history');
  }

  const result = await response.json();
  return result;
};

// Get my customer info (for logged-in users to see their own data)
export const getMyCustomerInfo = async (email?: string, phone?: string): Promise<{
  success: boolean;
  customer: Customer | null;
  sales: any[];
  message?: string;
}> => {
  if (!email && !phone) {
    return {
      success: true,
      customer: null,
      sales: [],
      message: 'No customer identifier available',
    };
  }

  const params = new URLSearchParams();
  if (email) params.append('email', email);
  if (phone) params.append('phone', phone);

  const response = await fetch(`${API_BASE_URL}/customers/my-info?${params}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    await handleAuthError(response, 'Failed to fetch customer info');
    throw new Error('Failed to fetch customer info');
  }

  return response.json();
};

// ============ SUPPLIERS ============

// Create supplier
export const createSupplier = async (data: {
  name: string;
  phone: string;
  email?: string;
  gstNumber?: string;
  address?: string;
}) => {
  const response = await fetch(`${API_BASE_URL}/suppliers`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create supplier');
  }

  return response.json();
};

// Get suppliers
export const getSuppliers = async (params?: { status?: string; search?: string }) => {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.search) queryParams.append('search', params.search);

  const response = await fetch(`${API_BASE_URL}/suppliers?${queryParams}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    await handleAuthError(response, 'Failed to fetch suppliers');
    throw new Error('Failed to fetch suppliers');
  }

  const result = await response.json();
  return result.data;
};

// ============ PURCHASES ============

// Create purchase
export const createPurchase = async (data: {
  supplierId: string;
  items: Array<{
    medicineId: string;
    quantity: number;
    unitPrice: number;
    batchNumber?: string;
    expiryDate?: string;
    mrp?: number;
  }>;
  expectedDeliveryDate?: string;
}) => {
  const response = await fetch(`${API_BASE_URL}/purchases`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create purchase');
  }

  return response.json();
};

// Get purchases
export const getPurchases = async (params?: { status?: string; supplierId?: string; limit?: number; page?: number }) => {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.supplierId) queryParams.append('supplierId', params.supplierId);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.page) queryParams.append('page', params.page.toString());

  const response = await fetch(`${API_BASE_URL}/purchases?${queryParams}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    await handleAuthError(response, 'Failed to fetch purchases');
  }

  return response.json();
};

// Get low stock items
export const getLowStockItems = async () => {
  const response = await fetch(`${API_BASE_URL}/purchases/low-stock`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    await handleAuthError(response, 'Failed to fetch low stock items');
  }

  const result = await response.json();
  return result.data;
};

// Update purchase status
export const updatePurchaseStatus = async (purchaseId: string, status: string) => {
  const response = await fetch(`${API_BASE_URL}/purchases/${purchaseId}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ status })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update purchase status');
  }

  return response.json();
};

// Delete purchase
export const deletePurchase = async (purchaseId: string) => {
  const response = await fetch(`${API_BASE_URL}/purchases/${purchaseId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete purchase');
  }

  return response.json();
};

// ============ STOCK AUDIT ============

export type StockAuditType = 'full' | 'category' | 'rack';
export type StockAuditStatus = 'in_progress' | 'completed' | 'cancelled';

export type StockAuditSummary = {
  lastAudit: null | {
    id: string;
    date: string;
    type: StockAuditType;
    itemsAudited: number;
    mismatches: number;
    status: StockAuditStatus;
  };
};

export type StockAuditRecord = {
  id: string;
  date: string;
  type: StockAuditType;
  category?: string;
  rack?: string;
  itemsAudited: number;
  mismatches: number;
  status: StockAuditStatus;
};

export type StockAuditItem = {
  itemId: string;
  medicineId: string;
  batchId?: string;
  batchNumber?: string;
  medicineName: string;
  category?: string;
  rack?: string;
  systemQty: number;
  physicalQty: number;
  difference: number;
  note?: string;
};

export const getLatestAuditSummary = async (): Promise<StockAuditSummary> => {
  const response = await fetch(`${API_BASE_URL}/audits/summary/latest`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    await handleAuthError(response, 'Failed to fetch audit summary');
  }
  const result = await response.json();
  return result.data;
};

export const getAuditHistory = async (limit: number = 50): Promise<StockAuditRecord[]> => {
  const response = await fetch(`${API_BASE_URL}/audits?limit=${limit}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    await handleAuthError(response, 'Failed to fetch audit history');
  }
  const result = await response.json();
  return result.data;
};

export const getAuditDetails = async (auditId: string): Promise<{ audit: any; items: StockAuditItem[] }> => {
  const response = await fetch(`${API_BASE_URL}/audits/${auditId}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    await handleAuthError(response, 'Failed to fetch audit details');
  }
  const result = await response.json();
  return result.data;
};

export const getLatestInProgressAudit = async (): Promise<{ audit: any | null; items: StockAuditItem[] }> => {
  const response = await fetch(`${API_BASE_URL}/audits/in-progress/latest`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    await handleAuthError(response, 'Failed to fetch in-progress audit');
  }
  const result = await response.json();
  return result.data;
};

export const startStockAudit = async (data: {
  type: StockAuditType;
  category?: string;
  rack?: string;
  performedBy?: string;
  performedByUserId?: string;
}): Promise<{ audit: any; items: StockAuditItem[] }> => {
  const response = await fetch(`${API_BASE_URL}/audits/start`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    const err: any = new Error(error.message || 'Failed to start audit');
    err.status = response.status;
    err.existingAuditId = error.data?.auditId;
    throw err;
  }

  const result = await response.json();
  return result.data;
};

export const updateStockAuditItem = async (auditId: string, itemId: string, data: { physicalQty: number; note?: string }) => {
  const response = await fetch(`${API_BASE_URL}/audits/${auditId}/items/${itemId}`, {
    method: 'PATCH',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update audit item');
  }

  const result = await response.json();
  return result.data;
};

export const cancelStockAudit = async (auditId: string) => {
  const response = await fetch(`${API_BASE_URL}/audits/${auditId}/cancel`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to cancel audit');
  }

  const result = await response.json();
  return result.data;
};

export const completeStockAudit = async (auditId: string, data: {
  items: Array<{ itemId?: string; medicineId?: string; batchId?: string; physicalQty: number; note?: string }>;
  performedBy?: string;
  performedByUserId?: string;
}) => {
  const response = await fetch(`${API_BASE_URL}/audits/${auditId}/complete`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to complete audit');
  }

  return response.json();
};

export type AuditAnalytics = {
  expired: {
    count: number;
    totalValue: number;
    items: Array<{
      medicineName: string;
      genericName?: string;
      category: string;
      rack?: string;
      batchNumber: string;
      expiryDate: string;
      quantityAvailable: number;
      purchasePrice: number;
      mrp: number;
      daysExpired: number;
      totalValue: number;
    }>;
  };
  expiringSoon: {
    count: number;
    totalValue: number;
    items: Array<{
      medicineName: string;
      genericName?: string;
      category: string;
      rack?: string;
      batchNumber: string;
      expiryDate: string;
      quantityAvailable: number;
      purchasePrice: number;
      mrp: number;
      daysUntilExpiry: number;
      totalValue: number;
    }>;
  };
  highSales: {
    count: number;
    totalRevenue: number;
    totalProfit: number;
    items: Array<{
      medicineId: string;
      medicineName: string;
      genericName?: string;
      category: string;
      rack?: string;
      totalQuantitySold: number;
      totalRevenue: number;
      totalCost: number;
      profit: number;
      saleCount: number;
    }>;
  };
  lowSales: {
    count: number;
    totalRevenue: number;
    items: Array<{
      medicineId: string;
      medicineName: string;
      genericName?: string;
      category: string;
      rack?: string;
      totalQuantitySold: number;
      totalRevenue: number;
      profit: number;
      saleCount: number;
    }>;
  };
  zeroSales: {
    count: number;
    totalStockValue: number;
    items: Array<{
      medicineId: string;
      medicineName: string;
      genericName?: string;
      category: string;
      rack?: string;
      totalQuantitySold: number;
      totalRevenue: number;
      profit: number;
      saleCount: number;
      currentStock?: number;
    }>;
  };
  filters: {
    type: StockAuditType;
    category: string | null;
    rack: string | null;
    totalMedicines: number;
  };
};

export const getAuditAnalytics = async (params?: {
  type?: StockAuditType;
  category?: string;
  rack?: string;
}): Promise<AuditAnalytics> => {
  const queryParams = new URLSearchParams();
  if (params?.type) queryParams.append('type', params.type);
  if (params?.category) queryParams.append('category', params.category);
  if (params?.rack) queryParams.append('rack', params.rack);

  const response = await fetch(`${API_BASE_URL}/audits/analytics?${queryParams}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    await handleAuthError(response, 'Failed to fetch audit analytics');
  }

  const result = await response.json();
  return result.data;
};

// Call Request API functions
export interface CallRequest {
  id: string;
  name: string;
  phone: string;
  message: string;
  createdAt: string;
  status: 'pending' | 'called' | 'resolved';
  updatedAt?: string;
}

export const createCallRequest = async (data: {
  name: string;
  phone: string;
  message?: string;
}) => {
  const response = await fetch(`${API_BASE_URL}/call-requests`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to submit call request');
  }

  return response.json();
};

export const getCallRequests = async (): Promise<CallRequest[]> => {
  const response = await fetch(`${API_BASE_URL}/call-requests`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    await handleAuthError(response, 'Failed to fetch call requests');
  }
  const result = await response.json().catch(() => ([]));
  if (Array.isArray(result)) {
    return result as CallRequest[];
  }
  if (result && Array.isArray(result.data)) {
    return result.data as CallRequest[];
  }
  return [];
};

export const updateCallRequestStatus = async (id: string, status: string) => {
  const response = await fetch(`${API_BASE_URL}/call-requests/${id}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ status })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update call request status');
  }

  return response.json();
};

// ============ AUTH ============

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
}

export interface AuthResponse {
  success?: boolean;
  token: string;
  user: AuthUser;
  message?: string;
}

export const loginUser = async (email: string, password: string): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Failed to login');
  }

  return data as AuthResponse;
};

export interface SignupData {
  username: string;
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}

export const signupUser = async (data: SignupData): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false) {
    throw new Error(result.message || 'Failed to sign up');
  }

  return result as AuthResponse;
};

// ============ OTP VERIFICATION ============

// ============ PRESCRIPTIONS ============

export interface PrescriptionMedicine {
  name: string;
  quantity: string;
  notes?: string;
}

export interface PrescriptionRequest {
  _id: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  customerId?: string;
  medicines: Array<{
    name: string;
    quantity: string;
    notes?: string;
  }>;
  prescriptionImage?: string;
  extractedText?: string;
  ocrStatus?: 'pending' | 'done' | 'failed' | 'none';
  doctorName?: string;
  doctorPhone?: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'collected';
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  notificationSent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderItem {
  _id: string;
  id: string;
  userId?: string | null;
  userName: string;
  userEmail: string;
  userPhone: string;
  medicineName: string;
  dosage?: string;
  reminderTime: string;
  repeatMode: 'once' | 'daily' | 'weekly';
  notes?: string;
  isActive: boolean;
  nextRunAt: string;
  lastSentAt?: string | null;
  sentCount: number;
  lastError?: string;
  whatsappEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export const getWhatsAppConnectionStatus = async (): Promise<{ connected: boolean; initialized: boolean }> => {
  const response = await fetch(`${API_BASE_URL}/notifications/status`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to fetch WhatsApp status');
  }

  const result = await response.json();
  return result.data || { connected: false, initialized: false };
};

export const getMyReminders = async (): Promise<ReminderItem[]> => {
  const response = await fetch(`${API_BASE_URL}/reminders/my`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    await handleAuthError(response, 'Failed to fetch reminders');
    throw new Error('Failed to fetch reminders');
  }

  const result = await response.json();
  return result.data || [];
};

export const createReminder = async (data: {
  medicineName: string;
  dosage?: string;
  reminderTime: string;
  repeatMode: 'once' | 'daily' | 'weekly';
  notes?: string;
  userPhone: string;
}): Promise<{ success: boolean; message?: string; data: ReminderItem }> => {
  const response = await fetch(`${API_BASE_URL}/reminders`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to create reminder');
  }

  return response.json();
};

export const deleteReminder = async (id: string) => {
  const response = await fetch(`${API_BASE_URL}/reminders/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to delete reminder');
  }

  return response.json();
};

export const submitPrescription = async (data: {
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  doctorName?: string;
  medicines: PrescriptionMedicine[];
  imageFile?: File | null;
}): Promise<{ success: boolean; request: PrescriptionRequest }> => {
  try {
    // Validate image file
    if (!data.imageFile) {
      throw new Error('Prescription image is required. Please upload an image.');
    }

    const formData = new FormData();
    formData.append('patientName', data.patientName);
    formData.append('patientPhone', data.patientPhone);
    if (data.patientEmail) formData.append('patientEmail', data.patientEmail);
    if (data.doctorName) formData.append('doctorName', data.doctorName);
    formData.append('medicines', JSON.stringify(data.medicines));
    formData.append('prescriptionImage', data.imageFile);

    console.log('[API] Submitting prescription to:', `${API_BASE_URL}/prescriptions`);
    console.log('[API] Form data keys:', Array.from(formData.keys()));

    const response = await fetch(`${API_BASE_URL}/prescriptions`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary
    });

    console.log('[API] Response status:', response.status);

    if (!response.ok) {
      let errorMessage = 'Failed to submit prescription';
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch (parseErr) {
        // If response is not JSON, use status text
        errorMessage = `${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('[API] Prescription submitted successfully:', result);
    return result;
  } catch (err) {
    // Enhanced error messaging
    let errorMsg = 'Failed to submit prescription';
    
    if (err instanceof TypeError && err.message.includes('fetch')) {
      errorMsg = `Network Error: Could not reach backend at ${API_BASE_URL}. Make sure the backend server is running.`;
    } else if (err instanceof Error) {
      errorMsg = err.message;
    }

    console.error('[API] Prescription submission error:', errorMsg);
    throw new Error(errorMsg);
  }
};

// Get user's own prescriptions by phone or email
export const getMyPrescriptions = async (phoneOrEmail: string): Promise<PrescriptionRequest[]> => {
  const response = await fetch(`${API_BASE_URL}/prescriptions/my/${encodeURIComponent(phoneOrEmail)}`);

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    try {
      const error = errorText ? JSON.parse(errorText) : null;
      throw new Error(error?.message || 'Failed to fetch prescriptions');
    } catch {
      throw new Error(errorText || 'Failed to fetch prescriptions');
    }
  }

  const result = await response.json().catch(() => ({}));
  return result.requests || [];
};

export const getPrescriptionPendingCount = async (): Promise<number> => {
  const response = await fetch(`${API_BASE_URL}/prescriptions/pending-count`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    await handleAuthError(response, 'Failed to fetch pending prescription count');
  }

  const result = await response.json();
  return result.count || 0;
};

export const listPrescriptions = async (params?: { 
  status?: string; 
  search?: string; 
  page?: number; 
  limit?: number 
}): Promise<{ requests: PrescriptionRequest[]; total: number; pending: number }> => {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const response = await fetch(`${API_BASE_URL}/prescriptions?${queryParams}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    await handleAuthError(response, 'Failed to fetch prescriptions');
  }

  const result = await response.json();
  return {
    requests: result.requests || [],
    total: result.total || 0,
    pending: result.pending || 0,
  };
};

export const updatePrescriptionStatus = async (
  id: string, 
  status: string, 
  adminNotes?: string
): Promise<{ request: PrescriptionRequest }> => {
  const response = await fetch(`${API_BASE_URL}/prescriptions/${id}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ status, adminNotes })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update prescription status');
  }

  return response.json();
};

export const deletePrescription = async (id: string): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_BASE_URL}/prescriptions/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete prescription');
  }

  return response.json();
};

// ============ STOCK NOTIFICATIONS ============

export interface StockItem {
  name: string;
  qty: number;
  minLevel?: number;
  daysLeft?: number;
  batches?: number;
}

export interface StockSnapshot {
  healthy: StockItem[];
  lowStock: StockItem[];
  expiringSoon: StockItem[];
  expired: StockItem[];
  total: number;
}

export const getStockNotificationPreview = async (): Promise<StockSnapshot | null> => {
  const response = await fetch(`${API_BASE_URL}/notifications/stock-preview`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    await handleAuthError(response, 'Failed to fetch stock notification preview');
    throw new Error('Failed to fetch stock notification preview');
  }

  const result = await response.json();
  return result.data;
};

export const sendStockSMS = async () => {
  const response = await fetch(`${API_BASE_URL}/notifications/send-sms`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to send SMS');
  }

  return response.json();
};

export const sendStockWhatsApp = async () => {
  const response = await fetch(`${API_BASE_URL}/notifications/send-whatsapp`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to send WhatsApp message');
  }

  return response.json();
};
