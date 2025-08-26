// --- IMPORTANT ---
// Replace 'YOUR_API_KEY' with the key you got from OpenWeatherMap
const apiKey = '6a09a8378e117e070c55548d99a106ee';

const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const weatherResult = document.getElementById('weather-result');
const errorMessage = document.getElementById('error-message');
const loader = document.getElementById('loader'); // NEW: Get loader

const cityNameEl = document.getElementById('cityName');
const weatherIconEl = document.getElementById('weatherIcon');
const temperatureEl = document.getElementById('temperature');
const descriptionEl = document.getElementById('description');
const humidityEl = document.getElementById('humidity');

searchBtn.addEventListener('click', getWeather);
cityInput.addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
        getWeather();
    }
});

function getWeather() {
    const city = cityInput.value;

    if (!city) {
        return;
    }

    // Hide previous results and show the loader
    weatherResult.classList.add('hidden');
    errorMessage.classList.add('hidden');
    loader.classList.remove('hidden'); // NEW: Show loader

    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('City not found');
            }
            return response.json();
        })
        .then(data => {
            loader.classList.add('hidden'); // NEW: Hide loader on success
            displayWeather(data);
        })
        .catch(error => {
            console.error('Error fetching weather data:', error);
            loader.classList.add('hidden'); // NEW: Hide loader on error
            errorMessage.classList.remove('hidden');
        });
}

function displayWeather(data) {
    cityNameEl.textContent = data.name;
    temperatureEl.textContent = `Temperature: ${Math.round(data.main.temp)}°C`;
    descriptionEl.textContent = `${data.weather[0].description}`;
    humidityEl.textContent = `Humidity: ${data.main.humidity}%`;
    
    const iconCode = data.weather[0].icon;
    weatherIconEl.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

    weatherResult.classList.remove('hidden');
}