import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Search } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';

type Label = {
  dateCreated: string;
  field: string;
  guid: string;
  isUsed: boolean;
  order_key: string;
  qrcodeId: string;
};

const generateQrCodeId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 3; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const SmartLabelsPage = () => {
  const [labels, setLabels] = useState<Label[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUsedFilter, setIsUsedFilter] = useState<boolean | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const { currentUser } = useAuth();
  
  useEffect(() => {
    fetchLabels();
  }, [searchTerm]);

  const fetchLabels = async (): Promise<void> => {
    try {
      if (!currentUser) return;
      setIsLoading(true);
      
      const labelsRef = collection(db, 'smartlabels');
      let q;
      
      let conditions = [where('userId', '==', currentUser.uid)];
      
      if (searchTerm) {
        const searchTerms = searchTerm.split(',').map(term => term.trim());
        conditions.push(where('qrcodeId', 'in', searchTerms));
      }
      
      if (isUsedFilter !== null) {
        conditions.push(where('isUsed', '==', isUsedFilter));
      }
      
      if (startDate && endDate) {
        conditions.push(where('dateCreated', '>=', startDate));
        conditions.push(where('dateCreated', '<=', endDate));
      }
      
      q = query(labelsRef, ...conditions);
      
      const querySnapshot = await getDocs(q);
      
      const labelsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          dateCreated: data.dateCreated,
          field: data.field,
          guid: data.guid || doc.id,
          isUsed: data.isUsed,
          order_key: data.order_key,
          qrcodeId: data.qrcodeId,
          userId: data.userId
        } as Label;
      });
      
      setLabels(labelsData);
    } catch (error) {
      console.error('Error fetching labels:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateLabel = async (label: Omit<Label, 'guid' | 'dateCreated' | 'isUsed' | 'order_key' | 'qrcodeId'>) => {
    try {
      if (!currentUser) return;
      setIsLoading(true);
      
      const batch = writeBatch(db);
      const now = new Date().toISOString();
      
      for (let i = 0; i < quantity; i++) {
        const guid = self.crypto?.randomUUID() || Math.random().toString(36).substring(2) + Date.now().toString(36);
        const qrcodeId = generateQrCodeId();
        
        const labelData = {
          dateCreated: now,
          field: `${label.field} ${quantity > 1 ? `(${i+1})` : ''}`.trim(),
          guid,
          isUsed: false,
          order_key: '',
          qrcodeId,
          userId: currentUser.uid
        };
        
        const docRef = doc(collection(db, 'smartlabels'));
        batch.set(docRef, labelData);
      }
      
      await batch.commit();
      fetchLabels();
    } catch (error) {
      console.error('Error creating labels:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="space-y-4 mb-6">
        <h1 className="text-2xl font-bold">Smart Labels</h1>
        <div className="w-full space-y-2">
          <Label htmlFor="search">Search by QR Code IDs</Label>
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Comma separated QR Code IDs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button 
            onClick={() => setShowQuantityModal(true)}
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Label'}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {labels.map((label) => (
          <div key={label.guid} className="p-4 border rounded-lg hover:bg-gray-50">
            <div className="font-medium">QR Code: {label.qrcodeId}</div>
            <div className="text-sm text-gray-500">Field: {label.field}</div>
            <div className="text-xs text-gray-400 mt-1">
              Created: {new Date(label.dateCreated).toLocaleString()}
            </div>
            <div className="text-xs mt-2">
              <span className="inline-block px-2 py-1 rounded bg-gray-100">
                {label.isUsed ? 'Used' : 'Available'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {showQuantityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Create Labels</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Number of labels to create:
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowQuantityModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowQuantityModal(false);
                  handleCreateLabel({ field: `New Label ${quantity > 1 ? '(x' + quantity + ')' : ''}` });
                }}
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};