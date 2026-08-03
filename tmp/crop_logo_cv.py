import cv2
import numpy as np
import sys

def crop_logo(input_path, output_path):
    # Load image, preserving alpha if any
    img = cv2.imread(input_path, cv2.IMREAD_UNCHANGED)
    
    # If no alpha, add one
    if img.shape[2] == 3:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
        
    # Create mask based on the white/beige background inside the circle
    # But wait, the easiest way to find the enclosing circle inside the brown frame
    # is to find the largest contour or simply the largest circular shape.
    gray = cv2.cvtColor(img, cv2.COLOR_BGRA2GRAY)
    
    # blur
    blur = cv2.GaussianBlur(gray, (5,5), 0)
    
    # circles
    circles = cv2.HoughCircles(blur, cv2.HOUGH_GRADIENT, dp=1.2, minDist=100,
                               param1=50, param2=30, minRadius=int(img.shape[0]*0.3), maxRadius=int(img.shape[0]*0.48))
                               
    if circles is not None:
        circles = np.uint16(np.around(circles))
        c = circles[0, 0]
        x, y, r = c[0], c[1], c[2]
        
        # Create a blank mask
        mask = np.zeros(img.shape[:2], dtype="uint8")
        # Draw the circle on the mask, maybe shrink radius a little bit to avoid frame
        cv2.circle(mask, (x, y), int(r * 0.98), 255, -1)
        
        # apply mask
        img[:,:,3] = mask
        
        # crop to the bounding box of the circle
        cropped = img[y-r:y+r, x-r:x+r]
        
        cv2.imwrite(output_path, cropped)
        print("Success: Cropped precisely to circle")
    else:
        print("Error: Could not detect circle automatically. Doing naive center crop.")
        # Fallback naive crop
        h, w = img.shape[:2]
        r = int(min(h, w) * 0.45)
        cx, cy = w//2, h//2
        mask = np.zeros(img.shape[:2], dtype="uint8")
        cv2.circle(mask, (cx, cy), r, 255, -1)
        img[:,:,3] = mask
        cropped = img[cy-r:cy+r, cx-r:cx+r]
        cv2.imwrite(output_path, cropped)

if __name__ == "__main__":
    crop_logo(sys.argv[1], sys.argv[2])
