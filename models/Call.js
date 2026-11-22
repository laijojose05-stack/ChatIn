const mongoose = require('mongoose');

const callSchema = new mongoose.Schema(
  {
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      default: null,
    },
    callType: {
      type: String,
      enum: ['video', 'audio'],
      default: 'video',
    },
    status: {
      type: String,
      enum: ['calling', 'accepted', 'rejected', 'ended'],
      default: 'calling',
      index: true,
    },
    rejectReason: {
      type: String,
      default: null,
    },
    offer: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    answer: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    callerCandidates: [
      {
        type: mongoose.Schema.Types.Mixed,
      },
    ],
    receiverCandidates: [
      {
        type: mongoose.Schema.Types.Mixed,
      },
    ],
    acceptedAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number, // in seconds
      default: 0,
    },
    deletedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

callSchema.index({ receiver: 1, status: 1 });
callSchema.index({ caller: 1, status: 1 });
callSchema.index({ createdAt: -1 });

const Call = mongoose.model('Call', callSchema);
module.exports = Call;
