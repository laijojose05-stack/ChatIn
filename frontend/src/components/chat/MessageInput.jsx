import React, { useState, useRef } from 'react';
import {
  Send,
  Smile,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import EmojiPicker from '../common/EmojiPicker';
import { messageApi } from '../../api/messageApi';

const MessageInput = ({
  onSendMessage,
  onTyping,
  replyingTo,
  onCancelReply,
}) => {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleTextChange = (e) => {
    setText(e.target.value);
    onTyping(true);
  };

  const handleSelectEmoji = (emoji) => {
    setText((prev) => prev + emoji);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if ((!text.trim() && selectedFiles.length === 0) || uploading) return;

    try {
      setUploading(true);
      let attachments = [];

      // If user selected files, upload them
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach((file) => formData.append('attachments', file));
        const uploadRes = await messageApi.uploadAttachments(formData);
        if (uploadRes.success && uploadRes.data) {
          attachments = uploadRes.data;
        }
      }

      await onSendMessage({
        content: text.trim(),
        attachments,
        replyTo: replyingTo?._id || null,
        messageType:
          attachments.length > 0
            ? attachments[0].mimeType?.startsWith('image')
              ? 'image'
              : 'document'
            : 'text',
      });

      // Clear states
      setText('');
      setSelectedFiles([]);
      setShowEmoji(false);
      onCancelReply();
      onTyping(false);
    } catch (err) {
      console.error('Failed to dispatch message:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="composer-wrapper">
      {/* Emoji Picker Popup */}
      {showEmoji && (
        <EmojiPicker
          onSelectEmoji={handleSelectEmoji}
          onClose={() => setShowEmoji(false)}
        />
      )}

      {/* Quoted Reply Banner */}
      {replyingTo && (
        <div
          className="d-flex align-items-center justify-content-between p-2 rounded-2"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            fontSize: 'var(--text-xs)',
          }}
        >
          <div className="d-flex align-items-center gap-2 overflow-hidden">
            <div
              className="border-start border-2 border-primary ps-2 text-truncate"
              style={{ maxWidth: '420px' }}
            >
              <span className="fw-semibold text-primary">
                Replying to @{replyingTo.senderId?.username || 'user'}:
              </span>{' '}
              <span className="text-secondary">{replyingTo.content || 'Attachment'}</span>
            </div>
          </div>
          <button
            className="btn-icon"
            style={{ width: '24px', height: '24px' }}
            onClick={onCancelReply}
            title="Cancel reply"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Selected Attachments Chips */}
      {selectedFiles.length > 0 && (
        <div className="d-flex flex-wrap gap-2">
          {selectedFiles.map((file, idx) => (
            <div
              key={idx}
              className="d-flex align-items-center gap-1 py-1 px-2 rounded-pill"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
                fontSize: 'var(--text-2xs)',
              }}
            >
              {file.type?.startsWith('image') ? <ImageIcon size={12} /> : <FileText size={12} />}
              <span className="text-truncate" style={{ maxWidth: '140px' }}>
                {file.name}
              </span>
              <button
                type="button"
                className="btn-icon p-0 ms-1"
                style={{ width: '16px', height: '16px' }}
                onClick={() => removeFile(idx)}
                title="Remove attachment"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Composer Input Bar */}
      <form onSubmit={handleSubmit} className="composer-box">
        {/* Emoji Button */}
        <button
          type="button"
          className={`btn-icon ${showEmoji ? 'active' : ''}`}
          title="Add Emoji"
          onClick={() => setShowEmoji(!showEmoji)}
        >
          <Smile size={18} />
        </button>

        {/* Attachment Button */}
        <button
          type="button"
          className="btn-icon"
          title="Attach file"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip size={18} />
        </button>
        <input
          type="file"
          multiple
          ref={fileInputRef}
          className="d-none"
          onChange={handleFileChange}
        />

        {/* Message Input Field */}
        <input
          type="text"
          className="composer-input"
          placeholder="Type a message... (Press Enter to send)"
          value={text}
          onChange={handleTextChange}
          onBlur={() => onTyping(false)}
          disabled={uploading}
        />

        {/* Send Action */}
        <button
          type="submit"
          className="btn btn-primary-action px-3"
          style={{ height: '32px' }}
          disabled={(!text.trim() && selectedFiles.length === 0) || uploading}
          title="Send message"
        >
          {uploading ? (
            <span
              className="spinner-border spinner-border-sm"
              style={{ width: '12px', height: '12px' }}
            />
          ) : (
            <Send size={14} />
          )}
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
