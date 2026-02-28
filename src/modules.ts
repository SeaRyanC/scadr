import * as fs from "node:fs/promises";
import { conventions, type Options, type ConventionType } from "./types";

/**
 * Get the list of modules to render from the .scad file
 */
export async function getPartsToRender(filePath: string, options: Options): Promise<string[]> {
    const fileContent = await fs.readFile(filePath, { encoding: "utf-8" });

    if (options.convention === 'auto') {
        const allModules = findModules(fileContent, conventions.all);
        const pascalModules = findModules(fileContent, conventions.pascal);
        const underscore = findModules(fileContent, conventions.underscore);
        if ((pascalModules.length > 0) && (pascalModules.length < allModules.length)) {
            return pascalModules;
        } else if ((underscore.length > 0) && (underscore.length < allModules.length)) {
            return underscore;
        } else {
            return allModules;
        }
    }
    return findModules(fileContent, conventions[options.convention as ConventionType]);
}

function findModules(fileContent: string, rgx: RegExp): string[] {
    return [...fileContent.matchAll(rgx)].map(g => g[1]);
}
