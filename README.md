# Express.js ja Socket.io

[![DOI](https://zenodo.org/badge/733807414.svg)](https://zenodo.org/doi/10.5281/zenodo.10409021)

Tässä esimerkissä näytetään, miten mittausdataa voidaan näyttää web-sovelluksessa Google Chartin avulla niin, että data päivittyy reaaliaikaisesti.

Ohjelma datagenerator.py generoi simuloitua mittausdataa ja lähettää sen palvelinohjelmalle. Express.js:llä toteutettu palvelinohjelma index.js vastaanottaa mittaukset ja välittää ne html-sivulle, jossa ne näytetään Google Chart -kaaviona. Express-palvelinohjelman ja html-sivun välisessä kommunikoinnissa käytetään socket.io:ta.

## Tiedostot

### Datagenerator.py

Python-ohjelma datageneratorclient.py generoi simuloitua mittausdataa trigonometristen funktioiden ja satunnaislukugeneraattorin avulla:

```python
    # let's play that we will read data from sensors
    # simulate the sensor values
    pressure = 100 * math.sin(i/10)
    temperature = 50 * math.cos(i / 3)
    humidity = random.random() * 20 - 10

    # create an object
    measurements = { 
        "pressure" : pressure,
        "temperature" : temperature,
        "humidity" : humidity
    }
```

Generoidut mittaukset lähetetään palvelimelle HTTP Postin avulla:

```python
    # serialize the object to json and POST it the thingspeak
    response = requests.post('http://localhost:3001/api/measurements/', json=measurements)
```

### index.js

Express-ohjelma index.js vastaanottaa mittaukset ja välittää ne html-sivulle socket.io:n avulla.

Ohjelman alku on esitetty alla. Socket.io vaatii CORS:n huomioimisen. Myös json-middleware on otettava käyttöön. Saapuneet mittaukset tallennetaan listaan measurementsArray.

```javascript
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
```

Funktio (route) app.get('/', (request, response) käsittelee juureen osoitetun sivupyynnön. Funktio avaa sivun measurements.ejs selaimessa. Tämä ohjelma perustuu ejs-templaten käyttöön.

```javascript
app.get('/', (request, response) => {
  response.render('measurements')
})
```

Funktio (route) app.post('/api/measurements', (request, response) ottaa vastaan HTTP POST:lla osoitteeseen /api/measurements lähetetyn viestin. Aluksi tarkistetaan, että viesti sisältää dataa. Alun perin sanakirjassa olleet tiedot (pressure, temperature, humidity) muunnetaan listamuotoon, sillä Google Charts vaatii tiedon listamuotoisena.

Koko lista sarjallistetaan ja lähetetään selainohjelmalle io.emit-viestillä.

```javascript
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
```

### measurements.ejs

Sivu measurements.ejs on views-kansiossa. Ohjelmassa käytetään ejs-templatea.

Selainohjelma ottaa vastaan socketio-viestejä ja näyttää niissä olevat mittaukset viivakaaviona.

Sivun rakenne on esitetty alla:

```html
<html>
    <head>
      <script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
      <script type="text/javascript" src="//code.jquery.com/jquery-1.4.2.min.js"></script>
      <script type="text/javascript" src="//cdnjs.cloudflare.com/ajax/libs/socket.io/4.4.0/socket.io.min.js"></script>
      <script type="text/javascript" charset="utf-8"></script>    

      <script type="text/javascript">
        ...
      </script>
    </head>
    <body>
      <div id="curve_chart" style="width: 900px; height: 500px"></div>
    </body>
  </html>
```

Viivakaavio näytetään div-elementissä curve_chart.

Google Chartin alustus ja socketio-viestin vastaanotto on esitetty alla:

```javascript
        google.charts.load('current', {'packages':['corechart', 'table']});
        google.charts.setOnLoadCallback(init);

        function init() {
          var socket = io();
          console.log("init")
          socket.on('measdata', function (data) {
            var s = JSON.parse(data);
            drawChart(s);
          })
        }
```

Saapunut socketio-viesti sisältää listan mittauksia. Yksi mittausrivi on on myös listan muodossa (id, pressure, temperature, humidity). Kun socketio-viesti on saapunut, se deserialisoidaan ja muunnettu tieto välitetään funktiolle drawChart().

Funktio drawChart piirtää viivakaavion div-elementtiin curve_chart:

```javascript
        function drawChart(s) {
            var data = new google.visualization.DataTable();
            data.addColumn('string', 'id');
            data.addColumn('number', 'pressure');
            data.addColumn('number', 'temperature');
            data.addColumn('number', 'humidity');
            console.log("draw row", s)
            data.addRows(s);
  
          var options = {
            title: 'Measurement data',
            curveType: 'function',
            legend: { position: 'bottom' }
          };
  
          var chart = new google.visualization.LineChart(document.getElementById('curve_chart'));
  
          chart.draw(data, options);
```

## Kirjastojen asennus ja ohjelmien ajaminen

Sovelluksen riippuvuudet on määritetty tiedostossa package.json. 

```
{
  "name": "nodejsmeasurementserver",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "author": "",
  "license": "ISC",
  "dependencies": {
    "cors": "^2.8.5",
    "ejs": "^3.1.9",
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "socketio": "^1.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

Tiedoston package.json määrittelemät kirjastot asennetaan komennolla
```
npm install
```

Palvelinohjelma käynnistetään komennolla
```
npm run dev
```

Avaa seuraavaksi selain osoitteessa localhost:3001

Käynnistä sitten mittausdataa tuottava Python-ohjelma
```
py datagenerator
```

Uudet mittaukset päivittyvät kaavioon selaimessa reaaliajassa.
