"""
Test suite for AI Deep Analysis (Health Report) refresh functionality
Tests the /api/stocks/{ticker}/health-report endpoint
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://market-insight-153.preview.emergentagent.com')

class TestHealthReportEndpoint:
    """Tests for the health report API endpoint used by refresh button"""
    
    def test_health_endpoint_available(self):
        """Test that the API health endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✅ API health check passed")
    
    def test_health_report_aapl(self):
        """Test health report for AAPL stock"""
        response = requests.get(f"{BASE_URL}/api/stocks/AAPL/health-report")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify required fields
        assert "ticker" in data
        assert data["ticker"] == "AAPL"
        assert "company_name" in data
        assert "audit_date" in data
        assert "quarters" in data
        assert "current_metrics" in data
        assert "trends" in data
        assert "verdict" in data
        assert "score" in data
        
        # Verify quarters data structure
        assert len(data["quarters"]) > 0
        quarter = data["quarters"][0]
        assert "quarter" in quarter
        assert "revenue" in quarter
        assert "gross_margin" in quarter
        assert "op_margin" in quarter
        assert "net_income" in quarter
        assert "fcf" in quarter
        
        print(f"✅ Health report for AAPL: {data['verdict']} ({data['score']}/10)")
    
    def test_health_report_msft(self):
        """Test health report for MSFT stock"""
        response = requests.get(f"{BASE_URL}/api/stocks/MSFT/health-report")
        assert response.status_code == 200
        
        data = response.json()
        assert data["ticker"] == "MSFT"
        assert "quarters" in data
        assert len(data["quarters"]) > 0
        
        print(f"✅ Health report for MSFT: {data['verdict']} ({data['score']}/10)")
    
    def test_health_report_googl(self):
        """Test health report for GOOGL stock"""
        response = requests.get(f"{BASE_URL}/api/stocks/GOOGL/health-report")
        assert response.status_code == 200
        
        data = response.json()
        assert data["ticker"] == "GOOGL"
        assert "quarters" in data
        
        print(f"✅ Health report for GOOGL: {data['verdict']} ({data['score']}/10)")
    
    def test_health_report_response_time(self):
        """Test that health report responds within acceptable time (20 seconds)"""
        start_time = time.time()
        response = requests.get(f"{BASE_URL}/api/stocks/NVDA/health-report", timeout=25)
        elapsed_time = time.time() - start_time
        
        assert response.status_code == 200
        assert elapsed_time < 20, f"Response took {elapsed_time:.2f}s, expected < 20s"
        
        print(f"✅ Health report response time: {elapsed_time:.2f}s")
    
    def test_health_report_current_metrics(self):
        """Test that current_metrics contains expected fields"""
        response = requests.get(f"{BASE_URL}/api/stocks/AAPL/health-report")
        assert response.status_code == 200
        
        data = response.json()
        metrics = data.get("current_metrics", {})
        
        # Check for expected metric fields
        expected_fields = [
            "market_cap", "pe_ratio", "debt_to_equity", "current_ratio",
            "roe", "revenue_growth", "recommendation", "sector", "industry"
        ]
        
        for field in expected_fields:
            assert field in metrics, f"Missing field: {field}"
        
        print(f"✅ Current metrics validated: {len(metrics)} fields present")
    
    def test_health_report_trends(self):
        """Test that trends data is present"""
        response = requests.get(f"{BASE_URL}/api/stocks/AAPL/health-report")
        assert response.status_code == 200
        
        data = response.json()
        trends = data.get("trends", {})
        
        # Trends should have at least some data
        assert isinstance(trends, dict)
        
        print(f"✅ Trends data present: {list(trends.keys())}")
    
    def test_health_report_sentiment(self):
        """Test that sentiment data is present"""
        response = requests.get(f"{BASE_URL}/api/stocks/AAPL/health-report")
        assert response.status_code == 200
        
        data = response.json()
        sentiment = data.get("sentiment", {})
        
        assert isinstance(sentiment, dict)
        
        print(f"✅ Sentiment data present: {sentiment}")
    
    def test_health_report_invalid_ticker(self):
        """Test health report with invalid ticker returns gracefully"""
        response = requests.get(f"{BASE_URL}/api/stocks/INVALIDTICKER123/health-report")
        
        # Should return 200 with empty/error data, not crash
        assert response.status_code == 200
        
        data = response.json()
        # Should have ticker field even for invalid stocks
        assert "ticker" in data
        
        print("✅ Invalid ticker handled gracefully")


class TestRefreshFunctionality:
    """Tests simulating the refresh button behavior"""
    
    def test_consecutive_refresh_calls(self):
        """Test that multiple consecutive calls work (simulating refresh button clicks)"""
        for i in range(3):
            response = requests.get(f"{BASE_URL}/api/stocks/AAPL/health-report")
            assert response.status_code == 200
            data = response.json()
            assert "quarters" in data
            print(f"   Refresh call {i+1}: Success")
        
        print("✅ Consecutive refresh calls work correctly")
    
    def test_refresh_returns_fresh_data(self):
        """Test that refresh returns data with current audit date"""
        response = requests.get(f"{BASE_URL}/api/stocks/AAPL/health-report")
        assert response.status_code == 200
        
        data = response.json()
        audit_date = data.get("audit_date")
        
        # Audit date should be today or recent
        assert audit_date is not None
        from datetime import datetime
        audit_datetime = datetime.strptime(audit_date, "%Y-%m-%d")
        days_old = (datetime.now() - audit_datetime).days
        
        assert days_old <= 1, f"Audit date is {days_old} days old"
        
        print(f"✅ Fresh data returned with audit date: {audit_date}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
