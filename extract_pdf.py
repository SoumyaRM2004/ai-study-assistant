import PyPDF2
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

reader = PyPDF2.PdfReader(r'd:\Project\PdfAnalyzer\AI Study Intelligence Platform.pdf')
for i, page in enumerate(reader.pages):
    text = page.extract_text()
    print(f"=== PAGE {i+1} ===")
    print(text)
    print()
