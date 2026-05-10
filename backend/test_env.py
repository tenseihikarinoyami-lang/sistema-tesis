import fastapi
import firebase_admin
from firebase_admin import credentials, auth
import uvicorn
print("All imports successful")

try:
    firebase_admin.initialize_app()
    print("Firebase initialized with ADC")
except Exception as e:
    print(f"Firebase initialization failed: {e}")
