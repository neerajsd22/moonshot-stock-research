"""
Test suite for Pinned Stocks Drag-and-Drop Reorder Feature
Tests the PUT /api/pinned-stocks/reorder endpoint and GET /api/pinned-stocks order sorting
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPinnedStocksReorder:
    """Tests for pinned stocks reorder functionality"""
    
    def test_get_pinned_stocks_returns_sorted_by_order(self):
        """GET /api/pinned-stocks should return stocks sorted by order field"""
        response = requests.get(f"{BASE_URL}/api/pinned-stocks")
        assert response.status_code == 200
        
        stocks = response.json()
        assert isinstance(stocks, list)
        assert len(stocks) >= 3, "Expected at least 3 pinned stocks (GOOGL, AAPL, MSFT)"
        
        # Verify each stock has required fields
        for stock in stocks:
            assert "ticker" in stock
            assert "company_name" in stock
            assert "order" in stock
            assert isinstance(stock["order"], int)
        
        # Verify stocks are sorted by order
        orders = [s["order"] for s in stocks]
        assert orders == sorted(orders), "Stocks should be sorted by order field"
        print(f"✓ GET /api/pinned-stocks returns {len(stocks)} stocks sorted by order")
    
    def test_reorder_endpoint_updates_order(self):
        """PUT /api/pinned-stocks/reorder should update order fields"""
        # Get current order
        response = requests.get(f"{BASE_URL}/api/pinned-stocks")
        assert response.status_code == 200
        original_stocks = response.json()
        original_tickers = [s["ticker"] for s in original_stocks]
        
        # Reverse the order
        reversed_tickers = list(reversed(original_tickers))
        
        # Call reorder endpoint
        reorder_response = requests.put(
            f"{BASE_URL}/api/pinned-stocks/reorder",
            json=reversed_tickers
        )
        assert reorder_response.status_code == 200
        assert reorder_response.json()["message"] == "Pinned stocks reordered"
        
        # Verify new order
        verify_response = requests.get(f"{BASE_URL}/api/pinned-stocks")
        assert verify_response.status_code == 200
        new_stocks = verify_response.json()
        new_tickers = [s["ticker"] for s in new_stocks]
        
        assert new_tickers == reversed_tickers, f"Expected {reversed_tickers}, got {new_tickers}"
        
        # Restore original order
        restore_response = requests.put(
            f"{BASE_URL}/api/pinned-stocks/reorder",
            json=original_tickers
        )
        assert restore_response.status_code == 200
        print(f"✓ Reorder endpoint correctly updates order: {original_tickers} -> {reversed_tickers} -> {original_tickers}")
    
    def test_reorder_with_partial_list(self):
        """PUT /api/pinned-stocks/reorder with partial list should update only those stocks"""
        # Get current stocks
        response = requests.get(f"{BASE_URL}/api/pinned-stocks")
        original_stocks = response.json()
        original_tickers = [s["ticker"] for s in original_stocks]
        
        # Reorder with just first two stocks swapped
        if len(original_tickers) >= 2:
            partial_reorder = [original_tickers[1], original_tickers[0]]
            
            reorder_response = requests.put(
                f"{BASE_URL}/api/pinned-stocks/reorder",
                json=partial_reorder
            )
            assert reorder_response.status_code == 200
            
            # Verify the partial reorder worked
            verify_response = requests.get(f"{BASE_URL}/api/pinned-stocks")
            new_stocks = verify_response.json()
            
            # First two should be swapped
            assert new_stocks[0]["ticker"] == original_tickers[1]
            assert new_stocks[1]["ticker"] == original_tickers[0]
            
            # Restore original order
            requests.put(f"{BASE_URL}/api/pinned-stocks/reorder", json=original_tickers)
            print(f"✓ Partial reorder works correctly")
    
    def test_reorder_preserves_stock_data(self):
        """Reordering should preserve all stock data except order field"""
        # Get current stocks
        response = requests.get(f"{BASE_URL}/api/pinned-stocks")
        original_stocks = response.json()
        original_tickers = [s["ticker"] for s in original_stocks]
        
        # Store original data (excluding order)
        original_data = {s["ticker"]: {k: v for k, v in s.items() if k != "order"} for s in original_stocks}
        
        # Reverse order
        reversed_tickers = list(reversed(original_tickers))
        requests.put(f"{BASE_URL}/api/pinned-stocks/reorder", json=reversed_tickers)
        
        # Get new stocks
        verify_response = requests.get(f"{BASE_URL}/api/pinned-stocks")
        new_stocks = verify_response.json()
        
        # Verify all data preserved
        for stock in new_stocks:
            ticker = stock["ticker"]
            for key, value in original_data[ticker].items():
                assert stock[key] == value, f"Data mismatch for {ticker}.{key}"
        
        # Restore original order
        requests.put(f"{BASE_URL}/api/pinned-stocks/reorder", json=original_tickers)
        print(f"✓ Reorder preserves all stock data")
    
    def test_reorder_with_empty_list(self):
        """PUT /api/pinned-stocks/reorder with empty list should succeed"""
        reorder_response = requests.put(
            f"{BASE_URL}/api/pinned-stocks/reorder",
            json=[]
        )
        assert reorder_response.status_code == 200
        print(f"✓ Empty list reorder succeeds")
    
    def test_reorder_with_nonexistent_ticker(self):
        """PUT /api/pinned-stocks/reorder with nonexistent ticker should not fail"""
        # Get current stocks
        response = requests.get(f"{BASE_URL}/api/pinned-stocks")
        original_stocks = response.json()
        original_tickers = [s["ticker"] for s in original_stocks]
        
        # Add a nonexistent ticker
        tickers_with_fake = original_tickers + ["FAKETICKER123"]
        
        reorder_response = requests.put(
            f"{BASE_URL}/api/pinned-stocks/reorder",
            json=tickers_with_fake
        )
        # Should succeed (nonexistent ticker is just ignored)
        assert reorder_response.status_code == 200
        print(f"✓ Nonexistent ticker in reorder list is handled gracefully")
    
    def test_order_field_is_sequential(self):
        """After reorder, order fields should be sequential starting from 0"""
        # Get current stocks
        response = requests.get(f"{BASE_URL}/api/pinned-stocks")
        stocks = response.json()
        
        # Verify order is sequential
        orders = [s["order"] for s in stocks]
        expected_orders = list(range(len(stocks)))
        assert orders == expected_orders, f"Orders should be sequential: expected {expected_orders}, got {orders}"
        print(f"✓ Order fields are sequential: {orders}")


class TestPinnedStocksBasicCRUD:
    """Basic CRUD tests for pinned stocks (context for reorder feature)"""
    
    def test_get_pinned_stocks(self):
        """GET /api/pinned-stocks should return list of pinned stocks"""
        response = requests.get(f"{BASE_URL}/api/pinned-stocks")
        assert response.status_code == 200
        
        stocks = response.json()
        assert isinstance(stocks, list)
        
        # Verify expected stocks are present
        tickers = [s["ticker"] for s in stocks]
        assert "GOOGL" in tickers, "GOOGL should be pinned"
        assert "AAPL" in tickers, "AAPL should be pinned"
        assert "MSFT" in tickers, "MSFT should be pinned"
        print(f"✓ GET /api/pinned-stocks returns expected stocks: {tickers}")
    
    def test_pinned_stock_has_order_field(self):
        """Each pinned stock should have an order field"""
        response = requests.get(f"{BASE_URL}/api/pinned-stocks")
        stocks = response.json()
        
        for stock in stocks:
            assert "order" in stock, f"Stock {stock['ticker']} missing order field"
            assert isinstance(stock["order"], int), f"Order should be int for {stock['ticker']}"
        print(f"✓ All pinned stocks have order field")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
