const API_BASE_URL = process.env.REACT_APP_API_URL || '';

const buildUrl = (path) => `${API_BASE_URL}${path}`;

const request = async (path, options = {}) => {
  const response = await fetch(buildUrl(path), {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    let message = 'Request failed';
    try {
      const data = await response.json();
      if (data?.message) message = data.message;
    } catch {
      // no-op
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
};

export const getTasks = () => request('/api/tasks');

export const createTask = (payload) =>
  request('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

export const updateTask = (id, payload) =>
  request(`/api/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });

export const deleteTask = (id) =>
  request(`/api/tasks/${id}`, {
    method: 'DELETE'
  });
