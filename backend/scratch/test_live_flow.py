import urllib.request
import json
import io
import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE = 'http://127.0.0.1:8000/api/v1'

def run():
    print("Testing live backend reporting workflow...")
    # 1. Create project
    req = urllib.request.Request(
        f'{BASE}/projects/',
        data=json.dumps({'name': 'Enterprise Audit', 'description': 'Main workspace'}).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    resp = urllib.request.urlopen(req)
    proj = json.loads(resp.read().decode())['data']
    pid = proj['id']
    print(f"1. Project created: {proj['name']} ({pid})")

    # 2. Upload dataset
    csv_data = "Transaction_ID,Region,Product,Sales,Units,Rating\nTX001,North,Widget A,150.5,3,4.5\nTX002,South,Widget B,240.0,5,4.8\nTX003,East,Widget A,95.0,2,3.9\nTX004,West,Widget C,310.2,6,4.9\nTX005,North,Widget B,180.0,4,4.2\nTX006,South,Widget A,120.0,2,4.0\nTX007,East,Widget C,450.0,8,5.0\nTX008,West,Widget B,210.5,4,4.3\n"
    boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
    body_lines = [
        f'--{boundary}',
        'Content-Disposition: form-data; name="project_id"',
        '',
        f'{pid}',
        f'--{boundary}',
        'Content-Disposition: form-data; name="file"; filename="quarterly_sales.csv"',
        'Content-Type: text/csv',
        '',
        csv_data,
        f'--{boundary}--',
        ''
    ]
    body = '\r\n'.join(body_lines).encode('utf-8')

    req = urllib.request.Request(
        f'{BASE}/datasets/upload',
        data=body,
        headers={'Content-Type': f'multipart/form-data; boundary={boundary}'},
        method='POST'
    )
    resp = urllib.request.urlopen(req)
    ds = json.loads(resp.read().decode())['data']
    ds_id = ds['id']
    print(f"2. Dataset uploaded: {ds['original_filename']} ({ds_id})")

    # 3. Generate PDF Report
    req = urllib.request.Request(
        f'{BASE}/reports/{ds_id}/generate_pdf',
        data=json.dumps({}).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    resp = urllib.request.urlopen(req)
    gen_data = json.loads(resp.read().decode())
    print(f"3. PDF Generated: {gen_data['data']['title']}")

    # 4. Download PDF Report
    req = urllib.request.Request(f'{BASE}/reports/{ds_id}/download_pdf')
    resp = urllib.request.urlopen(req)
    disp = resp.headers.get('Content-Disposition')
    pdf_bytes = resp.read()
    print(f"4. PDF Downloaded: {len(pdf_bytes):,} bytes | Header: {disp}")
    assert pdf_bytes.startswith(b'%PDF'), "Invalid PDF format"

    # 5. History
    req = urllib.request.Request(f'{BASE}/reports/{ds_id}/history')
    resp = urllib.request.urlopen(req)
    hist = json.loads(resp.read().decode())['data']
    print(f"5. Report History retrieved: {len(hist)} item(s)")
    print(f"   History Title: {hist[0]['title']}")

    # 6. Export CSV
    req = urllib.request.Request(f'{BASE}/reports/{ds_id}/export?format=csv')
    resp = urllib.request.urlopen(req)
    csv_bytes = resp.read()
    print(f"6. CSV Export: {len(csv_bytes)} bytes | Header: {resp.headers.get('Content-Disposition')}")

    # 7. Export Excel
    req = urllib.request.Request(f'{BASE}/reports/{ds_id}/export?format=excel')
    resp = urllib.request.urlopen(req)
    xlsx_bytes = resp.read()
    print(f"7. Excel Export: {len(xlsx_bytes)} bytes | Header: {resp.headers.get('Content-Disposition')}")

    print("\n[SUCCESS] Live reporting flow completely verified on running backend!")

if __name__ == "__main__":
    run()
