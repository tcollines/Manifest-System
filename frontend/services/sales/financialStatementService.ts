import { apiFetch } from '../api';

export interface BusinessDocument {
    id: string;
    manifest_id: string;
    document_name: string;
    report_type: string;
    date_range: string;
    generated_by_name: string;
    generated_by_uid: string;
    format: string;
    status: 'GENERATED' | 'PENDING' | 'ARCHIVED';
    report_data: any;
    created_at: string;
    updated_at: string;
}

export const financialStatementService = {
    async getDocuments(): Promise<BusinessDocument[]> {
        const response = await apiFetch('/sales/documents');
        return response as BusinessDocument[];
    },

    async generateDocument(documentName: string, reportType: string, dateRange: string): Promise<BusinessDocument> {
        const response = await apiFetch('/sales/documents/generate', {
            method: 'POST',
            body: JSON.stringify({ documentName, reportType, dateRange })
        });
        return response as BusinessDocument;
    },

    async updateStatus(id: string, status: string): Promise<BusinessDocument> {
        const response = await apiFetch(`/sales/documents/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
        return response as BusinessDocument;
    },

    async deleteDocument(id: string): Promise<void> {
        await apiFetch(`/sales/documents/${id}`, {
            method: 'DELETE'
        });
    }
};
