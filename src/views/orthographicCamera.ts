export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

export interface Ray {
    origin: Vector3;
    direction: Vector3;
}

export interface OrthographicCamera {
    position: Vector3;
    target: Vector3;
    up: Vector3;
    left: number;
    right: number;
    bottom: number;
    top: number;
    near: number;
    far: number;
}

export function createOrthographicCamera(
    position: Vector3,
    target: Vector3,
    up: Vector3,
    width: number,
    height: number,
    scale: number
): OrthographicCamera {
    const halfWidth = width / 2 * scale;
    const halfHeight = height / 2 * scale;
    
    return {
        position,
        target,
        up,
        left: -halfWidth,
        right: halfWidth,
        bottom: -halfHeight,
        top: halfHeight,
        near: 0.1,
        far: 1000
    };
}

/**
 * Generate a ray for the given pixel coordinates in an orthographic projection
 */
export function getRayForPixel(
    camera: OrthographicCamera,
    pixelX: number,
    pixelY: number,
    imageWidth: number,
    imageHeight: number
): Ray {
    // Convert pixel coordinates to normalized coordinates [0,1]
    const u = pixelX / imageWidth;
    const v = pixelY / imageHeight;
    
    // Convert to camera space coordinates
    const worldX = camera.left + u * (camera.right - camera.left);
    const worldY = camera.bottom + v * (camera.top - camera.bottom);
    
    // Calculate camera basis vectors
    const forward = normalize(subtract(camera.target, camera.position));
    const right = normalize(cross(forward, camera.up));
    const up = cross(right, forward);
    
    // Calculate ray origin in world space
    const rayOrigin: Vector3 = {
        x: camera.position.x + worldX * right.x + worldY * up.x,
        y: camera.position.y + worldX * right.y + worldY * up.y,
        z: camera.position.z + worldX * right.z + worldY * up.z
    };
    
    return {
        origin: rayOrigin,
        direction: forward
    };
}

// Vector math utilities
export function add(a: Vector3, b: Vector3): Vector3 {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function subtract(a: Vector3, b: Vector3): Vector3 {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function multiply(v: Vector3, scalar: number): Vector3 {
    return { x: v.x * scalar, y: v.y * scalar, z: v.z * scalar };
}

export function dot(a: Vector3, b: Vector3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross(a: Vector3, b: Vector3): Vector3 {
    return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x
    };
}

export function length(v: Vector3): number {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function normalize(v: Vector3): Vector3 {
    const len = length(v);
    if (len === 0) return { x: 0, y: 0, z: 0 };
    return multiply(v, 1 / len);
}