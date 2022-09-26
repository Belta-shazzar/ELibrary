const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

const { getMe, getUser, loginUser, registerUser, updateUser } = require('../controllers/userControllers');

router.post('/', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.put('/:id', protect, updateUser);
router.get('/:id', getUser);

module.exports = router;