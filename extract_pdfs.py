import os
from PyPDF2 import PdfReader

pdf_dir = r"d:\sistema tesis\ejemplos"
output_dir = r"d:\sistema tesis\ejemplos_txt"

os.makedirs(output_dir, exist_ok=True)

for filename in os.listdir(pdf_dir):
    if filename.endswith(".pdf"):
        pdf_path = os.path.join(pdf_dir, filename)
        txt_path = os.path.join(output_dir, filename.replace(".pdf", ".txt"))
        
        try:
            reader = PdfReader(pdf_path)
            text = ""
            for i, page in enumerate(reader.pages):
                extracted = page.extract_text()
                if extracted:
                    text += f"\n--- Page {i+1} ---\n" + extracted
            
            with open(txt_path, "w", encoding="utf-8") as f:
                f.write(text)
            print(f"Extracted: {filename} ({len(reader.pages)} pages)")
        except Exception as e:
            print(f"Error extracting {filename}: {e}")
