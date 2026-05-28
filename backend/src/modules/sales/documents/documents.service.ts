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
                reportData = await reportsService.fetchDetailedProfitAndLoss(manifestId);
                break;
            case 'Sales Report':
                reportData = await reportsService.fetchDetailedSalesReport(manifestId);
                break;
            case 'Balance Sheet':
                reportData = await reportsService.fetchFinancialPosition(manifestId);
                break;
            case 'Cash Position Report':
                reportData = await reportsService.fetchCashbookData(manifestId);
                break;
            case 'Inventory Valuation Report':
                reportData = await reportsService.fetchInventoryValuation(manifestId);
                break;
            case 'Sales & Inventory Summary':
                reportData = await reportsService.getSalesSummary(manifestId);
                break;
            case 'Supplier Ledger':
                reportData = await reportsService.fetchSupplierLedger(manifestId);
                break;
            case 'Procurement Report':
                reportData = await reportsService.fetchDetailedProcurementReport(manifestId);
                break;
            default:
                reportData = await reportsService.fetchFinancialPosition(manifestId);
        }
    } catch (e) {
        console.error('Error snapshotting report data:', e);
        // Continue and save without data rather than failing completely
    }

    let finalActorName = actorName;
    let finalActorRole = 'System Administrator';
    if (actorId) {
        const { data: userData } = await supabase.from('users').select('name, role').eq('id', actorId).single();
        if (userData) {
            if (!finalActorName && userData.name) finalActorName = userData.name;
            if (userData.role) finalActorRole = userData.role;
        }
    }
    
    // Attach the generator role to report data for PDF rendering
    reportData = reportData || {};
    reportData.generator_role = finalActorRole;

    // 2. Save the record to the database
    const { data: doc, error } = await supabase
        .from('sales_business_documents')
        .insert([{
            manifest_id: manifestId,
            document_name: documentName,
            report_type: reportType,
            date_range: dateRange,
            generated_by_name: finalActorName || 'System',
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
    const { data: doc, error } = await supabase
        .from('sales_business_documents')
        .update({ status })
        .eq('manifest_id', manifestId)
        .eq('id', documentId)
        .select()
        .single();
        
    if (error) throw error;
    return doc;
};

export const deleteDocument = async (manifestId: string, id: string) => {
    const { data: doc, error } = await supabase
        .from('sales_business_documents')
        .delete()
        .eq('manifest_id', manifestId)
        .eq('id', id)
        .select()
        .single();
        
    if (error) throw error;
    return doc;
};
