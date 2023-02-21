'use strict';

const express = require('express');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT;

app.get('/location.json', getLocationData);


function getLocationData (req, res) {
    console.log(req.query);
    res.send('ok')
    }

app.listen(PORT, () => {
    console.log('server is working on port ' + PORT)
});

// const LocationData = function () {
//     this.
// }