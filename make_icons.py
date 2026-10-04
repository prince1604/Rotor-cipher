import zlib
import struct
from pathlib import Path

def make_png(size, out_path):
    # Dark ink background #12151a with brass 5-rotor ticks
    # Palette: ink (18, 21, 26), mute (139, 147, 162), brass (196, 163, 90)
    bg = (18, 21, 26, 255)
    mute = (139, 147, 162, 255)
    brass = (196, 163, 90, 255)

    pixels = [[bg for _ in range(size)] for _ in range(size)]

    # Draw 5 vertical bars in the middle
    # Relative heights: [0.55, 0.75, 0.90, 0.65, 0.45]
    heights = [0.55, 0.75, 0.90, 0.65, 0.45]
    n_bars = 5
    bar_w = max(1, size // 10)
    gap = max(1, size // 14)
    total_w = n_bars * bar_w + (n_bars - 1) * gap
    start_x = (size - total_w) // 2
    base_y = int(size * 0.82)
    max_h = int(size * 0.65)

    for i in range(n_bars):
        col = brass if i == 2 else mute
        bh = int(max_h * heights[i])
        bx = start_x + i * (bar_w + gap)
        for x in range(bx, bx + bar_w):
            for y in range(base_y - bh, base_y):
                if 0 <= x < size and 0 <= y < size:
                    pixels[y][x] = col

    # Raw RGBA scanlines
    raw = bytearray()
    for row in pixels:
        raw.append(0)  # filter type 0
        for r, g, b, a in row:
            raw.extend((r, g, b, a))

    compressed = zlib.compress(bytes(raw), 9)

    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        crc = zlib.crc32(tag + data) & 0xffffffff
        return c + struct.pack('>I', crc)

    png = (
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
        + chunk(b'IDAT', compressed)
        + chunk(b'IEND', b'')
    )

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(png)

root = Path(__file__).resolve().parent
for s in [16, 48, 128]:
    make_png(s, root / 'icons' / f'icon{s}.png')
print('icons written')
