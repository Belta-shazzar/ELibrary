const express = require('express');
require('dotenv').config();
const connectDB = require('./config/db');

connectDB();

const app = express();
const PORT = process.env.PORT || 5000;
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

//* Routes
app.use('/api/users', require('./routes/userRoute'));

app.listen(PORT, () => {
    console.log(`Server is running on  port: ${PORT}, on ${process.env.NODE_ENV} mode`);
});