const Call = require('../models/Call');
const User = require('../models/User');

// Initiate Call
exports.initiateCall = async (req, res) => {
  try {
    const callerId = req.user._id;
    const { targetUserId, conversationId, callType, offer } = req.body;

    if (!targetUserId || !offer) {
      return res.status(400).json({
        success: false,
        message: 'Target user ID and WebRTC offer are required',
      });
    }

    // Invalidate any older open call requests for this user
    await Call.updateMany(
      {
        $or: [
          { caller: callerId, status: 'calling' },
          { receiver: callerId, status: 'calling' },
        ],
      },
      { status: 'ended', endedAt: new Date() }
    );

    const newCall = await Call.create({
      caller: callerId,
      receiver: targetUserId,
      conversation: conversationId || null,
      callType: callType || 'video',
      status: 'calling',
      offer,
    });

    // If Socket.IO is initialized on this node instance, emit directly
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${targetUserId}`).emit('call:incoming', {
        callId: newCall._id,
        caller: {
          _id: callerId,
          username: req.user.username,
          profilePicture: req.user.profilePicture || '',
        },
        targetUserId,
        conversationId,
        callType: newCall.callType,
        offer,
      });
    }

    res.status(201).json({
      success: true,
      data: {
        callId: newCall._id,
        callType: newCall.callType,
        status: newCall.status,
      },
    });
  } catch (err) {
    console.error('Error in initiateCall:', err.message);
    res.status(500).json({ success: false, message: 'Failed to initiate call session' });
  }
};

// Check for Incoming Calls (For HTTP polling fallback)
exports.checkIncomingCall = async (req, res) => {
  try {
    const userId = req.user._id;
    const incoming = await Call.findOne({
      receiver: userId,
      status: 'calling',
      createdAt: { $gte: new Date(Date.now() - 45000) },
    }).populate('caller', '_id username profilePicture bio');

    res.status(200).json({
      success: true,
      call: incoming || null,
    });
  } catch (err) {
    console.error('Error in checkIncomingCall:', err.message);
    res.status(500).json({ success: false, message: 'Error checking calls' });
  }
};

// Sync Call Status & ICE Candidates
exports.getCallSync = async (req, res) => {
  try {
    const { callId } = req.params;
    const call = await Call.findById(callId).populate('caller receiver', '_id username profilePicture');

    if (!call) {
      return res.status(404).json({ success: false, message: 'Call not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        callId: call._id,
        status: call.status,
        callType: call.callType,
        answer: call.answer,
        rejectReason: call.rejectReason,
        callerCandidates: call.callerCandidates || [],
        receiverCandidates: call.receiverCandidates || [],
      },
    });
  } catch (err) {
    console.error('Error in getCallSync:', err.message);
    res.status(500).json({ success: false, message: 'Error syncing call' });
  }
};

// Accept Call
exports.acceptCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const { answer } = req.body;
    const userId = req.user._id;

    const call = await Call.findById(callId);
    if (!call) {
      return res.status(404).json({ success: false, message: 'Call session not found' });
    }

    call.status = 'accepted';
    call.answer = answer;
    await call.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${call.caller}`).emit('call:accepted', {
        callId: call._id,
        targetUserId: userId,
        answer,
        callType: call.callType,
      });
    }

    res.status(200).json({ success: true, message: 'Call accepted' });
  } catch (err) {
    console.error('Error in acceptCall:', err.message);
    res.status(500).json({ success: false, message: 'Error accepting call' });
  }
};

// Reject Call
exports.rejectCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    const call = await Call.findById(callId);
    if (call) {
      call.status = 'rejected';
      call.rejectReason = reason || 'declined';
      call.endedAt = new Date();
      await call.save();

      const io = req.app.get('io');
      if (io) {
        const peerId = call.caller.toString() === userId.toString() ? call.receiver : call.caller;
        io.to(`user:${peerId}`).emit('call:rejected', {
          callId: call._id,
          reason: call.rejectReason,
        });
      }
    }

    res.status(200).json({ success: true, message: 'Call rejected' });
  } catch (err) {
    console.error('Error in rejectCall:', err.message);
    res.status(500).json({ success: false, message: 'Error rejecting call' });
  }
};

// Add ICE Candidate
exports.addCandidate = async (req, res) => {
  try {
    const { callId } = req.params;
    const { candidate } = req.body;
    const userId = req.user._id;

    const call = await Call.findById(callId);
    if (!call) return res.status(404).json({ success: false });

    const isCaller = call.caller.toString() === userId.toString();
    if (isCaller) {
      call.callerCandidates.push(candidate);
    } else {
      call.receiverCandidates.push(candidate);
    }
    await call.save();

    const io = req.app.get('io');
    if (io) {
      const peerId = isCaller ? call.receiver : call.caller;
      io.to(`user:${peerId}`).emit('call:ice_candidate', {
        callId: call._id,
        userId,
        candidate,
      });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

// End Call
exports.endCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user._id;

    const call = await Call.findById(callId);
    if (call) {
      call.status = 'ended';
      call.endedAt = new Date();
      await call.save();

      const io = req.app.get('io');
      if (io) {
        const peerId = call.caller.toString() === userId.toString() ? call.receiver : call.caller;
        io.to(`user:${peerId}`).emit('call:ended', {
          callId: call._id,
          userId,
        });
      }
    }

    res.status(200).json({ success: true, message: 'Call ended' });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};
