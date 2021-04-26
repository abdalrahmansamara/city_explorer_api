'use strict'

const express = require('express');
const app = express();

require('dotenv').config();
const cors = require('cors');
app.use(cors({
  'origin': '*',
  'methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
  'preflightContinue': false,
  'optionsSuccessStatus': 204
}));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`you are listening to PORT ${PORT}`)
})

// Routes
app.get('/', homePage)
app.get('/location', locationHandler)
app.get('/weather', weatherHandler)
app.get('*', errorHandler)

// Handler Functions

function locationHandler (req,res) {
  const locationData = require('./data/location.json');

  let newLocation = new Location(locationData)

  res.json(newLocation);
}

function weatherHandler (req,res) {
  let weatherData = require('./data/weather.json')
  let results = [];
  weatherData.data.forEach(element => {
    let newData = new Weather(element);
    results.push(newData);
  })
  res.send(results);
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

function Location (loc){
  this.search_query = 'Lynnwood';
  this.formatted_query = loc[0].display_name;
  this.latitude = loc[0].lat;
  this.longitude = loc[0].lon;
}
function Weather (weatherDat) {
  this.forecast = weatherDat.weather.description;
  this.time =new Date(weatherDat.datetime).toString().slice(0,15);
}
