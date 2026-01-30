"""
S&P 500 Comprehensive Feature Test Suite
Tests all major endpoints against S&P 500 tickers
"""
import asyncio
import aiohttp
import json
import time
from datetime import datetime

# API Base URL
API_BASE = "https://market-insight-153.preview.emergentagent.com/api"

# S&P 500 Sample - Testing with 50 diverse tickers across sectors
SP500_SAMPLE = [
    # Technology
    "AAPL", "MSFT", "GOOGL", "META", "NVDA", "AMD", "CRM", "ORCL", "ADBE", "INTC",
    # Finance
    "JPM", "BAC", "WFC", "GS", "MS", "BLK", "C", "AXP", "V", "MA",
    # Healthcare
    "JNJ", "UNH", "PFE", "ABBV", "MRK", "LLY", "TMO", "ABT", "BMY", "AMGN",
    # Consumer
    "AMZN", "TSLA", "HD", "NKE", "MCD", "SBUX", "TGT", "LOW", "COST", "WMT",
    # Energy & Industrial
    "XOM", "CVX", "COP", "CAT", "DE", "BA", "HON", "GE", "MMM", "LMT"
]

# All endpoints to test
ENDPOINTS = [
    ("quote", "/stocks/{ticker}/quote"),
    ("health-report", "/stocks/{ticker}/health-report"),
    ("five-signals", "/stocks/{ticker}/five-signals"),
    ("smart-earnings", "/stocks/{ticker}/smart-earnings"),
    ("why-moving", "/stocks/{ticker}/why-moving"),
    ("insider-alerts", "/stocks/{ticker}/insider-alerts"),
    ("whale-watch", "/stocks/{ticker}/whale-watch"),
    ("similar-stocks", "/stocks/{ticker}/similar-stocks"),
]

async def test_endpoint(session, ticker, endpoint_name, endpoint_path):
    """Test a single endpoint for a ticker"""
    url = f"{API_BASE}{endpoint_path.format(ticker=ticker)}"
    start_time = time.time()
    
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
            elapsed = round((time.time() - start_time) * 1000)
            
            if response.status == 200:
                data = await response.json()
                # Validate response has data
                if data and isinstance(data, dict):
                    return {
                        "status": "PASS",
                        "ticker": ticker,
                        "endpoint": endpoint_name,
                        "response_time_ms": elapsed,
                        "has_data": bool(data)
                    }
                else:
                    return {
                        "status": "WARN",
                        "ticker": ticker,
                        "endpoint": endpoint_name,
                        "response_time_ms": elapsed,
                        "message": "Empty response"
                    }
            else:
                return {
                    "status": "FAIL",
                    "ticker": ticker,
                    "endpoint": endpoint_name,
                    "response_time_ms": elapsed,
                    "http_status": response.status
                }
    except asyncio.TimeoutError:
        return {
            "status": "TIMEOUT",
            "ticker": ticker,
            "endpoint": endpoint_name,
            "message": "Request timed out after 30s"
        }
    except Exception as e:
        return {
            "status": "ERROR",
            "ticker": ticker,
            "endpoint": endpoint_name,
            "message": str(e)[:100]
        }

async def test_ticker(session, ticker, semaphore):
    """Test all endpoints for a single ticker"""
    async with semaphore:
        results = []
        for endpoint_name, endpoint_path in ENDPOINTS:
            result = await test_endpoint(session, ticker, endpoint_name, endpoint_path)
            results.append(result)
            await asyncio.sleep(0.2)  # Small delay between requests
        return results

async def run_tests():
    """Run all tests"""
    print(f"\n{'='*60}")
    print(f"S&P 500 COMPREHENSIVE FEATURE TEST")
    print(f"Testing {len(SP500_SAMPLE)} tickers × {len(ENDPOINTS)} endpoints")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")
    
    all_results = []
    semaphore = asyncio.Semaphore(5)  # Limit concurrent requests
    
    async with aiohttp.ClientSession() as session:
        tasks = [test_ticker(session, ticker, semaphore) for ticker in SP500_SAMPLE]
        ticker_results = await asyncio.gather(*tasks)
        
        for results in ticker_results:
            all_results.extend(results)
    
    return all_results

