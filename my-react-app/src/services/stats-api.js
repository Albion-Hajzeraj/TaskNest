import { request } from './tasks-api';

export const getStats = () => request('/api/stats');
