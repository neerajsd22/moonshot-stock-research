"""
Portfolio import: tolerant CSV/paste parser with column auto-detection.

Public API:
    parse_input(text_or_csv_str) -> ParseResult
        ParseResult.positions: list of dicts {ticker, shares, avg_cost, buy_date?}
        ParseResult.mapping: detected column mapping
        ParseResult.broker: detected broker label (best-effort, None if unknown)
        ParseResult.warnings: list of human-readable warnings/skips
"""

import csv
import io
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


# ---- Field detection patterns -----------------------------------------------

_HEADER_PATTERNS = {
    "ticker": [
        r"^symbol$", r"^ticker$", r"^instrument$", r"^stock\s*name$",
        r"^security", r"^scrip", r"^holding$",
    ],
    "shares": [
        r"^(quantity|qty|shares|units|holdings)$",
        r"^(quantity\s*available|shares\s*held|qty\s*owned|share\s*amount)$",
    ],
    "cost_basis": [
        r"avg.*(cost|price|buy)", r"average.*(cost|price)", r"cost\s*basis",
        r"cost\s*per\s*share", r"buy\s*price", r"purchase\s*price",
        r"acquisition\s*price",
    ],
    "date": [
        r"(trade|acquired|purchase|buy|opening|acquisition)\s*date",
        r"^date$",
    ],
}


# ---- Broker fingerprints (best-effort, just for the friendly badge) ---------

_BROKER_FINGERPRINTS = {
    "Robinhood": {"instrument", "symbol", "shares", "average cost"},
    "Fidelity": {"symbol", "quantity", "cost basis", "current value"},
    "Schwab": {"symbol", "description", "quantity", "cost per share"},
    "Vanguard": {"symbol", "shares", "cost basis"},
    "E*TRADE": {"symbol", "qty", "price paid"},
    "Webull": {"symbol", "quantity", "average cost"},
}


# ---- Tolerant number parser ------------------------------------------------

def parse_number(s):
    """Parse $1,234.56  (50) → -50  3.14  '4.5 shares' etc. Returns float or None."""
    if s is None:
        return None
    s = str(s).strip()
    if not s:
        return None
    # Parens = negative
    negative = s.startswith("(") and s.endswith(")")
    if negative:
        s = s[1:-1]
    # Strip currency / whitespace
    s = re.sub(r"[\$₹€£¥\s]", "", s)
    # Strip thousands separators (including Indian lakh format)
    s = s.replace(",", "")
    # Strip trailing units like "shares" or "%"
    s = re.sub(r"[a-zA-Z%]+$", "", s).strip()
    try:
        n = float(s)
        return -n if negative else n
    except ValueError:
        return None


_DATE_FORMATS = [
    "%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%d-%m-%Y",
    "%m-%d-%Y", "%Y/%m/%d", "%b %d, %Y", "%B %d, %Y",
    "%d %b %Y", "%d %B %Y",
]


def parse_date_flexible(s):
    if not s:
        return None
    s = str(s).strip()
    if not s:
        return None
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(s, fmt).date().isoformat()
        except ValueError:
            continue
    return None


# ---- Column scoring --------------------------------------------------------

def _score_header(header, field):
    if not header:
        return 0
    h = header.strip().lower()
    for pat in _HEADER_PATTERNS[field]:
        if re.search(pat, h, re.IGNORECASE):
            return 100
    return 0


_TICKER_RE = re.compile(r"^[A-Z]{1,6}(\.NS|\.BO)?$")


def _score_content(values, field):
    """Score how likely a column's values match a given field type."""
    if not values:
        return 0
    score = 0
    for raw in values:
        if raw is None:
            continue
        v = str(raw).strip()
        if not v:
            continue
        if field == "ticker":
            if _TICKER_RE.match(v.upper()):
                score += 10
        elif field == "shares":
            n = parse_number(v)
            if n is not None and 0 < n < 10_000_000:
                score += 10
        elif field == "cost_basis":
            n = parse_number(v)
            if n is not None and 0 < n < 1_000_000:
                score += 5
                if "." in v:
                    score += 3  # decimals → more likely a price than a count
        elif field == "date":
            if parse_date_flexible(v) is not None:
                score += 10
    return score


def detect_columns(headers, sample_rows):
    """Return dict {field: col_idx} based on combined header + content scoring."""
    fields = ["ticker", "shares", "cost_basis", "date"]
    # Score matrix: scores[col_idx][field]
    scores = {}
    for col_idx in range(len(headers)):
        col_values = [
            row[col_idx] if col_idx < len(row) else "" for row in sample_rows
        ]
        scores[col_idx] = {
            f: _score_header(headers[col_idx], f) + _score_content(col_values, f)
            for f in fields
        }
    # Greedy assignment: highest score wins each round
    mapping = {}
    remaining_fields = set(fields)
    remaining_cols = set(scores.keys())
    while remaining_fields and remaining_cols:
        best = None  # (score, col_idx, field)
        for col_idx in remaining_cols:
            for f in remaining_fields:
                s = scores[col_idx][f]
                if best is None or s > best[0]:
                    best = (s, col_idx, f)
        if best is None or best[0] < 10:
            break
        _, col_idx, field = best
        mapping[field] = col_idx
        remaining_cols.discard(col_idx)
        remaining_fields.discard(field)
    return mapping


