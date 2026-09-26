#!/usr/bin/env python3
"""Synthetic fixture only. pip install -r scripts/requirements.txt; python scripts/generate_fake_export.py"""
import argparse
import calendar
import json
import random
import zipfile
from datetime import datetime, timezone, timedelta
from pathlib import Path
from uuid import UUID
from faker import Faker

Faker.seed(42)
fake = Faker('en_US')
rng = random.Random(42)
parser = argparse.ArgumentParser()
parser.add_argument('--as-of', default=datetime.now(timezone.utc).date().isoformat())
args = parser.parse_args()
end = datetime.fromisoformat(args.as_of).replace(tzinfo=timezone.utc)
start_year, start_month = end.year, end.month - 14
while start_month <= 0:
    start_month += 12
    start_year -= 1
start = end.replace(year=start_year, month=start_month, day=min(end.day, calendar.monthrange(start_year, start_month)[1]))
root = Path(__file__).resolve().parents[1]
uid = lambda: str(UUID(int=rng.getrandbits(128), version=4))
# Non-overlapping planted cohorts make expected conversation counts auditable.
plants = [(40, 'Hi, my name is Alex Rivera. Help me organize this task.', 'Introducing myself'),
          (23, 'My email is alex.rivera@example.com. Draft a short reply.', 'A quick email'),
          (14, 'My home address is 742 Evergreen Terrace, Springfield, IL 62704. Help with my rent email.', 'Help with my rent email'),
          (9, 'My phone number is 202-555-0147. Draft a contact note.', 'A contact note'),
          (6, 'I was diagnosed with asthma. Help me prepare questions for my appointment.', 'Preparing for an appointment'),
          (4, 'My salary is $72000 and my bank routing number is 021000021. Help me budget.', 'Monthly budget'),
          (2, 'The test key is sk-proj-DEMO_ONLY_abcdefghijklmnopqrstuvwxyz1234567890. Help debug this integration.', 'Debugging an integration'),
          (2, 'My date of birth is 1994-06-15. Help format this form.', 'Formatting a form'),
          (1, 'The test card number is 4242 4242 4242 4242. Help test my checkout.', 'Testing a checkout')]
scenarios = [(text, title) for count, text, title in plants for _ in range(count)]
scenarios += [('Explain a useful technique for ' + topic + '.', 'A little ' + topic) for topic in ['coding','recipes','travel','study'] for _ in range(30)]
scenarios = scenarios[:220]
rng.shuffle(scenarios)
conversations = []
for index, (prompt, title) in enumerate(scenarios):
    timestamp = (start + (end-start) * rng.random() ** 0.55).timestamp()
    cid = uid()
    mapping = {'root': {'id': 'root', 'message': None, 'parent': None, 'children': []}}
    parent = 'root'
    for turn in range(rng.randint(2,8)):
        for role in ['user','assistant']:
            nid = uid()
            if role == 'user':
                text = prompt if turn == 0 else rng.choice(['Could you explain the next step?', 'Make that easier to understand.', 'Give me a practical example.', 'Summarize this as a short list.'])
            else:
                text = ' '.join(fake.words(nb=rng.randint(80,400))) + '.'
            mapping[parent]['children'].append(nid)
            mapping[nid] = {'id':nid,'parent':parent,'children':[], 'message':{'id':nid,'author':{'role':role},'create_time':timestamp+turn*120+(60 if role=='assistant' else 0),'content':{'content_type':'text','parts':[text]}}}
            parent = nid
    conversations.append({'id':cid,'conversation_id':cid,'title':title,'create_time':timestamp,'update_time':timestamp+1000,'current_node':parent,'mapping':mapping})
output = root / 'fixtures/fake-export'
output.mkdir(parents=True, exist_ok=True)
content = json.dumps(conversations, ensure_ascii=False)
(output/'conversations.json').write_text(content)
with zipfile.ZipFile(output/'fake-export.zip','w',zipfile.ZIP_DEFLATED) as archive:
    archive.writestr('conversations.json',content)
    archive.writestr('chat.html','<!doctype html><title>Synthetic PromptShield sample</title><p>Generated fake data. No real conversations.</p>')
(root/'apps/web/public/sample/fake-export.zip').write_bytes((output/'fake-export.zip').read_bytes())
(output/'manifest.json').write_text(json.dumps({'synthetic':True,'asOf':args.as_of,'seed':42,'conversationCount':220,'expectedCounts':{'PERSON':40,'EMAIL':23,'ADDRESS':14,'PHONE':9,'HEALTH':6,'FINANCE':4,'BANK':4,'API_KEY':2,'DATE_OF_BIRTH':2,'CREDIT_CARD':1},'persona':{'name':'Alex Rivera','email':'alex.rivera@example.com','phone':'202-555-0147','address':'742 Evergreen Terrace, Springfield, IL 62704','employer':'Example Labs','dateOfBirth':'1994-06-15','family':['Jamie Rivera','Morgan Rivera']}},indent=2))
print(f'Generated {len(conversations)} synthetic conversations → {output}')
