const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    conversationType: {
      type: String,
      enum: ['private', 'group'],
      default: 'private',
    },
    groupName: {
      type: String,
      trim: true,
      default: null,
    },
    groupDescription: {
      type: String,
      trim: true,
      default: null,
    },
    groupPicture: {
      type: String,
      default: '',
    },
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast querying of user's active conversations
conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);
module.exports = Conversation;
