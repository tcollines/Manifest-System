import { apiFetch } from '../api';

export const reportService = {
  async getDailySales(manifestId: string, date: string): Promise<any> {
    const data = await apiFetch(`/sales/reports/daily-sales?date=${date}`);
    return data;
  },

  async getAllTimeStats(manifestId: string): Promise<any> {
    const data = await apiFetch('/sales/reports/all-time-stats');
    return data;
  }
};
