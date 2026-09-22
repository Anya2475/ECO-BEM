import os
import urllib.request

base_url = "https://eco-bem.vercel.app"
target_dir = r"C:\Users\chatt\Desktop\ECO-BEM\Vercel_Version"

if not os.path.exists(target_dir):
    os.makedirs(target_dir)

files = [
    "/",  # index.html
    "/style.CSS",
    "/app.js",
    "/database.js",
    "/eco-mvs.js",
    "/logo.png"
]

for file in files:
    try:
        url = base_url + file
        print(f"Downloading {url}...")
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            content = response.read()
            
        filename = "index.html" if file == "/" else file.lstrip("/")
        filepath = os.path.join(target_dir, filename)
        
        with open(filepath, "wb") as f:
            f.write(content)
        print(f"Saved to {filepath}")
    except Exception as e:
        print(f"Failed to download {file}: {e}")
