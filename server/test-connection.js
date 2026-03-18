require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Falta MONGODB_URI en .env');
  process.exit(1);
}

mongoose.connect(uri).then(() => {
  console.log('Conectado a MongoDB Atlas.');
  process.exit(0);
}).catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
