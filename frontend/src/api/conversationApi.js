import axiosClient from './axiosClient';

export const conversationApi = {
  getConversations: () => axiosClient.get('/conversations'),
  getOrCreatePrivate: (recipientId) =>
    axiosClient.post('/conversations', { recipientId }),
  createGroup: (formData) =>
    axiosClient.post('/conversations/group', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getById: (id) => axiosClient.get(`/conversations/${id}`),
  updateGroup: (id, formData) =>
    axiosClient.put(`/conversations/${id}/group`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  addParticipants: (id, participantIds) =>
    axiosClient.post(`/conversations/${id}/participants`, { participantIds }),
  removeParticipant: (id, userId) =>
    axiosClient.delete(`/conversations/${id}/participants/${userId}`),
  toggleAdmin: (id, targetUserId, action) =>
    axiosClient.put(`/conversations/${id}/admins`, { targetUserId, action }),
};
