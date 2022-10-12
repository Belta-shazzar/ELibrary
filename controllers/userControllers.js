const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const asyncHandler = require('express-async-handler');
const TokenVerif = require('../models/tokenVerifModel');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const paypal = require("../config/paypal");
  

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
                host: 'smtp.gmail.com',
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
                from: process.env.AUTH_EMAIL, 
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

const resendEmail = asyncHandler( async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    const tokens = await TokenVerif.find({ user_id: user._id });

    if (!user) {
        res.status(400);
        throw new Error('Enter a valid email');
    } else if (user.isActive) {
        res.status(200);
        throw new Error('This account is already activated');
    } else if (tokens.length > 1) {
        res.status(400);
        throw new Error('Email has already been resent!');
    } else {
        const token = await TokenVerif.create({ user_id: user._id, token: crypto.randomBytes(16).toString('hex')});

        if (token) {
            const transporter = nodemailer.createTransport({ 
                host: 'smtp-relay.sendinblue.com',
                port: 587,
                auth: { 
                    user: process.env.AUTH_EMAIL, 
                    pass: process.env.AUTH_PASS
                } 
            });

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
    }
});

//? Desc: Logging a user
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
        } else if (!user.isSubscribed) {
            res.status(403);
            throw new Error('You need an active paypal subscription');
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

//? Desc: user paypal subscription 
//* Route: POST api/users/subscribe
//! Access: Public

const makePaypalSubscription = asyncHandler(async (req, res) => {
  const email = req.body.email;
  const user = await User.findOne(
    { email: email }
  );
  if (!user) {
    throw new Error(`${email} is not signed up`);
  } else {
    const quantity = req.body.quantity || 1;
    const subscriptionPrice = req.body.price || "25.00";
    const currency = req.body.currency || "USD";
    const create_payment_json = {
      intent: "sale",
      payer: {
        payment_method: "paypal",
      },
      redirect_urls: {
        return_url: "http://localhost:5000/api/users/payment/success",
        cancel_url: "http://localhost:5000/api/users/cancel",
      },
      transactions: [
        {
          item_list: {
            items: [
              {
                name: "ELibrary Subscription",
                sku: "001",
                price: subscriptionPrice,
                currency: currency,
                quantity: quantity,
              },
            ],
          },
          amount: {
            currency: currency,
            total: subscriptionPrice,
          },
          description: "ELibrary Subscription with paypal",
        },
      ],
    };
  
    paypal.payment.create(create_payment_json, function (error, payment) {
      if (error) {
        throw error;
      } else {
        for (let i = 0; i < payment.links.length; i++) {
          if (payment.links[i].rel === "approval_url") {
            res.redirect(payment.links[i].href);
          }
        }
      }
    });
  }
  
 
});

//? Desc: payment success
//* Route: POST api/users/success
//! Access: Public

const paymentSuccess = asyncHandler(async (req, res) => {
  const payerId = req.query.PayerID;
  const paymentId = req.query.paymentId;
  const total = "25.00";
  const currency = "USD";
  console.log(req.query);

  const execute_payment_json = {
    payer_id: payerId,
    transactions: [
      {
        amount: {
          currency: currency,
          total: total
        },
      },
    ],
  };

  paypal.payment.execute(
    paymentId,
    execute_payment_json,
    async function (error, payment) {
      if (error) {
        console.log(error.response);
        throw error;
      } else {
        const email = payment.payer.payer_info.email;
        const user = await User.findOneAndUpdate(
          { email: email },
          { isSubscribed: true },
          { new: true }
        );
        console.log(user);
        res.send({
          message: `${user.name}, your subscription is successful`,
          payment_details: payment,
        });
        // res.send("Success");
      }
    }
  );
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
    confirmEmail,
    resendEmail,
    makePaypalSubscription,
    paymentSuccess
}