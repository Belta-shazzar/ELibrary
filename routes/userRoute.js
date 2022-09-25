const express = require('express');
const router = express.Router();

const { getMe, getUser, loginUser, registerUser, updateUser } = require('../controllers/userControllers');

router.post('/', registerUser);
router.post('/login', loginUser);
router.get('/me', getMe);
router.put('/:id', updateUser);
router.get('/:id', getUser);

module.exports = router;