from docx import Document
import sys
import os

def extract_text(file_path):
    try:
        doc = Document(file_path)
        full_text = []
        for para in doc.paragraphs:
            full_text.append(para.text)
        return "\n".join(full_text)
    except Exception as e:
        return f"Error: {e}"

if __name__ == "__main__":
    file_path = "d:/sistema tesis/proyectos/Tesis_proj_82747.docx"
    text = extract_text(file_path)
    # Save to a temporary text file so I can read it with view_file
    with open("extracted_thesis_text.txt", "w", encoding="utf-8") as f:
        f.write(text)
    print("Extraction complete")
