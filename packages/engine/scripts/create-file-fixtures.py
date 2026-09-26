import io
from pathlib import Path
import zipfile
root = Path(__file__).resolve().parents[1] / 'tests' / 'fixtures'
root.mkdir(exist_ok=True)
def pdf(texts):
    objects = ['<< /Type /Catalog /Pages 2 0 R >>','', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
    kids=[]
    for text in texts:
        page_id=len(objects)+1
        kids.append(f'{page_id} 0 R')
        stream=f'BT /F1 12 Tf 72 720 Td ({text}) Tj ET'
        objects += [f'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents {page_id+1} 0 R >>',f'<< /Length {len(stream)} >>\nstream\n{stream}\nendstream']
    objects[1]=f'<< /Type /Pages /Kids [{" ".join(kids)}] /Count {len(texts)} >>'
    out=b'%PDF-1.4\n'; offsets=[0]
    for i,obj in enumerate(objects,1):
        offsets.append(len(out)); out+=f'{i} 0 obj\n{obj}\nendobj\n'.encode()
    xref=len(out)
    out+=f'xref\n0 {len(offsets)}\n0000000000 65535 f \n'.encode()
    out+=''.join(f'{offset:010d} 00000 n \n' for offset in offsets[1:]).encode()
    out+=f'trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode()
    return out
(root/'text.pdf').write_bytes(pdf(['Email: fake@example.com','Second page with readable sample text.']))
(root/'scanned.pdf').write_bytes(pdf(['','']))
with zipfile.ZipFile(root/'text.docx','w',zipfile.ZIP_DEFLATED) as z:
    z.writestr('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
    z.writestr('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
    z.writestr('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Email: fake@example.com</w:t></w:r></w:p></w:body></w:document>')
