var mongoose = require('mongoose');

var UserSchema = new mongoose.Schema({
  code: {type: String, index: true},
  user:  {type: Schema.Types.ObjectId, ref: 'User'},
  used: {type: Boolean} 
}, {timestamps: true});


UserSchema.methods.validPassword = function(password) {
  return bcrypt.compareSync(password, this.password);
};

UserSchema.methods.setPassword = function(password){
  this.password = bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

UserSchema.methods.generateJWT = function() {
  var today = new Date();
  var exp = new Date(today);
  exp.setDate(today.getDate() + 60);

  return jwt.sign({
    id: this._id,
    username: this.username,
    exp: parseInt(exp.getTime() / 1000),
  }, secret);
};

UserSchema.methods.toAuthJSON = function(){
  return {
    username: this.username,
    email: this.email,
    token: this.generateJWT(),
    wallet_address: this.address
  };
};

UserSchema.methods.toProfileJSONFor = function(user){
  return {
    username: this.username,
    wallet_address: this.address
  };
};

// UserSchema.methods.favorite = function(id){
//   if(this.favorites.indexOf(id) === -1){
//     this.favorites.push(id);
//   }

//   return this.save();
// };

// UserSchema.methods.unfavorite = function(id){
//   this.favorites.remove(id);
//   return this.save();
// };

// UserSchema.methods.isFavorite = function(id){
//   return this.favorites.some(function(favoriteId){
//     return favoriteId.toString() === id.toString();
//   });
// };

// UserSchema.methods.follow = function(id){
//   if(this.following.indexOf(id) === -1){
//     this.following.push(id);
//   }

//   return this.save();
// };

// UserSchema.methods.unfollow = function(id){
//   this.following.remove(id);
//   return this.save();
// };

// UserSchema.methods.isFollowing = function(id){
//   return this.following.some(function(followId){
//     return followId.toString() === id.toString();
//   });
// };

mongoose.model('User', UserSchema);
