const mongoose = require('mongoose');

const RecoverySchema = new mongoose.Schema({
    userId:  {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    email: {
        type: String, 
        required: true,
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date
});



mongoose.model('Recovery', RecoverySchema);
