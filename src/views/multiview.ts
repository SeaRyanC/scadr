import { createCanvas, Canvas, CanvasRenderingContext2D } from 'canvas';
import { STLModel } from '../stl';
import { 
    Vector3, 
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
    // Use smaller resolution for performance
    const viewWidth = 400;
    const viewHeight = 300;
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
    const scale = maxDimension / Math.min(viewWidth, viewHeight) * 1.2; // Add some padding
    
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
        // 3/4 perspective view (upper-right)
        { 
            name: "perspective",
            position: { 
                x: center.x + maxDimension * 1.5, 
                y: center.y + maxDimension * 1.5, 
                z: center.z + maxDimension * 1.5 
            },
            target: center,
            up: { x: 0, y: 0, z: 1 },
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
    
    // Sample at lower resolution for speed
    const step = 2; // Sample every 2nd pixel for speed
    const totalPixels = Math.ceil(width / step) * Math.ceil(height / step);
    let processedPixels = 0;
    
    for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
            const ray = getRayForPixel(camera, x, y, width, height);
            
            // Cast ray and get color
            const hit = castRay(ray, scene);
            let color: Vector3;
            
            if (hit) {
                // Simple shading without expensive edge detection
                color = calculateLighting(hit, scene, ray.direction);
            } else {
                // Background with subtle grid
                color = getBackgroundColor(x, y, width, height, scene.backgroundColor);
            }
            
            // Fill a 2x2 block for the sampled pixel
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