def detect_broker(headers):
    """Return broker label if headers match a known fingerprint, else None."""
    header_set = {h.strip().lower() for h in headers if h}
    for broker, fp in _BROKER_FINGERPRINTS.items():
        if fp.issubset(header_set):
            return broker
    return None


# ---- Public entry ----------------------------------------------------------

@dataclass
class ParseResult:
    positions: list = field(default_factory=list)
    mapping: dict = field(default_factory=dict)
    broker: Optional[str] = None
    warnings: list = field(default_factory=list)
    headers: list = field(default_factory=list)


def _read_rows(text):
    """Read CSV-ish input. Tolerates commas, tabs, semicolons, pipes, and runs of spaces."""
    text = text.strip()
    if not text:
        return []
    # Sniff delimiter
    sample = text[:2048]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",\t;|")
        delim = dialect.delimiter
        reader = csv.reader(io.StringIO(text), delimiter=delim)
        rows = [row for row in reader if any(cell.strip() for cell in row)]
    except csv.Error:
        rows = []
    # If sniffing produced single-column rows for everything (looks like
    # space-delimited paste), re-split each line on runs of whitespace.
    if not rows or all(len(r) <= 1 for r in rows):
        rows = []
        for line in text.splitlines():
            # Drop common copy-paste noise like trailing $ on cost or "@"
            cleaned = re.sub(r"[@:]+", " ", line).strip()
            if not cleaned:
                continue
            parts = re.split(r"\s+", cleaned)
            if parts:
                rows.append(parts)
    return rows


def _detect_header_row(rows):
    """Return index of the header row, or -1 if no header detected."""
    if not rows:
        return -1
    first = rows[0]
    # If first row has any field-matching keyword, treat it as headers
    for cell in first:
        for f in _HEADER_PATTERNS:
            if _score_header(cell, f) >= 100:
                return 0
    # Otherwise: heuristic — first row has no numeric value but second does
    if len(rows) >= 2:
        first_has_num = any(parse_number(c) is not None for c in first)
        second_has_num = any(parse_number(c) is not None for c in rows[1])
        if not first_has_num and second_has_num:
            return 0
    return -1


def parse_input(text):
    """Main entry point. Returns ParseResult."""
    result = ParseResult()
    rows = _read_rows(text)
    if not rows:
        result.warnings.append("Empty input.")
        return result

    header_idx = _detect_header_row(rows)
    if header_idx >= 0:
        headers = [c.strip() for c in rows[header_idx]]
        data_rows = rows[header_idx + 1:]
    else:
        headers = [f"col_{i}" for i in range(len(rows[0]))]
        data_rows = rows

    result.headers = headers
    result.broker = detect_broker(headers)

    sample = data_rows[:15] if data_rows else []
    mapping = detect_columns(headers, sample)
    result.mapping = mapping

    if "ticker" not in mapping or "shares" not in mapping or "cost_basis" not in mapping:
        result.warnings.append(
            "Could not auto-detect required columns (ticker, shares, cost basis). "
            "Please review and map columns manually."
        )
        return result

    t_col = mapping["ticker"]
    s_col = mapping["shares"]
    c_col = mapping["cost_basis"]
    d_col = mapping.get("date")

    for i, row in enumerate(data_rows, start=1):
        def cell(idx):
            return row[idx].strip() if idx is not None and idx < len(row) else ""

        ticker = cell(t_col).upper()
        if not ticker:
            continue
        # Strip exchange suffix junk like "(NASDAQ)" or quotes
        ticker = re.sub(r"[^A-Z.\-]", "", ticker)
        if not _TICKER_RE.match(ticker):
            result.warnings.append(f"Row {i}: '{cell(t_col)}' doesn't look like a ticker — skipped.")
            continue

        shares = parse_number(cell(s_col))
        if shares is None or shares <= 0:
            result.warnings.append(f"Row {i} ({ticker}): invalid share count '{cell(s_col)}' — skipped.")
            continue

        cost = parse_number(cell(c_col))
        if cost is None or cost <= 0:
            result.warnings.append(f"Row {i} ({ticker}): invalid cost '{cell(c_col)}' — skipped.")
            continue

        position = {
            "ticker": ticker,
            "shares": shares,
            "avg_cost": cost,
        }
        if d_col is not None:
            date_str = parse_date_flexible(cell(d_col))
            if date_str:
                position["buy_date"] = date_str

        result.positions.append(position)

    return result
