import json
import os
import urllib.request
import re

DATA_DIR = r"C:\WEBs\Diamante\DatosIniciales"
IMGS_DIR = os.path.join(DATA_DIR, "Imagenes")
TEXTS_DIR = os.path.join(DATA_DIR, "Textos")
MAPPING_FILE = os.path.join(DATA_DIR, "mapeo_recursos.json")

def sanitize_filename(name):
    return re.sub(r'[\\/*?:"<>|]', "", name).replace(" ", "_").lower()

def download_image(url, filename):
    if not url.startswith("http"):
        url = "https:" + url
    try:
        path = os.path.join(IMGS_DIR, filename)
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as response, open(path, 'wb') as out_file:
            out_file.write(response.read())
        return path
    except Exception as e:
        print(f"Error downloading {url}: {e}")
    return None

def save_text(content, filename):
    path = os.path.join(TEXTS_DIR, filename)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    return path

def process_product(product):
    title = product.get("title", "unknown")
    safe_title = sanitize_filename(title)
    
    # Download main image
    img_url = product.get("main_image")
    img_path = None
    if img_url:
        img_ext = "jpg" # default
        if "png" in img_url.lower(): img_ext = "png"
        img_path = download_image(img_url, f"{safe_title}.{img_ext}")
    
    # Save description as associated text
    desc = product.get("description", "")
    price = product.get("price", "")
    full_text = f"Title: {title}\nPrice: {price}\nDescription: {desc}"
    txt_path = save_text(full_text, f"{safe_title}.txt")
    
    return {
        "url_origen": product.get("url"),
        "ruta_imagen": img_path,
        "textos_asociados": [title, price, desc],
        "tipo": "asociado"
    }

def main(products_data):
    if os.path.exists(MAPPING_FILE):
        with open(MAPPING_FILE, 'r', encoding='utf-8') as f:
            try:
                mapping = json.load(f)
            except:
                mapping = []
    else:
        mapping = []

    for prod in products_data:
        entry = process_product(prod)
        mapping.append(entry)
    
    with open(MAPPING_FILE, 'w', encoding='utf-8') as f:
        json.dump(mapping, f, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    import sys
    data_file = r"C:\WEBs\Diamante\data_to_process.json"
    if os.path.exists(data_file):
        with open(data_file, 'r', encoding='utf-8') as f:
            products = json.load(f)
            main(products)
            print(f"Processed {len(products)} products.")
    else:
        print("No data to process.")
