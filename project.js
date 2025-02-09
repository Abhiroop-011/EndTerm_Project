let exchangeRates = {};
let selectedCurrency = "USD";
const API_KEY = "abfddebfec56e4f9435d7ba6"; // Replace with a real API key
let countryToCurrency = {};
let isExchangeRatesLoaded = false; // Add a flag to track if exchange rates are loaded

// Use proxy OR direct API
const useProxy = false; // Change to `true` if running a proxy server
const proxyUrl = useProxy ? "http://localhost:5000/proxy?url=" : "";
const apiUrl = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`;

// Fetch exchange rates
fetch(useProxy ? proxyUrl + encodeURIComponent(apiUrl) : apiUrl) // Fix URL construction
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.result === "success") {
            exchangeRates = data.conversion_rates;
            isExchangeRatesLoaded = true; // Set the flag to true
            console.log("Exchange Rates Loaded:", exchangeRates);
        } else {
            console.error("API Error:", data.error);
        }
    })
    .catch(error => console.error("Fetch Error:", error));

// Fetch country-currency mapping
fetch("https://restcountries.com/v3.1/all?fields=name,currencies")
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        data.forEach(country => {
            const countryName = country.name.common;
            const currencyCode = country.currencies ? Object.keys(country.currencies)[0] : null;
            if (currencyCode) {
                countryToCurrency[countryName] = currencyCode;
            }
        });
        console.log("Country to Currency Mapping:", countryToCurrency);
    })
    .catch(error => console.error("Country API Error:", error));

// Initialize Map
const map = L.map('map').setView([20, 0], 2);

// Load GeoJSON countries
fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json")
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        L.geoJSON(data, {
            style: { color: "#3388ff", weight: 1 },
            onEachFeature: function (feature, layer) {
                layer.on({
                    mousemove: showCurrencyConversion,
                    mouseout: removeFloatingBox
                });
            }
        }).addTo(map);
    })
    .catch(error => console.error("GeoJSON Load Error:", error));

// Floating box functions
function createFloatingBox(content, x, y) {
    let infoBox = document.getElementById("info-box");
    if (!infoBox) {
        infoBox = document.createElement("div");
        infoBox.id = "info-box";
        document.body.appendChild(infoBox);
    }
    Object.assign(infoBox.style, {
        position: "absolute",
        left: `${x + 10}px`,
        top: `${y + 10}px`,
        padding: "10px",
        background: "rgba(0, 0, 0, 0.8)",
        color: "white",
        borderRadius: "5px",
        zIndex: "1000"
    });
    infoBox.innerHTML = content;
}

function removeFloatingBox() {
    let infoBox = document.getElementById("info-box");
    if (infoBox) {
        document.body.removeChild(infoBox);
    }
}

// Show currency conversion  
function showCurrencyConversion(e) {
    if (!isExchangeRatesLoaded) {
        createFloatingBox("Exchange rates are still loading...", e.originalEvent.clientX, e.originalEvent.clientY);
        return;
    }

    const country = e.target.feature.properties.name;
    const countryCode = countryToCurrency[country];

    if (!countryCode) {
        createFloatingBox(`Currency data not available for ${country}`, e.originalEvent.clientX, e.originalEvent.clientY);
        return;
    }

    if (exchangeRates[selectedCurrency] && exchangeRates[countryCode]) {
        const conversionRate = exchangeRates[countryCode] / exchangeRates[selectedCurrency];
        createFloatingBox(
            `<strong>${country}</strong><br>1 ${selectedCurrency} = ${conversionRate.toFixed(2)} ${countryCode}`,
            e.originalEvent.clientX, e.originalEvent.clientY
        );
    } else {
        createFloatingBox(`Exchange rate not available for ${countryCode}`, e.originalEvent.clientX, e.originalEvent.clientY);
    }
}
