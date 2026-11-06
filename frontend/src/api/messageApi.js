import axiosClient from './axiosClient';

export const messageApi = {
  getMessages: (conversationId, limit = 40, before = null) => {
    let url = `/messages/${conversationId}?limit=${limit}`;
    if (before) {
      url += `&before=${encodeURIComponent(before)}`;
    }
    return axiosClient.get(url);
  },
  sendMessage: (data) => axiosClient.post('/messages', data),
  editMessage: (id, content) => axiosClient.put(`/messages/${id}`, { content }),
  deleteMessage: (id) => axiosClient.delete(`/messages/${id}`),
  markAsRead: (conversationId) =>
    axiosClient.post(`/messages/${conversationId}/read`),
  uploadAttachments: (formData) =>
    axiosClient.post('/messages/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};
