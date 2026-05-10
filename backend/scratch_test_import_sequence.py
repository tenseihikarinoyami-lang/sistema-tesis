import time
def test_import(module_name):
    print(f"Importing {module_name}...", end=" ", flush=True)
    start = time.time()
    try:
        __import__(module_name)
        print(f"Done in {time.time()-start:.2f}s")
    except Exception as e:
        print(f"Failed: {e}")

test_import("os")
test_import("asyncio")
test_import("dotenv")
test_import("langchain_google_genai")
test_import("langchain_groq")
test_import("langchain_openai")
test_import("langchain_core.prompts")
test_import("langchain_core.messages")
print("Finished all imports")
