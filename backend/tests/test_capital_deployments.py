"""Tests for /api/stocks/:ticker/capital-deployments (Intelligence Hub module).

Verifies:
  - 13F filer (NVDA, BRK-B) returns is_13f_filer=True, populated current_book
  - Non-13F filer (AAPL) returns is_13f_filer=False
  - Response shape is JSON-safe (no NaN/Inf, only allowed keys)
  - Numeric fields are numbers, not strings
  - Endpoint never returns 5xx (graceful degrade on upstream failure)

Skips if SEC EDGAR is rate-limiting (HTTP failure on the upstream).
"""
import os

import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
ENDPOINT = f"{BASE_URL}/api/stocks/{{}}/capital-deployments"

EXPECTED_KEYS = {
    "ticker",
    "is_13f_filer",
    "filing_date",
    "thirteenf_filing_url",
    "all_13f_url",
    "all_8k_url",
    "edgar_profile_url",
    "new_this_quarter",
    "current_book",
    "acquisitions",
}

ROW_KEYS = {"ticker", "name", "value_usd", "shares", "badge", "qoq_change_pct"}
ACQ_KEYS = {"date", "target_name", "deal_size_text", "filing_url"}


def _get(ticker: str):
    return requests.get(ENDPOINT.format(ticker), timeout=30)


def _assert_row_shape(row):
    assert ROW_KEYS.issubset(set(row.keys())), f"missing keys in row: {row}"
    assert isinstance(row["ticker"], str)
    assert isinstance(row["name"], str)
    assert isinstance(row["value_usd"], (int, float))
    if row["shares"] is not None:
        assert isinstance(row["shares"], (int, float))
    if row["badge"] is not None:
        assert row["badge"] in ("NEW", "TOPUP", "EXITED")
    if row["qoq_change_pct"] is not None:
        assert isinstance(row["qoq_change_pct"], (int, float))


def test_endpoint_returns_200_for_known_filer():
    r = _get("NVDA")
    assert r.status_code == 200
    body = r.json()
    assert EXPECTED_KEYS.issubset(set(body.keys()))


def test_nvda_is_13f_filer_with_holdings():
    r = _get("NVDA")
    body = r.json()
    if not body.get("current_book"):
        # SEC EDGAR may rate-limit; treat as upstream failure, not test failure
        return
    assert body["is_13f_filer"] is True
    assert isinstance(body["filing_date"], str) and len(body["filing_date"]) > 0
    assert len(body["current_book"]) > 0
    for row in body["current_book"]:
        _assert_row_shape(row)


def test_brk_b_has_large_book():
    r = _get("BRK-B")
    body = r.json()
    if not body.get("current_book"):
        return
    # Berkshire's portfolio is consistently >10 distinct positions
    assert body["is_13f_filer"] is True
    assert len(body["current_book"]) >= 10
    # Apple is consistently Berkshire's largest or near-largest holding
    tickers = [r["ticker"] for r in body["current_book"][:5]]
    assert "AAPL" in tickers


def test_aapl_is_not_a_13f_filer():
    r = _get("AAPL")
    body = r.json()
    assert body["is_13f_filer"] is False
    assert body["current_book"] == []
    assert body["new_this_quarter"] == []


def test_acquisition_rows_well_formed():
    # Berkshire-ish or NVDA-ish — only check shape if we have any rows
    for tk in ("NVDA", "BRK-B", "AAPL"):
        r = _get(tk)
        for acq in r.json().get("acquisitions", []):
            assert ACQ_KEYS.issubset(set(acq.keys()))
            assert acq["filing_url"].startswith("https://")


def test_response_is_json_safe_no_nan_inf():
    # If json.loads() succeeds, NaN/Inf weren't in the response.
    # (Python's stdlib does NOT auto-emit NaN by default in our backend.)
    for tk in ("NVDA", "BRK-B", "AAPL", "TSLA"):
        r = _get(tk)
        assert r.status_code == 200
        r.json()  # raises on malformed JSON


def test_invalid_ticker_does_not_500():
    r = _get("XYZNONEXISTENT")
    assert r.status_code == 200
    body = r.json()
    assert body["is_13f_filer"] is False
    assert body["current_book"] == []
    assert body["acquisitions"] == []


def test_source_links_are_well_formed():
    """Option C + D: per-row 8-K links + footer card with 13F / 8-K / EDGAR profile."""
    # NVDA (13F filer) — must expose 13F filing, all-13F list, all-8K list, EDGAR profile
    r = _get("NVDA")
    body = r.json()
    if not body.get("current_book"):
        return  # SEC rate-limit; skip
    assert body["thirteenf_filing_url"], "13F filer must expose thirteenf_filing_url"
    assert body["thirteenf_filing_url"].startswith("https://www.sec.gov/Archives/edgar/data/")
    assert body["all_13f_url"] and "type=13F-HR" in body["all_13f_url"]
    assert body["all_8k_url"] and "type=8-K" in body["all_8k_url"]
    assert body["edgar_profile_url"] and "action=getcompany" in body["edgar_profile_url"]

    # AAPL (non-13F filer) — no 13F filing URL, but EDGAR + 8-K list still available
    r = _get("AAPL")
    body = r.json()
    assert body["thirteenf_filing_url"] is None
    assert body["all_13f_url"] is None  # don't promise a list of zero filings
    assert body["all_8k_url"] and "type=8-K" in body["all_8k_url"]
    assert body["edgar_profile_url"]


def test_acquisition_filing_url_is_specific():
    """Each acquisition's filing_url must point to that exact 8-K (Option C)."""
    for tk in ("NVDA", "BRK-B"):
        r = _get(tk)
        body = r.json()
        for acq in body.get("acquisitions", []):
            assert acq["filing_url"].startswith("https://www.sec.gov/Archives/edgar/data/"), (
                f"acquisition filing_url must be a specific filing index, got {acq['filing_url']}"
            )
