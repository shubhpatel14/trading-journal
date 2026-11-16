import json, re
with open('mt5-sync/firebase-key.json') as f:
    orig = json.load(f)['private_key']
orig_clean = orig.replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '').replace('\n', '').replace(' ', '').replace('\r', '')

with open('android-app/app/src/main/java/com/tradeforge/journal/MainActivity.kt') as f:
    c = f.read()

match = re.search(r'val privateKeyPem = """(.*?)"""', c, re.DOTALL)
kt_key = match.group(1).replace('\n', '').replace(' ', '').replace('\r', '')

print('Original length:', len(orig_clean))
print('Kotlin length:  ', len(kt_key))
print('Match:', orig_clean == kt_key)
if orig_clean != kt_key:
    for i, (a, b) in enumerate(zip(orig_clean, kt_key)):
        if a != b:
            print(f'Mismatch at index {i}: orig={a} kt={b}')
            print('Orig slice:', orig_clean[i-10:i+10])
            print('Kt slice:  ', kt_key[i-10:i+10])
            break

