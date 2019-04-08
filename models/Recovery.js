const mongoose = require('mongoose');

const RecoverySchema = new mongoose.Schema({
    userId:  {type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true},
    email: {
        type: String, 
        required: true,
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date
}, {timestamps: true});



mongoose.model('Recovery', RecoverySchema);
