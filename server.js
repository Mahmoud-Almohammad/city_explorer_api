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
app.use(cors());

//-------------------------------------------------------------------------------------------------

// Route Definitions
app.get('/location', getLocationData);
app.get('/weather', getWeatherData);
app.get('/parks', parksHandler);
app.get('/movies', moviesHandler);
app.get('/yelp', yelpHandler);
app.get('/*', handleErrors);

//-------------------------------------------------------------------------------------------------

const locations = {};
/**
 * This function send a request to locationiq server and get the data, process it, then send it back to the user
 * @param {*} req the request that come from the user to this server
 * @param {*} res the response that this server send it back to the user
 */
// Locaion Handler function
function getLocationData (req, res) {

// Create a constructor function to create objects for locations
    const LocationObj = function (city, location) {
        this.search_query = city;
        this.formatted_query = location.display_name;
        this.latitude = location.lat;
        this.longitude = location.lon;
    }


// Get the data from the json file
    const city = req.query.city;
    const key = process.env.GEOCODE_API_KEY;
    const url = `https://us1.locationiq.com/v1/search.php?key=${key}&q=${city}&format=json&limit=1`;


// Shonimg an error message if no city specified
    if (!city) {
        throw ('no city found')
    }


// Checking if we have this requset requested already and if not send a request to another server and get the data and send it back to the user
    if(locations[url]) {
        res.send(locations[url]);
    } else {
        superagent.get(url)
        .then( data => {
            const location = data.body[0];
            const locationData = new LocationObj (city, location);
            locations[url] = locationData;
            res.send(locationData);
        })
        .catch( error => {
            console.log('ERROR', error);
            res.status(500).send('So sorry, something went wrong.');
          });
    }    
}

//-------------------------------------------------------------------------------------------------

/**
 * This function send a request to weather bit server and get the data, process it, then send it back to the user
 * @param {*} req the request that come from the user to this server
 * @param {*} res the response that this server send it back to the user
 */
    // Weather Handler function
function getWeatherData (req, res) {

    // Create a constructor function to create objects for weathers
        const WeatherObj = function (forecast, time) {
            this.forecast = forecast;
            this.time = time;
        }
    
    // get the key from env file and the latitude and longitude from the request query from the client and then set the url request to send it to the weather bit server
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

// create park handler function
function parksHandler (req, res) {

    // create a constructer function to create objects for parks
    function ParksObj (name, address, fee, description, url) {
      this.name = name;
      this.address = address;
      this.fee = fee;
      this.description = description;
      this.url = url;
    }

    // get the key from env file and the latitude and longitude from the request query from the client and then set the url request to send it to the national park service server
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

/**
 * This function send a request to movies server and get the data, process it, then send it back to the user
 * @param {*} req the request that come from the user to this server
 * @param {*} res the response that this server send it back to the user
 */
function moviesHandler (req, res) {

    // create a constructer function to create objects for parks
    function MoviesObj (title, overview, average_votes, total_votes, image_url, popularity, released_on) {
        this.title = title;
        this.overview = overview;
        this.average_votes = average_votes;
        this.total_votes = total_votes;
        this.image_url = 'https://image.tmdb.org/t/p/w500' + image_url;
        this.popularity = popularity;
        this.released_on = released_on;
    };

    const moviesKey = process.env.MOVIE_API_KEY;
    const location = req.query.search_query;

    const moviesUrl = `https://api.themoviedb.org/3/search/movie?api_key=${moviesKey}&query=${location}`;

    try {
        superagent.get(moviesUrl)
        .then( moviesData => {
            const movies = moviesData.body;
            const allMovies = movies.results.map( movie => {
                return new MoviesObj (movie.title, movie.overview, movie.vote_average, movie.vote_count, movie.poster_path, movie.popularity, movie.release_date);
            });
            res.json(allMovies);
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
 * This function send a request to movies server and get the data, process it, then send it back to the user
 * @param {*} req the request that come from the user to this server
 * @param {*} res the response that this server send it back to the user
 */
function yelpHandler (req, res) {

    function YelpObj (name, image_url, price, rating, url) {
        this.name = name;
        this.image_url = image_url;
        this.price = price;
        this.rating = rating;
        this.url = url;
    }

    function getOffset (page) {
        const offset = (5 * page) - 5
        return offset;
    }

    const location = req.query.search_query;
    const page = req.query.page;
    const yelpKey = process.env.YELP_API_KEY;
    const yelpUrl = `https://api.yelp.com/v3/businesses/search?term=restaurants&limit=5&sort_by=rating&location=${location}&page=${page}&offest=${getOffset (page)}`;

    try {
        console.log(getOffset(page), page, yelpUrl)
        superagent.get(yelpUrl)
        .set('Authorization', `Bearer ${yelpKey}`)
        .then(data => {
            const yelpBody = data.body;
            const restaurants = yelpBody.businesses.map( restaurant => new YelpObj(restaurant.name, restaurant.image_url, restaurant.price, restaurant.rating, restaurant.url));
            res.json(restaurants);
        })
    }
    catch (error) {
        console.log('Error', error);
        res.status(500).send('something went wrong')
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

