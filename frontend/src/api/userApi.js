import axiosClient from './axiosClient';

export const userApi = {
  searchUsers: (query = '') =>
    axiosClient.get(`/users${query ? `?search=${encodeURIComponent(query)}` : ''}`),
  getUserById: (id) => axiosClient.get(`/users/${id}`),
};
