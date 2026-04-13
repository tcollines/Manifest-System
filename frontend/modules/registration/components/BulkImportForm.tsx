import React from 'react';
import { useRegistration } from '../RegistrationContext';
import { ArrowLeft, Upload } from 'lucide-react';

export default function BulkImportForm() {
    const {
        viewMode,
        bulkMemberText,
        setBulkMemberText,
        handleBulkMemberImport,
        handleFileUpload,
        isImporting,
        importProgress,
        handleBackRegistration
    } = useRegistration();

    if (viewMode !== 'bulk-import-members') return null;

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in p-4 md:p-0">
            <div className="flex items-center space-x-3 border-b border-gray-100 pb-4">
                <button onClick={handleBackRegistration} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h2 className="text-xl font-bold text-ministry-text">Bulk Member Import</h2>
            </div>

            <form onSubmit={handleBulkMemberImport} className="space-y-6 bg-white p-8 rounded-2xl border border-gray-200 shadow-lg">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-2">
                    <p className="text-sm font-bold text-blue-800">Instructions</p>
                    <p className="text-xs text-blue-700 mt-1">Upload an Excel file (.xlsx) or copy and paste cells.</p>
                    <p className="text-xs text-blue-700 mt-1">
                        Columns Order: <span className="font-mono bg-blue-100 px-1 rounded font-bold">Name | Residence | Contact | Gender</span>
                    </p>
                    <p className="text-xs text-blue-600 mt-1 italic">* All imports will be categorized as "Member".</p>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Upload Excel File</label>
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={handleFileUpload}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-ministry-orange file:text-white hover:file:bg-orange-600"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Or Paste Excel Data Here</label>
                    <textarea
                        required
                        value={bulkMemberText}
                        onChange={e => setBulkMemberText(e.target.value)}
                        className="w-full p-4 h-64 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none font-mono text-sm whitespace-pre"
                        placeholder={`John Doe\tEntebbe\t0772123456\tMale\nJane Smith\tKampala\t0700987654\tFemale`}
                    />
                </div>

                <div className="flex justify-end pt-4">
                    <button type="submit" className="flex items-center space-x-2 bg-ministry-text text-white px-6 py-3 rounded-xl font-bold hover:bg-ministry-orange transition-colors shadow-lg">
                        <Upload className="w-4 h-4" />
                        <span>Import Members</span>
                    </button>
                </div>
            </form>

            {/* Loading overlay */}
            {isImporting && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center space-y-4">
                        <div className="w-12 h-12 border-4 border-ministry-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <h3 className="text-xl font-bold text-gray-800">Importing Members...</h3>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div className="bg-ministry-orange h-2.5 rounded-full transition-all duration-300" style={{ width: `${importProgress}%` }}></div>
                        </div>
                        <p className="text-gray-500 font-mono">{importProgress}% Complete</p>
                    </div>
                </div>
            )}
        </div>
    );
}
