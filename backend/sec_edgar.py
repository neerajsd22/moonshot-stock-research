"""
SEC EDGAR client for Capital Deployments (Intelligence Hub module).

Public functions
----------------
- get_cik(ticker)                  -> "0000000000" | None
- get_capital_deployments(ticker)  -> dict with keys:
      ticker, is_13f_filer, filing_date,
      new_this_quarter, current_book, acquisitions

All HTTP calls are wrapped in defensive try/except and degrade to empty data
rather than raising. EDGAR mandates a polite User-Agent.
"""
from __future__ import annotations

import logging
import re
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from xml.etree import ElementTree as ET

import requests

logger = logging.getLogger(__name__)

SEC_UA = "Moonshot Research moonshot@research.app"
HEADERS = {"User-Agent": SEC_UA, "Accept-Encoding": "gzip, deflate"}
TIMEOUT = 10

# ---------------------------------------------------------------------------
# In-process TTL cache (simple dict; one-process scope, same lifetime model
# as TickerCache in server.py).
# ---------------------------------------------------------------------------
_CACHE: Dict[str, tuple[float, Any]] = {}


def _cache_get(key: str, ttl: int) -> Optional[Any]:
    item = _CACHE.get(key)
    if not item:
        return None
    ts, value = item
    if time.time() - ts > ttl:
        _CACHE.pop(key, None)
        return None
    return value


def _cache_set(key: str, value: Any) -> None:
    _CACHE[key] = (time.time(), value)


