import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to add authorization token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiry / unauthorized requests
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (email, password) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    const response = await api.post('/auth/login', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
    }
    return response.data;
  },
  
  register: async (fullName, email, password, roleName) => {
    const response = await api.post('/auth/register', {
      full_name: fullName,
      email,
      password,
      role_name: roleName,
    });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    localStorage.setItem('user', JSON.stringify(response.data));
    return response.data;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
};

export const storeService = {
  list: async () => {
    const response = await api.get('/stores/');
    return response.data;
  },
  get: async (id) => {
    const response = await api.get(`/stores/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/stores/', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/stores/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/stores/${id}`);
    return response.data;
  }
};

export const zoneService = {
  listByStore: async (storeId) => {
    const response = await api.get(`/zones/store/${storeId}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/zones/', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/zones/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/zones/${id}`);
    return response.data;
  }
};

export const shelfService = {
  listByZone: async (zoneId) => {
    const response = await api.get(`/shelves/zone/${zoneId}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/shelves/', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/shelves/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/shelves/${id}`);
    return response.data;
  },
  assignProduct: async (shelfId, productId, position) => {
    const response = await api.post(`/shelves/${shelfId}/products`, {
      product_id: productId,
      position,
    });
    return response.data;
  },
  removeProduct: async (shelfId, productId) => {
    const response = await api.delete(`/shelves/${shelfId}/products/${productId}`);
    return response.data;
  }
};

export const productService = {
  list: async () => {
    const response = await api.get('/products/');
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/products/', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/products/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  }
};

export const cameraService = {
  listByStore: async (storeId) => {
    const response = await api.get(`/cameras/store/${storeId}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/cameras/', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/cameras/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/cameras/${id}`);
    return response.data;
  }
};

export const userService = {
  list: async () => {
    const response = await api.get('/users/');
    return response.data;
  },
  updateRole: async (userId, roleId, isActive) => {
    const response = await api.put(`/users/${userId}/role`, {
      role_id: roleId,
      is_active: isActive,
    });
    return response.data;
  },
  delete: async (userId) => {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
  }
};

export const eventService = {
  list: async (limit = 50) => {
    const response = await api.get('/events/', { params: { limit } });
    return response.data;
  },
  create: async (message, type = 'info') => {
    const response = await api.post('/events/', { message, type });
    return response.data;
  }
};

export const analyticsService = {
  listDwellTimes: async () => {
    const response = await api.get('/analytics/dwell-times');
    return response.data;
  },
  listAttractiveness: async () => {
    const response = await api.get('/analytics/attractiveness');
    return response.data;
  },
  listSessions: async (storeId, limit = 20) => {
    const response = await api.get('/analytics/sessions', { params: { store_id: storeId, limit } });
    return response.data;
  },
  uploadVideo: async (storeId, file) => {
    const formData = new FormData();
    formData.append('store_id', storeId);
    formData.append('file', file);
    const response = await api.post('/analytics/upload-video', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
};

export default api;

