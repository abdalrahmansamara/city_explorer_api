'use strict'

require('dotenv').config();
const express = require('express');
const app = express();
const pg = require('pg');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL/*, ssl: { rejectUnauthorized: false } */});

const cors = require('cors');
const superagent = require('superagent');
app.use(cors({
  'origin': '*',
  'methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
  'preflightContinue': false,
  'optionsSuccessStatus': 204
}));

const PORT = process.env.PORT || 3000;



// Routes
app.get('/', homePage)
app.get('/location', locationHandler)
app.get('/weather', weatherHandler)
app.get('/parks', parksHandler)
app.get('/movies', moviesHandler)
app.get('/yelp', yelpHandler)
app.get('*', errorHandler)

// Handler Functions

function locationHandler (req,res) {

  let cityName = req.query.city;
  if(!cityName){
    res.send('please enter a city in the query')
  }
  let sql = `SELECT * FROM location5 WHERE search_query=$1;`
  let safeValues = [cityName];
  client.query(sql,safeValues)
    .then(data => {
      if(data.rows.length){
        res.send(data.rows[0]);
      }
      else {
        let key = process.env.GEOCODE_API_KEY;
        let URL = `https://eu1.locationiq.com/v1/search.php?key=${key}&q=${cityName}&format=json`
        superagent.get(URL)
          .then(geoData =>{
            let gData = geoData.body;
            let locationData = new Location(cityName,gData);
            // res.send(locationData)
            let sql = `INSERT INTO location5 VALUES ($1,$2,$3,$4) RETURNING *;`
            let safeValues = [locationData.search_query, locationData.formatted_query,locationData.latitude,locationData.longitude]
            client.query(sql,safeValues)
              .then(data => {
                res.send(data.rows)
              })
          })
          .catch(error=>{
            console.log(error);
            res.send(error);
          })
      }
    })



}




function weatherHandler (req,res) {
  let key = process.env.WEATHER_API_KEY
  let lat = req.query.latitude;
  let lon = req.query.longitude;
  let URL = `https://api.weatherbit.io/v2.0/forecast/daily?key=${key}&lat=${lat}&lon=${lon}`
  superagent.get(URL)
    .then(Weatherdata => {
      let allData = Weatherdata.body.data
      let results = allData.map(item => {
        let newWeather = new Weather(item)
        return newWeather
      })
      res.send(results)
    })
    .catch(error=>{
      console.log(error);
      res.send(error);
    })
}

// https://developer.nps.gov/api/v1/parks?parkCode=acad&api_key=lWJhbEQRk9oSM59jDYLwcpHLflgfWDcLP2qChlfo
function parksHandler (req,res) {
  let city = req.query.search_query;
  let key = process.env.PARKS_API_KEY;
  let URL = `https://developer.nps.gov/api/v1/parks?q=${city}&api_key=${key}`;
  superagent.get(URL)
    .then(parksData => {
      let park = parksData.body.data;
      let results = park.map(item => {
        let address = item.addresses[0];
        let onePark = new Park(item,address);
        return onePark
      })
      res.send(results)
    })
}

function yelpHandler (req,res) {
  let search_query = req.query.search_query;
  let key = process.env.YELP_API_KEY;
  let page = req.query.page;
  let yelpArray = [];
  let limit = 5;
  let offset = (page-1)*limit +1;
  let url = `https://api.yelp.com/v3/businesses/search?location=${search_query}&limit=${limit}&offset=${offset}`;
  superagent
    .get(url)
    .set('Authorization', `Bearer ${key}`)
    .then(data => {
      data.body.businesses.forEach(element => {
        let newYelp = new Yelp(element);
        yelpArray.push(newYelp);
      })
      res.send(yelpArray);
    })
}

function moviesHandler (req,res) {
  let moviesArray = [];
  let search_query = req.query.search_query;
  let key = process.env.MOVIE_API_KEY;
  let url = `https://api.themoviedb.org/3/search/movie?api_key=${key}&query=${search_query}&include_adult=false`;
  superagent.get(url)
    .then(data => {
      data.body.results.forEach(element => {
        let newMovie = new Movie(element);
        moviesArray.push(newMovie)
      })
      res.send(moviesArray);
    })
}

function errorHandler (req,res) {
  let errorMessage = {
    status: 500,
    responseText: 'Sorry, the Developer is too lazy to make this Page'
  };
  res.status(500).send(errorMessage);
}

function homePage (req,res) {
  res.send('You are in the home page');
}




// Constructors

function Location (city,locData){
  this.search_query = city;
  this.formatted_query = locData[0].display_name;
  this.latitude = locData[0].lat;
  this.longitude = locData[0].lon;
}
function Weather (weatherDat) {
  this.forecast = weatherDat.weather.description;
  this.time =new Date(weatherDat.datetime).toString().slice(0,15);
}
function Park (parkData, address) {
  this.name = parkData.fullName;
  this.address = `${address.line1}, ${address.city}, ${address.stateCode} ${address.postalCode}`;
  this.fee = parkData.entranceFees[0].cost;
  this.description = parkData.description;
  this.url = parkData.url;
}
function Yelp (data){
  this.name = data.name;
  this.image_url = data.image_url;
  this.price = data.price;
  this.rating = data.rating;
  this.url = data.url;
}

function Movie (data) {
  this.title = data.title;
  this.overview = data.overview;
  this.average_votes = data.vote_average;
  this.total_votes = data.vote_count;
  this.image_url = data.poster_path;
  this.popularity = data.popularity;
  this.released_on = data.release_date;
}


client.connect()
  .then(
    app.listen(PORT, () => {
      console.log(`you are listening to PORT ${PORT}`)
    }))
