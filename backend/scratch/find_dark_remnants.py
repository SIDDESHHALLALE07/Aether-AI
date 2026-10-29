import os, sys, re

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

frontend_src = r"c:\Users\SIDDESH\OneDrive\เอกสาร\Aether-Copilot-AI\frontend\src"

dark_patterns = [
    re.compile(r'dark:', re.IGNORECASE),
    re.compile(r'\[#151922\]', re.IGNORECASE),
    re.compile(r'\[#0d1117\]', re.IGNORECASE),
    re.compile(r'\[#0b0e14\]', re.IGNORECASE),
    re.compile(r'\[#1e2330\]', re.IGNORECASE),
    re.compile(r'\[#10141d\]', re.IGNORECASE),
    re.compile(r'\[#181d27\]', re.IGNORECASE),
    re.compile(r'\[#0f172a\]', re.IGNORECASE),
    re.compile(r'\[#1a1f2c\]', re.IGNORECASE),
    re.compile(r'\w+\[#', re.IGNORECASE), # e.g. bg-slate-50[#151922]
    re.compile(r'border-slate-100\[', re.IGNORECASE),
]

findings = {}
for root, dirs, files in os.walk(frontend_src):
    for f in files:
        if f.endswith(('.tsx', '.ts', '.css')):
            path = os.path.join(root, f)
            rel_path = os.path.relpath(path, frontend_src)
            with open(path, 'r', encoding='utf-8', errors='ignore') as file:
                lines = file.readlines()
            file_matches = []
            for i, line in enumerate(lines, 1):
                for p in dark_patterns:
                    if p.search(line):
                        file_matches.append((i, line.strip()))
                        break
            if file_matches:
                findings[rel_path] = file_matches

print(f"Files with dark remnants or malformed classes: {len(findings)}")
for file, matches in findings.items():
    print(f"\n--- {file} ({len(matches)} matches) ---")
    for line_no, content in matches[:5]:
        print(f"  L{line_no}: {content[:100]}")
    if len(matches) > 5:
        print(f"  ... and {len(matches) - 5} more")
