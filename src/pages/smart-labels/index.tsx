import React, { useState, useEffect } from 'react';
import { Step1, Step3 } from './components/index';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { TemplatesView } from '../../pages/smart-labels/components/TemplatesView';

interface RequestHistory {
  requestId: string;
  qrCount: number;
  date: string;
}

export const SmartLabelsPage = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrCount, setQrCount] = useState(0);
  const [requestId, setRequestId] = useState('');
  const [requestHistory, setRequestHistory] = useState<RequestHistory[]>([]);
  const { currentUser } = useAuth();
  const [isPrinting, setIsPrinting] = useState(false);
  
  useEffect(() => {
    const fetchRequestHistory = async () => {
      if (currentUser?.uid) {
        const q = query(
          collection(db, 'smartlabels'),
          where('userId', '==', currentUser.uid)
        );
        
        const querySnapshot = await getDocs(q);
        const requests = new Map<string, RequestHistory>();
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const date = data.dateCreated?.toDate()?.toLocaleDateString() || 'Unknown date';
          
          if (data.requestId) {
            requests.set(data.requestId, {
              requestId: data.requestId,
              qrCount: requests.get(data.requestId)?.qrCount ? requests.get(data.requestId)!.qrCount + 1 : 1,
              date
            });
          }
        });
        
        setRequestHistory(Array.from(requests.values()));
      }
    };
    
    fetchRequestHistory();
  }, [currentUser?.uid, isGenerating]);
  
  const handleGenerate = (requestId: string) => {
    setRequestId(requestId);
    setIsGenerating(true);
  };
  
  const handleBack = () => setIsGenerating(false);
  
  const navigate = useNavigate();

  const handlePrint = async (requestId: string) => {
    try {
      setIsPrinting(true);
      const token = await currentUser?.getIdToken();
      const response = await fetch('http://localhost:3000/api/export-templates', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch templates');
      
      const data = await response.json();
      console.log('API response data:', data);
      navigate('/smart-labels/templates', { state: { templates: data, requestId } });
    } catch (error) {
      console.error('Print error:', error);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Smart Labels</h1>
      
      {!isGenerating && requestHistory.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Previous Requests</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requestHistory.map((request) => (
              <div key={request.requestId} className="bg-gray-100 p-4 rounded-lg relative">
                <button 
                   onClick={() => handlePrint(request.requestId)}
                   className="absolute top-2 right-2 p-1 text-blue-600 hover:text-blue-800 disabled:opacity-50"
                   aria-label="Print request"
                   disabled={isPrinting}
                 >
                   {isPrinting ? (
                      <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                   </svg>
                    )}
                </button>
                <h3 className="font-medium text-lg mb-2">Request {request.requestId.slice(0, 8)}</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm text-gray-500">QR Codes</p>
                    <p className="font-medium">{request.qrCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date Generated</p>
                    <p className="font-medium">{request.date}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <AnimatePresence mode="wait">
        {!isGenerating ? (
          <Step1 
            qrCount={qrCount} 
            setQrCount={setQrCount} 
            onGenerate={handleGenerate} 
          />
        ) : (
          <Step3 
            qrCount={qrCount} 
            onBack={handleBack}
            requestId={requestId}
          />
        )}
      </AnimatePresence>
    </div>
  );
};