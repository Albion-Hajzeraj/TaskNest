import { request } from './tasks-api';

export const generateSubtasks = (task) =>
  request('/api/ai/subtasks', {
    method: 'POST',
    body: JSON.stringify({ task })
  });
