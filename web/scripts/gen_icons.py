import struct
import zlib
import os

BG = (31, 41, 55)      # #1f2937 (fondo oscuro, mismo theme-color de la app)
FG = (217, 119, 6)     # #d97706 (acento tipo cafe/ambar)

def make_png(path, size):
    cx = cy = size / 2
    r_outer = size * 0.36
    rows = []
    for y in range(size):
        row = bytearray()
        for x in range(size):
            dx = x - cx + 0.5
            dy = y - cy + 0.5
            dist = (dx * dx + dy * dy) ** 0.5
            if dist <= r_outer:
                r, g, b = FG
            else:
                r, g, b = BG
            row += bytes((r, g, b, 255))
        rows.append(bytes([0]) + bytes(row))
    raw = b"".join(rows)

    def chunk(tag, data):
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    idat = zlib.compress(raw, 9)

    with open(path, "wb") as f:
        f.write(sig)
        f.write(chunk(b"IHDR", ihdr))
        f.write(chunk(b"IDAT", idat))
        f.write(chunk(b"IEND", b""))

if __name__ == "__main__":
    out_dir = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
    os.makedirs(out_dir, exist_ok=True)
    for size in (192, 512):
        make_png(os.path.join(out_dir, f"icon-{size}.png"), size)
    print("Iconos generados en", out_dir)
