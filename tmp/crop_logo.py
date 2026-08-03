from PIL import Image, ImageDraw
import sys

def crop_to_circle(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    w, h = img.size
    
    # The logo is a square png. Let's assume the circle is centered.
    # We will find the bounding box of the circle to crop the frame.
    # Usually the circle is slightly inset. We can crop 5-10% off the edges?
    # Actually, we can just create a circular mask of the exact size we want.
    # But we want to REMOVE the brown frame that's outside the circle.
    
    # We can crop the square to just inside the outer brown frame.
    box_crop = 20 # guess
    cropped = img.crop((box_crop, box_crop, w - box_crop, h - box_crop))
    
    # If the user says it's losing definition, maybe we just need to let the image be 100% size
    # and just apply a circular mask.
    
    # Let's save a test uncropped but masked circle image.
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((10, 10, w-10, h-10), fill=255) # Tweak these bounds
    result = img.copy()
    result.putalpha(mask)
    
    result.save(output_path, "PNG")

if __name__ == "__main__":
    crop_to_circle(sys.argv[1], sys.argv[2])
