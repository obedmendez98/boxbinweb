import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface Template {
  id: number;
  name: string;
  pdf: string;
  labelsPerPage?: number;
  gridLayout?: {
    columns: number;
    rows: number;
  };
  dimensions?: {
    qrCode: {
      width: string;
      height: string;
    };
    label: {
      width: string;
      height: string;
    };
    margins?: {
      top: string;
      sides: string;
    };
  };
}

interface RouteState {
  templates: Template[];
  requestId: string;
}

export const TemplatesView = () => {
  const { state } = useLocation() as { state: RouteState };
  const { currentUser } = useAuth();
  const [qrCodes, setQrCodes] = useState<string[]>([]);
  
  useEffect(() => {
  }, [state?.requestId, currentUser]);
  
  console.log('Received route state:', state);
  const templates = state?.templates || [];
  console.log('Templates to display:', templates);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 max-w-6xl mx-auto"
    >
      <h1 className="text-2xl font-bold mb-8">Available Templates</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <motion.div
            key={template.id}
            whileHover={{ scale: 1.03 }}
            className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200"
          >
            <div className="p-4">
              <h3 className="text-xl font-semibold mb-2">{template.name}</h3>
              
              {template.labelsPerPage && (
                <p className="text-gray-600 mb-1">
                  Labels per page: {template.labelsPerPage}
                </p>
              )}
              
              {template.gridLayout && (
                <p className="text-gray-600 mb-1">
                  Grid: {template.gridLayout.columns} × {template.gridLayout.rows}
                </p>
              )}
              
              {template.dimensions && (
                <div className="mt-2">
                  <h4 className="font-medium text-gray-700">Dimensions:</h4>
                  <ul className="text-sm text-gray-600">
                    <li>QR Code: {template.dimensions.qrCode.width} × {template.dimensions.qrCode.height}</li>
                    <li>Label: {template.dimensions.label.width} × {template.dimensions.label.height}</li>
                    {template.dimensions.margins && (
                      <li>Margins: Top {template.dimensions.margins.top}, Sides {template.dimensions.margins.sides}</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
            
            <div className="bg-gray-50 px-4 py-3 flex justify-end">
              <button 
                onClick={async () => {
                  const token = await currentUser?.getIdToken();
                  fetch('http://localhost:3000/api/generate-template', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                      template_name: template.name,
                      requestId: state?.requestId
                    })
                  })
                  .then(response => response.blob())
                  .then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${template.name}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                  })
                  .catch(error => console.error('Download error:', error));
                }}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Download
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};