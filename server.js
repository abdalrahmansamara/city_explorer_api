'use strict'

const express = require('express');
const app = express();
const pg = require('pg');
let client = new pg.Client(process.env.DATABASE_URL)

require('dotenv').config();
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
app.get('/names',namesHandler)
app.get('*', errorHandler)

// Handler Functions

function locationHandler (req,res) {

  let cityName = req.query.city;

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
            res.send(locationData)
            let sql = `INSERT INTO location5 VALUES ($1,$2,$3,$4) RETURNING *;`
            let safeValues = [locationData.search_query, locationData.formatted_query,locationData.latitude.locationData.longitude]
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

function namesHandler (req,res) {
  let firstName = req.query.firstName;
  let lastName = req.query.lastName;
  let sql = `INSERT INTO people VALUES ($1,$2) RETURNING *;`
  let safe = [firstName,lastName];
  client.query(sql,safe)
    .then(data => {
      res.send(data);
    })
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


client.connect()
  .then(
    app.listen(PORT, () => {
      console.log(`you are listening to PORT ${PORT}`)
    }))
