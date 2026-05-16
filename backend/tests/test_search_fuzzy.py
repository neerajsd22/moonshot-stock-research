"""Tests for /api/stocks/search fuzzy lookup fix.

P0 Bug: Stock search must return results for full company names
(e.g. 'Salesforce' -> CRM, 'Abbott Laboratories' -> ABT) using
yfinance Search as a supplement to predefined ticker dictionary.

Plus light regression checks for other key endpoints.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
SEARCH = f"{BASE_URL}/api/stocks/search"


def _search(q, exchange=None, retries=2):
    """Call the search endpoint with retries (yfinance may rate-limit)."""
    last = None
    for _ in range(retries):
        params = {"q": q}
        if exchange:
            params["exchange"] = exchange
        try:
            r = requests.get(SEARCH, params=params, timeout=30)
            last = r
            if r.status_code == 200 and r.json():
                return r
        except requests.RequestException as e:
            last = e
    return last


# ---------- Fuzzy company name -> ticker resolution ----------
class TestFuzzyCompanyName:
    def test_salesforce_returns_crm(self):
        r = _search("Salesforce")
        assert hasattr(r, "status_code") and r.status_code == 200, f"Bad response: {r}"
        data = r.json()
        assert isinstance(data, list) and len(data) > 0, "No results returned for Salesforce"
        tickers = [d["ticker"] for d in data]
        assert "CRM" in tickers, f"CRM not in results: {tickers}"
        # Verify name contains 'Salesforce'
        crm = next(d for d in data if d["ticker"] == "CRM")
        assert "salesforce" in crm["name"].lower(), f"Name mismatch: {crm}"

    def test_abbott_returns_abt(self):
        r = _search("Abbott Laboratories")
        assert r.status_code == 200
        data = r.json()
        tickers = [d["ticker"] for d in data]
        assert "ABT" in tickers, f"ABT not in results: {tickers}"

    def test_tesla_returns_tsla(self):
        r = _search("Tesla")
        assert r.status_code == 200
        data = r.json()
        tickers = [d["ticker"] for d in data]
        assert "TSLA" in tickers, f"TSLA not in results: {tickers}"

    def test_microsoft_returns_msft(self):
        r = _search("Microsoft")
        assert r.status_code == 200
        data = r.json()
        tickers = [d["ticker"] for d in data]
        assert "MSFT" in tickers, f"MSFT not in results: {tickers}"

    def test_reliance_returns_nse_or_bse(self):
        r = _search("Reliance")
        assert r.status_code == 200
        data = r.json()
        tickers = [d["ticker"] for d in data]
        assert ("RELIANCE.NS" in tickers) or ("RELIANCE.BO" in tickers), \
            f"Reliance NSE/BSE missing: {tickers}"


# ---------- Direct ticker lookup (regression) ----------
class TestDirectTicker:
    def test_aapl_direct(self):
        r = _search("AAPL")
        assert r.status_code == 200
        data = r.json()
        tickers = [d["ticker"] for d in data]
        assert "AAPL" in tickers, f"AAPL missing: {tickers}"

    def test_crm_direct(self):
        r = _search("CRM")
        assert r.status_code == 200
        data = r.json()
        tickers = [d["ticker"] for d in data]
        assert "CRM" in tickers, f"CRM missing: {tickers}"


# ---------- Exchange filtering ----------
class TestExchangeFilter:
    def test_salesforce_us_only(self):
        r = _search("Salesforce", exchange="us")
        assert r.status_code == 200
        data = r.json()
        tickers = [d["ticker"] for d in data]
        assert "CRM" in tickers, f"CRM missing for us filter: {tickers}"
        # No NSE/BSE results
        for t in tickers:
            assert not t.endswith(".NS"), f"Unexpected NSE ticker {t}"
            assert not t.endswith(".BO"), f"Unexpected BSE ticker {t}"

    def test_reliance_nse_only(self):
        r = _search("Reliance", exchange="nse")
        assert r.status_code == 200
        data = r.json()
        tickers = [d["ticker"] for d in data]
        assert "RELIANCE.NS" in tickers, f"RELIANCE.NS missing: {tickers}"
        for t in tickers:
            assert not t.endswith(".BO"), f"BSE leaked into nse filter: {t}"
            # No raw US listings
            assert ("." in t) or t.startswith("^"), \
                f"US-style ticker leaked into nse filter: {t}"

    def test_no_foreign_exchanges(self):
        """Ensure .DE, .MX, .BA etc are excluded."""
        r = _search("Volkswagen")
        if r.status_code != 200:
            pytest.skip("Search rate-limited")
        data = r.json()
        for d in data:
            t = d["ticker"]
            # Only allowed dot-suffixes are .NS and .BO; ^ for indices
            if "." in t and not t.startswith("^"):
                suffix = "." + t.split(".")[-1]
                assert suffix in (".NS", ".BO"), \
                    f"Foreign exchange ticker leaked: {t}"


# ---------- Regression checks ----------
class TestRegression:
    def test_aapl_quote(self):
        r = requests.get(f"{BASE_URL}/api/stocks/AAPL/quote", timeout=30)
        assert r.status_code == 200, f"Quote failed: {r.status_code} {r.text[:200]}"
        data = r.json()
        assert data.get("ticker") == "AAPL"
        assert isinstance(data.get("price", data.get("current_price")), (int, float)) or "price" in data or "current_price" in data

    def test_price_alerts_list(self):
        r = requests.get(f"{BASE_URL}/api/price-alerts", timeout=30)
        assert r.status_code == 200, f"price-alerts failed: {r.status_code}"
        assert isinstance(r.json(), list)

    def test_pinned_stocks_list(self):
        r = requests.get(f"{BASE_URL}/api/pinned-stocks", timeout=30)
        assert r.status_code == 200, f"pinned-stocks failed: {r.status_code}"
        assert isinstance(r.json(), list)
