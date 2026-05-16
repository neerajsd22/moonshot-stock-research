"""
Regression tests for the NaN-in-history bug fix.

Bug: /api/stocks/MSFT/history previously returned HTTP 500 because yfinance
returned an ex-dividend row with NaN OHLC values, breaking JSON serialization.

Fix: dropna(subset=['Open','High','Low','Close']) + safe Volume int conversion +
per-row try/except in /app/backend/server.py::get_stock_history.
"""

import os
import math
import json
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

TIMEOUT = 60


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ------------------------- /api/stocks/{ticker}/history -------------------------

# Targeted MSFT regression — the original bug ticker
class TestMSFTHistoryRegression:
    def test_msft_history_1y_returns_200_and_finite_ohlc(self, session):
        r = session.get(f"{API}/stocks/MSFT/history", params={"period": "1y"}, timeout=TIMEOUT)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
        # raw text must contain no NaN/Infinity tokens (json.loads would also reject those)
        assert "NaN" not in r.text and "Infinity" not in r.text, "Response contains non-JSON-compliant floats"
        rows = r.json()
        assert isinstance(rows, list) and len(rows) > 100, f"Expected >100 rows for 1y, got {len(rows)}"
        for row in rows:
            for k in ("open", "high", "low", "close"):
                v = row[k]
                assert isinstance(v, (int, float)) and math.isfinite(v), f"Non-finite {k}={v} on {row.get('date')}"
            assert isinstance(row["volume"], int) and row["volume"] >= 0

    @pytest.mark.parametrize("period", ["1mo", "3mo", "6mo", "1y", "5y"])
    def test_msft_history_all_periods(self, session, period):
        r = session.get(f"{API}/stocks/MSFT/history", params={"period": period}, timeout=TIMEOUT)
        assert r.status_code == 200, f"period={period} -> {r.status_code}: {r.text[:200]}"
        rows = r.json()
        assert isinstance(rows, list) and len(rows) > 0


# Broad-sector cross-ticker regression
TICKERS = [
    "AAPL", "GOOGL", "NVDA", "TSLA", "AMZN", "META", "CRM", "ABT",
    "JNJ", "KO", "V", "PFE", "ORCL", "NFLX", "BAC", "INTC", "PG",
]


class TestBroadTickerHistory:
    @pytest.mark.parametrize("ticker", TICKERS)
    def test_history_1y_returns_finite_ohlc(self, session, ticker):
        r = session.get(f"{API}/stocks/{ticker}/history", params={"period": "1y"}, timeout=TIMEOUT)
        assert r.status_code == 200, f"{ticker} 1y -> {r.status_code}: {r.text[:200]}"
        assert "NaN" not in r.text and "Infinity" not in r.text, f"{ticker}: non-compliant floats in JSON"
        # Must json-parse cleanly
        rows = json.loads(r.text)
        assert isinstance(rows, list) and len(rows) > 0, f"{ticker}: empty history"
        # Spot-check a sample of rows
        for row in rows[:5] + rows[-5:]:
            for k in ("open", "high", "low", "close"):
                v = row[k]
                assert math.isfinite(v), f"{ticker} non-finite {k} on {row.get('date')}"


class TestHistoryInvalidTicker:
    def test_invalid_ticker_returns_404(self, session):
        r = session.get(f"{API}/stocks/INVALIDTICKER/history", params={"period": "1y"}, timeout=TIMEOUT)
        assert r.status_code == 404, f"Expected 404, got {r.status_code}"


# ------------------------- regression on related MSFT endpoints -------------------------

class TestMSFTOtherEndpointsRegression:
    """Make sure other endpoints used by the stock card still return 200 for MSFT."""

    def test_quote(self, session):
        r = session.get(f"{API}/stocks/MSFT/quote", timeout=TIMEOUT)
        assert r.status_code == 200, r.text[:200]
        data = r.json()
        assert data.get("ticker", "").upper() == "MSFT"

    def test_earnings_snapshot(self, session):
        r = session.get(f"{API}/stocks/MSFT/earnings-snapshot", timeout=TIMEOUT)
        assert r.status_code == 200, r.text[:200]

    def test_earnings_link(self, session):
        r = session.get(f"{API}/stocks/MSFT/earnings-link", timeout=TIMEOUT)
        assert r.status_code == 200, r.text[:200]

    def test_health_report(self, session):
        r = session.get(f"{API}/stocks/MSFT/health-report", timeout=120)
        assert r.status_code == 200, r.text[:200]

    def test_news(self, session):
        r = session.get(f"{API}/stocks/MSFT/news", timeout=TIMEOUT)
        assert r.status_code == 200, r.text[:200]

    def test_bull_bear_sentiment(self, session):
        r = session.get(f"{API}/stocks/MSFT/bull-bear-sentiment", timeout=120)
        assert r.status_code == 200, r.text[:200]
