import React from 'react';
import Sidebar from '../components/sidebar/Sidebar';
import ChatArea from '../components/chat/ChatArea';

const ChatDashboard = () => {
  return (
    <div className="app-container">
      <Sidebar />
      <ChatArea />
    </div>
  );
};

export default ChatDashboard;
