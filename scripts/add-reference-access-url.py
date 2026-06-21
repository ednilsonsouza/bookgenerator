"""
Adiciona o atributo 'accessUrl' na coleção 'references' do Appwrite.
Rode: python scripts/add-reference-access-url.py
"""
import os, json, time, urllib.request, urllib.error

env_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
with open(env_path, 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith('#'): continue
        eq = line.find('=')
        if eq == -1: continue
        k, v = line[:eq], line[eq+1:]
        if v.startswith('"') and v.endswith('"'): v = v[1:-1]
        if v.startswith("'") and v.endswith("'"): v = v[1:-1]
        os.environ.setdefault(k, v)

endpoint  = os.environ['NEXT_PUBLIC_APPWRITE_ENDPOINT'].rstrip('/')
project   = os.environ['NEXT_PUBLIC_APPWRITE_PROJECT_ID']
key       = os.environ['APPWRITE_API_KEY']
db_id     = os.environ.get('APPWRITE_DATABASE_ID', 'bookgenerator')
coll_id   = 'references'

headers = {
    'X-Appwrite-Project': project,
    'X-Appwrite-Key':     key,
    'Content-Type':       'application/json',
}

def api(path, method='GET', body=None):
    url = f'{endpoint}{path}'
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        print(f'HTTP {e.code}: {err}')
        return None

# 1. Verifica se o atributo já existe
attrs = api(f'/databases/{db_id}/collections/{coll_id}/attributes')
if attrs:
    existing = [a.get('key') for a in attrs.get('attributes', [])]
    if 'accessUrl' in existing:
        print('accessUrl já existe na coleção references.')
    else:
        print('Criando atributo accessUrl...')
        result = api(
            f'/databases/{db_id}/collections/{coll_id}/attributes/string',
            method='POST',
            body={'key': 'accessUrl', 'size': 1024, 'required': False, 'default': None},
        )
        if result:
            print(f'Atributo criado: {result}')
            print('Aguardando propagação...')
            time.sleep(2)
        else:
            print('Erro ao criar atributo.')
else:
    print('Erro ao listar atributos.')
