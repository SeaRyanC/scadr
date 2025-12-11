import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as util from "node:util";
import * as child_process from "node:child_process";

const execFile = util.promisify(child_process.execFile);

/**
 * Check if OpenSCAD supports the --backend option
 */
export async function checkBackendSupport(openScadPath: string): Promise<boolean> {
    try {
        const { stdout } = await execFile(openScadPath, ['--help']);
        return stdout.includes('--backend');
    } catch {
        // If help fails, assume no backend support
        return false;
    }
}

/**
 * Find the OpenSCAD executable path
 */
export async function findOpenScad(): Promise<string> {
    const candidateRoots = [
        process.env['OPENSCADPATH'],
        // Windows - prefer Nightly version
        winpath('ProgramFiles', 'OpenSCAD (Nightly)'),
        winpath('ProgramFiles(x86)', 'OpenSCAD (Nightly)'),
        winpath('ProgramFiles'),
        winpath('ProgramFiles(x86)'),
        // Mac
        '/Applications/OpenSCAD.app/Contents/MacOS/OpenSCAD',
        // Linux [?]
        '/usr/bin/openscad'

    ].filter(p => !!p) as string[];

    for (const candidate of candidateRoots) {
        try {
            await fs.stat(candidate);
            return candidate;
        } catch {
            // Didn't exist; carry on
        }
    }

    console.error("Unable to find OpenSCAD; set OPENSCADPATH environment variable");
    return process.exit(-1);
}

function winpath(env: string, subfolder?: string): string | undefined {
    const val = process.env[env];
    if (val) {
        const folder = subfolder ?? "OpenSCAD";

        return path.join(val, folder, "openscad.com");
    }
    return undefined;
}
