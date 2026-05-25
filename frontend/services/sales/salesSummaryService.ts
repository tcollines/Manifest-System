import { apiFetch } from '../api';

export const salesSummaryService = {
  async getSummary(manifestId: string): Promise<any> {
    const data = await apiFetch('/sales/reports/summary');
    return data;
  }
};
