document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Element Cache ---
    const dom = {
        cityInput: document.getElementById('city-input'),
        locationBtn: document.getElementById('location-btn'),
        unitSwitch: document.getElementById('unit-switch'),
        unitC: document.getElementById('unit-c'),
        unitF: document.getElementById('unit-f'),
        loader: document.getElementById('loader'),
        messageText: document.getElementById('message-text'),
        messageCenter: document.getElementById('message-center'),
        currentWeatherView: document.getElementById('current-weather-view'),
        detailsPanel: document.getElementById('details-panel'),
        autocompleteResults: document.getElementById('autocomplete-results'),
        appContainer: document.getElementById('app-container')
    };

    // --- API Configuration ---
    const GEOCODING_API_KEY = '6a09a8378e117e070c55548d99a106ee'; // IMPORTANT: Replace with your key

    // --- App State ---
    const state = {
        currentUnit: 'celsius',
        currentWeatherData: null,
        debounceTimer: null,
    };

    // --- Mappers ---
    const weatherCodeMap = {
        0: { text: 'Clear sky', icon: '01', theme: 'sunny' },
        1: { text: 'Mainly clear', icon: '02', theme: 'sunny' },
        2: { text: 'Partly cloudy', icon: '03', theme: 'cloudy' },
        3: { text: 'Overcast', icon: '04', theme: 'cloudy' },
        45: { text: 'Fog', icon: '50', theme: 'cloudy' },
        48: { text: 'Rime fog', icon: '50', theme: 'cloudy' },
        51: { text: 'Light drizzle', icon: '09', theme: 'rainy' },
        61: { text: 'Slight rain', icon: '10', theme: 'rainy' },
        63: { text: 'Rain', icon: '10', theme: 'rainy' },
        80: { text: 'Slight showers', icon: '09', theme: 'rainy' },
        95: { text: 'Thunderstorm', icon: '11', theme: 'stormy' },
        71: { text: 'Slight snow', icon: '13', theme: 'snowy' },
        73: { text: 'Snow', icon: '13', theme: 'snowy' },
    };
    const backgroundMap = {
        sunny: 'https://images.unsplash.com/photo-1566228015668-4c45abc4e3f6?q=80&w=1974&auto=format&fit=crop',
        cloudy: 'https://images.unsplash.com/photo-1496450681664-3df85efbd29f?q=80&w=2070&auto=format&fit=crop',
        rainy: 'https://images.unsplash.com/photo-1519692933481-e162a57d6721?q=80&w=2070&auto=format&fit=crop',
        stormy: 'https://images.unsplash.com/photo-1605727226425-6295624b35b4?q=80&w=1974&auto=format&fit=crop',
        snowy: 'https://images.unsplash.com/photo-1491002052546-bf38f186af56?q=80&w=2108&auto=format&fit=crop',
    };

    // --- Initialization ---
    function init() {
        lucide.createIcons();
        addEventListeners();
        fetchWeatherForCity("Greater Noida"); // Default city
    }

    function addEventListeners() {
        dom.cityInput.addEventListener('input', handleCityInput);
        dom.cityInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const firstResult = dom.autocompleteResults.firstChild;
                if (firstResult) firstResult.click();
            }
        });
        dom.locationBtn.addEventListener('click', getUserLocation);
        dom.unitSwitch.addEventListener('change', handleUnitChange);
        dom.unitC.addEventListener('click', () => setUnit('celsius'));
        dom.unitF.addEventListener('click', () => setUnit('fahrenheit'));
        document.addEventListener('click', (e) => {
            if (!dom.cityInput.contains(e.target)) {
                clearAutocomplete();
            }
        });
    }

    // --- Event Handlers ---
    function handleCityInput(e) {
        clearTimeout(state.debounceTimer);
        const query = e.target.value.trim();
        if (query.length > 2) {
            state.debounceTimer = setTimeout(() => fetchAutocomplete(query), 350);
        } else {
            clearAutocomplete();
        }
    }

    function handleUnitChange() {
        state.currentUnit = dom.unitSwitch.checked ? 'fahrenheit' : 'celsius';
        dom.unitC.classList.toggle('active', !dom.unitSwitch.checked);
        dom.unitF.classList.toggle('active', dom.unitSwitch.checked);
        if (state.currentWeatherData) {
            updateUI(state.currentWeatherData.data, state.currentWeatherData.name, state.currentWeatherData.country);
        }
    }
    
    function setUnit(unit) {
        const isFahrenheit = unit === 'fahrenheit';
        if (dom.unitSwitch.checked !== isFahrenheit) {
            dom.unitSwitch.checked = isFahrenheit;
            handleUnitChange();
        }
    }

    // --- API & Data Fetching ---
    async function fetchAutocomplete(query) {
        if (GEOCODING_API_KEY === 'YOUR_API_KEY_HERE') return;
        try {
            const response = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${GEOCODING_API_KEY}`);
            if (!response.ok) throw new Error('Autocomplete fetch failed');
            const data = await response.json();
            renderAutocomplete(data);
        } catch (error) {
            console.error("Autocomplete Error:", error);
            clearAutocomplete();
        }
    }

    async function fetchWeather(lat, lon, name, country) {
        showLoading(true);
        try {
            const weatherData = await getWeatherData(lat, lon);
            state.currentWeatherData = { data: weatherData, name, country };
            updateUI(weatherData, name, country);
        } catch (error) {
            console.error("Weather Fetch Error:", error);
            displayMessage('Failed to fetch weather data.', true);
        } finally {
            showLoading(false);
        }
    }
    
    async function fetchWeatherForCity(city) {
        if (GEOCODING_API_KEY === 'YOUR_API_KEY_HERE') {
            return displayMessage('Please provide an API key.', true);
        }
        showLoading(true);
        try {
            const coords = await getCoordinates(city);
            if (!coords) return displayMessage(`Could not find city: ${city}`, true);
            await fetchWeather(coords.lat, coords.lon, coords.name, coords.country);
        } catch (error) {
            console.error("Geocoding Error:", error);
            displayMessage('Failed to get city coordinates.', true);
        }
    }

    async function getWeatherData(lat, lon) {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max&past_days=5&forecast_days=6&air_quality_variables=pm2_5`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Weather API request failed.');
        return await response.json();
    }
    
     async function getCoordinates(city) {
        const url = `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${GEOCODING_API_KEY}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Geocoding API request failed.');
        const data = await response.json();
        return data.length > 0 ? { lat: data[0].lat, lon: data[0].lon, name: data[0].name, country: data[0].country } : null;
    }

    // --- Geolocation ---
    function getUserLocation() {
        if (!navigator.geolocation) {
            return displayMessage('Geolocation is not supported.', true);
        }
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                showLoading(true);
                try {
                    const response = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${GEOCODING_API_KEY}`);
                    if (!response.ok) throw new Error('Reverse geocoding failed');
                    const data = await response.json();
                    const name = data[0]?.name || 'Current Location';
                    const country = data[0]?.country || '';
                    await fetchWeather(latitude, longitude, name, country);
                } catch (error) {
                    console.error("Reverse Geocoding Error:", error);
                    displayMessage('Failed to determine location name.', true);
                }
            },
            (error) => {
                console.error("Geolocation error:", error);
                displayMessage('Unable to retrieve your location.', true);
            }
        );
    }
    
    // --- UI Rendering ---
    function renderAutocomplete(results) {
        clearAutocomplete();
        if (!results || results.length === 0) return;
        results.forEach(result => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.innerHTML = `${result.name} <small>${result.country}${result.state ? ', ' + result.state : ''}</small>`;
            item.onclick = () => {
                dom.cityInput.value = result.name;
                clearAutocomplete();
                fetchWeather(result.lat, result.lon, result.name, result.country);
            };
            dom.autocompleteResults.appendChild(item);
        });
    }

    function updateUI(data, cityName, country) {
        const { current, daily, hourly } = data;
        const weatherInfo = getWeatherInfo(current.weather_code);

        // Update background & theme
        dom.appContainer.style.backgroundImage = `url('${backgroundMap[weatherInfo.theme] || backgroundMap.cloudy}')`;
        document.documentElement.style.setProperty('--accent-color', `var(--theme-${weatherInfo.theme}, var(--theme-cloudy))`);

        // Update current weather
        dom.currentWeatherView.classList.remove('hidden');
        document.getElementById('current-city').textContent = `${cityName}, ${country}`;
        document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        document.getElementById('current-temp').textContent = `${formatTemp(current.temperature_2m)}°`;
        document.getElementById('current-condition').textContent = weatherInfo.text;
        document.getElementById('current-weather-icon').src = `https://openweathermap.org/img/wn/${weatherInfo.icon}d@4x.png`;

        // Update details panel
        dom.detailsPanel.classList.remove('hidden');
        document.getElementById('current-wind').textContent = `${Math.round(current.wind_speed_10m)} km/h`;
        document.getElementById('current-humidity').textContent = `${current.relative_humidity_2m}%`;
        document.getElementById('uv-index').textContent = Math.round(daily.uv_index_max[5]); // Index 5 is today
        document.getElementById('air-quality').textContent = Math.round(data.air_quality?.pm2_5[0] || 0);

        // Update forecasts
        updateHourlyForecast(hourly);
        updateDailyForecast(daily, 'forecast-cards', 6, 5); // Future
        updateDailyForecast(daily, 'past-weather-cards', 0, 5); // Past
        
        // Final UI state
        dom.messageCenter.classList.add('hidden');
    }

    function updateHourlyForecast(hourlyData) {
        const container = document.getElementById('hourly-forecast');
        container.innerHTML = '';
        const now = new Date();
        let startIndex = hourlyData.time.findIndex(timeStr => new Date(timeStr) >= now);
        if (startIndex === -1) startIndex = 0;

        for (let i = startIndex; i < startIndex + 24 && i < hourlyData.time.length; i++) {
            container.innerHTML += createCard('hourly', {
                time: formatTime(hourlyData.time[i]),
                icon: getWeatherInfo(hourlyData.weather_code[i]).icon,
                temp: formatTemp(hourlyData.temperature_2m[i]),
            });
        }
    }

    function updateDailyForecast(dailyData, containerId, startIndex, count) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const dayIndex = startIndex + i;
            if (dayIndex >= dailyData.time.length) break;
            
            container.innerHTML += createCard('daily', {
                day: getDayName(dailyData.time[dayIndex], startIndex === 6 && i === 0),
                icon: getWeatherInfo(dailyData.weather_code[dayIndex]).icon,
                minTemp: formatTemp(dailyData.temperature_2m_min[dayIndex]),
                maxTemp: formatTemp(dailyData.temperature_2m_max[dayIndex]),
            });
        }
    }
    
    function createCard(type, data) {
        if (type === 'hourly') {
            return `
                <div class="hourly-card">
                    <p class="time">${data.time}</p>
                    <img src="https://openweathermap.org/img/wn/${data.icon}d@2x.png" alt="">
                    <p class="temp">${data.temp}°</p>
                </div>
            `;
        }
        if (type === 'daily') {
            return `
                <div class="daily-card">
                    <p class="day">${data.day}</p>
                    <div class="icon-wrapper">
                        <img src="https://openweathermap.org/img/wn/${data.icon}d@2x.png" alt="">
                    </div>
                    <p class="temps">${data.minTemp}° / <span>${data.maxTemp}°</span></p>
                </div>
            `;
        }
    }

    // --- Helper & Utility Functions ---
    function formatTemp(celsius) {
        if (state.currentUnit === 'fahrenheit') {
            return Math.round(celsius * 9/5 + 32);
        }
        return Math.round(celsius);
    }

    function formatTime(dateString) {
        return new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }).toLowerCase();
    }
    
    function getDayName(dateString, isTomorrow) {
        if (isTomorrow) return 'Tomorrow';
        return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
    }

    function getWeatherInfo(code) {
        return weatherCodeMap[code] || { text: 'Clear', icon: '01', theme: 'cloudy' };
    }
    
    function clearAutocomplete() {
        dom.autocompleteResults.innerHTML = '';
    }

    function showLoading(isLoading) {
        dom.messageCenter.classList.remove('hidden');
        dom.currentWeatherView.classList.add('hidden');
        dom.detailsPanel.classList.add('hidden');
        dom.loader.classList.toggle('hidden', !isLoading);
        dom.messageText.classList.toggle('hidden', isLoading);
    }

    function displayMessage(msg, isError = false) {
        showLoading(false);
        dom.messageText.textContent = msg;
        dom.messageText.style.color = isError ? '#f87171' : 'var(--text-secondary)';
    }

    // --- Start the App ---
    init();
});
