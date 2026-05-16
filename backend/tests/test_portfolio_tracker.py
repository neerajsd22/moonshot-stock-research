"""
Backend tests for Portfolio Tracker (P&L Dashboard) feature.
Covers: GET/POST/PUT/DELETE /api/portfolio, GET /api/portfolio/summary,
POST /api/portfolio/import (CSV + paste, preview + confirm).
"""

import os
import pytest
import requests
from typing import Any, Dict

BASE = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE:
    # Fallback to frontend/.env if env not pushed into pytest context
    with open("/app/frontend/.env") as fp:
        for line in fp:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE = line.split("=", 1)[1].strip().rstrip("/")

API = f"{BASE}/api"


# ---- helpers ---------------------------------------------------------------

def _clear_portfolio():
    r = requests.get(f"{API}/portfolio", timeout=30)
    if r.status_code == 200:
        for p in r.json():
            requests.delete(f"{API}/portfolio/{p['id']}", timeout=15)


@pytest.fixture(autouse=True)
def clean_portfolio():
    _clear_portfolio()
    yield
    _clear_portfolio()


# ---- empty state -----------------------------------------------------------

class TestEmptyState:
    def test_get_portfolio_empty_returns_list(self):
        r = requests.get(f"{API}/portfolio", timeout=15)
        assert r.status_code == 200
        assert r.json() == []

    def test_get_summary_empty_marks_is_empty(self):
        r = requests.get(f"{API}/portfolio/summary", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["is_empty"] is True
        assert data["position_count"] == 0
        assert data["total_value"] == 0
        assert data["total_cost"] == 0
        assert data["allocation"] == []


# ---- CRUD ------------------------------------------------------------------

class TestPortfolioCRUD:
    def test_add_position_validation_ticker_required(self):
        r = requests.post(f"{API}/portfolio", json={"ticker": "", "shares": 10, "avg_cost": 100}, timeout=15)
        # Pydantic still accepts empty string into payload, server-side strip→400
        assert r.status_code in (400, 422)

    def test_add_position_validation_shares_must_be_positive(self):
        r = requests.post(f"{API}/portfolio", json={"ticker": "AAPL", "shares": 0, "avg_cost": 100}, timeout=15)
        assert r.status_code == 400

    def test_add_position_validation_cost_must_be_positive(self):
        r = requests.post(f"{API}/portfolio", json={"ticker": "AAPL", "shares": 10, "avg_cost": 0}, timeout=15)
        assert r.status_code == 400

    def test_add_nvda_and_get_returns_computed_fields(self):
        payload = {"ticker": "NVDA", "shares": 50, "avg_cost": 420.10}
        r = requests.post(f"{API}/portfolio", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["ticker"] == "NVDA"
        assert created["shares"] == 50
        assert created["avg_cost"] == 420.10
        assert "id" in created

        # List
        rl = requests.get(f"{API}/portfolio", timeout=60)
        assert rl.status_code == 200
        items = rl.json()
        assert len(items) == 1
        item = items[0]
        # cost_basis must equal shares * avg_cost
        assert item["cost_basis"] == pytest.approx(50 * 420.10, rel=1e-4)
        # computed fields exist (price may be None if yfinance is rate-limited)
        for k in ("price", "market_value", "unrealized_pnl", "unrealized_pnl_pct", "today_change", "today_change_pct"):
            assert k in item, f"missing field {k}"

    def test_summary_one_position_allocation_100pct(self):
        requests.post(f"{API}/portfolio", json={"ticker": "AAPL", "shares": 10, "avg_cost": 150}, timeout=30)
        r = requests.get(f"{API}/portfolio/summary", timeout=60)
        assert r.status_code == 200
        data = r.json()
        assert data["is_empty"] is False
        assert data["position_count"] == 1
        for k in ("total_value", "total_cost", "total_pnl", "total_pnl_pct",
                  "today_change", "best_performer", "worst_performer", "allocation"):
            assert k in data
        # allocation 100% IF live price available
        if data["allocation"]:
            assert data["allocation"][0]["ticker"] == "AAPL"
            assert data["allocation"][0]["percent"] == pytest.approx(100, abs=0.01)

    def test_put_updates_shares(self):
        c = requests.post(f"{API}/portfolio", json={"ticker": "MSFT", "shares": 5, "avg_cost": 300}, timeout=30)
        pid = c.json()["id"]
        u = requests.put(f"{API}/portfolio/{pid}", json={"shares": 12}, timeout=15)
        assert u.status_code == 200
        # Verify persistence
        rl = requests.get(f"{API}/portfolio", timeout=60)
        item = [x for x in rl.json() if x["id"] == pid][0]
        assert item["shares"] == 12

    def test_put_returns_404_for_missing(self):
        u = requests.put(f"{API}/portfolio/does-not-exist-id", json={"shares": 5}, timeout=15)
        assert u.status_code == 404

    def test_delete_removes_position(self):
        c = requests.post(f"{API}/portfolio", json={"ticker": "GOOG", "shares": 2, "avg_cost": 100}, timeout=30)
        pid = c.json()["id"]
        d = requests.delete(f"{API}/portfolio/{pid}", timeout=15)
        assert d.status_code == 200
        rl = requests.get(f"{API}/portfolio", timeout=30)
        assert all(x["id"] != pid for x in rl.json())

    def test_delete_returns_404_for_missing(self):
        d = requests.delete(f"{API}/portfolio/does-not-exist-id", timeout=15)
        assert d.status_code == 404


# ---- Import: CSV broker detection -----------------------------------------

ROBINHOOD_CSV = """Symbol,Quantity,Average Cost,Instrument,Shares
NVDA,50,420.10,NVIDIA,50
AAPL,120,178.50,Apple Inc,120
"""

FIDELITY_CSV = """Symbol,Quantity,Cost Basis,Current Value
NVDA,50,21005.00,22500.00
AAPL,30,5400.00,5800.00
"""

DOLLAR_COMMA_CSV = """Symbol,Quantity,Average Cost
NVDA,50,"$1,420.50"
AAPL,80,"$165.50"
"""

INVALID_TICKER_CSV = """Symbol,Quantity,Average Cost
NVDA,50,420.10
INVALID123,10,100.00
"""


class TestImportCSV:
    def test_preview_does_not_insert(self):
        r = requests.post(f"{API}/portfolio/import", json={"text": ROBINHOOD_CSV, "confirm": False}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["count"] == 2
        assert {p["ticker"] for p in data["positions"]} == {"NVDA", "AAPL"}
        assert "mapping" in data and "ticker" in data["mapping"]
        # ensure nothing was inserted
        rl = requests.get(f"{API}/portfolio", timeout=15)
        assert rl.json() == []

    def test_robinhood_auto_detect(self):
        r = requests.post(f"{API}/portfolio/import", json={"text": ROBINHOOD_CSV, "confirm": False}, timeout=15)
        d = r.json()
        # Mapping populated
        assert "ticker" in d["mapping"]
        assert "shares" in d["mapping"]
        assert "cost_basis" in d["mapping"]
        # broker label best-effort
        # (Robinhood fingerprint includes 'instrument','symbol','shares','average cost')

    def test_fidelity_auto_detect_broker_label(self):
        r = requests.post(f"{API}/portfolio/import", json={"text": FIDELITY_CSV, "confirm": False}, timeout=15)
        d = r.json()
        assert d["broker"] == "Fidelity"
        assert d["count"] == 2

    def test_dollar_and_comma_numbers_parse(self):
        r = requests.post(f"{API}/portfolio/import", json={"text": DOLLAR_COMMA_CSV, "confirm": False}, timeout=15)
        d = r.json()
        assert d["count"] == 2
        nvda = next(p for p in d["positions"] if p["ticker"] == "NVDA")
        assert nvda["avg_cost"] == pytest.approx(1420.50)

    def test_invalid_ticker_produces_warning_not_crash(self):
        r = requests.post(f"{API}/portfolio/import", json={"text": INVALID_TICKER_CSV, "confirm": False}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["count"] == 1
        assert any("INVALID123" in w or "skipped" in w.lower() for w in d["warnings"])

    def test_confirm_inserts_positions(self):
        r = requests.post(f"{API}/portfolio/import",
                          json={"text": ROBINHOOD_CSV, "confirm": True}, timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert d["imported"] == 2
        # verify persisted
        rl = requests.get(f"{API}/portfolio", timeout=60)
        items = rl.json()
        assert {x["ticker"] for x in items} == {"NVDA", "AAPL"}


# ---- Import: paste formats -------------------------------------------------

class TestImportPaste:
    def test_space_delimited_no_header(self):
        text = "NVDA 50 420.10\nAAPL 120 178.50"
        r = requests.post(f"{API}/portfolio/import", json={"text": text, "confirm": False}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["count"] == 2
        tickers = {p["ticker"] for p in d["positions"]}
        assert tickers == {"NVDA", "AAPL"}

    def test_colon_at_dollar_format(self):
        text = "NVDA: 50 @ $420.10\nAAPL: 30 @ $180.00"
        r = requests.post(f"{API}/portfolio/import", json={"text": text, "confirm": False}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["count"] == 2
        nvda = next(p for p in d["positions"] if p["ticker"] == "NVDA")
        assert nvda["shares"] == 50
        assert nvda["avg_cost"] == pytest.approx(420.10)

    def test_empty_input_returns_warning(self):
        r = requests.post(f"{API}/portfolio/import", json={"text": "", "confirm": False}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "Empty input." in d["warnings"]
        assert d["count"] == 0
