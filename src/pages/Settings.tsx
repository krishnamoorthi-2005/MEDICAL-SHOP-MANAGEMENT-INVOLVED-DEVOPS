import { useEffect, useMemo, useState } from 'react';
import { Save, Database, Download, RefreshCw, CheckCircle, UserPlus, Trash2, Mail, Lock, User, Bell, MessageSquare, Eye, Send, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

import {
  createBackup,
  createUser,
  deleteBackup as apiDeleteBackup,
  deleteUser as apiDeleteUser,
  getBackupDetails,
  getUsers,
  listBackups,
  updateUserStatus,
  type AppUser,
  type BackupRecord,
  getStockNotificationPreview,
  sendStockSMS,
  sendStockWhatsApp,
  type StockSnapshot,
} from '@/lib/api';
import { downloadPredictionDataset, uploadPredictionDataset } from '@/lib/api';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Settings() {
  const { toast } = useToast();

  // Shop Information
  const [shopInfo, setShopInfo] = useState({
    shopName: 'Special Access Pharma',
    gstNumber: '29ABCDE1234F1Z5',
    phone: '+91 9876543210',
    address: 'Ammal Yeri Road, Dadagapatty, Salem - 636006'
  });

  // Tax Settings
  const [taxSettings, setTaxSettings] = useState({
    gst5: '5',
    gst12: '12',
    gst18: '18',
    gst28: '28',
    defaultTax: '12'
  });

  // User Management
  const [users, setUsers] = useState<AppUser[]>([]);

  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Staff'
  });

  // Backup status
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [showBackupDetails, setShowBackupDetails] = useState(false);
  const [backupDetailsLoading, setBackupDetailsLoading] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<any>(null);

  const [confirmDeleteBackupId, setConfirmDeleteBackupId] = useState<string | null>(null);

  // AI dataset download
  const [downloadingDataset, setDownloadingDataset] = useState(false);
  const [uploadingDataset, setUploadingDataset] = useState(false);
  const [datasetFile, setDatasetFile] = useState<File | null>(null);

  // Twilio notifications
  const [notifPreview, setNotifPreview] = useState<StockSnapshot | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sendingSMS, setSendingSMS] = useState(false);
  const [sendingWA, setSendingWA] = useState(false);

  const lastBackupLabel = useMemo(() => {
    const latest = backups[0];
    if (!latest?.createdAt) return 'No backups yet';
    return new Date(latest.createdAt).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [backups]);

  useEffect(() => {
    const load = async () => {
      try {
        const [u, b] = await Promise.all([getUsers(), listBackups(20)]);
        setUsers(u || []);
        setBackups(b || []);
      } catch (error: any) {
        console.error('Settings load error:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to load settings data',
          variant: 'destructive',
        });
      }
    };
    load();
  }, [toast]);

  const handleSaveShopInfo = () => {
    toast({
      title: 'Settings Saved',
      description: 'Shop information has been updated successfully'
    });
  };

  const handleSaveTaxSettings = () => {
    toast({
      title: 'Tax Settings Saved',
      description: 'Tax rates have been updated'
    });
  };

  const handleBackupNow = async () => {
    try {
      setIsBackingUp(true);
      await createBackup({ createdBy: 'Admin', note: 'Manual backup from Settings' });
      const updated = await listBackups(20);
      setBackups(updated || []);
      toast({
        title: 'Backup Complete',
        description: 'Your data has been backed up successfully',
      });
    } catch (error: any) {
      console.error('Backup error:', error);
      toast({
        title: 'Backup Failed',
        description: error.message || 'Failed to create backup',
        variant: 'destructive',
      });
    } finally {
      setIsBackingUp(false);
    }
  };

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
      console.error('Add user error:', error);
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
      await apiDeleteUser(userId);
      setUsers(users.filter((u) => u.id !== userId));
      toast({
        title: 'User Deleted',
        description: 'User has been removed successfully',
      });
    } catch (error: any) {
      console.error('Delete user error:', error);
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
      console.error('Toggle user status error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user status',
        variant: 'destructive',
      });
    }
  };

  const handleViewBackup = async (backupId: string) => {
    try {
      setShowBackupDetails(true);
      setBackupDetailsLoading(true);
      const result = await getBackupDetails(backupId);
      setSelectedBackup(result.data);
    } catch (error: any) {
      console.error('Backup details error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load backup',
        variant: 'destructive',
      });
      setShowBackupDetails(false);
    } finally {
      setBackupDetailsLoading(false);
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    try {
      await apiDeleteBackup(backupId);
      const updated = await listBackups(20);
      setBackups(updated || []);
      toast({
        title: 'Backup Deleted',
        description: 'Backup snapshot removed successfully',
      });
    } catch (error: any) {
      console.error('Delete backup error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete backup',
        variant: 'destructive',
      });
    } finally {
      setConfirmDeleteBackupId(null);
    }
  };

  const handleExportData = () => {
    toast({
      title: 'Export Started',
      description: 'Your data export will be ready shortly'
    });
  };

  const handleDatasetFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setDatasetFile(file);
  };

  const handleDownloadDataset = async () => {
    try {
      setDownloadingDataset(true);
      const blob = await downloadPredictionDataset();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pharmacy_sales_dataset_last12months.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({
        title: 'Dataset Downloaded',
        description: 'Last 12 months sales dataset exported for AI training',
      });
    } catch (error: any) {
      console.error('Dataset download error:', error);
      toast({
        title: 'Download Failed',
        description: error?.message || 'Could not download training dataset',
        variant: 'destructive',
      });
    } finally {
      setDownloadingDataset(false);
    }
  };

  const handleUploadDataset = async () => {
    if (!datasetFile) {
      toast({
        title: 'No file selected',
        description: 'Please choose a CSV file before uploading.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploadingDataset(true);
      const result = await uploadPredictionDataset(datasetFile);
      toast({
        title: 'Dataset Uploaded',
        description:
          result.message || 'Dataset uploaded and AI model training started successfully.',
      });
    } catch (error: any) {
      console.error('Dataset upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error?.message || 'Could not upload training dataset',
        variant: 'destructive',
      });
    } finally {
      setUploadingDataset(false);
    }
  };

  const handlePreviewNotification = async () => {
    try {
      setLoadingPreview(true);
      const data = await getStockNotificationPreview();
      setNotifPreview(data);
    } catch (err: any) {
      toast({ title: 'Preview Failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSendWhatsApp = async () => {
    try {
      setSendingWA(true);
      await sendStockWhatsApp();
      toast({ title: 'WhatsApp Sent', description: 'Stock report sent to your WhatsApp successfully' });
    } catch (err: any) {
      toast({ title: 'WhatsApp Failed', description: err.message, variant: 'destructive' });
    } finally {
      setSendingWA(false);
    }
  };

  return (
    <div className="space-y-6 w-full px-4 sm:px-6 lg:px-8 py-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your pharmacy settings and preferences</p>
        </div>
      </div>

      {/* Shop Information */}
      <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-border/40 bg-slate-50/50">
          <h2 className="font-semibold text-foreground">Shop Information</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Basic details about your pharmacy</p>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="shopName">Shop Name</Label>
              <Input
                id="shopName"
                value={shopInfo.shopName}
                onChange={(e) => setShopInfo(s => ({ ...s, shopName: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gstNumber">GST Number</Label>
              <Input
                id="gstNumber"
                value={shopInfo.gstNumber}
                onChange={(e) => setShopInfo(s => ({ ...s, gstNumber: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={shopInfo.phone}
                onChange={(e) => setShopInfo(s => ({ ...s, phone: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={shopInfo.address}
              onChange={(e) => setShopInfo(s => ({ ...s, address: e.target.value }))}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveShopInfo} style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }} className="text-white">
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* Tax Settings */}
      <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-border/40 bg-slate-50/50">
          <h2 className="font-semibold text-foreground">Tax Settings</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Configure GST rates for your products</p>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="gst5">GST 5% Rate</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="gst5"
                  type="number"
                  value={taxSettings.gst5}
                  onChange={(e) => setTaxSettings(s => ({ ...s, gst5: e.target.value }))}
                  className="w-20"
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gst12">GST 12% Rate</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="gst12"
                  type="number"
                  value={taxSettings.gst12}
                  onChange={(e) => setTaxSettings(s => ({ ...s, gst12: e.target.value }))}
                  className="w-20"
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gst18">GST 18% Rate</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="gst18"
                  type="number"
                  value={taxSettings.gst18}
                  onChange={(e) => setTaxSettings(s => ({ ...s, gst18: e.target.value }))}
                  className="w-20"
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gst28">GST 28% Rate</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="gst28"
                  type="number"
                  value={taxSettings.gst28}
                  onChange={(e) => setTaxSettings(s => ({ ...s, gst28: e.target.value }))}
                  className="w-20"
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>
          </div>
          <Separator />
          <div className="grid gap-2 max-w-xs">
            <Label>Default Tax Rate</Label>
            <Select
              value={taxSettings.defaultTax}
              onValueChange={(v) => setTaxSettings(s => ({ ...s, defaultTax: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No Tax (0%)</SelectItem>
                <SelectItem value="5">GST 5%</SelectItem>
                <SelectItem value="12">GST 12%</SelectItem>
                <SelectItem value="18">GST 18%</SelectItem>
                <SelectItem value="28">GST 28%</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveTaxSettings} style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }} className="text-white">
              <Save className="mr-2 h-4 w-4" />
              Save Tax Settings
            </Button>
          </div>
        </div>
      </div>

      {/* AI & Prediction Dataset */}
      <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-border/40 bg-slate-50/50">
          <h2 className="font-semibold text-foreground">AI Prediction Dataset</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Upload or download the 1-year sales dataset used to train the demand prediction model that powers the AI Audit Assistant.</p>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-[2fr,1fr] items-end">
            <div className="space-y-2">
              <Label htmlFor="datasetFile">Upload custom dataset (CSV)</Label>
              <Input
                id="datasetFile"
                type="file"
                accept=".csv,text/csv"
                onChange={handleDatasetFileChange}
              />
              <p className="text-xs text-muted-foreground">
                Expected format: aggregated 12-month sales per medicine as produced by
                extract_from_mongo.py. Uploading will retrain the AI model server-side.
              </p>
            </div>
            <div className="flex flex-col gap-2 md:items-end">
              <Button onClick={handleUploadDataset} disabled={uploadingDataset} style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }} className="text-white">
                {uploadingDataset ? 'Uploading & Training…' : 'Upload & Train Model'}
              </Button>
              <Button variant="outline" onClick={handleDownloadDataset} disabled={downloadingDataset}>
                <Download className="mr-2 h-4 w-4" />
                {downloadingDataset ? 'Preparing…' : 'Download Dataset'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Backup & Data */}
      <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-border/40 bg-slate-50/50">
          <h2 className="font-semibold text-foreground">Backup & Data</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Manage your data backups and exports</p>
        </div>
        <div className="p-4 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-emerald-200/60 bg-emerald-50/40">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
                <Database className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="font-semibold text-foreground">Last Backup</div>
                <div className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                  <CheckCircle className="h-3 w-3 text-emerald-600" />
                  {lastBackupLabel}
                </div>
              </div>
            </div>
            <Button onClick={handleBackupNow} disabled={isBackingUp} style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }} className="text-white">
              {isBackingUp ? (
                <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Backing Up...</>
              ) : (
                <><RefreshCw className="mr-2 h-4 w-4" />Backup Now</>
              )}
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="font-semibold text-sm">Backup History</div>
            <div className="text-xs text-muted-foreground">Click Retrieve to restore a snapshot</div>
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80">
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Date</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 hidden sm:table-cell">Created By</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Items</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No backups found</TableCell>
                      </TableRow>
                    ) : (
                      backups.slice(0, 10).map((b) => (
                        <TableRow key={b._id} className="hover:bg-slate-50/60">
                          <TableCell className="font-medium text-sm">{new Date(b.createdAt).toLocaleString('en-IN')}</TableCell>
                          <TableCell className="text-sm hidden sm:table-cell">{b.createdBy || 'system'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {(b.counts?.medicines ?? 0)} medicines, {(b.counts?.batches ?? 0)} batches
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col sm:flex-row justify-end gap-1 sm:gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleViewBackup(b._id)} className="text-xs">Retrieve</Button>
                              <Button variant="destructive" size="sm" onClick={() => setConfirmDeleteBackupId(b._id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50/60 border border-border/40">
            <div>
              <div className="font-semibold text-sm">Export Data</div>
              <div className="text-xs text-muted-foreground mt-0.5">Download all your data in CSV format</div>
            </div>
            <Button variant="outline" onClick={handleExportData} className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" />
              Export All Data
            </Button>
          </div>
        </div>
      </div>

      {/* WhatsApp Stock Notifications */}
      <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-border/40 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-emerald-500" />
            <h2 className="font-semibold text-foreground">Stock Notifications (WhatsApp)</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Daily stock report sent automatically via WhatsApp. Configure phone number in backend <code className="bg-slate-100 px-1 rounded text-[11px]">.env</code>.
          </p>
        </div>
        <div className="p-4 sm:p-6 space-y-5">
          {/* Schedule info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 text-center">
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Schedule</div>
              <div className="font-semibold text-sm text-emerald-700">Daily 9:00 AM</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">WHATSAPP_NOTIFY_CRON</div>
            </div>
            <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-4 text-center">
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Channel</div>
              <div className="font-semibold text-sm text-teal-700">WhatsApp Web</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Direct WhatsApp API</div>
            </div>
            <div className="rounded-xl border border-cyan-100 bg-cyan-50/40 p-4 text-center">
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Cost</div>
              <div className="font-semibold text-sm text-cyan-700">Free</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">No SMS charges</div>
            </div>
          </div>
          {/* Manual send buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={handlePreviewNotification} disabled={loadingPreview} className="gap-2">
              <Eye className="h-4 w-4" />
              {loadingPreview ? 'Loading...' : 'Preview Report'}
            </Button>
            <Button onClick={handleSendWhatsApp} disabled={sendingWA} className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90">
              <MessageSquare className="h-4 w-4" />
              {sendingWA ? 'Sending...' : 'Send WhatsApp Now'}
            </Button>
            <a href="https://github.com/pedrosans/whatsapp-web.js" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Setup Guide
              </Button>
            </a>
          </div>
          {/* Live preview panel */}
          {notifPreview && (
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50/80 border-b border-border/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                Stock Report Preview — {notifPreview.total} medicines
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/40">
                <div className="p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
                    <span className="text-xs font-semibold text-emerald-700">Healthy ({notifPreview.healthy.length})</span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {notifPreview.healthy.slice(0, 8).map((i, idx) => (
                      <div key={idx} className="text-xs text-muted-foreground flex justify-between">
                        <span className="truncate pr-2">{i.name}</span>
                        <span className="font-medium text-emerald-600 shrink-0">{i.qty}</span>
                      </div>
                    ))}
                    {notifPreview.healthy.length > 8 && <div className="text-[10px] text-muted-foreground">+{notifPreview.healthy.length - 8} more</div>}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-orange-500 inline-block" />
                    <span className="text-xs font-semibold text-orange-700">Low Stock ({notifPreview.lowStock.length})</span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {notifPreview.lowStock.length === 0 && <div className="text-xs text-muted-foreground">None</div>}
                    {notifPreview.lowStock.map((i, idx) => (
                      <div key={idx} className="text-xs text-muted-foreground flex justify-between">
                        <span className="truncate pr-2">{i.name}</span>
                        <span className="font-medium text-orange-600 shrink-0">{i.qty}/{i.minLevel}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-500 inline-block" />
                    <span className="text-xs font-semibold text-yellow-700">Expiring Soon ({notifPreview.expiringSoon.length})</span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {notifPreview.expiringSoon.length === 0 && <div className="text-xs text-muted-foreground">None</div>}
                    {notifPreview.expiringSoon.map((i, idx) => (
                      <div key={idx} className="text-xs text-muted-foreground flex justify-between">
                        <span className="truncate pr-2">{i.name}</span>
                        <span className="font-medium text-yellow-600 shrink-0">{i.daysLeft}d</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" />
                    <span className="text-xs font-semibold text-red-700">Expired ({notifPreview.expired.length})</span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {notifPreview.expired.length === 0 && <div className="text-xs text-muted-foreground">None</div>}
                    {notifPreview.expired.map((i, idx) => (
                      <div key={idx} className="text-xs text-muted-foreground flex justify-between">
                        <span className="truncate pr-2">{i.name}</span>
                        <span className="font-medium text-red-600 shrink-0">{i.qty} units</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Sample message */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 overflow-x-auto">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Sample SMS Format</div>
            <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed min-w-fit">{`📦 PHARMACY STOCK REPORT\n22 Mar 2026 | Total: 45 medicines\n━━━━━━━━━━━━━━━━━━━━\n🔴 EXPIRED (2)\n  • Paracetamol 500mg: 30 units\n🟠 LOW STOCK (3)\n  • Metformin 500mg: 8/50 units\n🟡 EXPIRING SOON (4)\n  • Cetirizine 10mg: 60 units (7d left)\n✅ HEALTHY STOCK (36)\n  • Aspirin 75mg: 200 units\n━━━━━━━━━━━━━━━━━━━━\n✅ 36 healthy  🟠 3 low  🟡 4 expiring  🔴 2 expired`}</pre>
          </div>
        </div>
      </div>

      {/* User Management */}
      <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-border/40 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-foreground">User Management</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Manage system admin and staff access</p>
          </div>
          <Button onClick={() => setShowAddUserDialog(true)} style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }} className="text-white">
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full px-4 sm:px-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Name</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 hidden sm:table-cell">Email</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Role</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 hidden md:table-cell">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 hidden lg:table-cell">Created</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.filter(u => u.role.toLowerCase() !== 'user').map((user) => (
                  <TableRow key={user.id} className="hover:bg-slate-50/60">
                    <TableCell className="font-medium text-sm">{user.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">{user.email}</TableCell>
                    <TableCell>
                      <Badge
                        className={user.role === 'Admin' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-600 border-slate-200'}
                        variant="outline"
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge
                        variant="outline"
                        className={user.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">
                      {new Date(user.createdAt).toLocaleDateString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col sm:flex-row justify-end gap-1 sm:gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleToggleUserStatus(user.id)} className="text-xs">
                          {user.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user.id)} disabled={user.role === 'Admin'}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Add User Dialog */}
      <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account for the system
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


      {/* Backup Details Dialog */}
      <Dialog open={showBackupDetails} onOpenChange={setShowBackupDetails}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Backup Data</DialogTitle>
            <DialogDescription>
              {selectedBackup?.createdAt
                ? `Snapshot from ${new Date(selectedBackup.createdAt).toLocaleString('en-IN')}`
                : 'Backup snapshot'}
            </DialogDescription>
          </DialogHeader>

          {backupDetailsLoading ? (
            <div className="text-sm text-muted-foreground">Loading backup…</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {Object.entries(selectedBackup?.counts || {}).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between rounded-md border p-2">
                    <div className="text-muted-foreground">{k}</div>
                    <div className="font-medium">{String(v)}</div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">
                Showing this backup snapshot only. (Data is stored in the backups collection.)
              </div>

              <div className="rounded-md border bg-muted/20 p-3">
                <div className="text-sm font-medium mb-2">Raw Data Preview</div>
                <pre className="text-xs overflow-auto max-h-[300px] whitespace-pre-wrap">
                  {JSON.stringify(selectedBackup?.data || {}, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBackupDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Backup Delete */}
      <AlertDialog open={!!confirmDeleteBackupId} onOpenChange={(open) => !open && setConfirmDeleteBackupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected backup snapshot from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDeleteBackupId && handleDeleteBackup(confirmDeleteBackupId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
