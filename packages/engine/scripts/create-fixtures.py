"""Deterministic, synthetic-only regression corpus. No real personal data."""
import json
from pathlib import Path
root = Path(__file__).resolve().parents[3]
cases = []
def case(id, text, expected, **extra):
    cases.append(dict(id=id, text=text, expected=[dict(type=t, value=v) for t,v in expected], **extra))
for id, text, kind, value in [
 ('email','Email me at krishna.test@example.com','EMAIL','krishna.test@example.com'),
 ('email-plus','Contact a.b+tag@example.co.uk.','EMAIL','a.b+tag@example.co.uk'),
 ('phone-us','Phone: (305) 555-0123','PHONE','(305) 555-0123'),
 ('phone-us-country','Phone: +1 305 555 0123','PHONE','+1 305 555 0123'),
 ('phone-india','Phone: +91 98765 43210','PHONE','+91 98765 43210'),
 ('phone-india-local','Phone: 9876543210','PHONE','9876543210'),
 ('phone-international','Phone: +44 7700 900123','PHONE','+44 7700 900123'),
 ('ssn','SSN: 123-45-6789','SSN','123-45-6789'),
 ('ssn-bare','Social security: 123456789','SSN','123456789'),
 ('card','Card: 4111 1111 1111 1111','CREDIT_CARD','4111 1111 1111 1111'),
 ('card-mastercard','Card: 5555-5555-5555-4444','CREDIT_CARD','5555-5555-5555-4444'),
 ('routing','routing 021000021','BANK','021000021'),
 ('routing-after','021000021 is the routing number','BANK','021000021'),
 ('account','account number: 12345678','BANK','12345678'),
 ('account-short-label','acct: 123456789012','BANK','123456789012'),
 ('openai-key','key sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz123456','API_KEY','sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz123456'),
 ('github-key','key ghp_'+'A1b2C3'*6,'API_KEY','ghp_'+'A1b2C3'*6),
 ('github-pat','key github_pat_'+'a1B2c3'*5,'API_KEY','github_pat_'+'a1B2c3'*5),
 ('aws-key','key AKIA1234567890ABCDEF','API_KEY','AKIA1234567890ABCDEF'),
 ('google-key','key AIza'+'a1B2c'*7,'API_KEY','AIza'+'a1B2c'*7),
 ('slack-key','key xoxb-1234567890-AbCdEf','API_KEY','xoxb-1234567890-AbCdEf'),
 ('stripe-key','key sk_live_'+'a1B2c3'*4,'API_KEY','sk_live_'+'a1B2c3'*4),
 ('private-key','-----BEGIN PRIVATE KEY-----\nZmFrZQ==\n-----END PRIVATE KEY-----','API_KEY','-----BEGIN PRIVATE KEY-----\nZmFrZQ==\n-----END PRIVATE KEY-----'),
 ('jwt','Token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c','API_KEY','eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'),
 ('entropy','secret A7mQ2zR9vK4pN8xT3bL6wH5sD0jF','API_KEY','A7mQ2zR9vK4pN8xT3bL6wH5sD0jF'),
 ('password','password: hunter22','PASSWORD','hunter22'),
 ('password-quoted','pwd = "fakeSecret42"','PASSWORD','fakeSecret42'),
 ('pin','pin: 1234','PASSWORD','1234'),
 ('ip','Server IP: 192.168.1.12','IP_ADDRESS','192.168.1.12'),
 ('dob','DOB: 01/15/1997','DATE_OF_BIRTH','01/15/1997'),
 ('dob-iso','Born on 1997-01-15','DATE_OF_BIRTH','1997-01-15'),
 ('dob-month','birthday: January 15, 1997','DATE_OF_BIRTH','January 15, 1997'),
 ('street','Meet at 123 Maple Street Apt 4B','ADDRESS','123 Maple Street Apt 4B'),
 ('address-phrase','my address is 24 lake view, unit 8','ADDRESS','24 lake view, unit 8'),
 ('name-lowercase','my name is krishna','PERSON','krishna'),
 ('name-full','my full name is Krishna Teja','PERSON','Krishna Teja'),
 ('name-stop','my name is krishna and my work is remote','PERSON','krishna'),
 ('name-weak','I am Priya Sharma','PERSON','Priya Sharma'),
 ('signoff','Regards,\nPriya Sharma','PERSON','Priya Sharma'),
 ('dictionary','I met Priya Sharma yesterday.','PERSON','Priya Sharma'),
]: case(id,text,[(kind,value)])
for i,text in enumerate(['I am happy','this is great','order number 1234567890','ZIP 33101','The year is 2026','version 1.2.3.4','1.2.3.4','Price: $123.45','a'*40,'0123456789abcdef0123456789abcdef01234567ab','https://example.com/9876543210','https://example.com/A7mQ2zR9vK4pN8xT3bL6wH5sD0jF','Call me later','021000021','Will you help me','SSN: 000-12-1234','SSN: 666-12-1234','SSN: 900-12-1234','Card: 4111 1111 1111 1112','IP: 999.168.1.12','abc9876543210xyz','Born next week','Meeting on 01/15/1997','I am a student','My name is not available']):
    case(f'negative-{i+1}',text,[])
