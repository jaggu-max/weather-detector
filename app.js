// ================= CONFIG - FILL IN YOUR KEYS =================
const OPENWEATHER_KEY = "b310472386ac1e443a76d34045a10018"; // Your OpenWeather key
const GEOAPIFY_KEY = "056dc8bb0c84438fae8d8ce40aa43e53";   // Your Geoapify key
// ============================================================

// DOM refs
const searchBox = document.getElementById('searchBox');
const searchBtn = document.getElementById('searchBtn');
const suggestionsEl = document.getElementById('suggestions');
const locationName = document.getElementById('locationName');
const tempEl = document.getElementById('temp');
const descEl = document.getElementById('desc');
const humidityEl = document.getElementById('humidity');
const windEl = document.getElementById('wind');
const coordsEl = document.getElementById('coords');
const owIcon = document.getElementById('owIcon');

const sunEl = document.getElementById('sun');
const cloudEl = document.getElementById('cloud');
const rainEl = document.getElementById('rain');

// ------------- Suggestions via Geoapify ----------
async function fetchSuggestions(q) {
  suggestionsEl.innerHTML = '<li style="opacity:0.6">Searching...</li>';
  try {
    const urlGeo = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(q)}&apiKey=${GEOAPIFY_KEY}&limit=7`;
    const res = await fetch(urlGeo);
    const data = await res.json();

    if (data.features && data.features.length) {
      suggestionsEl.innerHTML = data.features.map(f => {
        const p = f.properties;
        const label = `${p.city || p.name}, ${p.country}`;
        return `<li data-place="${escapeHtml(label)}" data-lat="${p.lat}" data-lon="${p.lon}">${escapeHtml(label)}</li>`;
      }).join('');
    } else {
      suggestionsEl.innerHTML = '<li>No suggestions found</li>';
    }
  } catch (e) {
    suggestionsEl.innerHTML = '<li>Error fetching suggestions</li>';
    console.error(e);
  }
}

// ---------- Event Listeners ----------
let typingTimer;
searchBox.addEventListener('input', (e) => {
  clearTimeout(typingTimer);
  const q = e.target.value.trim();
  if (!q) { suggestionsEl.innerHTML = ''; return; }
  typingTimer = setTimeout(() => fetchSuggestions(q), 250);
});

searchBtn.addEventListener('click', () => {
  const q = searchBox.value.trim();
  if (!q) return;
  selectAndFetch(q);
});

suggestionsEl.addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (!li) return;
  const placeText = li.dataset.place;
  const lat = li.dataset.lat;
  const lon = li.dataset.lon;
  searchBox.value = placeText;
  suggestionsEl.innerHTML = '';
  fetchWeatherByLatLon(lat, lon, placeText);
});

// ---------- Fetch weather ----------
async function selectAndFetch(placeText) {
  try {
    const urlGeo = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(placeText)}&apiKey=${GEOAPIFY_KEY}&limit=1`;
    const res = await fetch(urlGeo);
    const data = await res.json();

    if (data.features && data.features.length) {
      const p = data.features[0].properties;
      fetchWeatherByLatLon(p.lat, p.lon, `${p.city || p.name}, ${p.country}`);
    } else {
      locationName.innerText = 'Location not found';
    }
  } catch (e) {
    locationName.innerText = 'Error fetching location';
    console.error(e);
  }
}

async function fetchWeatherByLatLon(lat, lon, prettyName) {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data && data.weather) {
      updateUI(data, prettyName, lat, lon);
    } else {
      locationName.innerText = 'Weather not available';
    }
  } catch (e) {
    locationName.innerText = 'Error fetching weather';
    console.error(e);
  }
}

// ---------- Update UI ----------
function updateUI(data, prettyName, lat, lon) {
  const name = prettyName || `${data.name}, ${data.sys?.country || ''}`;
  const temp = Math.round(data.main.temp);
  const desc = data.weather[0].description;
  const humidity = data.main.humidity;
  const windKmph = Math.round((data.wind.speed || 0) * 3.6);
  const icon = data.weather[0].icon;
  const code = data.weather[0].id;

  locationName.innerText = name;
  tempEl.innerText = `${temp}°C`;
  descEl.innerText = capitalize(desc);
  humidityEl.innerText = `${humidity}%`;
  windEl.innerText = `${windKmph} km/h`;
  coordsEl.innerText = `${lat?.toFixed(2)}, ${lon?.toFixed(2)}`;
  owIcon.src = `https://openweathermap.org/img/wn/${icon}@2x.png`;
  owIcon.alt = desc;

  sunEl.style.opacity = 0;
  cloudEl.style.opacity = 0;
  rainEl.style.opacity = 0;

  if (code >= 200 && code < 600) { cloudEl.style.opacity = 1; rainEl.style.opacity = 1; }
  else if (code >= 600 && code < 700) { cloudEl.style.opacity = 1; rainEl.style.opacity = 0.9; }
  else if (code >= 700 && code < 800) { cloudEl.style.opacity = 1; sunEl.style.opacity = 0.2; }
  else if (code === 800) { sunEl.style.opacity = 1; }
  else if (code > 800) { cloudEl.style.opacity = 1; sunEl.style.opacity = 0.3; }
  else { sunEl.style.opacity = 0.8; }
}

// ---------- Helpers ----------
function capitalize(s){ return s.charAt(0).toUpperCase()+s.slice(1); }
function escapeHtml(s){ return String(s).replace(/[&<>"'`=\/]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'}[c])); }

// ---------- Auto geolocation on load ----------
async function tryGeolocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const lat = pos.coords.latitude, lon = pos.coords.longitude;
    await fetchWeatherByLatLon(lat, lon, 'Your location');
  }, () => {});
}
tryGeolocation();

// ---------- Service Worker ----------
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').catch(()=>{});
}
