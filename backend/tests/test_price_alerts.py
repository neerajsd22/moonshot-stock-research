"""
Test Price Alerts API Endpoints
Tests for: POST /api/price-alerts, GET /api/price-alerts, DELETE /api/price-alerts/{id}, GET /api/price-alerts/check
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPriceAlertsAPI:
    """Price Alerts CRUD tests"""
    
    created_alert_ids = []  # Track created alerts for cleanup
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup before each test"""
        yield
        # Cleanup: Delete all test-created alerts
        for alert_id in self.created_alert_ids:
            try:
                requests.delete(f"{BASE_URL}/api/price-alerts/{alert_id}")
            except:
                pass
        self.created_alert_ids.clear()
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health check passed")
    
    def test_create_price_alert_above(self):
        """Test creating a price alert with 'above' condition"""
        payload = {
            "ticker": "TEST_AAPL",
            "company_name": "Apple Inc. (Test)",
            "target_price": 999.99,
            "condition": "above"
        }
        response = requests.post(f"{BASE_URL}/api/price-alerts", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "id" in data
        assert data["ticker"] == "TEST_AAPL"
        assert data["company_name"] == "Apple Inc. (Test)"
        assert data["target_price"] == 999.99
        assert data["condition"] == "above"
        assert data["is_active"] == True
        assert data["is_triggered"] == False
        
        self.created_alert_ids.append(data["id"])
        print(f"✓ Created price alert (above): {data['id']}")
    
    def test_create_price_alert_below(self):
        """Test creating a price alert with 'below' condition"""
        payload = {
            "ticker": "TEST_MSFT",
            "company_name": "Microsoft Corp (Test)",
            "target_price": 100.00,
            "condition": "below"
        }
        response = requests.post(f"{BASE_URL}/api/price-alerts", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["ticker"] == "TEST_MSFT"
        assert data["condition"] == "below"
        assert data["target_price"] == 100.00
        
        self.created_alert_ids.append(data["id"])
        print(f"✓ Created price alert (below): {data['id']}")
    
    def test_create_price_alert_invalid_condition(self):
        """Test creating alert with invalid condition returns error"""
        payload = {
            "ticker": "TEST_GOOGL",
            "company_name": "Alphabet Inc (Test)",
            "target_price": 150.00,
            "condition": "invalid"
        }
        response = requests.post(f"{BASE_URL}/api/price-alerts", json=payload)
        
        assert response.status_code == 400, f"Expected 400 for invalid condition, got {response.status_code}"
        print("✓ Invalid condition correctly rejected")
    
    def test_get_all_price_alerts(self):
        """Test getting all price alerts"""
        # First create a test alert
        payload = {
            "ticker": "TEST_NVDA",
            "company_name": "NVIDIA Corp (Test)",
            "target_price": 500.00,
            "condition": "above"
        }
        create_response = requests.post(f"{BASE_URL}/api/price-alerts", json=payload)
        assert create_response.status_code == 200
        created_alert = create_response.json()
        self.created_alert_ids.append(created_alert["id"])
        
        # Get all alerts
        response = requests.get(f"{BASE_URL}/api/price-alerts")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Verify our created alert is in the list
        alert_ids = [a["id"] for a in data]
        assert created_alert["id"] in alert_ids
        print(f"✓ GET /api/price-alerts returned {len(data)} alerts")
    
    def test_get_active_price_alerts_only(self):
        """Test getting only active price alerts"""
        response = requests.get(f"{BASE_URL}/api/price-alerts?active_only=true")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # All returned alerts should be active
        for alert in data:
            assert alert["is_active"] == True
        
        print(f"✓ GET /api/price-alerts?active_only=true returned {len(data)} active alerts")
    
    def test_delete_price_alert(self):
        """Test deleting a price alert"""
        # First create an alert
        payload = {
            "ticker": "TEST_AMZN",
            "company_name": "Amazon.com Inc (Test)",
            "target_price": 200.00,
            "condition": "below"
        }
        create_response = requests.post(f"{BASE_URL}/api/price-alerts", json=payload)
        assert create_response.status_code == 200
        created_alert = create_response.json()
        alert_id = created_alert["id"]
        
        # Delete the alert
        delete_response = requests.delete(f"{BASE_URL}/api/price-alerts/{alert_id}")
        assert delete_response.status_code == 200
        
        # Verify it's deleted by trying to get all alerts
        get_response = requests.get(f"{BASE_URL}/api/price-alerts")
        all_alerts = get_response.json()
        alert_ids = [a["id"] for a in all_alerts]
        assert alert_id not in alert_ids
        
        print(f"✓ Deleted price alert: {alert_id}")
    
    def test_delete_nonexistent_alert(self):
        """Test deleting a non-existent alert returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/price-alerts/{fake_id}")
        
        assert response.status_code == 404
        print("✓ Delete non-existent alert correctly returns 404")
    
    def test_check_price_alerts(self):
        """Test the price alerts check endpoint"""
        response = requests.get(f"{BASE_URL}/api/price-alerts/check")
        assert response.status_code == 200
        
        data = response.json()
        assert "triggered_alerts" in data
        assert "count" in data
        assert isinstance(data["triggered_alerts"], list)
        assert isinstance(data["count"], int)
        
        print(f"✓ GET /api/price-alerts/check returned {data['count']} triggered alerts")
    
    def test_create_and_verify_persistence(self):
        """Test that created alert persists in database"""
        # Create alert
        payload = {
            "ticker": "TEST_META",
            "company_name": "Meta Platforms (Test)",
            "target_price": 350.00,
            "condition": "above"
        }
        create_response = requests.post(f"{BASE_URL}/api/price-alerts", json=payload)
        assert create_response.status_code == 200
        created_alert = create_response.json()
        self.created_alert_ids.append(created_alert["id"])
        
        # Verify persistence by fetching all alerts
        get_response = requests.get(f"{BASE_URL}/api/price-alerts")
        assert get_response.status_code == 200
        
        all_alerts = get_response.json()
        found_alert = next((a for a in all_alerts if a["id"] == created_alert["id"]), None)
        
        assert found_alert is not None, "Created alert not found in GET response"
        assert found_alert["ticker"] == "TEST_META"
        assert found_alert["target_price"] == 350.00
        assert found_alert["condition"] == "above"
        
        print(f"✓ Alert persistence verified: {created_alert['id']}")


class TestExistingAlerts:
    """Test existing alerts in the database"""
    
    def test_existing_alerts_structure(self):
        """Verify existing alerts have correct structure"""
        response = requests.get(f"{BASE_URL}/api/price-alerts")
        assert response.status_code == 200
        
        alerts = response.json()
        print(f"Found {len(alerts)} existing alerts")
        
        for alert in alerts:
            # Verify required fields
            assert "id" in alert
            assert "ticker" in alert
            assert "target_price" in alert
            assert "condition" in alert
            assert "is_active" in alert
            assert "is_triggered" in alert
            
            # Verify condition is valid
            assert alert["condition"] in ["above", "below"]
            
            print(f"  - {alert['ticker']}: {alert['condition']} ${alert['target_price']} (active={alert['is_active']})")
        
        print("✓ All existing alerts have valid structure")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
