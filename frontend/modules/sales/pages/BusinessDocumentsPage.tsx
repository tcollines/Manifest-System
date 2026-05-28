import React, { useState, useEffect } from 'react';
import { 
  FileText, Download, Eye, Plus, Search, Filter, Trash2
} from 'lucide-react';
import { financialStatementService, BusinessDocument } from '../../../services/sales/financialStatementService';
import { reportExportService } from '../../../services/sales/reportExportService';
import { useNotification } from '../../../components/ui/NotificationSystem';

const BusinessDocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<BusinessDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  const { showToast } = useNotification();

  const REPORT_TYPES = [
    'Profit & Loss Statement',
    'Inventory Valuation Report',
    'Cash Position Report',
    'Balance Sheet',
    'Sales Report',
    'Sales & Inventory Summary',
    'Supplier Ledger'
  ];

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await financialStatementService.getDocuments();
      setDocuments(data);
    } catch (e: any) {
      showToast(e.message || 'Failed to load documents', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const reportType = formData.get('reportType') as string;
    const dateRange = formData.get('dateRange') as string;
    const customName = formData.get('documentName') as string;

    const documentName = customName || `${reportType} - ${dateRange}`;

    try {
      setGenerating(true);
      await financialStatementService.generateDocument(documentName, reportType, dateRange);
      showToast('Document generated successfully', 'success');
      setShowGenerateModal(false);
      loadDocuments();
    } catch (e: any) {
      showToast(e.message || 'Failed to generate document', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handlePreview = async (doc: BusinessDocument) => {
    try {
      await reportExportService.previewDocument(doc);
    } catch (e: any) {
      showToast(e.message || 'Failed to preview document', 'error');
    }
  };

  const handleDownload = async (doc: BusinessDocument) => {
    try {
      await reportExportService.exportDocument(doc, 'PDF');
      showToast('Download started', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to download document', 'error');
    }
  };

  const handleDelete = async (doc: BusinessDocument) => {
    if (!window.confirm(`Are you sure you want to delete "${doc.document_name}"? This action cannot be undone.`)) return;
    try {
      await financialStatementService.deleteDocument(doc.id);
      showToast('Document deleted successfully', 'success');
      loadDocuments();
    } catch (e: any) {
      showToast(e.message || 'Failed to delete document', 'error');
    }
  };

  const filteredDocs = documents.filter(doc => 
    doc.document_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.report_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full min-w-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Document Archive</h2>
          <p className="text-sm text-gray-500 mt-1">Generated financial statements and operational reports.</p>
        </div>
        <button 
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center justify-center shrink-0 whitespace-nowrap gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Generate New Report
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row gap-3 justify-between items-center">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 bg-white w-full sm:w-auto justify-center">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-full">
            <thead>
              <tr className="bg-white border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                <th className="p-4 font-semibold">Document Name</th>
                <th className="p-4 font-semibold">Report Type</th>
                <th className="p-4 font-semibold">Period</th>
                <th className="p-4 font-semibold">Date Generated</th>
                <th className="p-4 font-semibold">Format</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    <div className="flex justify-center mb-2"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
                    Loading documents...
                  </td>
                </tr>
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-500">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-lg font-medium text-gray-900">No documents found</p>
                    <p className="text-sm">Generate a new report to get started.</p>
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{doc.document_name}</p>
                          <p className="text-xs text-gray-500 truncate">By: {doc.generated_by_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600 truncate max-w-[120px] sm:max-w-none">{doc.report_type}</td>
                    <td className="p-4 text-sm font-medium text-gray-700 whitespace-nowrap">{doc.date_range}</td>
                    <td className="p-4 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(doc.created_at).toLocaleDateString()} <span className="text-xs hidden sm:inline">{new Date(doc.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-50 text-red-700 text-xs font-medium border border-red-100">
                        PDF
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handlePreview(doc)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Preview PDF"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDownload(doc)}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Download PDF"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(doc)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Document"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200">
            <h2 className="text-xl font-bold mb-1 text-gray-900">Generate Report</h2>
            <p className="text-sm text-gray-500 mb-6">Create a new snapshot of financial or operational data.</p>
            
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Type <span className="text-red-500">*</span></label>
                <select 
                  name="reportType" 
                  required
                  className="w-full p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a report type...</option>
                  {REPORT_TYPES.map(rt => (
                    <option key={rt} value={rt}>{rt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Range <span className="text-red-500">*</span></label>
                <select 
                  name="dateRange" 
                  required
                  className="w-full p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="All Time">All Time</option>
                  <option value="Today">Today</option>
                  <option value="This Week">This Week</option>
                  <option value="This Month">This Month</option>
                  <option value="Q1">Q1</option>
                  <option value="Q2">Q2</option>
                  <option value="Q3">Q3</option>
                  <option value="Q4">Q4</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Custom Document Name (Optional)</label>
                <input 
                  type="text" 
                  name="documentName" 
                  placeholder="e.g. Q1 Final P&L Statement"
                  className="w-full p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowGenerateModal(false)} 
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={generating}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-70 flex justify-center items-center gap-2"
                >
                  {generating ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Generating...</>
                  ) : (
                    'Generate Document'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessDocumentsPage;
