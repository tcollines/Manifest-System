import { apiFetch } from '../api';

export const cashPositionService = {
  async getCashPosition(manifestId: string): Promise<any> {
    const data = await apiFetch('/sales/reports/cash-position');
    return data;
  }
};
