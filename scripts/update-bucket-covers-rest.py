import os, json, urllib.request, urllib.error

env_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
with open(env_path, 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        eq = line.find('=')
        if eq == -1:
            continue
        k, v = line[:eq], line[eq+1:]
        if v.startswith('"') and v.endswith('"'):
            v = v[1:-1]
        if v.startswith("'") and v.endswith("'"):
            v = v[1:-1]
        os.environ.setdefault(k, v)

endpoint = os.environ['NEXT_PUBLIC_APPWRITE_ENDPOINT'].rstrip('/')
project = os.environ['NEXT_PUBLIC_APPWRITE_PROJECT_ID']
key = os.environ['APPWRITE_API_KEY']

body = json.dumps({
    'name': 'Covers',
    'maximumFileSize': 20 * 1024 * 1024,
    'allowedFileExtensions': ['jpg', 'jpeg', 'png', 'webp'],
    'enabled': True,
    'encryption': False,
    'antivirus': False,
}).encode()

req = urllib.request.Request(
    f'{endpoint}/storage/buckets/covers',
    data=body,
    method='PUT',
    headers={
        'X-Appwrite-Project': project,
        'X-Appwrite-Key': key,
        'Content-Type': 'application/json',
    }
)

try:
    resp = urllib.request.urlopen(req)
    print(resp.read().decode())
except urllib.error.HTTPError as e:
    print('HTTP ERROR', e.code, e.read().decode())
