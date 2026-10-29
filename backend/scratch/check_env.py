import urllib.parse

# Let's test if postgres is reachable or if the project uses sqlite
import os
print("Testing dotenv parsing of backend/.env:")
with open("backend/.env", "r", encoding="utf-8") as f:
    for line in f:
        print(" ", repr(line.strip()))
