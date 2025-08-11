import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Events API
export const eventsAPI = {
  getAll: (params = {}) => api.get('/events', { params }),
  getById: (id: string) => api.get(`/events/${id}`),
  getFeatured: () => api.get('/events/featured/list'),
  getSeats: (eventId: string) => api.get(`/events/${eventId}/seats`),
  getCategories: () => api.get('/events/meta/categories'),
};

// Seats API
export const seatsAPI = {
  hold: (seatId: string) => api.post(`/seats/${seatId}/hold`),
  release: (seatId: string) => api.post(`/seats/${seatId}/release`),
  getAvailability: (eventId: string) => api.get(`/seats/availability/${eventId}`),
};

// Reservations API
export const reservationsAPI = {
  create: (data: any) => api.post('/reservations', data),
  getAll: (params = {}) => api.get('/reservations', { params }),
  getById: (id: string) => api.get(`/reservations/${id}`),
  cancel: (id: string) => api.put(`/reservations/${id}/cancel`),
  getQR: (id: string) => api.get(`/reservations/${id}/qr`),
  resendEmail: (id: string) => api.post(`/reservations/${id}/resend-email`),
};

// Admin API
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  
  // Events
  createEvent: (data: any) => api.post('/admin/events', data),
  getEvents: (params = {}) => api.get('/admin/events', { params }),
  updateEvent: (id: string, data: any) => api.put(`/admin/events/${id}`, data),
  deleteEvent: (id: string) => api.delete(`/admin/events/${id}`),
  
  // Users
  getUsers: (params = {}) => api.get('/admin/users', { params }),
  updateUserStatus: (id: string, isActive: boolean) => 
    api.put(`/admin/users/${id}/status`, { isActive }),
  
  // Reservations
  getReservations: (params = {}) => api.get('/admin/reservations', { params }),
};

// Gallery API
export const galleryAPI = {
  list: () => api.get('/gallery'),
  create: (data: FormData) => api.post('/gallery', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  adminList: () => api.get('/gallery/admin'),
  update: (id: string, data: FormData | any) => api.put(`/gallery/${id}`, data),
  remove: (id: string) => api.delete(`/gallery/${id}`),
};

export default api;

// Announcements API
export const announcementsAPI = {
  listPublic: () => api.get('/announcements'),
  adminList: () => api.get('/announcements/admin'),
  create: (data: any) => api.post('/announcements/admin', data),
  update: (id: string, data: any) => api.put(`/announcements/admin/${id}`, data),
  remove: (id: string) => api.delete(`/announcements/admin/${id}`),
};
