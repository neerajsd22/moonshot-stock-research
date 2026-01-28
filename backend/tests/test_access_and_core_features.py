"""
Backend API Tests for Moonshot Stock Picker - Access Code System and Core Features
Tests: Access Code Verification, Admin Login, Stock APIs, AI Sentiment, News
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAccessCodeSystem:
    """Access Code System tests - Admin login and code generation/verification"""
    
    admin_token = None
    generated_code = None
    
    def test_admin_login_success(self):
        """Test admin login with correct password"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "password": "moonshot2024"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data
        assert "message" in data
        assert data["message"] == "Admin access granted"
        
        TestAccessCodeSystem.admin_token = data["token"]
        print(f"✓ Admin login successful, token received")
    
    def test_admin_login_invalid_password(self):
        """Test admin login with incorrect password"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print(f"✓ Invalid password returns 401")
    
    def test_generate_access_codes(self):
        """Test generating access codes (admin only)"""
        if not TestAccessCodeSystem.admin_token:
            pytest.skip("No admin token available")
        
        response = requests.post(f"{BASE_URL}/api/admin/access-codes",
            json={"count": 1},
            headers={"X-Admin-Token": TestAccessCodeSystem.admin_token}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "codes" in data
        assert "count" in data
        assert len(data["codes"]) == 1
        assert data["count"] == 1
        
        TestAccessCodeSystem.generated_code = data["codes"][0]
        print(f"✓ Generated access code: {TestAccessCodeSystem.generated_code}")
    
    def test_get_access_codes(self):
        """Test getting all access codes (admin only)"""
        if not TestAccessCodeSystem.admin_token:
            pytest.skip("No admin token available")
        
        response = requests.get(f"{BASE_URL}/api/admin/access-codes",
            headers={"X-Admin-Token": TestAccessCodeSystem.admin_token}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} access codes")
    
    def test_get_access_codes_without_token(self):
        """Test getting access codes without admin token fails"""
        response = requests.get(f"{BASE_URL}/api/admin/access-codes")
        assert response.status_code == 401
        print(f"✓ Access codes endpoint requires admin token (401)")
    
    def test_verify_access_code_valid(self):
        """Test verifying a valid access code"""
        if not TestAccessCodeSystem.generated_code:
            pytest.skip("No generated code available")
        
        response = requests.post(f"{BASE_URL}/api/access/verify", json={
            "code": TestAccessCodeSystem.generated_code
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["valid"] == True
        assert "message" in data
        print(f"✓ Valid access code verified successfully")
    
    def test_verify_access_code_already_used(self):
        """Test verifying an already used access code fails"""
        if not TestAccessCodeSystem.generated_code:
            pytest.skip("No generated code available")
        
        # Try to use the same code again (should fail as it's single-use)
        response = requests.post(f"{BASE_URL}/api/access/verify", json={
            "code": TestAccessCodeSystem.generated_code
        })
        assert response.status_code == 401
        print(f"✓ Already used access code returns 401")
    
    def test_verify_access_code_invalid(self):
        """Test verifying an invalid access code"""
        response = requests.post(f"{BASE_URL}/api/access/verify", json={
            "code": "INVALID123"
        })
        assert response.status_code == 401
        print(f"✓ Invalid access code returns 401")
    
    def test_verify_access_code_empty(self):
        """Test verifying with empty access code"""
        response = requests.post(f"{BASE_URL}/api/access/verify", json={
            "code": ""
        })
        assert response.status_code == 400
        print(f"✓ Empty access code returns 400")
    
    def test_delete_access_code(self):
        """Test deleting an access code (admin only)"""
        if not TestAccessCodeSystem.admin_token:
            pytest.skip("No admin token available")
        
        # Generate a new code to delete
        gen_response = requests.post(f"{BASE_URL}/api/admin/access-codes",
            json={"count": 1},
            headers={"X-Admin-Token": TestAccessCodeSystem.admin_token}
        )
        code_to_delete = gen_response.json()["codes"][0]
        
        # Delete the code
        response = requests.delete(f"{BASE_URL}/api/admin/access-codes/{code_to_delete}",
            headers={"X-Admin-Token": TestAccessCodeSystem.admin_token}
        )
        assert response.status_code == 200
        print(f"✓ Access code deleted successfully")


class TestStockSearchAPI:
    """Stock Search API tests"""
    
    def test_search_by_ticker(self):
        """Test searching stocks by ticker symbol"""
        response = requests.get(f"{BASE_URL}/api/stocks/search?q=AAPL")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Verify AAPL is in results
        tickers = [r["ticker"] for r in data]
        assert "AAPL" in tickers
        
        # Verify result structure
        result = data[0]
        assert "ticker" in result
        assert "name" in result
        assert "exchange" in result
        print(f"✓ Search by ticker returned {len(data)} results")
    
    def test_search_by_company_name(self):
        """Test searching stocks by company name"""
        response = requests.get(f"{BASE_URL}/api/stocks/search?q=Apple")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) > 0
        print(f"✓ Search by company name returned {len(data)} results")
    
    def test_search_us_market_filter(self):
        """Test searching with US market filter"""
        response = requests.get(f"{BASE_URL}/api/stocks/search?q=AAPL&exchange=us")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) > 0
        print(f"✓ US market filter search returned {len(data)} results")
    
    def test_search_india_market_filter(self):
        """Test searching with India market filter"""
        response = requests.get(f"{BASE_URL}/api/stocks/search?q=RELIANCE&exchange=nse")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) > 0
        # Verify NSE stocks are returned
        for result in data:
            if result["ticker"].endswith(".NS"):
                assert result["exchange"] == "NSE"
        print(f"✓ India market filter search returned {len(data)} results")
    
    def test_search_empty_query(self):
        """Test searching with empty query"""
        response = requests.get(f"{BASE_URL}/api/stocks/search?q=")
        assert response.status_code == 200
        
        data = response.json()
        assert data == []
        print(f"✓ Empty query returns empty list")


class TestStockQuoteAPI:
    """Stock Quote API tests"""
    
    def test_get_quote_us_stock(self):
        """Test getting quote for US stock"""
        response = requests.get(f"{BASE_URL}/api/stocks/AAPL/quote")
        assert response.status_code == 200
        
        data = response.json()
        assert data["ticker"] == "AAPL"
        assert "price" in data
        assert "change" in data
        assert "change_percent" in data
        assert "company_name" in data
        assert "market_cap" in data
        assert "volume" in data
        assert "high_52week" in data
        assert "low_52week" in data
        assert "day_open" in data
        assert "day_high" in data
        assert "day_low" in data
        assert "pe_ratio" in data
        assert "market_state" in data
        
        # Verify data types
        assert isinstance(data["price"], float)
        assert isinstance(data["change"], float)
        print(f"✓ AAPL quote: ${data['price']:.2f} ({data['change_percent']:.2f}%)")
    
    def test_get_quote_indian_stock(self):
        """Test getting quote for Indian stock"""
        response = requests.get(f"{BASE_URL}/api/stocks/RELIANCE.NS/quote")
        assert response.status_code == 200
        
        data = response.json()
        assert data["ticker"] == "RELIANCE.NS"
        assert "price" in data
        print(f"✓ RELIANCE.NS quote: ₹{data['price']:.2f}")
    
    def test_get_quote_invalid_ticker(self):
        """Test getting quote for invalid ticker"""
        response = requests.get(f"{BASE_URL}/api/stocks/INVALIDTICKER123/quote")
        assert response.status_code == 404
        print(f"✓ Invalid ticker returns 404")


class TestStockHistoryAPI:
    """Stock History API tests"""
    
    def test_get_history_default_period(self):
        """Test getting historical data with default period (1y)"""
        response = requests.get(f"{BASE_URL}/api/stocks/AAPL/history")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Verify data structure
        point = data[0]
        assert "date" in point
        assert "open" in point
        assert "high" in point
        assert "low" in point
        assert "close" in point
        assert "volume" in point
        print(f"✓ Historical data returned {len(data)} data points")
    
    def test_get_history_1mo_period(self):
        """Test getting historical data with 1mo period"""
        response = requests.get(f"{BASE_URL}/api/stocks/AAPL/history?period=1mo")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) > 0
        assert len(data) <= 25  # Approximately 1 month of trading days
        print(f"✓ 1mo period returned {len(data)} data points")
    
    def test_get_history_5y_period(self):
        """Test getting historical data with 5y period"""
        response = requests.get(f"{BASE_URL}/api/stocks/AAPL/history?period=5y")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) > 200  # Should have many data points for 5 years
        print(f"✓ 5y period returned {len(data)} data points")
    
    def test_get_history_invalid_ticker(self):
        """Test getting history for invalid ticker"""
        response = requests.get(f"{BASE_URL}/api/stocks/INVALIDTICKER123/history")
        assert response.status_code == 404
        print(f"✓ Invalid ticker returns 404")


class TestAISentimentAPI:
    """AI Bull/Bear Sentiment API tests"""
    
    def test_get_bull_bear_sentiment(self):
        """Test getting AI-generated bull/bear sentiment"""
        response = requests.get(f"{BASE_URL}/api/stocks/AAPL/bull-bear-sentiment")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["ticker"] == "AAPL"
        assert "company_name" in data
        assert "bull_points" in data
        assert "bear_points" in data
        assert "timestamp" in data
        
        # Verify we have 3 points each
        assert len(data["bull_points"]) == 3
        assert len(data["bear_points"]) == 3
        
        # Verify points are non-empty strings
        for point in data["bull_points"]:
            assert isinstance(point, str)
            assert len(point) > 0
        
        for point in data["bear_points"]:
            assert isinstance(point, str)
            assert len(point) > 0
        
        print(f"✓ Bull/Bear sentiment returned for {data['company_name']}")
        print(f"  Bull points: {len(data['bull_points'])}")
        print(f"  Bear points: {len(data['bear_points'])}")
    
    def test_get_bull_bear_sentiment_different_stock(self):
        """Test getting sentiment for different stock"""
        response = requests.get(f"{BASE_URL}/api/stocks/MSFT/bull-bear-sentiment")
        assert response.status_code == 200
        
        data = response.json()
        assert data["ticker"] == "MSFT"
        print(f"✓ Bull/Bear sentiment returned for MSFT")


class TestStockNewsAPI:
    """Stock News API tests - Should return LIVE data from Yahoo Finance"""
    
    def test_get_stock_news(self):
        """Test getting news for a stock"""
        response = requests.get(f"{BASE_URL}/api/stocks/AAPL/news")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "News API should return at least 1 article"
        
        # Verify news article structure
        article = data[0]
        assert "title" in article
        assert "publisher" in article
        assert "link" in article
        assert "published_date" in article
        assert "summary" in article
        
        # Verify title is not empty
        assert len(article["title"]) > 0
        
        print(f"✓ News API returned {len(data)} articles")
        for i, art in enumerate(data):
            print(f"  {i+1}. {art['title'][:60]}... ({art['publisher']})")
    
    def test_get_stock_news_different_stock(self):
        """Test getting news for different stock"""
        response = requests.get(f"{BASE_URL}/api/stocks/MSFT/news")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) > 0
        print(f"✓ MSFT news returned {len(data)} articles")


class TestCategoryStocksAPI:
    """Category Stocks API tests"""
    
    def test_get_technology_category(self):
        """Test getting technology category stocks"""
        response = requests.get(f"{BASE_URL}/api/stocks/category/technology")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "category" in data
        assert "stocks" in data
        assert data["category"] == "technology"
        assert len(data["stocks"]) > 0
        
        # Verify stock data structure
        stock = data["stocks"][0]
        assert "ticker" in stock
        assert "name" in stock
        assert "price" in stock
        assert "change_percent" in stock
        assert "market_cap" in stock
        
        print(f"✓ Technology category returned {len(data['stocks'])} stocks")
    
    def test_get_nifty50_category(self):
        """Test getting Nifty 50 category stocks (Indian market)"""
        response = requests.get(f"{BASE_URL}/api/stocks/category/nifty50")
        assert response.status_code == 200
        
        data = response.json()
        assert data["category"] == "nifty50"
        assert len(data["stocks"]) > 0
        print(f"✓ Nifty 50 category returned {len(data['stocks'])} stocks")
    
    def test_get_invalid_category(self):
        """Test getting invalid category"""
        response = requests.get(f"{BASE_URL}/api/stocks/category/invalidcategory")
        assert response.status_code == 404
        print(f"✓ Invalid category returns 404")


class TestWatchlistsAPI:
    """Watchlists CRUD API tests"""
    
    created_watchlist_id = None
    
    def test_create_watchlist(self):
        """Test creating a new watchlist"""
        response = requests.post(f"{BASE_URL}/api/watchlists", json={
            "name": "TEST_Iteration3_Watchlist",
            "description": "Test watchlist for iteration 3",
            "color": "#3b82f6",
            "tickers": ["AAPL", "MSFT"]
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["name"] == "TEST_Iteration3_Watchlist"
        assert "AAPL" in data["tickers"]
        assert "MSFT" in data["tickers"]
        
        TestWatchlistsAPI.created_watchlist_id = data["id"]
        print(f"✓ Created watchlist with ID: {data['id']}")
    
    def test_get_all_watchlists(self):
        """Test getting all watchlists"""
        response = requests.get(f"{BASE_URL}/api/watchlists")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} watchlists")
    
    def test_delete_watchlist(self):
        """Test deleting a watchlist"""
        if not TestWatchlistsAPI.created_watchlist_id:
            pytest.skip("No watchlist created")
        
        response = requests.delete(f"{BASE_URL}/api/watchlists/{TestWatchlistsAPI.created_watchlist_id}")
        assert response.status_code == 200
        print(f"✓ Deleted watchlist")


class TestPriceAlertsAPI:
    """Price Alerts CRUD API tests"""
    
    created_alert_id = None
    
    def test_create_price_alert(self):
        """Test creating a price alert"""
        response = requests.post(f"{BASE_URL}/api/price-alerts", json={
            "ticker": "AAPL",
            "company_name": "Apple Inc.",
            "target_price": 999.99,
            "condition": "above"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["ticker"] == "AAPL"
        assert data["condition"] == "above"
        assert data["is_active"] == True
        
        TestPriceAlertsAPI.created_alert_id = data["id"]
        print(f"✓ Created price alert with ID: {data['id']}")
    
    def test_get_all_price_alerts(self):
        """Test getting all price alerts"""
        response = requests.get(f"{BASE_URL}/api/price-alerts")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} price alerts")
    
    def test_delete_price_alert(self):
        """Test deleting a price alert"""
        if not TestPriceAlertsAPI.created_alert_id:
            pytest.skip("No alert created")
        
        response = requests.delete(f"{BASE_URL}/api/price-alerts/{TestPriceAlertsAPI.created_alert_id}")
        assert response.status_code == 200
        print(f"✓ Deleted price alert")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_watchlists(self):
        """Clean up TEST_ prefixed watchlists"""
        response = requests.get(f"{BASE_URL}/api/watchlists")
        if response.status_code == 200:
            watchlists = response.json()
            for wl in watchlists:
                if wl["name"].startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/watchlists/{wl['id']}")
                    print(f"  Cleaned up watchlist: {wl['name']}")
        print(f"✓ Watchlist cleanup complete")
    
    def test_cleanup_test_alerts(self):
        """Clean up test price alerts"""
        response = requests.get(f"{BASE_URL}/api/price-alerts")
        if response.status_code == 200:
            alerts = response.json()
            for alert in alerts:
                if alert["target_price"] >= 999 or alert["target_price"] <= 1:
                    requests.delete(f"{BASE_URL}/api/price-alerts/{alert['id']}")
                    print(f"  Cleaned up alert: {alert['ticker']} @ ${alert['target_price']}")
        print(f"✓ Alert cleanup complete")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
