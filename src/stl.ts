export interface Triangle {
    normal: [number, number, number];
    vertices: [[number, number, number], [number, number, number], [number, number, number]];
}

export interface STLModel {
    triangles: Triangle[];
    name?: string;
}

/**
 * Parse STL file (binary or ASCII format) into a list of triangles
 */
export async function parseSTL(filePath: string): Promise<STLModel> {
    const fs = require("node:fs/promises");
    const buffer = await fs.readFile(filePath);
    
    // Check if it's ASCII STL by looking for "solid" at the beginning
    const header = buffer.toString('ascii', 0, 5);
    if (header === 'solid') {
        return parseASCIISTL(buffer);
    } else {
        return parseBinarySTL(buffer);
    }
}

function parseASCIISTL(buffer: Buffer): STLModel {
    const content = buffer.toString('utf8');
    const triangles: Triangle[] = [];
    
    const lines = content.split('\n').map(line => line.trim());
    let i = 0;
    
    // Skip header line (solid name)
    while (i < lines.length && !lines[i].startsWith('facet normal')) {
        i++;
    }
    
    while (i < lines.length) {
        const line = lines[i];
        
        if (line.startsWith('facet normal')) {
            const normalParts = line.split(/\s+/).slice(2);
            const normal: [number, number, number] = [
                parseFloat(normalParts[0]),
                parseFloat(normalParts[1]),
                parseFloat(normalParts[2])
            ];
            
            i++; // Skip "outer loop"
            i++;
            
            const vertices: [[number, number, number], [number, number, number], [number, number, number]] = [
                [0, 0, 0], [0, 0, 0], [0, 0, 0]
            ];
            
            // Read 3 vertices
            for (let v = 0; v < 3; v++) {
                const vertexLine = lines[i];
                const vertexParts = vertexLine.split(/\s+/).slice(1);
                vertices[v] = [
                    parseFloat(vertexParts[0]),
                    parseFloat(vertexParts[1]),
                    parseFloat(vertexParts[2])
                ];
                i++;
            }
            
            triangles.push({ normal, vertices });
            
            i++; // Skip "endloop"
            i++; // Skip "endfacet"
        } else {
            i++;
        }
    }
    
    return { triangles };
}

function parseBinarySTL(buffer: Buffer): STLModel {
    const triangles: Triangle[] = [];
    
    // Skip 80-byte header
    let offset = 80;
    
    // Read number of triangles (4 bytes, little endian)
    const numTriangles = buffer.readUInt32LE(offset);
    offset += 4;
    
    for (let i = 0; i < numTriangles; i++) {
        // Read normal (3 floats, 12 bytes)
        const normal: [number, number, number] = [
            buffer.readFloatLE(offset),
            buffer.readFloatLE(offset + 4),
            buffer.readFloatLE(offset + 8)
        ];
        offset += 12;
        
        // Read 3 vertices (9 floats, 36 bytes)
        const vertices: [[number, number, number], [number, number, number], [number, number, number]] = [
            [
                buffer.readFloatLE(offset),
                buffer.readFloatLE(offset + 4),
                buffer.readFloatLE(offset + 8)
            ],
            [
                buffer.readFloatLE(offset + 12),
                buffer.readFloatLE(offset + 16),
                buffer.readFloatLE(offset + 20)
            ],
            [
                buffer.readFloatLE(offset + 24),
                buffer.readFloatLE(offset + 28),
                buffer.readFloatLE(offset + 32)
            ]
        ];
        offset += 36;
        
        // Skip attribute byte count (2 bytes)
        offset += 2;
        
        triangles.push({ normal, vertices });
    }
    
    return { triangles };
}