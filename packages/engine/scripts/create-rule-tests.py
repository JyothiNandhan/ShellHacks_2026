"""Write individual rule regression tests, using synthetic examples only."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]/'tests'
examples={
'email':('Email: demo@example.com','demo@example.com','abc@example'),
'phone':('Call +91 98765 43210','+91 98765 43210','order number 1234567890'),
'ssn':('ssn 123-45-6789','123-45-6789','000-45-6789'),
'creditCard':('4111 1111 1111 1111','4111 1111 1111 1111','4111 1111 1111 1112'),
'bank':('routing 021000021','021000021','021000021'),
'apiKey':('AKIA1234567890ABCDEF','AKIA1234567890ABCDEF','AKIA123'),
'password':('password: "hunter22"','hunter22','password missing'),
'ip':('IP 192.168.0.12','192.168.0.12','version 1.2.3.4'),
'dob':('DOB 1997-01-15','1997-01-15','meeting 1997-01-15'),
'address':('Mail to 123 Maple Street','123 Maple Street','A short sentence.'),
'namePhrases':('my name is krishna','krishna','Call me later'),
}
for name,(positive,value,negative) in examples.items():
    (root/f'{name}.test.ts').write_text(f'''import {{ expect, it }} from 'vitest';
import {{ find }} from '../src/rules/{name}';
it('{name}: exact positive offsets and negative boundary', () => {{
  const text = {json.dumps(positive)};
  for(let i=0;i<2;i++) {{
    const found=find(text); expect(found.map(f=>f.value)).toEqual([{json.dumps(value)}]);
    for(const f of found) expect(text.slice(f.start,f.end)).toBe(f.value);
  }}
  expect(find({json.dumps(negative)})).toEqual([]);
}});
''',encoding='utf-8')