# ---------------------------------------------------------------------------
# CIK lookup
# ---------------------------------------------------------------------------
def _load_ticker_map() -> Dict[str, str]:
    """ticker (upper) -> 10-digit CIK string. Cached for 24h."""
    cached = _cache_get("ticker_map", ttl=86_400)
    if cached is not None:
        return cached

    try:
        r = requests.get(
            "https://www.sec.gov/files/company_tickers.json",
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        r.raise_for_status()
        data = r.json()
        mapping = {
            row["ticker"].upper(): str(row["cik_str"]).zfill(10)
            for row in data.values()
        }
        _cache_set("ticker_map", mapping)
        return mapping
    except Exception as exc:
        logger.warning("SEC ticker map fetch failed: %s", exc)
        return {}


def get_cik(ticker: str) -> Optional[str]:
    """Return zero-padded 10-digit CIK for ticker, or None."""
    if not ticker:
        return None
    return _load_ticker_map().get(ticker.upper())


# ---------------------------------------------------------------------------
# Submissions JSON (recent filings index)
# ---------------------------------------------------------------------------
def _get_submissions(cik: str) -> Dict[str, Any]:
    """Fetch /submissions/CIK{cik}.json. Cached for 1h."""
    key = f"submissions:{cik}"
    cached = _cache_get(key, ttl=3_600)
    if cached is not None:
        return cached

    try:
        r = requests.get(
            f"https://data.sec.gov/submissions/CIK{cik}.json",
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        r.raise_for_status()
        data = r.json()
        _cache_set(key, data)
        return data
    except Exception as exc:
        logger.warning("SEC submissions fetch failed for %s: %s", cik, exc)
        return {}


def _recent_filings(submissions: Dict[str, Any]) -> List[Dict[str, str]]:
    """Flatten the 'recent' arrays into a list of per-filing dicts."""
    recent = submissions.get("filings", {}).get("recent", {})
    if not recent:
        return []
    keys = ["form", "filingDate", "accessionNumber", "primaryDocument", "items"]
    rows = []
    n = len(recent.get("form", []))
    for i in range(n):
        row = {k: (recent.get(k, [""] * n)[i] if i < len(recent.get(k, [])) else "") for k in keys}
        rows.append(row)
    return rows


# ---------------------------------------------------------------------------
# 13F-HR — Information Table parser
# ---------------------------------------------------------------------------
_INFOTABLE_NS = "{http://www.sec.gov/edgar/document/thirteenf/informationtable}"


def _accession_dir(cik: str, accession_no: str) -> str:
    return f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{accession_no.replace('-', '')}"


def _list_filing_files(cik: str, accession_no: str) -> List[str]:
    """List files inside the filing folder via the index.json sidecar."""
    try:
        r = requests.get(
            f"{_accession_dir(cik, accession_no)}/index.json",
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        r.raise_for_status()
        items = r.json().get("directory", {}).get("item", [])
        return [it["name"] for it in items]
    except Exception as exc:
        logger.warning("Filing dir listing failed for %s/%s: %s", cik, accession_no, exc)
        return []


def _fetch_information_table(cik: str, accession_no: str) -> List[Dict[str, Any]]:
    """Parse the information_table XML; returns list of {ticker?, name, value, shares}."""
    files = _list_filing_files(cik, accession_no)
    # Candidates: any .xml that is NOT the cover-sheet "primary_doc.xml".
    # Pattern-match preferred first (info/table), else fall back to any other XML.
    xml_files = [f for f in files if f.lower().endswith(".xml") and f.lower() != "primary_doc.xml"]
    preferred = [f for f in xml_files if "info" in f.lower() or "table" in f.lower()]
    info_files = preferred if preferred else xml_files
    if not info_files:
        return []

    # Try each candidate until we find one with infoTable entries
    for candidate in info_files:
        url = f"{_accession_dir(cik, accession_no)}/{candidate}"
        try:
            r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
            r.raise_for_status()
            root = ET.fromstring(r.content)
        except Exception as exc:
            logger.warning("13F info table parse failed %s/%s/%s: %s", cik, accession_no, candidate, exc)
            continue
        entries = root.findall(f"{_INFOTABLE_NS}infoTable")
        if not entries:
            continue

        holdings: List[Dict[str, Any]] = []
        for entry in entries:
            name_el = entry.find(f"{_INFOTABLE_NS}nameOfIssuer")
            value_el = entry.find(f"{_INFOTABLE_NS}value")
            shrs_el = entry.find(f"{_INFOTABLE_NS}shrsOrPrnAmt/{_INFOTABLE_NS}sshPrnamt")
            cusip_el = entry.find(f"{_INFOTABLE_NS}cusip")
            if name_el is None or value_el is None:
                continue
            try:
                # EDGAR 13F: post-2023 filings report `value` in dollars;
                # pre-2023 reported in thousands. We detect by magnitude.
                raw = int(value_el.text)
                if raw < 1_000_000:
                    # Old "in thousands" reporting (positions < $1M raw value)
                    value_usd = raw * 1000
                else:
                    value_usd = raw
            except (TypeError, ValueError):
                continue
            try:
                shares = int(shrs_el.text) if shrs_el is not None and shrs_el.text else None
            except (TypeError, ValueError):
                shares = None
            holdings.append(
                {
                    "name": (name_el.text or "").strip(),
                    "cusip": (cusip_el.text or "").strip() if cusip_el is not None else "",
                    "value_usd": value_usd,
                    "shares": shares,
                }
            )
        if holdings:
            return holdings
    return []


def _load_name_to_ticker() -> Dict[str, str]:
    """UPPER company-name -> ticker, derived from SEC's ticker file."""
    cached = _cache_get("name_ticker_map", ttl=86_400)
    if cached is not None:
        return cached
    try:
        r = requests.get(
            "https://www.sec.gov/files/company_tickers.json",
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        r.raise_for_status()
        data = r.json()
        out: Dict[str, str] = {}
        for row in data.values():
            title = (row.get("title") or "").upper().strip()
            tk = (row.get("ticker") or "").upper().strip()
            if title and tk:
                out[title] = tk
        _cache_set("name_ticker_map", out)
        return out
    except Exception as exc:
        logger.warning("SEC name->ticker map fetch failed: %s", exc)
        return {}


# Fast manual hints for common 13F holdings (covers prefix/format mismatches)
_NAME_HINTS = {
    "ARM HOLDINGS": "ARM",
    "RECURSION PHARMA": "RXRX",
    "SOUNDHOUND AI": "SOUN",
    "NANO-X IMAGING": "NNOX",
    "TEMPUS AI": "TEM",
    "SERVE ROBOTICS": "SERV",
    "WIMI HOLOGRAM": "WIMI",
    "COREWEAVE": "CRWV",
    "COHERENT CORP": "COHR",
    "INTEL CORP": "INTC",
    "SYNOPSYS": "SNPS",
    "MICROSOFT": "MSFT",
    "ALPHABET": "GOOGL",
    "AMAZON": "AMZN",
    "META PLATFORMS": "META",
    "TESLA": "TSLA",
    "APPLE INC": "AAPL",
    "BERKSHIRE HATHAWAY": "BRK.B",
    "JPMORGAN CHASE": "JPM",
    "BANK AMERICA": "BAC",
    "BANK OF AMERICA": "BAC",
    "AMERICAN EXPRESS": "AXP",
    "COCA COLA": "KO",
    "CHEVRON": "CVX",
    "OCCIDENTAL PETE": "OXY",
    "OCCIDENTAL PETROLEUM": "OXY",
    "CHUBB LTD": "CB",
    "NEW YORK TIMES": "NYT",
    "MACYS": "M",
    "CONSTELLATION BRANDS": "STZ",
    "LENNAR": "LEN",
    "NUCOR": "NUE",
    "DELTA AIR LINES": "DAL",
    "NOKIA CORP": "NOK",
    "NEBIUS GROUP": "NBIS",
}


def _guess_ticker_from_name(issuer_name: str) -> str:
    """Best-effort ticker resolution from issuer name."""
    if not issuer_name:
        return ""
    name = issuer_name.upper().strip()

    # 1. Manual hints (most reliable for known holdings)
    for key, tk in _NAME_HINTS.items():
        if key in name:
            return tk

    # 2. Exact match in SEC name map
    sec_map = _load_name_to_ticker()
    if name in sec_map:
        return sec_map[name]

    # 3. Strip common corporate suffixes and retry
    stripped = re.sub(
        r"\b(INC|CORP|CORPORATION|CO|LTD|LLC|PLC|HOLDINGS|GROUP|COMPANY)\b\.?",
        "",
        name,
    ).strip(" ,.")
    for sec_name, tk in sec_map.items():
        sec_stripped = re.sub(
            r"\b(INC|CORP|CORPORATION|CO|LTD|LLC|PLC|HOLDINGS|GROUP|COMPANY)\b\.?",
            "",
            sec_name,
        ).strip(" ,.")
        if stripped and sec_stripped == stripped:
            return tk

    # 4. Fallback: first word of name (clean, short, not truncated mid-word)
    first_word = name.split()[0] if name.split() else name
    return first_word[:6]


def _get_two_latest_13f(submissions: Dict[str, Any]) -> List[Dict[str, str]]:
    rows = _recent_filings(submissions)
    return [r for r in rows if r.get("form") == "13F-HR"][:2]


def _consolidate_by_cusip(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Sum value+shares for duplicated CUSIPs (e.g. Berkshire holds AAPL across many subs)."""
    if not rows:
        return rows
    by_cusip: Dict[str, Dict[str, Any]] = {}
    no_cusip: List[Dict[str, Any]] = []
    for r in rows:
        cusip = r.get("cusip") or ""
        if not cusip:
            no_cusip.append(r)
            continue
        if cusip not in by_cusip:
            by_cusip[cusip] = {
                "name": r["name"],
                "cusip": cusip,
                "value_usd": r["value_usd"],
                "shares": r.get("shares") or 0,
            }
        else:
            by_cusip[cusip]["value_usd"] += r["value_usd"]
            by_cusip[cusip]["shares"] += r.get("shares") or 0
    return list(by_cusip.values()) + no_cusip


def _compute_13f(cik: str, submissions: Dict[str, Any]) -> Dict[str, Any]:
    """Returns {is_13f_filer, filing_date, new_this_quarter, current_book}."""
    latest_two = _get_two_latest_13f(submissions)
    if not latest_two:
        return {
            "is_13f_filer": False,
            "filing_date": None,
            "new_this_quarter": [],
            "current_book": [],
        }

    latest = latest_two[0]
    latest_holdings = _consolidate_by_cusip(
        _fetch_information_table(cik, latest["accessionNumber"])
    )
    prior_holdings: List[Dict[str, Any]] = []
    if len(latest_two) > 1:
        prior_holdings = _consolidate_by_cusip(
            _fetch_information_table(cik, latest_two[1]["accessionNumber"])
        )

    # CUSIP-keyed lookup of prior shares for QoQ comparison
    prior_by_cusip = {h["cusip"]: h for h in prior_holdings if h.get("cusip")}

    current_book: List[Dict[str, Any]] = []
    new_this_quarter: List[Dict[str, Any]] = []
    for h in latest_holdings:
        prior = prior_by_cusip.get(h.get("cusip"))
        badge = None
        qoq_change_pct = None
        is_new = False
        if prior is None and h.get("cusip"):
            badge = "NEW"
            is_new = True
        else:
            prior_shares = (prior or {}).get("shares") or 0
            curr_shares = h.get("shares") or 0
            if prior_shares and curr_shares:
                pct = ((curr_shares - prior_shares) / prior_shares) * 100
                # Material moves only (>=10%)
                if abs(pct) >= 10:
                    badge = "TOPUP"
                    qoq_change_pct = int(round(pct))
        ticker = _guess_ticker_from_name(h["name"])
        row = {
            "ticker": ticker or h["name"][:6].upper(),
            "name": h["name"],
            "value_usd": h["value_usd"],
            "shares": h["shares"],
            "badge": badge,
            "qoq_change_pct": qoq_change_pct,
        }
        current_book.append(row)
        if is_new or (badge == "TOPUP" and abs(qoq_change_pct or 0) >= 10):
            new_this_quarter.append(row)

    # Detect exited positions (in prior, not in latest)
    latest_cusips = {h["cusip"] for h in latest_holdings if h.get("cusip")}
    for p in prior_holdings:
        if p.get("cusip") and p["cusip"] not in latest_cusips:
            ticker = _guess_ticker_from_name(p["name"])
            new_this_quarter.append(
                {
                    "ticker": ticker or p["name"][:6].upper(),
                    "name": p["name"],
                    "value_usd": 0,
                    "shares": 0,
                    "badge": "EXITED",
                    "qoq_change_pct": None,
                }
            )

    # Sort books by value, exited last
    current_book.sort(key=lambda r: r["value_usd"], reverse=True)
    new_this_quarter.sort(
        key=lambda r: (r["badge"] == "EXITED", -r["value_usd"])
    )

    return {
        "is_13f_filer": True,
        "filing_date": latest.get("filingDate"),
        "new_this_quarter": new_this_quarter,
        "current_book": current_book,
    }


# ---------------------------------------------------------------------------
# 8-K acquisitions parser
# ---------------------------------------------------------------------------
_ACQ_PATTERNS = [
    re.compile(r"(?:acquisition of|to acquire|acquired)\s+([A-Z][A-Za-z0-9&\.\-, ]{2,60}?)(?:[,\.\(]|\sfor\s|\sin\s)", re.IGNORECASE),
    re.compile(r"acquire\s+all\s+(?:of\s+the\s+)?outstanding\s+(?:shares|equity)\s+of\s+([A-Z][A-Za-z0-9&\.\-, ]{2,60})", re.IGNORECASE),
]

_DEAL_SIZE_PATTERNS = [
    re.compile(r"\$\s*([\d,\.]+)\s*(billion|million)", re.IGNORECASE),
    re.compile(r"approximately\s+\$\s*([\d,\.]+)\s*(billion|million)", re.IGNORECASE),
]


def _extract_acq_from_doc(cik: str, accession_no: str, primary_doc: str) -> Dict[str, Optional[str]]:
    """Best-effort: pull target name + deal size from the primary 8-K doc text."""
    url = f"{_accession_dir(cik, accession_no)}/{primary_doc}"
    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        r.raise_for_status()
        text = r.text
        # Strip HTML tags crudely
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"\s+", " ", text)[:8000]  # first 8KB is plenty
    except Exception as exc:
        logger.warning("8-K doc fetch failed %s/%s: %s", cik, accession_no, exc)
        return {"target_name": None, "deal_size_text": "undisclosed"}

    target = None
    for pat in _ACQ_PATTERNS:
        m = pat.search(text)
        if m:
            target = m.group(1).strip().rstrip(",.")
            break

    deal_size = None
    for pat in _DEAL_SIZE_PATTERNS:
        m = pat.search(text)
        if m:
            deal_size = f"~${m.group(1)} {m.group(2).lower()}"
            break

    return {
        "target_name": target,
        "deal_size_text": deal_size or "undisclosed",
    }


def _format_filing_date(s: str) -> str:
    """YYYY-MM-DD -> 'Jan 09, 2024'."""
    try:
        return datetime.strptime(s, "%Y-%m-%d").strftime("%b %d, %Y")
    except Exception:
        return s


def _compute_acquisitions(
    cik: str, submissions: Dict[str, Any], months: int = 12
) -> List[Dict[str, Any]]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=months * 30)
    rows = _recent_filings(submissions)
    out: List[Dict[str, Any]] = []

    for r in rows:
        if r.get("form") != "8-K":
            continue
        items = r.get("items") or ""
        # Item 1.01: entry into material agreement (M&A often filed here)
        # Item 2.01: completion of acquisition
        if "1.01" not in items and "2.01" not in items:
            continue
        try:
            fdt = datetime.strptime(r["filingDate"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except Exception:
            continue
        if fdt < cutoff:
            continue

        accession = r["accessionNumber"]
        primary = r["primaryDocument"]
        info = _extract_acq_from_doc(cik, accession, primary)
        if not info["target_name"]:
            # Not actually an acquisition — skip (Item 1.01 covers many other agreements)
            continue
        out.append(
            {
                "date": _format_filing_date(r["filingDate"]),
                "target_name": info["target_name"],
                "deal_size_text": info["deal_size_text"],
                "filing_url": f"https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany"
                f"&CIK={cik}&type=8-K&dateb=&owner=include&count=40",
            }
        )
        if len(out) >= 8:  # cap
            break
    return out


# ---------------------------------------------------------------------------
# Public façade
# ---------------------------------------------------------------------------
def get_capital_deployments(ticker: str) -> Dict[str, Any]:
    """Top-level call used by the FastAPI endpoint. 24h TTL on full payload."""
    ticker = (ticker or "").upper()
    key = f"capdeploy:{ticker}"
    cached = _cache_get(key, ttl=86_400)
    if cached is not None:
        return cached

    cik = get_cik(ticker)
    empty = {
        "ticker": ticker,
        "is_13f_filer": False,
        "filing_date": None,
        "new_this_quarter": [],
        "current_book": [],
        "acquisitions": [],
    }
    if not cik:
        _cache_set(key, empty)
        return empty

    submissions = _get_submissions(cik)
    if not submissions:
        _cache_set(key, empty)
        return empty

    thirteenf = _compute_13f(cik, submissions)
    acquisitions = _compute_acquisitions(cik, submissions, months=12)

    result = {
        "ticker": ticker,
        "is_13f_filer": thirteenf["is_13f_filer"],
        "filing_date": _format_filing_date(thirteenf["filing_date"])
        if thirteenf["filing_date"]
        else None,
        "new_this_quarter": thirteenf["new_this_quarter"],
        "current_book": thirteenf["current_book"],
        "acquisitions": acquisitions,
    }
    _cache_set(key, result)
    return result
