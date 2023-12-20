const express = require('express')
const app = express()
const socket = require("socket.io");

app.use(express.json())

const cors = require('cors')

app.use(cors())

// View engine setup
app.set('view engine', 'ejs');

// lista mittauksia varten
let measurementsArray = []

// avataan sivu measurements
app.get('/', (request, response) => {
  response.render('measurements')
})

// palauttaa kaikki mittaukset (ei käytetä tässä esimerkissä)
app.get('/api/measurements/', (request, response) => {
  response.json(measurementsArray)
})

// vastaanottaa mittauksen
app.post('/api/measurements', (request, response) => {
  const body = request.body

  if (!body.pressure) {
    return response.status(400).json({ 
      error: 'content missing' 
    })
  }

  let id = measurementsArray.length + 1
  const arrayrow = [id.toString(), body.pressure, body.temperature, body.humidity]

  measurementsArray.push(arrayrow)

  // lähetetään lista listoja [[,,,], [,,,]...]
  var s = JSON.stringify(measurementsArray);

  // lähetetään kaikki mittaukset
  io.emit('measdata', s);
  console.log(arrayrow)

  response.json(arrayrow)
})  

const PORT = 3001
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

const io = socket(server);

io.on('connection', (socket) => {
  console.log('New connection')
})