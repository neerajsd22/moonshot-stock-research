"""
Comprehensive test for AI Deep Analysis (Health Report) across all S&P 500 companies.
Tests the /api/stocks/{ticker}/health-report endpoint for each ticker.
"""
import requests
import time
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
import sys

BASE_URL = "https://market-insight-153.preview.emergentagent.com"

# S&P 500 tickers (as of 2025)
SP500_TICKERS = [
    "AAPL", "ABBV", "ABT", "ACN", "ADBE", "ADI", "ADM", "ADP", "ADSK", "AEE",
    "AEP", "AES", "AFL", "AIG", "AIZ", "AJG", "AKAM", "ALB", "ALGN", "ALL",
    "ALLE", "AMAT", "AMCR", "AMD", "AME", "AMGN", "AMP", "AMT", "AMZN", "ANET",
    "ANSS", "AON", "AOS", "APA", "APD", "APH", "APTV", "ARE", "ATO", "AVB",
    "AVGO", "AVY", "AWK", "AXON", "AXP", "AZO", "BA", "BAC", "BALL", "BAX",
    "BBWI", "BBY", "BDX", "BEN", "BF-B", "BG", "BIIB", "BIO", "BK", "BKNG",
    "BKR", "BLDR", "BLK", "BMY", "BR", "BRK-B", "BRO", "BSX", "BWA", "BX",
    "BXP", "C", "CAG", "CAH", "CARR", "CAT", "CB", "CBOE", "CBRE", "CCI",
    "CCL", "CDNS", "CDW", "CE", "CEG", "CF", "CFG", "CHD", "CHRW", "CHTR",
    "CI", "CINF", "CL", "CLX", "CMA", "CMCSA", "CME", "CMG", "CMI", "CMS",
    "CNC", "CNP", "COF", "COO", "COP", "COR", "COST", "CPAY", "CPB", "CPRT",
    "CPT", "CRL", "CRM", "CSCO", "CSGP", "CSX", "CTAS", "CTLT", "CTRA", "CTSH",
    "CTVA", "CVS", "CVX", "CZR", "D", "DAL", "DAY", "DD", "DE", "DECK",
    "DFS", "DG", "DGX", "DHI", "DHR", "DIS", "DLR", "DLTR", "DOC", "DOV",
    "DOW", "DPZ", "DRI", "DTE", "DUK", "DVA", "DVN", "DXCM", "EA", "EBAY",
    "ECL", "ED", "EFX", "EG", "EIX", "EL", "ELV", "EMN", "EMR", "ENPH",
    "EOG", "EPAM", "EQIX", "EQR", "EQT", "ES", "ESS", "ETN", "ETR", "ETSY",
    "EVRG", "EW", "EXC", "EXPD", "EXPE", "EXR", "F", "FANG", "FAST", "FCX",
    "FDS", "FDX", "FE", "FFIV", "FI", "FICO", "FIS", "FITB", "FLT", "FMC",
    "FOX", "FOXA", "FRT", "FSLR", "FTNT", "FTV", "GD", "GDDY", "GE", "GEHC",
    "GEN", "GEV", "GILD", "GIS", "GL", "GLW", "GM", "GNRC", "GOOG", "GOOGL",
    "GPC", "GPN", "GRMN", "GS", "GWW", "HAL", "HAS", "HBAN", "HCA", "HD",
    "HES", "HIG", "HII", "HLT", "HOLX", "HON", "HPE", "HPQ", "HRL", "HSIC",
    "HST", "HSY", "HUBB", "HUM", "HWM", "IBM", "ICE", "IDXX", "IEX", "IFF",
    "ILMN", "INCY", "INTC", "INTU", "INVH", "IP", "IPG", "IQV", "IR", "IRM",
    "ISRG", "IT", "ITW", "IVZ", "J", "JBHT", "JBL", "JCI", "JKHY", "JNJ",
    "JNPR", "JPM", "K", "KDP", "KEY", "KEYS", "KHC", "KIM", "KKR", "KLAC",
    "KMB", "KMI", "KMX", "KO", "KR", "KVUE", "L", "LDOS", "LEN", "LH",
    "LHX", "LIN", "LKQ", "LLY", "LMT", "LNT", "LOW", "LRCX", "LULU", "LUV",
    "LVS", "LW", "LYB", "LYV", "MA", "MAA", "MAR", "MAS", "MCD", "MCHP",
    "MCK", "MCO", "MDLZ", "MDT", "MET", "META", "MGM", "MHK", "MKC", "MKTX",
    "MLM", "MMC", "MMM", "MNST", "MO", "MOH", "MOS", "MPC", "MPWR", "MRK",
    "MRNA", "MRO", "MS", "MSCI", "MSFT", "MSI", "MTB", "MTCH", "MTD", "MU",
    "NCLH", "NDAQ", "NDSN", "NEE", "NEM", "NFLX", "NI", "NKE", "NOC", "NOW",
    "NRG", "NSC", "NTAP", "NTRS", "NUE", "NVDA", "NVR", "NWS", "NWSA", "NXPI",
    "O", "ODFL", "OKE", "OMC", "ON", "ORCL", "ORLY", "OTIS", "OXY", "PANW",
    "PARA", "PAYC", "PAYX", "PCAR", "PCG", "PEG", "PEP", "PFE", "PFG", "PG",
    "PGR", "PH", "PHM", "PKG", "PLD", "PM", "PNC", "PNR", "PNW", "PODD",
    "POOL", "PPG", "PPL", "PRU", "PSA", "PSX", "PTC", "PWR", "PXD", "PYPL",
    "QCOM", "QRVO", "RCL", "REG", "REGN", "RF", "RJF", "RL", "RMD", "ROK",
    "ROL", "ROP", "ROST", "RSG", "RTX", "RVTY", "SBAC", "SBUX", "SCHW", "SHW",
    "SJM", "SLB", "SMCI", "SNA", "SNPS", "SO", "SOLV", "SPG", "SPGI", "SRE",
    "STE", "STLD", "STT", "STX", "STZ", "SWK", "SWKS", "SYF", "SYK", "SYY",
    "T", "TAP", "TDG", "TDY", "TECH", "TEL", "TER", "TFC", "TFX", "TGT",
    "TJX", "TMO", "TMUS", "TPR", "TRGP", "TRMB", "TROW", "TRV", "TSCO", "TSLA",
    "TSN", "TT", "TTWO", "TXN", "TXT", "TYL", "UAL", "UBER", "UDR", "UHS",
    "ULTA", "UNH", "UNP", "UPS", "URI", "USB", "V", "VFC", "VICI", "VLO",
    "VLTO", "VMC", "VRSK", "VRSN", "VRTX", "VST", "VTR", "VTRS", "VZ", "WAB",
    "WAT", "WBA", "WBD", "WDC", "WEC", "WELL", "WFC", "WM", "WMB", "WMT",
    "WRB", "WST", "WTW", "WY", "WYNN", "XEL", "XOM", "XYL", "YUM", "ZBH",
    "ZBRA", "ZTS"
]

