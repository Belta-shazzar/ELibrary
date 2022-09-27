const mongoose = require('mongoose');

const tokenVerifSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },

    token: {
        type: String, 
        required: true
    },

    expireAt: {
        type: Date,
        default: Date.now,
        index: {
            expires: 86400000 
        }
    }
});

module.exports = mongoose.model('TokenVerif', tokenVerifSchema);