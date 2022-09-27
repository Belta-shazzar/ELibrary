const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const asyncHandler = require('express-async-handler');
const TokenVerif = require('../models/tokenVerifModel');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

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
        const token = await TokenVerif.create({ user_id: user._id, token: crypto.randomBytes(16).toString('hex') });

        if (token) {
            const transporter = nodemailer.createTransport({ 
                host: 'smtp-relay.sendinblue.com',
                port: 587,
                auth: { 
                    user: process.env.AUTH_EMAIL, 
                    pass: process.env.AUTH_PASS
                } 
            });

            // transporter.verify((error, success) => {
            //     if (error) {
            //         console.log(error)
            //     }   else {
            //         console.log(success)
            //         console.log("Ready to send")
            //     }
            // })


            const mailOptions = { 
                from: 'ovoexample@gmail.com', 
                to: user.email,     
                subject: 'Account Verification Link', 
                html: 'Hello '+ req.body.name +',\n\n' + 'Please verify your account by clicking the link: \nhttp:\/\/' + req.headers.host + '\/api/users/confirmation\/' + user.email + '\/' + token.token + '\n\nThank You!\n' 
            };
            
            try {
                const sendResult = await transporter.sendMail(mailOptions);
                // console.log(sendResult)
            } catch (error) {
                // console.log(error)
                // console.log(user.email)
                throw new Error("Error ocurred sending an email ")
            }
        } else {
            res.status(400);
            throw new Error('Failed to verify your email');
        }   

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

//* Confirm email

const confirmEmail = asyncHandler( async (req, res) => {
    const token = await TokenVerif.findOne({ token: req.params.token });

    if (!token) {
        res.status(400);
        throw new Error('Your verification link may have expired. Please click on resend for verify your Email.');
    } else {
        const user = await User.findById(token.user_id);

        if (!user) {
            res.status(401);
            throw new Error('We were unable to find a user for this verification. Please SignUp!');
        } else if (user.isActive) {
            res.status(200);
            throw new Error('User has been already verified. Please Login');
        } else {
            user.isActive = true;
            try {
                await User.updateOne({ _id: token.user_id }, user);   
                // const updated = User.findById(token.user_id);
                console.log(user)
                res.status(200).json(`${user.email} has been verified!`);
            } catch (error) {
                console.log(error);
                res.status(400);
                throw new Error('Failed to verify the user');
            }
        }
    }
});

//? Desc: Logging an user
//* Route: POST api/users/login
//! Access: Public

const loginUser = asyncHandler( async (req, res) => {
    const { email, password } = req.body;

    //* Check for user email
    const user = await User.findOne({ email })

    if (user && (await bcrypt.compare(password, user.password))) {

        if (!user.isActive) {
            res.status(401);
            throw new Error('Your Email has not been verified. Please click on resend');
        } else {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token: generateToken(user._id),
            })
        }
    } else {
        res.status(400);
        throw new Error('Invalid credentials');
  }
});

//? Desc: Get data for currently logged in user
//* Route: GET api/users/me
//! Access: Private

const getMe = asyncHandler( async (req, res) => {
    res.status(200).json(req.user);
});

//? Desc: Getting an user info
//* Route: GET api/users/:id
//! Access: Public

const getUser = asyncHandler( async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        res.status(404).json({ message: 'User dooes not exist' })
    }
    
    res.status(200).json({ name: user.name, email: user.email })
});

//? Desc: Update currently logged in user
//* Route: PUT api/users/:id
//! Access: Private

const updateUser = asyncHandler( async (req, res) => {
    if (!req.user) {
        throw new Error('You are logged out');
    } 

    const data = {
        name: req.body.name
    }

    try {
        await User.updateOne({ _id: req.user._id }, data);
        const newUser = await User.findById(req.user._id);

        res.status(200).json({
            _id: newUser._id,
            name: newUser.name,
            email: newUser.email
        });
    } catch (error) {
        console.log(error)
    }
});

module.exports = {
    registerUser,
    loginUser,
    getMe,
    getUser,
    updateUser,
    confirmEmail
}