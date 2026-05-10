print("Importing FastAPI...")
from fastapi import FastAPI
print("Importing ThesisForgePipeline...")
try:
    from services.ai_generator import ThesisForgePipeline
    print("Import successful")
except Exception as e:
    print(f"Import failed: {e}")
