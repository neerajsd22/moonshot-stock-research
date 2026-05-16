"""
Regression tests for the NaN/Inf JSON-safety defensive hardening pass.

Scope: /api/stocks/{ticker}/quote, /earnings-snapshot, /health-report, /history
must never emit NaN/Infinity/-Infinity JSON tokens and must return HTTP 200
for valid tickers (including international tickers like RELIANCE.NS, TCS.NS).

Backed by safe_float / safe_int / safe_pct helpers in server.py.
"""

import os
import math
import json
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
TIMEOUT = 60
HEALTH_TIMEOUT = 180  # health-report is slower (LLM + multi-call yfinance)

US_TICKERS = [
    "MSFT", "AAPL", "GOOGL", "NVDA", "TSLA", "AMZN", "META", "CRM",
    "ABT", "JNJ", "KO", "V", "PFE", "ORCL", "NFLX", "BAC", "INTC", "PG",
]
INTL_TICKERS = ["RELIANCE.NS", "TCS.NS"]
ALL_TICKERS = US_TICKERS + INTL_TICKERS


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _assert_no_nan_inf_tokens(text: str, ctx: str):
    """The raw response body must NOT contain JSON-illegal float tokens."""
    # Use word-ish boundaries to avoid false positives ("Infiniti" stock names, etc.).
    for bad in ('"NaN"', ": NaN", ":NaN", ", NaN", "[NaN",
                ": Infinity", ":Infinity", "[Infinity",
                ": -Infinity", ":-Infinity", "[-Infinity"):
        assert bad not in text, f"{ctx}: response contains JSON-illegal token {bad!r}"
    # Sanity: must json-decode without strict=False
    json.loads(text)  # raises if NaN/Infinity present