def analyze_results(results):
    """Analyze and summarize test results"""
    summary = {
        "total_tests": len(results),
        "passed": 0,
        "failed": 0,
        "warnings": 0,
        "timeouts": 0,
        "errors": 0,
        "by_endpoint": {},
        "by_ticker": {},
        "slow_requests": [],
        "failures": []
    }
    
    for r in results:
        endpoint = r["endpoint"]
        ticker = r["ticker"]
        status = r["status"]
        
        # Initialize counters
        if endpoint not in summary["by_endpoint"]:
            summary["by_endpoint"][endpoint] = {"pass": 0, "fail": 0, "total": 0, "avg_time": 0, "times": []}
        if ticker not in summary["by_ticker"]:
            summary["by_ticker"][ticker] = {"pass": 0, "fail": 0}
        
        summary["by_endpoint"][endpoint]["total"] += 1
        
        if status == "PASS":
            summary["passed"] += 1
            summary["by_endpoint"][endpoint]["pass"] += 1
            summary["by_ticker"][ticker]["pass"] += 1
            if "response_time_ms" in r:
                summary["by_endpoint"][endpoint]["times"].append(r["response_time_ms"])
                if r["response_time_ms"] > 5000:
                    summary["slow_requests"].append(r)
        elif status == "WARN":
            summary["warnings"] += 1
            summary["by_endpoint"][endpoint]["pass"] += 1
        elif status == "TIMEOUT":
            summary["timeouts"] += 1
            summary["by_endpoint"][endpoint]["fail"] += 1
            summary["by_ticker"][ticker]["fail"] += 1
            summary["failures"].append(r)
        elif status == "ERROR":
            summary["errors"] += 1
            summary["by_endpoint"][endpoint]["fail"] += 1
            summary["by_ticker"][ticker]["fail"] += 1
            summary["failures"].append(r)
        else:
            summary["failed"] += 1
            summary["by_endpoint"][endpoint]["fail"] += 1
            summary["by_ticker"][ticker]["fail"] += 1
            summary["failures"].append(r)
    
    # Calculate average times
    for endpoint, data in summary["by_endpoint"].items():
        if data["times"]:
            data["avg_time"] = round(sum(data["times"]) / len(data["times"]))
        del data["times"]
    
    return summary

def print_report(summary):
    """Print formatted test report"""
    print(f"\n{'='*60}")
    print("TEST RESULTS SUMMARY")
    print(f"{'='*60}")
    
    total = summary["total_tests"]
    passed = summary["passed"] + summary["warnings"]
    failed = summary["failed"] + summary["timeouts"] + summary["errors"]
    
    print(f"\nOverall: {passed}/{total} passed ({round(passed/total*100, 1)}%)")
    print(f"  ✅ Passed: {summary['passed']}")
    print(f"  ⚠️  Warnings: {summary['warnings']}")
    print(f"  ❌ Failed: {summary['failed']}")
    print(f"  ⏱️  Timeouts: {summary['timeouts']}")
    print(f"  💥 Errors: {summary['errors']}")
    
    print(f"\n{'─'*60}")
    print("BY ENDPOINT:")
    print(f"{'─'*60}")
    for endpoint, data in sorted(summary["by_endpoint"].items()):
        pct = round(data["pass"] / data["total"] * 100, 1) if data["total"] > 0 else 0
        status = "✅" if pct >= 90 else "⚠️" if pct >= 70 else "❌"
        print(f"  {status} {endpoint:20} {data['pass']:3}/{data['total']:3} ({pct:5.1f}%)  avg: {data['avg_time']:4}ms")
    
    if summary["failures"][:10]:
        print(f"\n{'─'*60}")
        print("SAMPLE FAILURES (first 10):")
        print(f"{'─'*60}")
        for f in summary["failures"][:10]:
            print(f"  ❌ {f['ticker']:6} | {f['endpoint']:20} | {f.get('message', f.get('http_status', 'Unknown'))}")
    
    if summary["slow_requests"][:5]:
        print(f"\n{'─'*60}")
        print("SLOW REQUESTS (>5s):")
        print(f"{'─'*60}")
        for s in summary["slow_requests"][:5]:
            print(f"  ⏱️  {s['ticker']:6} | {s['endpoint']:20} | {s['response_time_ms']}ms")
    
    print(f"\n{'='*60}")
    
    return summary

async def main():
    results = await run_tests()
    summary = analyze_results(results)
    print_report(summary)
    
    # Save detailed results
    with open("/tmp/sp500_test_results.json", "w") as f:
        json.dump({
            "summary": summary,
            "details": results,
            "timestamp": datetime.now().isoformat()
        }, f, indent=2)
    
    print(f"\nDetailed results saved to /tmp/sp500_test_results.json")
    
    return summary

if __name__ == "__main__":
    asyncio.run(main())
