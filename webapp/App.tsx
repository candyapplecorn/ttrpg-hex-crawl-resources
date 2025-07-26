import React, { useRef, useState } from 'react';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [pixelsPerMile, setPixelsPerMile] = useState<number>(22.56);
  const [hexMiles, setHexMiles] = useState<number>(6);
  const [outlineColor, setOutlineColor] = useState<string>('black');
  const [downloadUrl, setDownloadUrl] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
      setDownloadUrl('');
    }
  };

  const overlayHexGrid = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    ppm: number,
    miles: number,
    color: string
  ) => {
    const hexRadius = ppm * miles;
    const hexWidth = 2 * hexRadius;
    const hexHeight = Math.sqrt(3) * hexRadius;
    const hSpacing = 0.75 * hexWidth;
    const vSpacing = hexHeight;

    let y = 0;
    let row = 0;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    while (y < height + vSpacing) {
      const xOffset = row % 2 === 1 ? hexWidth / 2 : 0;
      let x = xOffset;
      while (x < width + hSpacing) {
        // draw a hexagon centered at (x, y)
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (30 + i * 60) * (Math.PI / 180);
          const px = x + hexRadius * Math.cos(angle);
          const py = y + hexRadius * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        x += hSpacing;
      }
      y += vSpacing;
      row += 1;
    }
  };

  const handleGenerate = () => {
    if (!imageFile || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      // draw base image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      // overlay hex grid
      overlayHexGrid(ctx, img.width, img.height, pixelsPerMile, hexMiles, outlineColor);
      // update download link
      const url = canvas.toDataURL('image/png');
      setDownloadUrl(url);
    };
    img.src = URL.createObjectURL(imageFile);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Create Hex Overlay</h1>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      <div style={{ marginTop: 10 }}>
        <label>
          Pixels per mile:{' '}
          <input
            type="number"
            value={pixelsPerMile}
            onChange={e => setPixelsPerMile(parseFloat(e.target.value))}
          />
        </label>
      </div>
      <div style={{ marginTop: 10 }}>
        <label>
          Hex radius (miles):{' '}
          <input
            type="number"
            value={hexMiles}
            onChange={e => setHexMiles(parseFloat(e.target.value))}
          />
        </label>
      </div>
      <div style={{ marginTop: 10 }}>
        <label>
          Outline color:{' '}
          <input
            type="text"
            value={outlineColor}
            onChange={e => setOutlineColor(e.target.value)}
          />
        </label>
      </div>
      <button style={{ marginTop: 20 }} onClick={handleGenerate}>
        Generate Overlay
      </button>

      <div style={{ marginTop: 20 }}>
        <canvas ref={canvasRef} style={{ maxWidth: '100%' }} />
      </div>

      {downloadUrl && (
        <div style={{ marginTop: 20 }}>
          <a href={downloadUrl} download="hexed-image.png">
            Download Image
          </a>
        </div>
      )}
    </div>
  );
}

export default App;
