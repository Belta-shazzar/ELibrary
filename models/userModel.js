const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    name: {

    },
    
    email: {

    },

    password: {

    },
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);