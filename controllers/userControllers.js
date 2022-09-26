const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const asyncHandler = require('express-async-handler');

//* Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    })
  }

//? Desc: Registering an user
//* Route: POST api/users
//! Access: Public

const registerUser = asyncHandler( async (req, res) => {

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        res.status(400)
        throw new Error('Please add all fields')
    }

    //* Check if user is already existing
    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('User with this email already exists');
    }

    //* Password hash
    const salt = await bcrypt.genSalt(10);
    const hashedPwd = await bcrypt.hash(password, salt);

    //* Create a user
    const user = await User.create({
        name,
        email,
        password: hashedPwd
    });

    if (user) {
        res.status(201).json({ 
            _id: user._id,
            username: user.name,
            email: user.email,
            token: generateToken(user._id)
        })
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

const loginUser = asyncHandler( async (req, res) => {
    const { email, password } = req.body;

    //* Check for user email
    const user = await User.findOne({ email })

    if (user && (await bcrypt.compare(password, user.password))) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id),
        })
    } else {
        res.status(400)
        throw new Error('Invalid credentials')
  }
});

const getMe = asyncHandler( async (req, res) => {
    res.status(200).json(req.user);
});

const getUser = asyncHandler( async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        res.status(404).json({ message: 'User dooes not exist' })
    }
    
    res.status(200).json({ name: user.name, email: user.email })
});

const updateUser = asyncHandler( async (req, res) => {

});

module.exports = {
    registerUser,
    loginUser,
    getMe,
    getUser,
    updateUser
}