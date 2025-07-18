import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../lib/firebase';

interface Step1Props {
  qrCount: number;
  setQrCount: (count: number) => void;
  onGenerate: (requestId: string) => void;
}

export const Step1 = ({ qrCount, setQrCount, onGenerate }: Step1Props) => {
  const isValid = qrCount > 0 && qrCount <= 100;

  const { currentUser } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleGenerateClick = async () => {
    console.log('Generate button clicked with qrCount:', qrCount);
    setIsGenerating(true);
    
    const requestGuid = uuidv4();
    
    // Simulate generation progress
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 10;
      });
    }, 300);

    try {
      // Store QR codes in Firestore
      const smartLabelsCollection = collection(db, 'smartlabels');
      for (let i = 0; i < qrCount; i++) {
        await addDoc(smartLabelsCollection, {
          dateCreated: serverTimestamp(),
          guid: uuidv4(),
          isUsed: false,
          userId: currentUser?.uid,
          requestId: requestGuid
        });
        console.log(`Successfully created QR code ${i+1}/${qrCount}`);
      }
    } catch (error) {
      console.error('Error creating smartlabels:', error);
      clearInterval(timer);
      setIsGenerating(false);
      return;
    }

    clearInterval(timer);
    onGenerate(requestGuid);
  };

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -50, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white p-6 rounded-lg shadow-md"
    >
      <h2 className="text-xl font-semibold mb-4">How many QR codes do you need?</h2>
      <input
        type="number"
        min="1"
        max="100"
        value={qrCount || ''}
        onChange={(e) => setQrCount(Number(e.target.value))}
        className="w-full p-2 border rounded mb-4"
        placeholder="Enter number (1-100)"
      />
      <button
          onClick={handleGenerateClick}
          disabled={!isValid}
          className={`w-full py-2 px-4 rounded ${isValid ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-500'}`}
        >
          Generate QR Codes
        </button>
    </motion.div>
  );
};