terms = dict(names=['Priya Sharma'],emails=[],phones=[],addresses=[],custom=['Project Saffron'])
case('private-term','Discuss Project Saffron later.', [('USER_TERM','Project Saffron')], options=dict(userTerms=terms))
case('saved-name','priya replied.', [('PERSON','priya')], options=dict(userTerms=terms))
case('ner-place','We moved to Hyderabad.', [], ner=[dict(type='LOCATION',start=12,end=21,score=.98)], fullExpected=[dict(type='LOCATION',value='Hyderabad')])
case('ner-organization','We use Acme Labs.', [], options=dict(enabledTypes=['ORGANIZATION']), ner=[dict(type='ORGANIZATION',start=7,end=16,score=.99)], fullExpected=[dict(type='ORGANIZATION',value='Acme Labs')])
messages = [
 ('Please rewrite my note. My name is krishna and I need a concise summary.', [('PERSON','krishna')]),
 ('Send the draft to priya.demo@example.org after the review.', [('EMAIL','priya.demo@example.org')]),
 ('My callback number is +1 305 555 0123 for this fictional exercise.', [('PHONE','+1 305 555 0123')]),
 ('Please format this sample: SSN 123-45-6789.', [('SSN','123-45-6789')]),
 ('The sandbox card is 4111 1111 1111 1111.', [('CREDIT_CARD','4111 1111 1111 1111')]),
 ('Use routing 021000021 in the fake payment form.', [('BANK','021000021')]),
 ('Test account number 12345678 belongs to the fictional customer.', [('BANK','12345678')]),
 ('The tutorial password: hunter22 should be replaced before sharing.', [('PASSWORD','hunter22')]),
 ('The fictional host uses 192.168.1.12 on a local network.', [('IP_ADDRESS','192.168.1.12')]),
 ('DOB: 1997-01-15 is a made-up profile field.', [('DATE_OF_BIRTH','1997-01-15')]),
 ('Please standardize 123 Maple Street for this practice letter.', [('ADDRESS','123 Maple Street')]),
 ('Thanks,\nPriya Sharma', [('PERSON','Priya Sharma')]),
 ('I am ready to present the slides tomorrow.', []),
 ('This is great progress on the report.', []),
 ('Call me later when the review is finished.', []),
 ('The release version 2.10.3.4 fixes the bug.', []),
 ('The invoice number 1234567890 is an internal identifier.', []),
 ('We budgeted $250.00 for materials in 2026.', []),
 ('Please review https://example.org/docs/9876543210 before the meeting.', []),
 ('Will you help me make this paragraph shorter?', []),
]
for i,(text,expected) in enumerate(messages): case(f'accuracy-{i+1}',text,expected)
resume = '''My name is Krishna Teja
Email: krishna.test@example.com
Phone: (305) 555-0123
123 Maple Street Apt 4B

Professional Summary
Curious software engineering student seeking an internship focused on reliable applications and accessible user experiences. Enjoys translating complex requirements into clear interfaces, writing maintainable code, and collaborating with teammates from different technical backgrounds. This resume is entirely fictional and was written for privacy detection testing.

Education
Bachelor of science in computer science, expected graduation 2027. Coursework includes data structures, database systems, computer networks, software testing, and human computer interaction. Completed a team project exploring practical privacy controls for everyday digital tools.

Experience
Built a browser extension that highlights sensitive information before users share documents. Implemented deterministic text processing, reusable components, and automated regression checks. Documented integration assumptions so teammates could work independently. Investigated reported bugs by reducing them to small examples and adding tests before making changes.

Projects
Created an offline resume analyzer that processes documents locally and displays clear explanations for each finding. Designed a dashboard with accessible colors, keyboard navigation, and useful empty states. Collaborated on a campus scheduling tool and improved its loading behavior on slower devices.

Skills
Comfortable with TypeScript, Python, React, SQL, Git, and browser developer tools. Practices code review, documentation, and careful handling of application state. Communicates progress early and asks focused questions when requirements are unclear.

Community
Volunteers at introductory programming workshops and helps new students troubleshoot projects. Interested in usable security, open source software, and tools that give people more control over their information.'''
(root/'fixtures'/'engine-samples.json').write_text(json.dumps(dict(cases=cases,resume=resume),indent=2),encoding='utf-8')
print(f'{len(cases)} cases; resume {len(resume.split())} words')
