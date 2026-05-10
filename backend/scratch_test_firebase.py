import firebase_admin
from firebase_admin import credentials
import sys

print("Starting Firebase Init...")
try:
    firebase_admin.initialize_app()
    print("Firebase initialized successfully")
except Exception as e:
    print(f"Error initializing Firebase: {e}")
sys.exit(0)
