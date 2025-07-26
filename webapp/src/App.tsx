import React, {RefObject, useEffect, useRef, useState} from 'react';
import {FaCheck, FaClipboard, FaDrawPolygon, FaMousePointer, FaTrash} from 'react-icons/fa';

// Tool modes
enum Tool {
    Select = 'select',
    Draw = 'draw',
    Delete = 'delete',
}

const PADDING = 100; // pixels of canvas padding around image

interface Point { x: number; y: number }

const Poly: "Polygon" = "Polygon";
const Hex: "Hexagon" = "Hexagon";

// Clipboard paste handler: reads first image from clipboard
async function readImageFromClipboard(): Promise<File | null> {
    try {
        // @ts-ignore navigator.clipboard.read not in older TS defs
        const items = await (navigator.clipboard as any).read();
        for (const item of items) {
            for (const type of item.types) {
                if (type.startsWith('image/')) {
                    const blob: Blob = await item.getType(type);
                    return new File([blob], `clipboard.${type.split('/')[1]}`, { type });
                }
            }
        }
    } catch (err) {
        console.error('Clipboard read failed', err);
    }
    return null;
}

// point-in-polygon test (ray-casting)
function pointInPolygon(point: Point, vs: Point[]) {
    const { x, y } = point;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i].x, yi = vs[i].y;
        const xj = vs[j].x, yj = vs[j].y;

        const intersect = ((yi > y) !== (yj > y)) &&
            (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function overlayHexGrid(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    ppm: number,
    miles: number,
    color: string,
    polygonsToSkip: Point[][] = [],
    polygonsToInclude: Point[][] = []
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
            const points: Point[] = []

            // draw one hexagon
            for (let i = 0; i < 6; i++) {
                // flat‑top: start at angle=0° (pointing right) and go CCW 60° steps
                const theta = (i * 60) * (Math.PI / 180);

                let px = x + hexRadius * Math.cos(theta);
                let py = y + yOffset + hexRadius * Math.sin(theta);

                // per‑hex vertical shift
                if (halfHeightOffsetCounter % 2 === 0) {
                    py += hexHeight / 2;
                }

                points.push({ x: px, y: py });
            }

            const shouldDrawHex = points.every(pt => {
                if (polygonsToSkip.some(polygon => pointInPolygon(pt, polygon))) {
                    if (polygonsToInclude.some(polygon => pointInPolygon(pt, polygon))) {
                        return true;
                    }
                    return false;
                }
                return true;
            });

            if (shouldDrawHex) {
                ctx.beginPath();
                points.forEach((pt: Point, i: number) => {
                    if (i === 0) ctx.moveTo(pt.x, pt.y);
                    else ctx.lineTo(pt.x, pt.y);
                })
                ctx.closePath();
                ctx.stroke();
            }

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
    const selectionCanvasRef = useRef<HTMLCanvasElement>(null);
    const [pixelsPerMile, setPixelsPerMile] = useState<number>(22.56);
    const [hexMiles, setHexMiles] = useState<number>(6);
    const [outlineColor, setOutlineColor] = useState<string>('black');
    const [downloadUrl, setDownloadUrl] = useState<string>('');
    const [vertices, setVertices] = useState<Point[]>([]);
    const [polygons, setPolygons] = useState<Point[][]>([]);
    const [selectedPolygons, setSelectedPolygons] = useState<Point[][] | null>(null);

    // finalize current drawing into polygons if >=3 points
    const finalize = () => {
        if (vertices.length >= 3) {
            setPolygons(prev => [...prev, vertices]);
        }
        setVertices([]);
    }

    // toggle tool and finalize if leaving draw
    const changeTool = (newTool: Tool) => {
        if (tool === newTool) {
            if (newTool === Tool.Draw) finalize();
            setTool(null);
            clearCanvas(selectionCanvasRef);
            clearCanvas(polyCanvasRef);
        } else {
            if (tool === Tool.Draw && newTool !== Tool.Draw) finalize();
            drawPolygons(polyCanvasRef, polygons, selectedPolygons);
            drawPolygons(selectionCanvasRef, selectedPolygons || [], [], 'rgba(0, 0, 255, 0.3)'); // Draw selected polygons in blue
            setTool(newTool);
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setImageFile(e.target.files[0]);
        setDownloadUrl('');
    };

    function clearCanvas(canvasRef: RefObject<HTMLCanvasElement>) {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    }

    function handleGenerate() {
        if (!imageFile || !mapCanvasRef.current || !polyCanvasRef.current || !selectionCanvasRef.current) return;
        const mapCanvas = mapCanvasRef.current;
        const polyCanvas = polyCanvasRef.current;
        const selectionCanvas = selectionCanvasRef.current;
        const ctx = mapCanvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.onload = () => {
            mapCanvas.width = img.width + PADDING * 2;
            mapCanvas.height = img.height + PADDING * 2;
            polyCanvas.width = mapCanvas.width;
            polyCanvas.height = mapCanvas.height;
            selectionCanvas.width = mapCanvas.width;
            selectionCanvas.height = mapCanvas.height;
            ctx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
            ctx.drawImage(img, PADDING, PADDING);
            // overlay hex grid
            overlayHexGrid(ctx, img.width, img.height, pixelsPerMile, hexMiles, outlineColor, polygons, selectedPolygons ?? []);
            if (tool === Tool.Draw) drawPolygons();
            // update download link
            const url = mapCanvas.toDataURL('image/png');
            setDownloadUrl(url);
        };
        img.src = URL.createObjectURL(imageFile);
    }

    // Draw the uploaded image on canvas with padding
    React.useEffect(handleGenerate, [imageFile]);

    // Draw vertices and polygon on polygon canvas when vertices change
    function drawPolygons(canvasRef: RefObject<HTMLCanvasElement> = polyCanvasRef, listOfPolygons: Point[][] = polygons, polygonsToOmit: Point[][] | null = selectedPolygons, color: string | null = null) {
        if (!canvasRef.current || tool === null) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        [vertices, ...listOfPolygons].forEach((polygon, index, polygons) => {
            // if the polygon isn't inside the selected polygons, draw it
            if (polygonsToOmit && polygonsToOmit.includes(polygon)) return;
            const fillColor = color || (index === 0 ? 'rgba(255,0,0,0.3)' : 'rgba(255,0,0,0.15)');
            drawPolygon(ctx, polygon, fillColor); // Current one (vertices) is darker so it's easier to see while editing
        })
    }

    useEffect(() => drawPolygons(polyCanvasRef, polygons, selectedPolygons, null), [vertices, polygons, selectedPolygons, tool]);

    // Draw filled polygon when 3+ vertices
    const drawPolygon = (ctx: CanvasRenderingContext2D, polygon: Point[], color: string = 'rgba(255,0,0,0.3)') => {
        if (polygon.length < 1) return;

        // draw marker for each vertex
        ctx.fillStyle = 'red';
        polygon.forEach(({ x, y }) => {
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        });

        if (polygon.length >= 3) {
            ctx.fillStyle = color;
            ctx.beginPath();
            polygon.forEach((pt, i) => {
                if (i === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
            });
            ctx.closePath();
            ctx.fill();
        }
    };

    // Handle canvas clicks for Draw tool with proper scaling
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = mapCanvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        if (tool === Tool.Delete) {
            // remove polygon under click
            const newPolygons = polygons.filter(poly => !pointInPolygon({ x, y }, poly));
            const newSelectedPolygons = selectedPolygons ? selectedPolygons.filter(poly => !pointInPolygon({ x, y }, poly)) : null;
            setPolygons(newPolygons);
            setSelectedPolygons(newSelectedPolygons);

            drawPolygons(selectionCanvasRef, newSelectedPolygons ?? [], [], 'rgba(0, 0, 255, 0.3)'); // Draw selected polygons in blue
            drawPolygons(polyCanvasRef, newPolygons, selectedPolygons);
        }
        if (tool === Tool.Draw) {
            setVertices(prev => [...prev, { x, y }]);
        }
        if (tool === Tool.Select) {
            // See if any of the polygons are clicked.
            const clickedPolygons = polygons.filter (poly => pointInPolygon({ x, y }, poly));
            // add the polygon to the list of selected polygons
            const copyOfSelectedPolygons = selectedPolygons ? [...selectedPolygons] : [];
            clickedPolygons.forEach(poly => {
                if (!copyOfSelectedPolygons?.includes(poly)) {
                    copyOfSelectedPolygons.push(poly);
                } else {
                    // if the polygon was already selected, remove it
                    const index = copyOfSelectedPolygons.indexOf(poly);
                    if (index > -1) {
                        copyOfSelectedPolygons.splice(index, 1);
                    }
                }
            })


            setSelectedPolygons(copyOfSelectedPolygons.length > 0 ? copyOfSelectedPolygons : null);
            drawPolygons(selectionCanvasRef, copyOfSelectedPolygons, [], 'rgba(0, 0, 255, 0.3)'); // Draw selected polygons in blue
            drawPolygons(polyCanvasRef, polygons, selectedPolygons);
        }
    };

    // compute hover position for finalize button (scaled to CSS)
    const hoverPos = React.useMemo(() => {
        if (vertices.length < 3 || !polyCanvasRef.current) return null;
        const xs = vertices.map(v=>v.x), ys = vertices.map(v=>v.y);
        const minX = Math.min(...xs), minY = Math.min(...ys);
        const offset = 100;
        const rect = polyCanvasRef.current.getBoundingClientRect();
        const scale = rect.width / polyCanvasRef.current.width;
        return { left: (minX - offset) * scale, top: (minY - offset) * scale };
    }, [vertices]);

    // Paste from clipboard
    const handlePaste = async () => {
        const file = await readImageFromClipboard();
        if (file) setImageFile(file);
    };

    // Prompt user on any page-level paste
    useEffect(() => {
        const onGlobalPaste = async (e: ClipboardEvent) => {
            // check for image in clipboard data
            if (e.clipboardData && Array.from(e.clipboardData.items).some(item => item.type.startsWith('image/'))) {
                const ok = window.confirm('Load image from clipboard?');
                if (ok) await handlePaste();
            }
        };
        window.addEventListener('paste', onGlobalPaste);
        return () => window.removeEventListener('paste', onGlobalPaste);
    }, []);

    return (
        <div style={{padding: 20, fontFamily: 'sans-serif'}}>
            <h1>Overlay {Hex} Tool</h1>
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
            <div style={{ display: "flex"}}>
                <button style={{marginTop: 20}} onClick={() => { handleGenerate(); }} disabled={vertices.length > 0}>
                    Generate {Hex}s
                </button>
                {vertices.length > 0 && (
                    <button style={{marginTop: 20}} onClick={() => { finalize(); }}>
                        Finalize {Poly}
                    </button>
                )}
            </div>

            {/* Toolbar */}
            <div style={{display: 'flex', alignItems: 'center', marginBottom: 10}}>
                <button
                    title={`Invert ${Poly}`}
                    onClick={() => changeTool(Tool.Select)}
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
                    title={`Create ${Poly}`}
                    onClick={() => changeTool(Tool.Draw)}
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
                    title={`Delete ${Poly}`}
                    onClick={() => changeTool(Tool.Delete)}
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
                        style={{ position: 'absolute', top: 0, left: 0, cursor: tool === Tool.Draw ? 'crosshair' : 'default', maxWidth: "100%" }}
                    />
                    <canvas
                        ref={selectionCanvasRef}
                        onClick={handleCanvasClick}
                        style={{ position: 'absolute', top: 0, left: 0, cursor: tool === Tool.Draw ? 'crosshair' : 'default', maxWidth: "100%" }}
                    />
                    {hoverPos && tool===Tool.Draw && (
                        <div onClick={finalize} title="Complete polygon" style={{position:'absolute',left:hoverPos.left,top:hoverPos.top,background:'#000',border:'1px solid #ccc',borderRadius:4,padding:4,cursor:'pointer',zIndex:10}}>
                            <FaCheck />
                        </div>
                    )}
                </div>
            ) : (
                <div style={{ width: 400, height: 300, border: '2px dashed #aaa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div>
                        <p>Upload Image</p>
                        <input type="file" accept="image/*" onChange={handleFileChange}/>
                        <p style={{ fontStyle: "italic"}}>or</p>
                        <button onClick={handlePaste} style={{marginLeft:8}} title="Paste image from clipboard">
                            <FaClipboard /> Paste from Clipboard
                        </button>
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
