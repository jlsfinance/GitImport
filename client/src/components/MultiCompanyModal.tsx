import { useState } from 'react';
import { useCompany, CompanyData } from '@/contexts/CompanyContext';
import { Building2, Plus, Check, Trash2, Edit, X, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface MultiCompanyModalProps {
  open: boolean;
  onClose: () => void;
  onAddCompany: () => void;
  onEditCompany: (company: CompanyData) => void;
}

export function MultiCompanyModal({ open, onClose, onAddCompany, onEditCompany }: MultiCompanyModalProps) {
  const { companies, selectedCompany, selectCompany, deleteCompany, loading } = useCompany();
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleSelectCompany = async (companyId: string) => {
    await selectCompany(companyId);
    onClose();
  };

  const handleDeleteCompany = async (companyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (companies.length <= 1) {
      alert("You must have at least one company");
      return;
    }
    
    if (confirm("Are you sure you want to delete this company?")) {
      setDeleting(companyId);
      try {
        await deleteCompany(companyId);
      } finally {
        setDeleting(null);
      }
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="sm:max-w-md" data-testid="modal-multicompany">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md" data-testid="modal-multicompany">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Select Company
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {companies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No companies found</p>
              <p className="text-sm">Create your first company to get started</p>
            </div>
          ) : (
            companies.map((company) => (
              <div
                key={company.id}
                data-testid={`company-item-${company.id}`}
                onClick={() => handleSelectCompany(company.id)}
                className={`p-3 rounded-md border cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                  selectedCompany?.id === company.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'border-border hover-elevate'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`p-2 rounded-md ${
                    selectedCompany?.id === company.id 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-muted'
                  }`}>
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" data-testid={`text-company-name-${company.id}`}>
                      {company.name}
                    </p>
                    {company.address && (
                      <p className="text-sm text-muted-foreground truncate">
                        {company.address}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  {selectedCompany?.id === company.id && (
                    <div className="p-1.5 bg-blue-600 rounded-full">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditCompany(company);
                    }}
                    data-testid={`button-edit-company-${company.id}`}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  
                  {companies.length > 1 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => handleDeleteCompany(company.id, e)}
                      disabled={deleting === company.id}
                      data-testid={`button-delete-company-${company.id}`}
                    >
                      {deleting === company.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-destructive" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="pt-4 border-t">
          <Button
            onClick={onAddCompany}
            className="w-full"
            variant="outline"
            data-testid="button-add-company"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Company
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface CompanySelectorProps {
  onOpenModal: () => void;
}

export function CompanySelector({ onOpenModal }: CompanySelectorProps) {
  const { selectedCompany, companies, loading } = useCompany();
  
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }
  
  return (
    <button
      onClick={onOpenModal}
      className="flex items-center gap-2 px-3 py-2 bg-muted hover-elevate rounded-md transition-colors w-full text-left"
      data-testid="button-company-selector"
    >
      <div className="p-1.5 bg-blue-600 rounded-md">
        <Building2 className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" data-testid="text-selected-company">
          {selectedCompany?.name || 'Select Company'}
        </p>
        {companies.length > 1 && (
          <p className="text-xs text-muted-foreground">
            {companies.length} companies
          </p>
        )}
      </div>
      <ChevronDown className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}
