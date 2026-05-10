import docx
import os

doc_path = r"d:\sistema tesis\proyectos\Tesis_proj_82747.docx"
output_path = r"d:\sistema tesis\proyectos\Tesis_proj_82747.txt"

def extract_docx(path):
    doc = docx.Document(path)
    full_text = []
    for para in doc.paragraphs:
        full_text.append(para.text)
    return '\n'.join(full_text)

if os.path.exists(doc_path):
    text = extract_docx(doc_path)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"Extracted text to {output_path}")
else:
    print(f"File not found: {doc_path}")
