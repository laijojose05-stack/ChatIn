const express = require('express');
const router = express.Router();
const callController = require('../controllers/callController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/initiate', callController.initiateCall);
router.get('/incoming', callController.checkIncomingCall);
router.get('/sync/:callId', callController.getCallSync);
router.post('/accept/:callId', callController.acceptCall);
router.post('/reject/:callId', callController.rejectCall);
router.post('/candidate/:callId', callController.addCandidate);
router.post('/end/:callId', callController.endCall);

module.exports = router;