def test_health_report(ticker):
    """Test health report for a single ticker"""
    try:
        start = time.time()
        response = requests.get(f"{BASE_URL}/api/stocks/{ticker}/health-report", timeout=30)
        elapsed = time.time() - start
        
        if response.status_code != 200:
            return {
                "ticker": ticker,
                "status": "FAIL",
                "error": f"HTTP {response.status_code}",
                "time": elapsed
            }
        
        data = response.json()
        
        # Check for required fields
        required_fields = ["ticker", "quarters", "verdict", "score"]
        missing_fields = [f for f in required_fields if f not in data]
        
        if missing_fields:
            return {
                "ticker": ticker,
                "status": "FAIL",
                "error": f"Missing fields: {missing_fields}",
                "time": elapsed
            }
        
        # Check if quarters has data
        if not data.get("quarters") or len(data["quarters"]) == 0:
            return {
                "ticker": ticker,
                "status": "FAIL",
                "error": "No quarterly data",
                "time": elapsed,
                "verdict": data.get("verdict", "N/A"),
                "score": data.get("score", "N/A")
            }
        
        # Success
        return {
            "ticker": ticker,
            "status": "PASS",
            "verdict": data.get("verdict", "N/A"),
            "score": data.get("score", "N/A"),
            "quarters": len(data.get("quarters", [])),
            "time": elapsed
        }
        
    except requests.exceptions.Timeout:
        return {
            "ticker": ticker,
            "status": "FAIL",
            "error": "Timeout (>30s)"
        }
    except Exception as e:
        return {
            "ticker": ticker,
            "status": "FAIL",
            "error": str(e)
        }

def run_batch_test(tickers, max_workers=5):
    """Run tests in parallel batches"""
    results = []
    passed = 0
    failed = 0
    
    print(f"\n{'='*60}")
    print(f"Testing {len(tickers)} S&P 500 tickers for AI Deep Analysis")
    print(f"{'='*60}\n")
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_ticker = {executor.submit(test_health_report, ticker): ticker for ticker in tickers}
        
        for i, future in enumerate(as_completed(future_to_ticker), 1):
            result = future.result()
            results.append(result)
            
            if result["status"] == "PASS":
                passed += 1
                print(f"[{i}/{len(tickers)}] ✅ {result['ticker']}: {result['verdict']} ({result['score']}/10) - {result.get('time', 0):.1f}s")
            else:
                failed += 1
                print(f"[{i}/{len(tickers)}] ❌ {result['ticker']}: {result.get('error', 'Unknown error')}")
    
    return results, passed, failed

if __name__ == "__main__":
    # Run test on a subset first for speed, or all if specified
    test_set = SP500_TICKERS[:50] if len(sys.argv) < 2 else SP500_TICKERS
    
    if len(sys.argv) > 1 and sys.argv[1] == "--all":
        test_set = SP500_TICKERS
    
    results, passed, failed = run_batch_test(test_set, max_workers=10)
    
    print(f"\n{'='*60}")
    print(f"SUMMARY")
    print(f"{'='*60}")
    print(f"Total Tested: {len(results)}")
    print(f"Passed: {passed} ({100*passed/len(results):.1f}%)")
    print(f"Failed: {failed} ({100*failed/len(results):.1f}%)")
    
    if failed > 0:
        print(f"\n❌ FAILED TICKERS:")
        for r in results:
            if r["status"] == "FAIL":
                print(f"  - {r['ticker']}: {r.get('error', 'Unknown')}")
    
    # Save results to JSON
    with open('/tmp/sp500_test_results.json', 'w') as f:
        json.dump({
            "summary": {
                "total": len(results),
                "passed": passed,
                "failed": failed,
                "pass_rate": f"{100*passed/len(results):.1f}%"
            },
            "failed_tickers": [r for r in results if r["status"] == "FAIL"],
            "all_results": results
        }, f, indent=2)
    
    print(f"\nResults saved to /tmp/sp500_test_results.json")
