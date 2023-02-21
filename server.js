'use strict';

// Dependencies
const express = require('express');
const cors = require('cors');
require('dotenv').config();

//-------------------------------------------------------------------------------------------------

// Setup
const app = express();
const PORT = process.env.PORT;
app.use(cors());

//-------------------------------------------------------------------------------------------------

// Route Definitions
app.get('/location', getLocationData);
app.get('/weather', getWeatherData);
app.get('/*', handleErrors);

//-------------------------------------------------------------------------------------------------

// Locaion Handler function
function getLocationData (req, res) {

// Create a constructor function to create objects for locations
    const LocationObj = function (city, location) {
        this.search_query = city;
        this.formatted_query = location[0].display_name;
        this.latitude = location[0].lat;
        this.longitude = location[0].lon;
    }


// Get the data from the json file
    const location = require('./data/location.json');
    const city = req.query.city;


// Shonimg an error message if no city specified
    if (!city) {
        throw ('no city found')
    }

// Response the needed data to the client
    const locationData = new LocationObj (city, location);
    res.status(200).json(locationData);
}

//-------------------------------------------------------------------------------------------------

    // Weather Handler function
function getWeatherData (req, res) {

    // Create a constructor function to create objects for locations
        const WeatherObj = function (forecast, time) {
            this.forecast = forecast;
            this.time = time;
        }
    
    
    // Get the data from the json file
        const weather = require('./data/weather.json');

        
    try {
    // Response the needed data to the client
    const allDaysWeather = [];
        weather.data.forEach( day => {
        return allDaysWeather.push( new WeatherObj(day.weather.description, day.datetime))
        })

        res.status(200).json(allDaysWeather);
    }
        catch (error) {
            console.log('Error', error)
            res.status(500).send('We are sorry, something went wrong.')
        }
}

//-------------------------------------------------------------------------------------------------

function handleErrors (req, res) {
    res.status(404).send('404 page not found')
}

//-------------------------------------------------------------------------------------------------

// Listen to the current port
app.listen(PORT, () => {
    console.log('server is working on port ' + PORT)
});

