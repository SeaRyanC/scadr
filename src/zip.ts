import * as path from "node:path";
import * as archiver from "archiver";
import * as fs from "node:fs";

/**
 * Create a zip file containing all STL files and the original .scad file
 */
export async function createZipFile(scadFilePath: string, tempDir: string, stlFiles: string[]): Promise<void> {
    const baseName = path.basename(scadFilePath, '.scad');
    const zipPath = path.join(path.dirname(scadFilePath), `${baseName}.zip`);
    
    console.log(`Creating zip file: ${zipPath}...`);
    
    const output = fs.createWriteStream(zipPath);
    const archive = archiver.default('zip', { zlib: { level: 9 } });
    
    return new Promise<void>((resolve, reject) => {
        output.on('close', () => {
            console.log(`Zip file created: ${zipPath} (${archive.pointer()} bytes)`);
            resolve();
        });
        
        archive.on('error', (err: any) => {
            reject(err);
        });
        
        archive.pipe(output);
        
        // Add all STL files
        for (const stlFile of stlFiles) {
            const fileName = path.basename(stlFile);
            archive.file(stlFile, { name: fileName });
        }
        
        // Add original .scad file
        archive.file(scadFilePath, { name: path.basename(scadFilePath) });
        
        archive.finalize();
    });
}
