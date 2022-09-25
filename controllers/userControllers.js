const User = require('../models/userModel');
const asyncHandler = require('express-async-handler');

const registerUser = asyncHandler( async (req, res) => {

});

const loginUser = asyncHandler( async (req, res) => {

});

const getMe = asyncHandler( async (req, res) => {
    // res.status(200).json("Hello svijete!");
    res.send("Hello svihjete!");
});

const getUser = asyncHandler( async (req, res) => {

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