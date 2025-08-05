import { useState, useEffect } from 'react';
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

import { useTranslation } from 'react-i18next';

export const TemplatesView = () => {
  const { t } = useTranslation();
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
    className="container mx-auto p-6 max-w-7xl"
  >
    {/* Header Section */}
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-gray-900">Templates</h1>
      <p className="text-gray-600 mt-2">{t('messages.templateSelection')}</p>
    </div>

    {/* Error State */}
    {error && (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 text-red-500">⚠️</div>
          <p className="text-red-700 font-medium">Error loading templates</p>
        </div>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </motion.div>
    )}

    {/* Loading State */}
    {loading ? (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200"></div>
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent absolute top-0"></div>
        </div>
        <p className="text-gray-600 mt-4 font-medium">Loading templates...</p>
        <p className="text-gray-500 text-sm">This might take a moment</p>
      </div>
    ) : (
      /* Templates Grid */
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        {templates.map((template, index) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group"
          >
            {/* Template Card */}
            <div className="flex flex-col h-full">
              
              {/* Preview Section */}
              <div className="relative p-4 pb-2">
                <div className="aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center overflow-hidden border border-gray-200 group-hover:border-blue-300 transition-colors">
                  <img
                    src={template.previewUrl}
                    alt={`${template.name} preview`}
                    className="max-h-full max-w-full object-contain transform group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </div>

              {/* Content Section */}
              <div className="flex-1 px-4 pb-4">
                <div className="mb-4">
                  <h3 className="font-semibold text-lg text-gray-900 mb-1 group-hover:text-blue-700 transition-colors">
                    {template.name}
                  </h3>
                  {template.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                      {template.description}
                    </p>
                  )}
                </div>

                {/* Template Details */}
                <div className="space-y-3 mb-4">
                  
                  {/* Page Layout Info */}
                  {(template.labelsPerPage || template.gridLayout) && (
                    <div className="flex items-center justify-between text-xs">
                      {template.labelsPerPage && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md">
                          <span className="font-medium">{template.labelsPerPage}</span>
                          <span>per page</span>
                        </div>
                      )}
                      {template.gridLayout && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-md">
                          <span className="font-medium">
                            {template.gridLayout.columns} × {template.gridLayout.rows}
                          </span>
                          <span>grid</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Fields */}
                  {template.fields?.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                        Fields ({template.fields.length})
                      </h4>
                      <div className="space-y-1">
                        {template.fields.slice(0, 3).map((field) => (
                          <div key={field.name} className="flex items-center justify-between">
                            <span className="text-xs text-gray-600 truncate pr-2">
                              {field.name}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-xs px-1.5 py-0.5 bg-white rounded text-gray-500 border">
                                {field.type}
                              </span>
                              {field.required && (
                                <span className="text-xs text-red-500 font-medium">*</span>
                              )}
                            </div>
                          </div>
                        ))}
                        {template.fields.length > 3 && (
                          <div className="text-xs text-gray-500 text-center pt-1">
                            +{template.fields.length - 3} more fields
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Dimensions */}
                  {template.dimensions && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                        Dimensions
                      </h4>
                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>QR Code:</span>
                          <span className="font-mono">
                            {template.dimensions.qrCode.width} × {template.dimensions.qrCode.height}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Label:</span>
                          <span className="font-mono">
                            {template.dimensions.label.width} × {template.dimensions.label.height}
                          </span>
                        </div>
                        {template.dimensions.margins && (
                          <div className="flex justify-between">
                            <span>Margins:</span>
                            <span className="font-mono">
                              {template.dimensions.margins.top}/{template.dimensions.margins.sides}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  {/*<button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                    onClick={() => console.log('Selected template:', template.id)}
                  >
                    Use Template
                  </button> */}

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
                    className="w-full bg-white hover:bg-gray-50 text-gray-700 py-2.5 px-4 rounded-lg font-medium border border-gray-300 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    )}

    {/* Empty State */}
    {!loading && templates.length === 0 && !error && (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-20"
      >
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No templates available</h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Templates will appear here once they're loaded. Please try refreshing the page.
        </p>
      </motion.div>
    )}
  </motion.div>
);
};
