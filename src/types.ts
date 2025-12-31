/**
 * CLI options parsed from command line arguments
 */
export interface Options {
    list: boolean;
    define: string[];
    module: string[];
    convention: 'auto' | 'pascal' | 'all' | 'underscore';
    zip: boolean;
    beep: boolean;
    dry: boolean;
}

/**
 * Naming conventions for detecting top-level modules
 */
export const conventions = {
    pascal: /^module ([A-Z]\w+)/gm,
    all: /^module (\w+)/gm,
    underscore: /^module ([^_]\w+)/gm
} as const;

export type ConventionType = keyof typeof conventions;

/**
 * Context for rendering modules
 */
export interface RenderContext {
    fullPath: string;
    filePath: string;
    ospath: string;
    supportsBackend: boolean;
    options: Options;
    tempDir: string | null;
    stlFiles: string[];
}
