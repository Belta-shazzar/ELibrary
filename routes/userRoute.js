const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

const { getMe, getUser, loginUser, registerUser, updateUser, confirmEmail, resendEmail } = require('../controllers/userControllers');

router.post('/', registerUser);
router.post('/login', loginUser);
router.get('/confirmation/:email/:token', confirmEmail);
router.post('/confirmation/resendEmail', resendEmail );
router.get('/me', protect, getMe);
router.put('/:id', protect, updateUser);
router.get('/:id', getUser);

module.exports = router;