def _walk_floats(obj, path="$"):
    """Yield (path, value) for every numeric leaf in a JSON-decoded structure."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield from _walk_floats(v, f"{path}.{k}")
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from _walk_floats(v, f"{path}[{i}]")
    elif isinstance(obj, float):
        yield path, obj


# ---------- /quote ----------

class TestQuoteEndpoint:
    @pytest.mark.parametrize("ticker", ALL_TICKERS)
    def test_quote_200_and_json_safe(self, session, ticker):
        r = session.get(f"{API}/stocks/{ticker}/quote", timeout=TIMEOUT)
        assert r.status_code == 200, f"{ticker} /quote -> {r.status_code}: {r.text[:300]}"
        _assert_no_nan_inf_tokens(r.text, f"{ticker} /quote")
        data = r.json()

        # Core fields must exist and be finite numbers (price & previous_close required by handler).
        assert data["ticker"].upper() == ticker.upper()
        assert isinstance(data["price"], (int, float)) and math.isfinite(data["price"])
        assert math.isfinite(data["change"])
        assert math.isfinite(data["change_percent"])

        # Every numeric leaf must be finite.
        for p, v in _walk_floats(data):
            assert math.isfinite(v), f"{ticker} /quote: non-finite value at {p}={v}"

    @pytest.mark.parametrize("ticker", ["MSFT", "AAPL", "NVDA"])
    def test_quote_premarket_postmarket_subobjects(self, session, ticker):
        """pre_market/post_market: either None or a dict with finite values."""
        r = session.get(f"{API}/stocks/{ticker}/quote", timeout=TIMEOUT)
        assert r.status_code == 200
        data = r.json()
        for key in ("pre_market", "post_market"):
            sub = data.get(key)
            assert sub is None or isinstance(sub, dict), f"{ticker}.{key} bad type: {type(sub)}"
            if isinstance(sub, dict):
                # price must be finite if dict is present (handler only emits dict when price is not None)
                assert isinstance(sub.get("price"), (int, float)) and math.isfinite(sub["price"]), \
                    f"{ticker}.{key}.price not finite: {sub.get('price')}"
                for k in ("change", "change_percent"):
                    v = sub.get(k)
                    assert v is None or math.isfinite(v), f"{ticker}.{key}.{k} not finite: {v}"


# ---------- /earnings-snapshot ----------

EARNINGS_NUMERIC_FIELDS = [
    "capex", "free_cash_flow", "gross_margin", "operating_margin", "profit_margin",
    "return_on_equity", "earnings_growth", "revenue_growth", "target_price",
    "revenue", "net_income",
]


class TestEarningsSnapshotEndpoint:
    @pytest.mark.parametrize("ticker", ALL_TICKERS)
    def test_earnings_snapshot_200_and_json_safe(self, session, ticker):
        r = session.get(f"{API}/stocks/{ticker}/earnings-snapshot", timeout=TIMEOUT)
        assert r.status_code == 200, f"{ticker} /earnings-snapshot -> {r.status_code}: {r.text[:300]}"
        _assert_no_nan_inf_tokens(r.text, f"{ticker} /earnings-snapshot")
        data = r.json()
        assert data["ticker"].upper() == ticker.upper()
        for f in EARNINGS_NUMERIC_FIELDS:
            assert f in data, f"{ticker}: missing field {f}"
            v = data[f]
            assert v is None or (isinstance(v, (int, float)) and math.isfinite(v)), \
                f"{ticker}.{f} not None/finite: {v!r}"


# ---------- /health-report ----------

class TestHealthReportEndpoint:
    @pytest.mark.parametrize("ticker", ALL_TICKERS)
    def test_health_report_200_and_json_safe(self, session, ticker):
        r = session.get(f"{API}/stocks/{ticker}/health-report", timeout=HEALTH_TIMEOUT)
        assert r.status_code == 200, f"{ticker} /health-report -> {r.status_code}: {r.text[:300]}"
        _assert_no_nan_inf_tokens(r.text, f"{ticker} /health-report")
        data = r.json()
        # Validate every numeric leaf
        for p, v in _walk_floats(data):
            assert math.isfinite(v), f"{ticker} /health-report: non-finite at {p}={v}"
        # risk_scores expected to exist (per the fix scope)
        if "risk_scores" in data:
            rs = data["risk_scores"]
            for p, v in _walk_floats(rs, "$.risk_scores"):
                assert math.isfinite(v), f"{ticker} risk_scores non-finite at {p}={v}"


# ---------- /history regression ----------

class TestHistoryRegression:
    @pytest.mark.parametrize("ticker", ALL_TICKERS)
    def test_history_1y_200_and_finite(self, session, ticker):
        r = session.get(f"{API}/stocks/{ticker}/history", params={"period": "1y"}, timeout=TIMEOUT)
        assert r.status_code == 200, f"{ticker} /history -> {r.status_code}: {r.text[:300]}"
        _assert_no_nan_inf_tokens(r.text, f"{ticker} /history")
        rows = r.json()
        assert isinstance(rows, list) and len(rows) > 0, f"{ticker}: empty history"
        for row in rows[:3] + rows[-3:]:
            for k in ("open", "high", "low", "close"):
                assert math.isfinite(row[k]), f"{ticker} non-finite {k} at {row.get('date')}"
            assert isinstance(row["volume"], int) and row["volume"] >= 0


# ---------- Graceful failure for invalid tickers ----------

class TestInvalidTickerGracefulFailure:
    def test_invalid_ticker_quote_returns_404(self, session):
        r = session.get(f"{API}/stocks/INVALIDTICKER/quote", timeout=TIMEOUT)
        assert r.status_code == 404, f"Expected 404, got {r.status_code}: {r.text[:200]}"

    def test_invalid_ticker_history_returns_404(self, session):
        r = session.get(f"{API}/stocks/INVALIDTICKER/history", params={"period": "1y"}, timeout=TIMEOUT)
        assert r.status_code == 404

    def test_invalid_ticker_earnings_snapshot_returns_structured(self, session):
        """earnings-snapshot returns a structured payload with None fields, not a 500."""
        r = session.get(f"{API}/stocks/INVALIDTICKER/earnings-snapshot", timeout=TIMEOUT)
        assert r.status_code == 200, f"Expected 200 (structured fallback), got {r.status_code}"
        _assert_no_nan_inf_tokens(r.text, "INVALIDTICKER /earnings-snapshot")
        data = r.json()
        assert data["ticker"] == "INVALIDTICKER"
        for f in EARNINGS_NUMERIC_FIELDS:
            assert data[f] is None, f"Expected None for invalid ticker {f}, got {data[f]!r}"

    def test_invalid_ticker_health_report_does_not_500(self, session):
        """health-report should return a structured error object, NOT a 500."""
        r = session.get(f"{API}/stocks/INVALIDTICKER/health-report", timeout=HEALTH_TIMEOUT)
        assert r.status_code != 500, f"Got 500 for invalid ticker: {r.text[:300]}"
        # Either 200 with error-shaped body, or 404 — both are acceptable graceful failures.
        assert r.status_code in (200, 404), f"Unexpected status {r.status_code}: {r.text[:300]}"
        if r.status_code == 200:
            _assert_no_nan_inf_tokens(r.text, "INVALIDTICKER /health-report")
