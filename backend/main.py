import logging
from typing import Dict, List

import pandas as pd
import yfinance as yf
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware


logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="Stock Analysis API")

app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)


def validate_symbol(symbol: str) -> str:
	cleaned = symbol.strip().upper()
	if not cleaned or len(cleaned) > 10:
		raise HTTPException(status_code=400, detail="Please provide a valid stock symbol.")
	return cleaned


def fetch_history(symbol: str, period: str = "30d") -> pd.DataFrame:
	ticker = yf.Ticker(symbol)
	history = ticker.history(period=period, interval="1d")
	if history.empty or "Close" not in history.columns:
		raise HTTPException(
			status_code=404,
			detail=f"No data found for symbol '{symbol}'. Please check the symbol and try again.",
		)
	return history


def calculate_rsi(close_prices: pd.Series, period: int = 14) -> float:
	delta = close_prices.diff()
	gains = delta.clip(lower=0)
	losses = -delta.clip(upper=0)

	avg_gain = gains.rolling(window=period).mean()
	avg_loss = losses.rolling(window=period).mean()

	rs = avg_gain / avg_loss.replace(0, pd.NA)
	rsi = 100 - (100 / (1 + rs))

	latest_rsi = rsi.dropna()
	if latest_rsi.empty:
		raise HTTPException(status_code=422, detail="Not enough data to calculate RSI.")
	return float(latest_rsi.iloc[-1])


@app.get("/")
def health_check() -> Dict[str, str]:
	return {"message": "Stock Analysis API is running"}


@app.get("/price/{symbol}")
def get_price(symbol: str) -> Dict[str, float | str]:
	symbol = validate_symbol(symbol)
	logger.info("Fetching latest price for %s", symbol)

	history = fetch_history(symbol, period="5d")
	latest_price = float(history["Close"].dropna().iloc[-1])

	return {
		"symbol": symbol,
		"price": round(latest_price, 2),
	}


@app.get("/indicators/{symbol}")
def get_indicators(symbol: str) -> Dict[str, float | str | List[float]]:
	symbol = validate_symbol(symbol)
	logger.info("Calculating indicators for %s", symbol)

	history = fetch_history(symbol, period="30d")
	close = history["Close"].dropna()

	if len(close) < 14:
		raise HTTPException(
			status_code=422,
			detail="Not enough historical data to calculate indicators.",
		)

	sma = float(close.tail(14).mean())
	ema = float(close.ewm(span=14, adjust=False).mean().iloc[-1])
	rsi = calculate_rsi(close, period=14)

	close_prices = [round(float(value), 2) for value in close.tail(30).tolist()]

	return {
		"symbol": symbol,
		"SMA": round(sma, 2),
		"EMA": round(ema, 2),
		"RSI": round(rsi, 2),
		"close_prices": close_prices,
	}
