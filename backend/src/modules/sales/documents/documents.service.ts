import { supabase } from '../../../supabase';
import * as reportsService from '../reports/reports.service';

export const getDocuments = async (manifestId: string) => {
    const { data, error } = await supabase
        .from('sales_business_documents')
        .select('*')
        .eq('manifest_id', manifestId)
        .order('created_at', { ascending: false });
        
    if (error) throw error;
    return data || [];
};

export const generateDocument = async (
    manifestId: string, 
    documentName: string, 
    reportType: string, 
    dateRange: string, 
    actorName: string | undefined, 
    actorId: string | undefined
) => {
    // 1. Snapshot the required data based on the report type
    let reportData: any = {};
    const today = new Date().toISOString().split('T')[0];

    try {
        switch (reportType) {
            case 'Profit & Loss Statement':
            case 'Income Statement':
            case 'Sales Report':
                reportData = await reportsService.fetchAllTimeStats(manifestId);
                // Also get daily stats if it's for today
                if (dateRange === 'Today') {
                    reportData = await reportsService.getDailySales(manifestId, today);
                }
                break;
            case 'Balance Sheet':
            case 'Cash Position Report':
                reportData = await reportsService.fetchFinancialPosition(manifestId);
                break;
            case 'Inventory Valuation Report':
                reportData = await reportsService.fetchInventoryValuation(manifestId);
                break;
            case 'Sales & Inventory Summary':
                reportData = await reportsService.getSalesSummary(manifestId);
                break;
            case 'Supplier Ledger':
                // For a specific supplier, we would pass supplierId, but for now we snapshot overall position
                reportData = await reportsService.fetchFinancialPosition(manifestId);
                break;
            default:
                reportData = { message: 'Snapshot not fully supported for this type yet' };
        }
    } catch (e) {
        console.error('Error snapshotting report data:', e);
        // Continue and save without data rather than failing completely
    }

    // 2. Save the record to the database
    const { data: doc, error } = await supabase
        .from('sales_business_documents')
        .insert([{
            manifest_id: manifestId,
            document_name: documentName,
            report_type: reportType,
            date_range: dateRange,
            generated_by_name: actorName || 'System',
            generated_by_uid: actorId || null,
            status: 'GENERATED',
            format: 'PDF',
            report_data: reportData
        }])
        .select()
        .single();

    if (error) throw error;
    return doc;
};

export const updateDocumentStatus = async (manifestId: string, documentId: string, status: string) => {
    const { data, error } = await supabase
        .from('sales_business_documents')
        .update({ status })
        .eq('id', documentId)
        .eq('manifest_id', manifestId)
        .select()
        .single();
        
    if (error) throw error;
    return data;
};
