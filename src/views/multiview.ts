import { createCanvas, Canvas, CanvasRenderingContext2D } from 'canvas';
import { STLModel } from '../stl';
import { 
    Vector3, 
    Ray,
    OrthographicCamera, 
    createOrthographicCamera, 
    getRayForPixel 
} from './orthographicCamera';
import { Scene, createScene, castRay, calculateLighting } from './raytracer';
import { detectOutline } from './outlineView';

export interface MultiviewOptions {
    width: number;
    height: number;
    outputPath: string;
}

/**
 * Generate multiview orthographic projection images
 */
export async function generateMultiview(
    models: STLModel[], 
    options: MultiviewOptions
): Promise<void> {
    // Final high resolution as requested (4x increase: 400x300 → 1600x1200)
    const viewWidth = 1600;
    const viewHeight = 1200;
    const totalWidth = viewWidth * 2;
    const totalHeight = viewHeight * 2;
    
    console.log(`Generating ${totalWidth}x${totalHeight} multiview image...`);
    
    // Create main canvas for 2x2 layout
    const canvas = createCanvas(totalWidth, totalHeight);
    const ctx = canvas.getContext('2d');
    
    // Combine all triangles from all models
    const allTriangles = models.flatMap(model => model.triangles);
    console.log(`Processing ${allTriangles.length} triangles...`);
    
    const scene = createScene(allTriangles);
    
    // Calculate model bounds for camera positioning
    const bounds = calculateBounds(allTriangles);
    const center = {
        x: (bounds.min.x + bounds.max.x) / 2,
        y: (bounds.min.y + bounds.max.y) / 2,
        z: (bounds.min.z + bounds.max.z) / 2
    };
    
    const maxDimension = Math.max(
        bounds.max.x - bounds.min.x,
        bounds.max.y - bounds.min.y,
        bounds.max.z - bounds.min.z
    );
    const scale = maxDimension / Math.min(viewWidth, viewHeight) * 2.0; // Increased padding to prevent clipping
    
    console.log(`Model bounds: min(${bounds.min.x.toFixed(2)}, ${bounds.min.y.toFixed(2)}, ${bounds.min.z.toFixed(2)}) max(${bounds.max.x.toFixed(2)}, ${bounds.max.y.toFixed(2)}, ${bounds.max.z.toFixed(2)})`);
    console.log(`Center: (${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)}), Scale: ${scale.toFixed(2)}`);
    
    // Render each view
    const views = [
        // Top view (upper-left)
        { 
            name: "top",
            position: { x: center.x, y: center.y, z: center.z + maxDimension * 2 },
            target: center,
            up: { x: 0, y: 1, z: 0 },
            canvasX: 0, 
            canvasY: 0 
        },
        // 3/4 perspective view from the top (upper-right)
        { 
            name: "perspective",
            position: { 
                x: center.x + maxDimension * 1.5, 
                y: center.y + maxDimension * 1.5, 
                z: center.z + maxDimension * 2.0  // Higher up to look "from the top"
            },
            target: center,
            up: { x: 0, y: 1, z: 0 },  // Change up vector for top-down view
            canvasX: viewWidth, 
            canvasY: 0 
        },
        // Side view (lower-left)
        { 
            name: "side",
            position: { x: center.x - maxDimension * 2, y: center.y, z: center.z },
            target: center,
            up: { x: 0, y: 0, z: 1 },
            canvasX: 0, 
            canvasY: viewHeight 
        },
        // Front view (lower-right)
        { 
            name: "front",
            position: { x: center.x, y: center.y - maxDimension * 2, z: center.z },
            target: center,
            up: { x: 0, y: 0, z: 1 },
            canvasX: viewWidth, 
            canvasY: viewHeight 
        }
    ];
    
    // Render each view
    for (let i = 0; i < views.length; i++) {
        const view = views[i];
        console.log(`Rendering ${view.name} view (${i + 1}/${views.length})...`);
        
        const camera = createOrthographicCamera(
            view.position,
            view.target,
            view.up,
            viewWidth,
            viewHeight,
            scale
        );
        
        await renderView(
            ctx, 
            scene, 
            camera, 
            viewWidth, 
            viewHeight, 
            view.canvasX, 
            view.canvasY
        );
    }
    
    // Add thick borders around different views for clarity
    drawViewBorders(ctx, viewWidth, viewHeight);
    
    // Save the image
    const fs = require('node:fs/promises');
    const buffer = canvas.toBuffer('image/png');
    await fs.writeFile(options.outputPath, buffer);
    
    console.log(`Multiview image saved: ${options.outputPath}`);
}

