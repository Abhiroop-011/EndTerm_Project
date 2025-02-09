let exchangeRates = {};
let selectedCurrency = "USD";
const API_KEY = "abfddebfec56e4f9435d7ba6"; 
let countryToCurrency = {};
let isExchangeRatesLoaded = false;
let isCountryDataLoaded = false;

fetch(`https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`)
    .then(response => response.json())
    .then(data => {
        if (data.result === "success") {
            exchangeRates = data.conversion_rates;
            isExchangeRatesLoaded = true;
            console.log("Exchange Rates Loaded:", exchangeRates);
        } else {
            console.error("API Error:", data.error);
        }
    })
    .catch(error => console.error("Fetch Error:", error));

fetch("https://restcountries.com/v3.1/all?fields=name,currencies")
    .then(response => response.json())
    .then(data => {
        data.forEach(country => {
            const countryName = country.name.common;
            const currencyCode = country.currencies ? Object.keys(country.currencies)[0] : null;
            if (currencyCode) {
                countryToCurrency[countryName] = currencyCode;
            }
        });
        isCountryDataLoaded = true;
        console.log("Country to Currency Mapping:", countryToCurrency);
    })
    .catch(error => console.error("Country API Error:", error));

const map = L.map('map').setView([20, 0], 2); 
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json")
    .then(response => response.json())
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
        zIndex: "1000",
        pointerEvents: "none" 
    });
    infoBox.innerHTML = content;
}

function removeFloatingBox() {
    let infoBox = document.getElementById("info-box");
    if (infoBox) {
        infoBox.remove();
    }
}

function showCurrencyConversion(e) {
    if (!isExchangeRatesLoaded || !isCountryDataLoaded) {
        createFloatingBox("Loading data...", e.originalEvent.clientX, e.originalEvent.clientY);
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

document.addEventListener("DOMContentLoaded", function () {
    const currencySelector = document.getElementById("currency-selector");
    if (currencySelector) {
        currencySelector.addEventListener("change", function (event) {
            selectedCurrency = event.target.value;
        });
    } else {
        console.error("Currency selector not found in the DOM.");
    }
});
