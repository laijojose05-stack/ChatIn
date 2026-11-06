import axiosClient from './axiosClient';

export const notificationApi = {
  getNotifications: () => axiosClient.get('/notifications'),
  markAsRead: (id) => axiosClient.put(`/notifications/${id}/read`),
  markAllAsRead: () => axiosClient.put('/notifications/read-all'),
  deleteNotification: (id) => axiosClient.delete(`/notifications/${id}`),
};
