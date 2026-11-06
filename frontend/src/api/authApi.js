import axiosClient from './axiosClient';

export const authApi = {
  register: (data) => axiosClient.post('/auth/register', data),
  login: (data) => axiosClient.post('/auth/login', data),
  getMe: () => axiosClient.get('/auth/me'),
  updateProfile: (data) => axiosClient.put('/auth/profile', data),
  changePassword: (data) => axiosClient.put('/auth/password', data),
  uploadAvatar: (formData) =>
    axiosClient.post('/auth/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  logout: () => axiosClient.post('/auth/logout'),
};
