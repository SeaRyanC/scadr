import { Triangle } from '../stl';
import { Vector3, Ray, subtract, dot, normalize, length } from './orthographicCamera';
import { castRay, Scene } from './raytracer';

export interface OutlineResult {
    isOutline: boolean;
    depth: number;
}

/**
 * Detect edges using depth discontinuities and normal discontinuities
 */
export function detectOutline(
    ray: Ray,
    scene: Scene,
    pixelX: number,
    pixelY: number,
    imageWidth: number,
    imageHeight: number,
    getRayForPixel: (x: number, y: number) => Ray
): OutlineResult {
    const hit = castRay(ray, scene);
    
    if (!hit) {
        return { isOutline: false, depth: Infinity };
    }
    
    // Sample neighboring pixels to detect edges
    const neighbors = [
        { x: pixelX + 1, y: pixelY },     // right
        { x: pixelX - 1, y: pixelY },     // left
        { x: pixelX, y: pixelY + 1 },     // down
        { x: pixelX, y: pixelY - 1 }      // up
    ];
    
    const depthThreshold = 0.1;
    const normalThreshold = 0.8;
    
    for (const neighbor of neighbors) {
        // Check bounds
        if (neighbor.x < 0 || neighbor.x >= imageWidth || 
            neighbor.y < 0 || neighbor.y >= imageHeight) {
            continue;
        }
        
        const neighborRay = getRayForPixel(neighbor.x, neighbor.y);
        const neighborHit = castRay(neighborRay, scene);
        
        if (!neighborHit) {
            // Edge between object and background
            return { isOutline: true, depth: hit.distance };
        }
        
        // Check depth discontinuity
        const depthDiff = Math.abs(hit.distance - neighborHit.distance);
        if (depthDiff > depthThreshold) {
            return { isOutline: true, depth: hit.distance };
        }
        
        // Check normal discontinuity
        const normalSimilarity = dot(hit.normal, neighborHit.normal);
        if (normalSimilarity < normalThreshold) {
            return { isOutline: true, depth: hit.distance };
        }
    }
    
    return { isOutline: false, depth: hit.distance };
}

/**
 * Enhanced edge detection using silhouette detection
 */
export function detectSilhouette(triangles: Triangle[], viewDirection: Vector3): boolean[] {
    const isSilhouette = new Array(triangles.length).fill(false);
    
    // Build edge adjacency information
    const edges = new Map<string, number[]>();
    
    triangles.forEach((triangle, triIndex) => {
        const vertices = triangle.vertices;
        
        // Add edges for this triangle
        for (let i = 0; i < 3; i++) {
            const v1 = vertices[i];
            const v2 = vertices[(i + 1) % 3];
            
            // Create edge key (sorted to ensure consistency)
            const edgeKey = createEdgeKey(v1, v2);
            
            if (!edges.has(edgeKey)) {
                edges.set(edgeKey, []);
            }
            edges.get(edgeKey)!.push(triIndex);
        }
    });
    
    // Find silhouette edges (edges where one triangle faces toward viewer and other faces away)
    edges.forEach((triangleIndices, edgeKey) => {
        if (triangleIndices.length === 2) {
            const [tri1Index, tri2Index] = triangleIndices;
            const tri1 = triangles[tri1Index];
            const tri2 = triangles[tri2Index];
            
            const normal1 = { x: tri1.normal[0], y: tri1.normal[1], z: tri1.normal[2] };
            const normal2 = { x: tri2.normal[0], y: tri2.normal[1], z: tri2.normal[2] };
            
            const facing1 = dot(normal1, viewDirection) < 0;
            const facing2 = dot(normal2, viewDirection) < 0;
            
            // Silhouette edge if one triangle faces viewer and other doesn't
            if (facing1 !== facing2) {
                isSilhouette[tri1Index] = true;
                isSilhouette[tri2Index] = true;
            }
        }
    });
    
    return isSilhouette;
}

function createEdgeKey(v1: [number, number, number], v2: [number, number, number]): string {
    // Sort vertices to create consistent edge key
    const [first, second] = v1[0] < v2[0] || 
                           (v1[0] === v2[0] && v1[1] < v2[1]) || 
                           (v1[0] === v2[0] && v1[1] === v2[1] && v1[2] < v2[2]) 
                           ? [v1, v2] : [v2, v1];
    
    return `${first[0]},${first[1]},${first[2]}-${second[0]},${second[1]},${second[2]}`;
}