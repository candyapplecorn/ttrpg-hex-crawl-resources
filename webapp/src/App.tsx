import React, {useEffect, useRef, useState} from 'react';
import {FaDrawPolygon, FaMousePointer, FaTrash} from 'react-icons/fa';

// Tool modes
enum Tool {
    Select = 'select',
    Draw = 'draw',
    Delete = 'delete',
}

const PADDING = 100; // pixels of canvas padding around image

interface Point { x: number; y: number }

function overlayHexGrid(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    ppm: number,
    miles: number,
    color: string
) {
    const hexDiameter = ppm * miles;
    const hexRadius = hexDiameter / 2;
    const hexWidth = 2 * hexRadius;
    const hexHeight = Math.sqrt(3) * hexRadius;
    const hSpacing = 0.75 * hexWidth;
    const vSpacing = hexHeight;

    let row = -1;
    let y = -vSpacing / 2;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    // outer loop = each row
    while (y < height + vSpacing) {
        row += 1;

        // row-level vertical shift
        const yOffset = (row % 2 === 0) ? 0 : vSpacing / 2;

        let halfHeightOffsetCounter = 0;
        let x = 0;

        // inner loop = each column
        while (x < width + hSpacing * 2) {
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
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();

            x += hSpacing;
        }

        y += vSpacing / 2;
    }
}

function App() {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [tool, setTool] = useState<Tool>(Tool.Draw);
    const mapCanvasRef = useRef<HTMLCanvasElement>(null);
    const polyCanvasRef = useRef<HTMLCanvasElement>(null);
    const [pixelsPerMile, setPixelsPerMile] = useState<number>(22.56);
    const [hexMiles, setHexMiles] = useState<number>(6);
    const [outlineColor, setOutlineColor] = useState<string>('black');
    const [downloadUrl, setDownloadUrl] = useState<string>('');
    const [vertices, setVertices] = useState<Point[]>([]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setImageFile(e.target.files[0]);
        setDownloadUrl('');
    };

    function handleGenerate() {
        if (!imageFile || !mapCanvasRef.current || !polyCanvasRef.current) return;
        const mapCanvas = mapCanvasRef.current;
        const polyCanvas = polyCanvasRef.current;
        const ctx = mapCanvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.onload = () => {
            mapCanvas.width = img.width + PADDING * 2;
            mapCanvas.height = img.height + PADDING * 2;
            polyCanvas.width = mapCanvas.width;
            polyCanvas.height = mapCanvas.height;
            ctx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
            ctx.drawImage(img, PADDING, PADDING);
            // overlay hex grid
            overlayHexGrid(ctx, img.width, img.height, pixelsPerMile, hexMiles, outlineColor);
            // drawPolygon(ctx);
            // update download link
            const url = mapCanvas.toDataURL('image/png');
            setDownloadUrl(url);
        };
        img.src = URL.createObjectURL(imageFile);
    };

    // Draw the uploaded image on canvas with padding
    React.useEffect(handleGenerate, [imageFile]);

    // Draw vertices and polygon on polygon canvas when vertices change
    function drawPolygons() {
        if (!polyCanvasRef.current) return;
        const canvas = polyCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        drawPolygon(ctx);
    }

    useEffect(drawPolygons, [vertices]);

    // Draw filled polygon when 3+ vertices
    const drawPolygon = (ctx: CanvasRenderingContext2D) => {
        if (vertices.length < 1) return;

        // draw marker for each vertex
        ctx.fillStyle = 'red';
        vertices.forEach(({ x, y }) => {
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        });

        if (vertices.length >= 3) {
            ctx.fillStyle = 'rgba(255,0,0,0.3)';
            ctx.beginPath();
            vertices.forEach((pt, i) => {
                if (i === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
            });
            ctx.closePath();
            ctx.fill();
        }
    };

    // Handle canvas clicks for Draw tool with proper scaling
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (tool !== Tool.Draw || !mapCanvasRef.current) return;
        const canvas = mapCanvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        setVertices(prev => [...prev, { x, y }]);
    };

    return (
        <div style={{padding: 20, fontFamily: 'sans-serif'}}>
            <h1>Create Hex Overlay</h1>
            <input type="file" accept="image/*" onChange={handleFileChange}/>
            <div style={{marginTop: 10}}>
                <label>
                    Pixels per mile:{' '}
                    <input
                        type="number"
                        value={pixelsPerMile}
                        onChange={e => setPixelsPerMile(parseFloat(e.target.value))}
                    />
                </label>
            </div>
            <div style={{marginTop: 10}}>
                <label>
                    Hex radius (miles):{' '}
                    <input
                        type="number"
                        value={hexMiles}
                        onChange={e => setHexMiles(parseFloat(e.target.value))}
                    />
                </label>
            </div>
            <div style={{marginTop: 10}}>
                <label>
                    Outline color:{' '}
                    <input
                        type="text"
                        value={outlineColor}
                        onChange={e => setOutlineColor(e.target.value)}
                    />
                </label>
            </div>
            <button style={{marginTop: 20}} onClick={handleGenerate}>
                Generate Overlay
            </button>

            {/* Toolbar */}
            <div style={{display: 'flex', alignItems: 'center', marginBottom: 10}}>
                <button
                    title="Select mode"
                    onClick={() => setTool(Tool.Select)}
                    style={{
                        background: tool === Tool.Select ? '#ddd' : 'transparent',
                        border: 'none',
                        padding: '8px',
                        cursor: 'pointer',
                    }}
                >
                    <FaMousePointer/>
                </button>
                <button
                    title="Draw mode"
                    onClick={() => setTool(Tool.Draw)}
                    style={{
                        background: tool === Tool.Draw ? '#ddd' : 'transparent',
                        border: 'none',
                        padding: '8px',
                        cursor: 'pointer',
                    }}
                >
                    <FaDrawPolygon/>
                </button>
                <button
                    title="Delete mode"
                    onClick={() => setTool(Tool.Delete)}
                    style={{
                        background: tool === Tool.Delete ? '#ddd' : 'transparent',
                        border: 'none',
                        padding: '8px',
                        cursor: 'pointer',
                    }}
                >
                    <FaTrash/>
                </button>
            </div>

            {/* Canvas Container */}
            {imageFile ? (
                <div style={{ position: 'relative', display: 'inline-block', border: '1px solid #ccc', maxWidth: "100%" }}>
                    <canvas ref={mapCanvasRef} style={{ display: 'block', maxWidth: "100%" }} />
                    <canvas
                        ref={polyCanvasRef}
                        onClick={handleCanvasClick}
                        style={{ position: 'absolute', top: 0, left: 0, cursor: tool === Tool.Draw ? 'crosshair' : 'default', maxWidth: "100%" }}
                    />
                </div>
            ) : (
                <div style={{ width: 400, height: 300, border: '2px dashed #aaa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div>
                        <p>Upload an image to get started:</p>
                        <input type="file" accept="image/*" onChange={handleFileChange}/>
                    </div>
                </div>
            )}

            {downloadUrl && (
                <div style={{marginTop: 20}}>
                    <a href={downloadUrl} download="hexed-image.png">
                        Download Image
                    </a>
                </div>
            )}
        </div>
    );
}

export default App;
