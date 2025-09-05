import { Triangle } from '../stl';
import { Vector3, Ray, add, subtract, multiply, dot, cross, normalize } from './orthographicCamera';

export interface RayHit {
    point: Vector3;
    normal: Vector3;
    distance: number;
    material: Material;
}

export interface Material {
    color: Vector3;
    ambient: number;
    diffuse: number;
}

export interface Scene {
    triangles: Triangle[];
    lightPosition: Vector3;
    lightColor: Vector3;
    ambientLight: Vector3;
    backgroundColor: Vector3;
    fogColor: Vector3;
    fogDensity: number;
}

export function createScene(triangles: Triangle[]): Scene {
    return {
        triangles,
        lightPosition: { x: 10, y: 10, z: 10 },
        lightColor: { x: 1, y: 1, z: 1 }, // White light
        ambientLight: { x: 0.3, y: 0.3, z: 0.3 },
        backgroundColor: { x: 1, y: 1, z: 0.8 }, // Pale yellow
        fogColor: { x: 0.9, y: 0.9, z: 0.7 },
        fogDensity: 0.005 // Reduced fog density for better visibility
    };
}

/**
 * Cast a ray and find the closest intersection
 */
export function castRay(ray: Ray, scene: Scene): RayHit | null {
    let closestHit: RayHit | null = null;
    let closestDistance = Infinity;
    
    // Check intersection with triangles
    for (const triangle of scene.triangles) {
        const hit = intersectRayTriangle(ray, triangle);
        if (hit && hit.distance < closestDistance) {
            closestDistance = hit.distance;
            closestHit = hit;
            
            // Early termination for very close hits
            if (hit.distance < 0.001) {
                break;
            }
        }
    }
    
    // Skip ground plane for performance
    // TODO: Add back ground plane if needed
    
    return closestHit;
}

/**
 * Calculate lighting for a hit point
 */
export function calculateLighting(hit: RayHit, scene: Scene, rayDirection: Vector3): Vector3 {
    const { point, normal, material } = hit;
    
    // Ambient lighting
    const ambient = multiplyVectors(material.color, scene.ambientLight);
    
    // Diffuse lighting
    const lightDirection = normalize(subtract(scene.lightPosition, point));
    const diffuseIntensity = Math.max(0, dot(normal, lightDirection)) * material.diffuse;
    const diffuse = multiply(multiplyVectors(material.color, scene.lightColor), diffuseIntensity);
    
    // Combine lighting
    let finalColor = add(ambient, diffuse);
    
    // Apply atmospheric fog
    const fogFactor = Math.exp(-scene.fogDensity * hit.distance);
    finalColor = add(multiply(finalColor, fogFactor), multiply(scene.fogColor, 1 - fogFactor));
    
    return clampColor(finalColor);
}

/**
 * Ray-triangle intersection using Möller-Trumbore algorithm with bounding box optimization
 */
function intersectRayTriangle(ray: Ray, triangle: Triangle): RayHit | null {
    const [v0, v1, v2] = triangle.vertices.map(v => ({ x: v[0], y: v[1], z: v[2] }));
    
    // Quick bounding box check for early rejection
    const minX = Math.min(v0.x, v1.x, v2.x);
    const maxX = Math.max(v0.x, v1.x, v2.x);
    const minY = Math.min(v0.y, v1.y, v2.y);
    const maxY = Math.max(v0.y, v1.y, v2.y);
    const minZ = Math.min(v0.z, v1.z, v2.z);
    const maxZ = Math.max(v0.z, v1.z, v2.z);
    
    // Skip if ray origin is far from triangle bounds
    if (ray.origin.x < minX - 1 || ray.origin.x > maxX + 1 ||
        ray.origin.y < minY - 1 || ray.origin.y > maxY + 1 ||
        ray.origin.z < minZ - 1 || ray.origin.z > maxZ + 1) {
        // Only do this check if the ray direction wouldn't help
        if ((ray.direction.x > 0 && ray.origin.x > maxX) ||
            (ray.direction.x < 0 && ray.origin.x < minX) ||
            (ray.direction.y > 0 && ray.origin.y > maxY) ||
            (ray.direction.y < 0 && ray.origin.y < minY) ||
            (ray.direction.z > 0 && ray.origin.z > maxZ) ||
            (ray.direction.z < 0 && ray.origin.z < minZ)) {
            return null;
        }
    }
    
    const edge1 = subtract(v1, v0);
    const edge2 = subtract(v2, v0);
    const h = cross(ray.direction, edge2);
    const a = dot(edge1, h);
    
    if (a > -0.00001 && a < 0.00001) {
        return null; // Ray is parallel to triangle
    }
    
    const f = 1.0 / a;
    const s = subtract(ray.origin, v0);
    const u = f * dot(s, h);
    
    if (u < 0.0 || u > 1.0) {
        return null;
    }
    
    const q = cross(s, edge1);
    const v = f * dot(ray.direction, q);
    
    if (v < 0.0 || u + v > 1.0) {
        return null;
    }
    
    const t = f * dot(edge2, q);
    
    if (t > 0.00001) {
        const point = add(ray.origin, multiply(ray.direction, t));
        const normal = normalize({ 
            x: triangle.normal[0], 
            y: triangle.normal[1], 
            z: triangle.normal[2] 
        });
        
        // Pleasant green material for objects
        const material: Material = {
            color: { x: 0.3, y: 0.8, z: 0.3 }, // Pleasant green
            ambient: 0.3,
            diffuse: 0.7
        };
        
        return { point, normal, distance: t, material };
    }
    
    return null;
}

/**
 * Ray-plane intersection
 */
function intersectRayPlane(ray: Ray, planePoint: Vector3, planeNormal: Vector3): RayHit | null {
    const denom = dot(planeNormal, ray.direction);
    
    if (Math.abs(denom) < 0.00001) {
        return null; // Ray is parallel to plane
    }
    
    const t = dot(subtract(planePoint, ray.origin), planeNormal) / denom;
    
    if (t > 0.00001) {
        const point = add(ray.origin, multiply(ray.direction, t));
        const material: Material = {
            color: { x: 0.9, y: 0.9, z: 0.7 },
            ambient: 0.4,
            diffuse: 0.6
        };
        
        return { point, normal: planeNormal, distance: t, material };
    }
    
    return null;
}

/**
 * Check if a point is on the grid lines (10x10 grid)
 */
function isOnGrid(point: Vector3): boolean {
    const gridSize = 1.0;
    const lineWidth = 0.05;
    
    const x = Math.abs(point.x % gridSize);
    const y = Math.abs(point.y % gridSize);
    
    return x < lineWidth || x > gridSize - lineWidth ||
           y < lineWidth || y > gridSize - lineWidth;
}

function multiplyVectors(a: Vector3, b: Vector3): Vector3 {
    return { x: a.x * b.x, y: a.y * b.y, z: a.z * b.z };
}

function clampColor(color: Vector3): Vector3 {
    return {
        x: Math.min(1, Math.max(0, color.x)),
        y: Math.min(1, Math.max(0, color.y)),
        z: Math.min(1, Math.max(0, color.z))
    };
}