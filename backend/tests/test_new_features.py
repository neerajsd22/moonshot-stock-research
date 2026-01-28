"""
Backend API Tests for Moonshot Stock Picker - New Features
Tests: Watchlists, Price Alerts, Advanced Charts (Candlestick, Indicators)
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestWatchlistCRUD:
    """Watchlist CRUD operations tests"""
    
    created_watchlist_id = None
    
    def test_create_watchlist(self):
        """Test creating a new watchlist"""
        response = requests.post(f"{BASE_URL}/api/watchlists", json={
            "name": "TEST_Growth_Stocks",
            "description": "High growth tech stocks",
            "color": "#3b82f6",
            "tickers": []
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["name"] == "TEST_Growth_Stocks"
        assert data["description"] == "High growth tech stocks"
        assert data["color"] == "#3b82f6"
        assert data["tickers"] == []
        
        TestWatchlistCRUD.created_watchlist_id = data["id"]
        print(f"✓ Created watchlist with ID: {data['id']}")
    
    def test_get_all_watchlists(self):
        """Test getting all watchlists"""
        response = requests.get(f"{BASE_URL}/api/watchlists")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} watchlists")
    
    def test_get_single_watchlist(self):
        """Test getting a single watchlist by ID"""
        if not TestWatchlistCRUD.created_watchlist_id:
            pytest.skip("No watchlist created")
        
        response = requests.get(f"{BASE_URL}/api/watchlists/{TestWatchlistCRUD.created_watchlist_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == TestWatchlistCRUD.created_watchlist_id
        assert data["name"] == "TEST_Growth_Stocks"
        print(f"✓ Retrieved watchlist: {data['name']}")
    
    def test_update_watchlist(self):
        """Test updating a watchlist"""
        if not TestWatchlistCRUD.created_watchlist_id:
            pytest.skip("No watchlist created")
        
        response = requests.put(f"{BASE_URL}/api/watchlists/{TestWatchlistCRUD.created_watchlist_id}", json={
            "name": "TEST_Updated_Growth_Stocks",
            "description": "Updated description"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "TEST_Updated_Growth_Stocks"
        assert data["description"] == "Updated description"
        print(f"✓ Updated watchlist name to: {data['name']}")
    
    def test_add_stock_to_watchlist(self):
        """Test adding a stock to a watchlist"""
        if not TestWatchlistCRUD.created_watchlist_id:
            pytest.skip("No watchlist created")
        
        response = requests.post(f"{BASE_URL}/api/watchlists/{TestWatchlistCRUD.created_watchlist_id}/stocks/AAPL")
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        print(f"✓ Added AAPL to watchlist")
        
        # Verify stock was added
        verify_response = requests.get(f"{BASE_URL}/api/watchlists/{TestWatchlistCRUD.created_watchlist_id}")
        assert "AAPL" in verify_response.json()["tickers"]
        print(f"✓ Verified AAPL in watchlist tickers")
    
    def test_add_multiple_stocks_to_watchlist(self):
        """Test adding multiple stocks to a watchlist"""
        if not TestWatchlistCRUD.created_watchlist_id:
            pytest.skip("No watchlist created")
        
        for ticker in ["MSFT", "GOOGL"]:
            response = requests.post(f"{BASE_URL}/api/watchlists/{TestWatchlistCRUD.created_watchlist_id}/stocks/{ticker}")
            assert response.status_code == 200
        
        # Verify all stocks were added
        verify_response = requests.get(f"{BASE_URL}/api/watchlists/{TestWatchlistCRUD.created_watchlist_id}")
        tickers = verify_response.json()["tickers"]
        assert "AAPL" in tickers
        assert "MSFT" in tickers
        assert "GOOGL" in tickers
        print(f"✓ Added and verified multiple stocks: {tickers}")
    
    def test_get_watchlist_stocks_with_data(self):
        """Test getting detailed stock data for watchlist"""
        if not TestWatchlistCRUD.created_watchlist_id:
            pytest.skip("No watchlist created")
        
        response = requests.get(f"{BASE_URL}/api/watchlists/{TestWatchlistCRUD.created_watchlist_id}/stocks")
        assert response.status_code == 200
        
        data = response.json()
        assert "stocks" in data
        assert len(data["stocks"]) > 0
        
        # Verify stock data structure
        stock = data["stocks"][0]
        assert "ticker" in stock
        assert "price" in stock
        assert "change_percent" in stock
        print(f"✓ Retrieved {len(data['stocks'])} stocks with price data")
    
    def test_remove_stock_from_watchlist(self):
        """Test removing a stock from a watchlist"""
        if not TestWatchlistCRUD.created_watchlist_id:
            pytest.skip("No watchlist created")
        
        response = requests.delete(f"{BASE_URL}/api/watchlists/{TestWatchlistCRUD.created_watchlist_id}/stocks/GOOGL")
        assert response.status_code == 200
        
        # Verify stock was removed
        verify_response = requests.get(f"{BASE_URL}/api/watchlists/{TestWatchlistCRUD.created_watchlist_id}")
        assert "GOOGL" not in verify_response.json()["tickers"]
        print(f"✓ Removed GOOGL from watchlist")
    
    def test_delete_watchlist(self):
        """Test deleting a watchlist"""
        if not TestWatchlistCRUD.created_watchlist_id:
            pytest.skip("No watchlist created")
        
        response = requests.delete(f"{BASE_URL}/api/watchlists/{TestWatchlistCRUD.created_watchlist_id}")
        assert response.status_code == 200
        
        # Verify watchlist was deleted
        verify_response = requests.get(f"{BASE_URL}/api/watchlists/{TestWatchlistCRUD.created_watchlist_id}")
        assert verify_response.status_code == 404
        print(f"✓ Deleted watchlist and verified 404 on GET")
    
    def test_get_nonexistent_watchlist(self):
        """Test getting a non-existent watchlist returns 404"""
        response = requests.get(f"{BASE_URL}/api/watchlists/nonexistent-id-12345")
        assert response.status_code == 404
        print(f"✓ Non-existent watchlist returns 404")


class TestPriceAlerts:
    """Price Alert CRUD and checking tests"""
    
    created_alert_id = None
    
    def test_create_price_alert_above(self):
        """Test creating a price alert with 'above' condition"""
        response = requests.post(f"{BASE_URL}/api/price-alerts", json={
            "ticker": "AAPL",
            "company_name": "Apple Inc.",
            "target_price": 999.99,  # High price unlikely to trigger
            "condition": "above"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["ticker"] == "AAPL"
        assert data["target_price"] == 999.99
        assert data["condition"] == "above"
        assert data["is_active"] == True
        assert data["is_triggered"] == False
        
        TestPriceAlerts.created_alert_id = data["id"]
        print(f"✓ Created price alert (above) with ID: {data['id']}")
    
    def test_create_price_alert_below(self):
        """Test creating a price alert with 'below' condition"""
        response = requests.post(f"{BASE_URL}/api/price-alerts", json={
            "ticker": "MSFT",
            "company_name": "Microsoft Corporation",
            "target_price": 1.00,  # Low price unlikely to trigger
            "condition": "below"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["condition"] == "below"
        assert data["is_active"] == True
        print(f"✓ Created price alert (below) with ID: {data['id']}")
    
    def test_create_price_alert_invalid_condition(self):
        """Test creating a price alert with invalid condition"""
        response = requests.post(f"{BASE_URL}/api/price-alerts", json={
            "ticker": "AAPL",
            "company_name": "Apple Inc.",
            "target_price": 100.00,
            "condition": "invalid"
        })
        assert response.status_code == 400
        print(f"✓ Invalid condition returns 400")
    
    def test_get_all_price_alerts(self):
        """Test getting all price alerts"""
        response = requests.get(f"{BASE_URL}/api/price-alerts")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} price alerts")
    
    def test_get_active_price_alerts_only(self):
        """Test getting only active price alerts"""
        response = requests.get(f"{BASE_URL}/api/price-alerts?active_only=true")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        # All returned alerts should be active
        for alert in data:
            assert alert["is_active"] == True
        print(f"✓ Retrieved {len(data)} active price alerts")
    
    def test_check_price_alerts(self):
        """Test checking price alerts endpoint"""
        response = requests.get(f"{BASE_URL}/api/price-alerts/check")
        assert response.status_code == 200
        
        data = response.json()
        assert "triggered_alerts" in data
        assert "count" in data
        assert isinstance(data["triggered_alerts"], list)
        print(f"✓ Checked alerts - {data['count']} triggered")
    
    def test_dismiss_price_alert(self):
        """Test dismissing a price alert"""
        if not TestPriceAlerts.created_alert_id:
            pytest.skip("No alert created")
        
        response = requests.post(f"{BASE_URL}/api/price-alerts/{TestPriceAlerts.created_alert_id}/dismiss")
        assert response.status_code == 200
        
        # Verify alert is now inactive
        verify_response = requests.get(f"{BASE_URL}/api/price-alerts")
        alerts = verify_response.json()
        alert = next((a for a in alerts if a["id"] == TestPriceAlerts.created_alert_id), None)
        assert alert is not None
        assert alert["is_active"] == False
        print(f"✓ Dismissed alert and verified is_active=False")
    
    def test_reset_price_alert(self):
        """Test resetting a dismissed price alert"""
        if not TestPriceAlerts.created_alert_id:
            pytest.skip("No alert created")
        
        response = requests.post(f"{BASE_URL}/api/price-alerts/{TestPriceAlerts.created_alert_id}/reset")
        assert response.status_code == 200
        
        # Verify alert is now active again
        verify_response = requests.get(f"{BASE_URL}/api/price-alerts")
        alerts = verify_response.json()
        alert = next((a for a in alerts if a["id"] == TestPriceAlerts.created_alert_id), None)
        assert alert is not None
        assert alert["is_active"] == True
        assert alert["is_triggered"] == False
        print(f"✓ Reset alert and verified is_active=True, is_triggered=False")
    
    def test_delete_price_alert(self):
        """Test deleting a price alert"""
        if not TestPriceAlerts.created_alert_id:
            pytest.skip("No alert created")
        
        response = requests.delete(f"{BASE_URL}/api/price-alerts/{TestPriceAlerts.created_alert_id}")
        assert response.status_code == 200
        
        # Verify alert was deleted
        verify_response = requests.get(f"{BASE_URL}/api/price-alerts")
        alerts = verify_response.json()
        alert = next((a for a in alerts if a["id"] == TestPriceAlerts.created_alert_id), None)
        assert alert is None
        print(f"✓ Deleted alert and verified removal")
    
    def test_delete_nonexistent_alert(self):
        """Test deleting a non-existent alert returns 404"""
        response = requests.delete(f"{BASE_URL}/api/price-alerts/nonexistent-id-12345")
        assert response.status_code == 404
        print(f"✓ Non-existent alert delete returns 404")


class TestAdvancedCharts:
    """Advanced Chart endpoints tests - Candlestick and Technical Indicators"""
    
    def test_candlestick_data_default_period(self):
        """Test getting candlestick data with default period (3mo)"""
        response = requests.get(f"{BASE_URL}/api/stocks/AAPL/candlestick")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "ticker" in data
        assert data["ticker"] == "AAPL"
        assert "data" in data
        assert len(data["data"]) > 0
        
        # Verify OHLC structure
        candle = data["data"][0]
        assert "date" in candle
        assert "open" in candle
        assert "high" in candle
        assert "low" in candle
        assert "close" in candle
        assert "volume" in candle
        
        # Verify data types
        assert isinstance(candle["open"], float)
        assert isinstance(candle["high"], float)
        assert isinstance(candle["low"], float)
        assert isinstance(candle["close"], float)
        assert isinstance(candle["volume"], int)
        
        print(f"✓ Retrieved {len(data['data'])} candlestick data points for AAPL")
    
    def test_candlestick_data_1mo_period(self):
        """Test getting candlestick data with 1mo period"""
        response = requests.get(f"{BASE_URL}/api/stocks/AAPL/candlestick?period=1mo")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["data"]) > 0
        print(f"✓ Retrieved {len(data['data'])} candlestick data points for 1mo period")
    
    def test_candlestick_data_6mo_period(self):
        """Test getting candlestick data with 6mo period"""
        response = requests.get(f"{BASE_URL}/api/stocks/MSFT/candlestick?period=6mo")
        assert response.status_code == 200
        
        data = response.json()
        assert data["ticker"] == "MSFT"
        assert len(data["data"]) > 0
        print(f"✓ Retrieved {len(data['data'])} candlestick data points for MSFT 6mo")
    
    def test_candlestick_invalid_ticker(self):
        """Test candlestick with invalid ticker returns 404"""
        response = requests.get(f"{BASE_URL}/api/stocks/INVALIDTICKER123/candlestick")
        assert response.status_code == 404
        print(f"✓ Invalid ticker returns 404 for candlestick")
    
    def test_technical_indicators_default_period(self):
        """Test getting technical indicators with default period (1y)"""
        response = requests.get(f"{BASE_URL}/api/stocks/AAPL/indicators")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "ticker" in data
        assert data["ticker"] == "AAPL"
        assert "indicators" in data
        assert len(data["indicators"]) > 0
        
        # Verify indicator structure (check a data point with all indicators calculated)
        # Skip first few points as they may have null values due to rolling calculations
        indicator = data["indicators"][-1]  # Last point should have all values
        
        assert "date" in indicator
        assert "close" in indicator
        assert "rsi" in indicator
        assert "macd" in indicator
        assert "macd_signal" in indicator
        assert "macd_histogram" in indicator
        assert "sma_20" in indicator
        assert "sma_50" in indicator
        assert "ema_20" in indicator
        assert "bb_upper" in indicator
        assert "bb_middle" in indicator
        assert "bb_lower" in indicator
        
        print(f"✓ Retrieved {len(data['indicators'])} indicator data points for AAPL")
    
    def test_technical_indicators_3mo_period(self):
        """Test getting technical indicators with 3mo period"""
        response = requests.get(f"{BASE_URL}/api/stocks/AAPL/indicators?period=3mo")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["indicators"]) > 0
        print(f"✓ Retrieved {len(data['indicators'])} indicator data points for 3mo period")
    
    def test_rsi_values_in_range(self):
        """Test that RSI values are within valid range (0-100)"""
        response = requests.get(f"{BASE_URL}/api/stocks/AAPL/indicators?period=3mo")
        assert response.status_code == 200
        
        data = response.json()
        for indicator in data["indicators"]:
            if indicator["rsi"] is not None:
                assert 0 <= indicator["rsi"] <= 100, f"RSI out of range: {indicator['rsi']}"
        
        print(f"✓ All RSI values within valid range (0-100)")
    
    def test_bollinger_bands_relationship(self):
        """Test that Bollinger Bands have correct relationship (lower < middle < upper)"""
        response = requests.get(f"{BASE_URL}/api/stocks/AAPL/indicators?period=3mo")
        assert response.status_code == 200
        
        data = response.json()
        for indicator in data["indicators"]:
            if all(indicator.get(k) is not None for k in ["bb_lower", "bb_middle", "bb_upper"]):
                assert indicator["bb_lower"] <= indicator["bb_middle"] <= indicator["bb_upper"], \
                    f"BB relationship violated: {indicator['bb_lower']} <= {indicator['bb_middle']} <= {indicator['bb_upper']}"
        
        print(f"✓ Bollinger Bands relationship verified (lower <= middle <= upper)")
    
    def test_indicators_invalid_ticker(self):
        """Test indicators with invalid ticker returns 404"""
        response = requests.get(f"{BASE_URL}/api/stocks/INVALIDTICKER123/indicators")
        assert response.status_code == 404
        print(f"✓ Invalid ticker returns 404 for indicators")
    
    def test_indicators_insufficient_data(self):
        """Test indicators with period that might have insufficient data"""
        # 1mo might not have enough data for all indicators (need 26 points for MACD)
        response = requests.get(f"{BASE_URL}/api/stocks/AAPL/indicators?period=1mo")
        # Should either return 200 with partial data or 404 if insufficient
        assert response.status_code in [200, 404]
        print(f"✓ Handled insufficient data period gracefully (status: {response.status_code})")


class TestCleanup:
    """Cleanup test data created during tests"""
    
    def test_cleanup_test_watchlists(self):
        """Clean up any TEST_ prefixed watchlists"""
        response = requests.get(f"{BASE_URL}/api/watchlists")
        if response.status_code == 200:
            watchlists = response.json()
            for wl in watchlists:
                if wl["name"].startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/watchlists/{wl['id']}")
                    print(f"  Cleaned up watchlist: {wl['name']}")
        print(f"✓ Cleanup complete")
    
    def test_cleanup_test_alerts(self):
        """Clean up any test price alerts"""
        response = requests.get(f"{BASE_URL}/api/price-alerts")
        if response.status_code == 200:
            alerts = response.json()
            # Clean up alerts with very high or very low target prices (test data)
            for alert in alerts:
                if alert["target_price"] >= 999 or alert["target_price"] <= 1:
                    requests.delete(f"{BASE_URL}/api/price-alerts/{alert['id']}")
                    print(f"  Cleaned up alert: {alert['ticker']} @ ${alert['target_price']}")
        print(f"✓ Alert cleanup complete")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
