'use strict';

// Dependencies
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');

//-------------------------------------------------------------------------------------------------

// Load Environment Variables from the .env file
require('dotenv').config();

//-------------------------------------------------------------------------------------------------

// Setup
const app = express();
const PORT = process.env.PORT;
const DATABASE_URL = process.env.DATABASE_URL;
const client = new pg.Client(DATABASE_URL);

client.on('error', err => {
    console.log('Error ', err);
});

app.use(cors());

//-------------------------------------------------------------------------------------------------

// Route Definitions
app.get('/location', getLocationData);
app.get('/weather', getWeatherData);
app.get('/parks', parksHandler)
app.get('/*', handleErrors);

//-------------------------------------------------------------------------------------------------

const locations = {};
/**
 * This function send a request to locationiq server and get the data, process it, then send it back to the user
 * @param {*} req the request that come from the user to this server
 * @param {*} res the response that this server send it back to the user
 */
function getLocationData (req, res) {

// Create a constructor function to create objects for locations
    const LocationObj = function (city, formatted_query, latitude, longitude) {
        this.search_query = city;
        this.formatted_query = formatted_query;
        this.latitude = latitude;
        this.longitude = longitude;
    }
    // get the city from the client 
    const city = req.query.city;
    const key = process.env.GEOCODE_API_KEY;
    const url = `https://us1.locationiq.com/v1/search.php?key=${key}&q=${city}&format=json&limit=1`;
    // write the sql statement 
    const findCity = 'SELECT * FROM city WHERE search_query = $1';
    const value = [city];


// Showing an error message if no city specified
    if (!city) {
        throw ('no city found')
    }

// Checking if we have this city in the database and if not send a request to another locationiq
// and get the data then send it back to the user
client.query(findCity, value)
.then(dataFromDB => {
    if(dataFromDB.rowCount === 0) {
        // request data from the API
        superagent.get(url)
        .then( dataFromAPI => {
            const location = dataFromAPI.body[0];
            // make city instance from the data 
            const locationData = new LocationObj (city, location.display_name, location.lat, location.lon);
            // save the data in the database
            const saveToDB = 'INSERT INTO city (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4)'
            const cityValues = [city, location.display_name, location.lat, location.lon];
            client.query(saveToDB, cityValues);

            // respond to the client with the data
            res.send(locationData);
       })
    } else {
        const databaseRow = dataFromDB.rows[0];
        const city_data = new LocationObj(city, databaseRow.formatted_query, databaseRow.latitude, databaseRow.longitude);
        res.send(city_data);
    }
})
.catch( err => {
    console.log('Error', err);
   });
}

//-------------------------------------------------------------------------------------------------

/**
 * This function send a request to weather bit server and get the data, process it, then send it back to the user
 * @param {*} req the request that come from the user to this server
 * @param {*} res the response that this server send it back to the user
 */
function getWeatherData (req, res) {

    // Create a constructor function to create objects for weathers
        const WeatherObj = function (forecast, time) {
            this.forecast = forecast;
            this.time = time;
        }

        const weatherKey = process.env.WEATHER_API_KEY;
        const userLocationInput = {
            lat: req.query.latitude,
            lon: req.query.longitude,
        }
        let weatherUrl = `http://api.weatherbit.io/v2.0/forecast/daily?key=${weatherKey}&lat=${userLocationInput.lat}&lon=${userLocationInput.lon}&days=8`
        
    // make a superagent request and make a promise so when its done evaluating and it resolved this code will run
    try {
        superagent.get(weatherUrl)
        .then( weatherData => {
            const weather = weatherData.body;
            const allDaysWeather = weather.data.map( day => {
        return new WeatherObj(day.weather.description, day.datetime);
        });
        res.send(allDaysWeather);
        })
    }
    // handle errors
        catch (error) {
            console.log('Error', error)
            res.status(500).send('We are sorry, something went wrong.')
        }
}

//-------------------------------------------------------------------------------------------------

/**
 * This function send a request to national park service server and get the data, process it, then send it back to the user
 * @param {*} req the request that come from the user to this server
 * @param {*} res the response that this server send it back to the user
 */
function parksHandler (req, res) {

    // create a constructer function to create objects for parks
    function ParksObj (name, address, fee, description, url) {
      this.name = name;
      this.address = address;
      this.fee = fee;
      this.description = description;
      this.url = url;
    }

    const parksKey = process.env.PARKS_API_KEY;
    const location = req.query.search_query;     
    const parksUrl = `https://developer.nps.gov/api/v1/parks?api_key=${parksKey}&q=${location}&limit=10`;

    // make a superagent request and make a promise so when its done evaluating and it resolved this code will run
    try {
        superagent.get(parksUrl)
        .then( parksData => {
            const parks = parksData.body;
            const allNearlyParks = parks.data.map( park => {
                return new ParksObj (park.fullName, `${park.addresses[0].line1}, ${park.addresses[0].city}, ${park.addresses[0].stateCode} ${park.addresses[0].postalCode}`, park.entranceFees[0].cost, park.description, park.url);
            });
            res.json(allNearlyParks);
        })
    }
     // handle errors
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

// Listen to the current port when the db connection is done
client.connect()
.then( () => {
    app.listen(PORT, () => {
        console.log("Connected to database:", client.connectionParameters.database);
        console.log('server is working on port ' + PORT)
    });
})
.catch( err => {
    console.log('Error', err);
})
