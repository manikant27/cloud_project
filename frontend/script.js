const BASE_URL = "http://13.126.117.109:8000";

const symbolInput = document.getElementById("symbolInput");
const priceBtn = document.getElementById("priceBtn");
const indicatorsBtn = document.getElementById("indicatorsBtn");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const chartWrapper = document.getElementById("chartWrapper");
const chartCanvas = document.getElementById("priceChart");

let chartInstance = null;

function setLoading(isLoading, message = "") {
  priceBtn.disabled = isLoading;
  indicatorsBtn.disabled = isLoading;
  statusEl.textContent = message;
}

function normalizeSymbol() {
  return symbolInput.value.trim().toUpperCase();
}

function showError(message) {
  resultEl.className = "result-card error";
  resultEl.innerHTML = `<strong>Error:</strong> ${message}`;
  resultEl.classList.remove("hidden");
}

function showPrice(data) {
  resultEl.className = "result-card success";
  resultEl.innerHTML = `
    <h3>Latest Price</h3>
    <div class="result-row"><span>Symbol</span><strong>${data.symbol}</strong></div>
    <div class="result-row"><span>Price</span><strong>$${Number(data.price).toFixed(2)}</strong></div>
  `;
  resultEl.classList.remove("hidden");
}

function showIndicators(data) {
  resultEl.className = "result-card success";
  resultEl.innerHTML = `
    <h3>Technical Indicators</h3>
    <div class="result-row"><span>Symbol</span><strong>${data.symbol}</strong></div>
    <div class="result-row"><span>SMA (14)</span><strong>${Number(data.SMA).toFixed(2)}</strong></div>
    <div class="result-row"><span>EMA (14)</span><strong>${Number(data.EMA).toFixed(2)}</strong></div>
    <div class="result-row"><span>RSI (14)</span><strong>${Number(data.RSI).toFixed(2)}</strong></div>
  `;
  resultEl.classList.remove("hidden");
}

function showChart(symbol, prices) {
  if (!Array.isArray(prices) || prices.length === 0) {
    chartWrapper.classList.add("hidden");
    return;
  }

  chartWrapper.classList.remove("hidden");
  const labels = prices.map((_, idx) => `Day ${idx + 1}`);
  const closeValues = prices.map((value) => Number(value));

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(chartCanvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: `${symbol} Close Price`,
          data: closeValues,
          borderColor: "#0f766e",
          backgroundColor: "rgba(15, 118, 110, 0.15)",
          fill: true,
          tension: 0.25,
          pointRadius: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
        },
      },
    },
  });
}

async function fetchJson(url) {
  const response = await fetch(url);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.detail || "Request failed");
  }

  return payload;
}

priceBtn.addEventListener("click", async () => {
  const symbol = normalizeSymbol();

  if (!symbol) {
    showError("Please enter a stock symbol.");
    return;
  }

  try {
    setLoading(true, "Fetching latest price...");
    resultEl.classList.add("hidden");
    chartWrapper.classList.add("hidden");

    const data = await fetchJson(`${BASE_URL}/price/${symbol}`);
    showPrice(data);
    setLoading(false, "Price loaded.");
  } catch (error) {
    showError(error.message || "Unable to fetch price.");
    setLoading(false, "");
  }
});

indicatorsBtn.addEventListener("click", async () => {
  const symbol = normalizeSymbol();

  if (!symbol) {
    showError("Please enter a stock symbol.");
    return;
  }

  try {
    setLoading(true, "Calculating indicators...");
    resultEl.classList.add("hidden");

    const data = await fetchJson(`${BASE_URL}/indicators/${symbol}`);
    showIndicators(data);
    showChart(symbol, data.close_prices);
    setLoading(false, "Indicators loaded.");
  } catch (error) {
    showError(error.message || "Unable to fetch indicators.");
    chartWrapper.classList.add("hidden");
    setLoading(false, "");
  }
});
