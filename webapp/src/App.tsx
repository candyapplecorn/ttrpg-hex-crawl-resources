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

  function overlayHexGrid(
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      ppm: number,
      miles: number,
      color: string
  ) {
    const hexRadius = ppm * miles;
    const hexWidth  = 2 * hexRadius;
    const hexHeight = Math.sqrt(3) * hexRadius;
    const hSpacing  = 0.75 * hexWidth;
    const vSpacing  = hexHeight;

    let row = -1;
    let y   = -vSpacing / 2;
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1;

    // outer loop = each row
    while (y < height + vSpacing) {
      row += 1;

      // row-level vertical shift
      const yOffset = (row % 2 === 0) ? 0 : vSpacing / 2;

      let halfHeightOffsetCounter = 0;
      let x = 0;

      // inner loop = each column
      while (x < width + hSpacing) {
        halfHeightOffsetCounter += 1;

        // draw one hexagon
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          // flat‑top: start at angle=0° (pointing right) and go CCW 60° steps
          const theta = (i * 60) * (Math.PI / 180);

          let px = x + hexRadius * Math.cos(theta);
          let py = y + yOffset + hexRadius * Math.sin(theta);

          // per‑hex vertical shift
          if (halfHeightOffsetCounter % 2 === 0) {
            py += hexHeight / 2;
          }

          if (i === 0) ctx.moveTo(px, py);
          else          ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();

        x += hSpacing;
      }

      y += vSpacing / 2;
    }
  }


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