async function renderView(
    ctx: CanvasRenderingContext2D,
    scene: Scene,
    camera: OrthographicCamera,
    width: number,
    height: number,
    offsetX: number,
    offsetY: number
): Promise<void> {
    // Create image data for the view
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    const startTime = Date.now();
    console.log(`  Starting ${width}x${height} render...`);
    
    // Sample at optimized resolution for performance vs quality balance
    const step = 2; // Sample every 2nd pixel for speed, but still enable outlines
    const totalPixels = Math.ceil(width / step) * Math.ceil(height / step);
    let processedPixels = 0;
    
    for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
            const ray = getRayForPixel(camera, x, y, width, height);
            
            // Cast ray and get color
            const hit = castRay(ray, scene);
            let color: Vector3;
            
            if (hit) {
                // Check for outline/edge
                const outline = detectOutline(
                    ray, 
                    scene, 
                    x, 
                    y, 
                    width, 
                    height, 
                    (px, py) => getRayForPixel(camera, px, py, width, height)
                );
                
                if (outline.isOutline) {
                    // Thick black outline
                    color = { x: 0, y: 0, z: 0 };
                } else {
                    color = calculateLighting(hit, scene, ray.direction);
                }
            } else {
                // Background with world-space aligned grid
                color = getBackgroundColorWorldSpace(ray, scene.backgroundColor);
            }
            
            // Fill a 2x2 block for the sampled pixel to maintain quality
            for (let dy = 0; dy < step && y + dy < height; dy++) {
                for (let dx = 0; dx < step && x + dx < width; dx++) {
                    const pixelIndex = ((y + dy) * width + (x + dx)) * 4;
                    data[pixelIndex] = Math.round(color.x * 255);     // R
                    data[pixelIndex + 1] = Math.round(color.y * 255); // G
                    data[pixelIndex + 2] = Math.round(color.z * 255); // B
                    data[pixelIndex + 3] = 255;                       // A
                }
            }
            
            processedPixels++;
            
            // Progress indicator every 10%
            if (processedPixels % Math.max(1, Math.floor(totalPixels / 10)) === 0) {
                const progress = Math.round(processedPixels / totalPixels * 100);
                console.log(`  Progress: ${progress}%`);
            }
        }
    }
    
    const elapsed = Date.now() - startTime;
    console.log(`  Completed in ${elapsed}ms`);
    
    // Put the image data onto the canvas at the correct offset
    ctx.putImageData(imageData, offsetX, offsetY);
}

function calculateBounds(triangles: any[]): { min: Vector3; max: Vector3 } {
    if (triangles.length === 0) {
        return {
            min: { x: -1, y: -1, z: -1 },
            max: { x: 1, y: 1, z: 1 }
        };
    }
    
    let min = { x: Infinity, y: Infinity, z: Infinity };
    let max = { x: -Infinity, y: -Infinity, z: -Infinity };
    
    for (const triangle of triangles) {
        for (const vertex of triangle.vertices) {
            const [x, y, z] = vertex;
            
            min.x = Math.min(min.x, x);
            min.y = Math.min(min.y, y);
            min.z = Math.min(min.z, z);
            
            max.x = Math.max(max.x, x);
            max.y = Math.max(max.y, y);
            max.z = Math.max(max.z, z);
        }
    }
    
    return { min, max };
}

function getBackgroundColor(x: number, y: number, width: number, height: number, baseColor: Vector3): Vector3 {
    // Create subtle grid pattern - simplified for performance
    const gridSize = 40; // Grid every 40 pixels (10x10 grid for 400x300)
    const lineWidth = 1;
    
    const onGridX = (x % gridSize) < lineWidth;
    const onGridY = (y % gridSize) < lineWidth;
    
    if (onGridX || onGridY) {
        // Slightly darker for grid lines
        return {
            x: baseColor.x * 0.9,
            y: baseColor.y * 0.9,
            z: baseColor.z * 0.9
        };
    }
    
    return baseColor;
}

function getBackgroundColorWorldSpace(ray: Ray, baseColor: Vector3): Vector3 {
    // Create grid aligned with world space z-plane
    const gridSize = 1.0; // Grid every 1 unit in world space
    const lineWidth = 0.05; // Line width in world units
    
    // Project ray to z=0 plane (ground plane)
    if (Math.abs(ray.direction.z) < 0.001) {
        // Ray is parallel to z-plane, no intersection
        return baseColor;
    }
    
    const t = -ray.origin.z / ray.direction.z;
    if (t < 0) {
        // Ray doesn't intersect z=0 plane in forward direction
        return baseColor;
    }
    
    const intersection = {
        x: ray.origin.x + t * ray.direction.x,
        y: ray.origin.y + t * ray.direction.y,
        z: 0
    };
    
    // Check if intersection point is on grid lines
    const x = Math.abs(intersection.x % gridSize);
    const y = Math.abs(intersection.y % gridSize);
    
    const onGridX = x < lineWidth || x > gridSize - lineWidth;
    const onGridY = y < lineWidth || y > gridSize - lineWidth;
    
    if (onGridX || onGridY) {
        // Slightly darker for grid lines
        return {
            x: baseColor.x * 0.85,
            y: baseColor.y * 0.85,
            z: baseColor.z * 0.85
        };
    }
    
    return baseColor;
}

function drawViewBorders(ctx: CanvasRenderingContext2D, viewWidth: number, viewHeight: number): void {
    const borderThickness = 8; // Thick borders for clarity
    
    ctx.fillStyle = '#000000'; // Black borders
    
    // Vertical border between left and right views
    const centerX = viewWidth;
    ctx.fillRect(centerX - borderThickness/2, 0, borderThickness, viewHeight * 2);
    
    // Horizontal border between top and bottom views  
    const centerY = viewHeight;
    ctx.fillRect(0, centerY - borderThickness/2, viewWidth * 2, borderThickness);
    
    // Outer border around entire image
    const totalWidth = viewWidth * 2;
    const totalHeight = viewHeight * 2;
    
    // Top border
    ctx.fillRect(0, 0, totalWidth, borderThickness);
    // Bottom border
    ctx.fillRect(0, totalHeight - borderThickness, totalWidth, borderThickness);
    // Left border
    ctx.fillRect(0, 0, borderThickness, totalHeight);
    // Right border
    ctx.fillRect(totalWidth - borderThickness, 0, borderThickness, totalHeight);
}