const express = require('express');
require('dotenv').config();

const app = express();

const PORT = process.env.PORT || 5000;
app.listen(() => {
    console.log(`Server is running on  port: ${PORT}, on ${process.env.NODE_ENV} mode`);
});