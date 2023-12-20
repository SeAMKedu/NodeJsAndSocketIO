import requests
import math
import time
import datetime
import random

i = 0

while i < 100:

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

    # serialize the object to json and POST it the thingspeak
    response = requests.post('http://localhost:3001/api/measurements/', json=measurements)

    print(response.ok)
    print(response.json())
    time.sleep(1)
    i += 1

