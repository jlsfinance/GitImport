import { useState, useEffect } from 'react';
import { useCompany, CompanyData } from '@/contexts/CompanyContext';
import { Building2, Save, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CompanyFormProps {
  editCompany?: CompanyData | null;
  onClose?: () => void;
  isModal?: boolean;
}

export const CompanyForm = ({ editCompany, onClose, isModal = false }: CompanyFormProps) => {
  const { saveCompany, loading, companies } = useCompany();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [gst, setGst] = useState('');
  const [gstEnabled, setGstEnabled] = useState(true);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [state, setState] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editCompany) {
      setName(editCompany.name || '');
      setAddress(editCompany.address || '');
      setGst(editCompany.gst || '');
      setGstEnabled(editCompany.gst_enabled ?? true);
      setPhone(editCompany.phone || '');
      setEmail(editCompany.email || '');
      setState(editCompany.state || '');
    } else {
      // Reset form for new company
      setName('');
      setAddress('');
      setGst('');
      setGstEnabled(true);
      setPhone('');
      setEmail('');
      setState('');
    }
  }, [editCompany]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Company name is required');
      return;
    }

    setError('');
    setIsSaving(true);

    try {
      await saveCompany({
        name,
        address,
        gst,
        gst_enabled: gstEnabled,
        phone,
        email,
        state
      }, editCompany?.id);
      
      if (onClose) {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save company details');
    } finally {
      setIsSaving(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Company Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
          placeholder="e.g. Acme Corp"
          data-testid="input-company-name"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Address</label>
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
          placeholder="Full business address"
          data-testid="input-company-address"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Phone</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
            placeholder="Phone number"
            data-testid="input-company-phone"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
            placeholder="Email address"
            data-testid="input-company-email"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">State</label>
          <input
            type="text"
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
            placeholder="State"
            data-testid="input-company-state"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">GST / Tax ID</label>
          <input
            type="text"
            value={gst}
            onChange={(e) => setGst(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
            placeholder="Optional"
            data-testid="input-company-gst"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="gstEnabled"
          checked={gstEnabled}
          onChange={(e) => setGstEnabled(e.target.checked)}
          className="rounded border-input text-primary focus:ring-ring"
          data-testid="checkbox-gst-enabled"
        />
        <label htmlFor="gstEnabled" className="text-sm text-foreground">Enable GST calculations</label>
      </div>

      <div className="pt-4 flex gap-2">
        {onClose && (
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
            data-testid="button-cancel"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSaving}
          className="flex-1"
          data-testid="button-save-company"
        >
          {isSaving ? (
            <>Processing...</>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" /> {editCompany ? 'Update' : 'Save'} Company
            </>
          )}
        </Button>
      </div>
    </form>
  );

  // If it's a modal (editing or adding new company when there are existing companies)
  if (isModal && onClose) {
    return (
      <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="sm:max-w-md" data-testid="modal-company-form">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              {editCompany ? 'Edit Company' : 'Add New Company'}
            </DialogTitle>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>
    );
  }

  // Full-screen form for first-time setup
  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-blue-600 p-4 flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {companies.length === 0 ? 'Create Your First Company' : 'Company Details'}
            </h2>
            <p className="text-blue-100 text-xs">
              {companies.length === 0 
                ? 'Set up your company to get started'
                : 'Please complete your profile to continue'
              }
            </p>
          </div>
        </div>

        <div className="p-6">
          {formContent}
        </div>
      </div>
    </div>
  );
};
