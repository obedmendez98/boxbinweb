import React, { useState, useEffect } from 'react';
import { Step1, Step3 } from './components/index';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';

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

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Smart Labels</h1>
      
      {!isGenerating && requestHistory.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Previous Requests</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requestHistory.map((request) => (
              <div key={request.requestId} className="bg-gray-100 p-4 rounded-lg">
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