#!/usr/bin/env node

import * as tmp from "tmp";
import * as path from "node:path";
import { program, Option } from "commander";
import { conventions, type Options, type RenderContext } from "./types";
import { findOpenScad, checkBackendSupport } from "./openscad";
import { getPartsToRender } from "./modules";
import { processModule } from "./renderer";
import { createZipFile } from "./zip";

program
    .name('scadr')
    .option('-d, --define <value>', `variable definitions`, collect, [])
    .option('-m, --module <name>', `specific module to render`, collect, [])
    .addOption(new Option('-c, --convention <kind>', 'top-level naming convention').choices(['auto', ...Object.keys(conventions)]).default("auto"))
    .option('-l, --list', `list modules without rendering`)
    .option('--dry', `dry run (show what would happen)`)
    .option('--zip', `create a zip file with all outputs and original .scad file`)
    .option('-b, --beep', `chime when completed`)
    .argument("<path>", `.scad file to render`)
    .action(main);
program.parse();

function main(filePath: string, options: Options) {
    asyncMain(filePath, options).then(() => {
        if (options['beep']) {
            console.log('\x07');
        }
    });
}

async function asyncMain(filePath: string, options: Options) {
    const fullPath = path.resolve(filePath);
    const ospath = await findOpenScad();
    const supportsBackend = await checkBackendSupport(ospath);
    let tempDir: string | null = null;
    let stlFiles: string[] = [];
    
    let dotCount = 0;
    if (options.list) {
        console.log("Discovered modules:");
        for (const p of await getPartsToRender(filePath, options)) {
            console.log(` * ${p}`);
        }
        return;
    }

    // Create temporary directory for zip mode
    if (options.zip) {
        tempDir = tmp.dirSync({ unsafeCleanup: true }).name;
    }

    const ctx: RenderContext = {
        fullPath,
        filePath,
        ospath,
        supportsBackend,
        options,
        tempDir,
        stlFiles
    };

    const taskStatus: [name: string, done: boolean][] = [];
    const parts = options.module.length ? options.module : await getPartsToRender(filePath, options);

    await new Promise<void>(done => {
        let timeoutToken: ReturnType<typeof setTimeout>;

        for (const p of parts) {
            const target: [string, boolean] = [p, false];
            taskStatus.push(target);
            processModule(p, ctx).then(() => {
                target[1] = true;
                clearTimeout(timeoutToken);
                recalc();
            });
        }
        printStatus(false);

        timeoutToken = setTimeout(recalc, 750);

        function recalc() {
            dotCount = (dotCount + 1) % 4;
            const allDone = printStatus(true);
            if (allDone) {
                done();
            } else {
                timeoutToken = setTimeout(recalc, 750);
            }
        }
    });

    function printStatus(cls: boolean) {
        const dots = ["", ".", "..", "..."];
        if (cls) {
            process.stdout.moveCursor(0, -taskStatus.length);
        }
        let allDone = true;
        for (const t of taskStatus) {
            process.stdout.clearLine(1);
            console.log(`${t[0]}\t${t[1] ? "Done" : "Working" + dots[dotCount]}`);
            allDone = allDone && t[1];
        }
        return allDone;
    }
    
    // Create zip file if requested
    if (options.zip && tempDir && !options.dry) {
        await createZipFile(filePath, tempDir, ctx.stlFiles);
    } else if (options.zip && options.dry) {
        const baseName = path.basename(filePath, '.scad');
        const zipPath = path.join(path.dirname(filePath), `${baseName}.zip`);
        console.log(`Would create zip file: ${zipPath}`);
    }
    
    console.log(`Done!`);
}

function collect(value: string, previous: string[]) {
    return [...previous, value];
}
