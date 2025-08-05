import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function ExportInventory() {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    if (!currentUser?.uid) return;
    
    setIsLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('https://boxbinapi-iv6wi.ondigitalocean.app/api/export-inventory-pdf', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm p-6">
        <h1 className="text-2xl font-bold mb-6">{t('export.title')}</h1>
        <p className="text-gray-600 mb-6">{t('export.description')}</p>
        
        <Button 
          onClick={handleExport}
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          <Download className="mr-2 h-4 w-4" />
          {isLoading ? t('export.exporting') : t('export.exportButton')}
        </Button>
      </div>
    </div>
  );
}