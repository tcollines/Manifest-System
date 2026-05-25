import { apiFetch } from '../api';

export const financialReportService = {
  async getFinancialPosition(manifestId: string): Promise<any> {
    const data = await apiFetch('/sales/reports/financial-position');
    return data;
  }
};
