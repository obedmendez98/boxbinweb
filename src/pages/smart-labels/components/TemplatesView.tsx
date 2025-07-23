import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface Template {
  id: string;
  name: string;
  description: string;
  previewUrl: string;
  fields: Array<{
    name: string;
    type: string;
    required: boolean;
  }>;
  labelsPerPage?: number;
  gridLayout?: {
    columns: number;
    rows: number;
  };
  dimensions?: {
    qrCode: { width: string; height: string };
    label: { width: string; height: string };
    margins?: { top: string; sides: string };
  };
}

interface RouteState {
  requestId?: string;
  selectedQRCodes?: string[];
  templates?: Template[];
}

export const TemplatesView = () => {
  const location = useLocation();
  const { currentUser } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestId = (location.state as RouteState)?.requestId;
  const selectedQRCodes = (location.state as RouteState)?.selectedQRCodes || [];

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      try {
        const token = await currentUser?.getIdToken();
        const response = await fetch('https://boxbinapi-iv6wi.ondigitalocean.app/api/export-templates', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        setTemplates(
          data.map((template: any) => ({
            id: template.id,
            name: template.name,
            description: template.description,
            fields: template.fields,
            labelsPerPage: template.labelsPerPage,
            gridLayout: template.gridLayout,
            dimensions: template.dimensions,
            previewUrl: `https://boxbinapi-iv6wi.ondigitalocean.app/api/templates/${template.id}/preview`,
          }))
        );
      } catch (error) {
        console.error('Error fetching templates:', error);
        setError('Failed to load templates. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [currentUser]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col gap-4 p-6"
    >
      <h1 className="text-2xl font-bold">Templates</h1>

      {error && <p className="text-red-500">{error}</p>}

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <h3 className="font-medium text-lg">{template.name}</h3>
                {template.description && (
                  <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                )}

                <div className="mt-2 h-40 bg-gray-100 rounded-md flex items-center justify-center">
                  <img
                    src={template.previewUrl}
                    alt={template.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>

                {template.fields?.length > 0 && (
                  <div className="mt-2">
                    <h4 className="text-sm font-medium">Fields:</h4>
                    <ul className="text-xs text-gray-600 mt-1 space-y-1">
                      {template.fields.map((field) => (
                        <li key={field.name}>
                          {field.name} ({field.type}) {field.required ? '*' : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {template.labelsPerPage && (
                  <p className="text-gray-600 mt-2">Labels per page: {template.labelsPerPage}</p>
                )}

                {template.gridLayout && (
                  <p className="text-gray-600">
                    Grid: {template.gridLayout.columns} × {template.gridLayout.rows}
                  </p>
                )}

                {template.dimensions && (
                  <div className="mt-2">
                    <h4 className="font-medium text-gray-700">Dimensions:</h4>
                    <ul className="text-sm text-gray-600">
                      <li>
                        QR Code: {template.dimensions.qrCode.width} ×{' '}
                        {template.dimensions.qrCode.height}
                      </li>
                      <li>
                        Label: {template.dimensions.label.width} ×{' '}
                        {template.dimensions.label.height}
                      </li>
                      {template.dimensions.margins && (
                        <li>
                          Margins: Top {template.dimensions.margins.top}, Sides{' '}
                          {template.dimensions.margins.sides}
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <button
                  className="w-full bg-primary text-white py-2 px-4 rounded hover:bg-primary-dark transition-colors"
                  onClick={() => console.log('Selected template:', template.id)}
                >
                  Use Template
                </button>

                <button
                  onClick={async () => {
                    try {
                      const token = await currentUser?.getIdToken();
                      const response = await fetch('https://boxbinapi-iv6wi.ondigitalocean.app/api/generate-template', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                          template_name: template.name,
                          requestId,
                          qrCodes: selectedQRCodes,
                        }),
                      });

                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${template.name}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      window.URL.revokeObjectURL(url);
                    } catch (error) {
                      console.error('Download error:', error);
                    }
                  }}
                  className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
