# scadr

scadr is a Node.js CLI tool that renders multiple high-quality STL files from a single OpenSCAD source file. It automatically detects top-level modules in a .scad file and renders each to a separate STL file using OpenSCAD as the rendering engine.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Prerequisites and Installation
- Install Node.js (v20+ recommended): The system should have Node.js and npm available
- Install OpenSCAD: `sudo apt update && sudo apt install -y openscad`
  - NEVER CANCEL: OpenSCAD installation can take 5-10 minutes depending on package updates. Set timeout to 15+ minutes.
  - Verify installation: `openscad --version` should show OpenSCAD version
  - If OpenSCAD fails to install or is not found, the application will not work

### Bootstrap and Build Process
- Install dependencies: `npm install` 
  - Takes ~2-5 seconds normally
- Build TypeScript: `npm run prepublishOnly`
  - Takes ~1 second normally
  - Compiles `src/cli.ts` to `lib/cli.js`
- NEVER CANCEL: Set timeout to 5+ minutes for npm install in case of network issues

### Basic Validation
Always validate the build by running these commands:
- `node lib/cli.js --help` - should show CLI usage help
- `node lib/cli.js demo/demo.scad --list` - should show "Ball" and "Box" modules
- `node lib/cli.js demo/demo.scad --dry` - should show what would be rendered without doing it
- `node lib/cli.js demo/demo.scad` - should generate demo-Ball.stl and demo-Box.stl files
  - Takes <0.1 seconds for demo file
  - Verify STL files exist: `ls -la demo/*.stl`

### Application Usage
- Basic rendering: `node lib/cli.js path/to/file.scad`
- List modules: `node lib/cli.js path/to/file.scad --list`
- Dry run: `node lib/cli.js path/to/file.scad --dry`
- Render specific module: `node lib/cli.js path/to/file.scad --module ModuleName`
- Set OpenSCAD parameters: `node lib/cli.js path/to/file.scad -d '$fn=180'`

## Validation and Testing

### Manual Validation Requirements
ALWAYS test actual functionality after making changes:
- Build the project: `npm run prepublishOnly`
- Test with demo file: `node lib/cli.js demo/demo.scad`
- Verify STL files are generated: Check that `demo/demo-Ball.stl` and `demo/demo-Box.stl` exist and have reasonable file sizes (Ball ~1.6MB, Box ~684 bytes)
- Test different CLI options: `--list`, `--dry`, `--module`, `-d` parameters
- Test naming convention detection: Create test .scad files with PascalCase and underscore naming
- Clean up test artifacts: `rm demo/*.stl` after testing

### Complete End-to-End Validation Workflow
After making code changes, always run this complete validation:
1. `npm run prepublishOnly`
2. `node lib/cli.js demo/demo.scad --list` (should show Ball and Box)
3. `node lib/cli.js demo/demo.scad --dry` (should show commands without errors)
4. `node lib/cli.js demo/demo.scad` (should generate STL files)
5. `ls -la demo/*.stl` (verify files exist with expected sizes)
6. `node lib/cli.js demo/demo.scad --module Ball` (test specific module)
7. `node lib/cli.js demo/demo.scad -d '$fn=20'` (test parameter passing)
8. `rm demo/*.stl` (cleanup)

### Expected Timings
- npm install: <1 second normally, up to 5 minutes with network issues
- TypeScript build: ~1 second
- Demo rendering: <0.1 seconds (simple geometry with $fn=180)
- Complex rendering: Can take 30-60 seconds for high-resolution models with $fn=100+
- OpenSCAD installation: 5-10 minutes including package updates
- NEVER CANCEL: Always set appropriate timeouts - 5+ minutes for npm install, 15+ minutes for OpenSCAD installation, 60+ minutes for complex rendering

### Common Issues
- "Unable to find OpenSCAD" error: Install OpenSCAD with `sudo apt install -y openscad` or set OPENSCADPATH environment variable
- Build fails: Run `npm install` to ensure dependencies are installed
- No STL output: Check that the .scad file has properly named modules (PascalCase or _underscore prefixed)

## Code Structure and Navigation

### Key Files
- `src/cli.ts` - Main CLI implementation (149 lines)
  - Contains argument parsing, module discovery, and OpenSCAD integration
  - Key functions: `main()`, `asyncMain()`, `findOpenScad()`, `processModule()`
- `lib/cli.js` - Compiled JavaScript output (generated, do not edit directly)
- `demo/demo.scad` - Demo OpenSCAD file for testing
- `package.json` - Dependencies: commander, tmp, typescript, @types packages
- `tsconfig.json` - TypeScript compiler configuration

### Development Workflow
- Edit TypeScript source in `src/cli.ts`
- Build with `npm run prepublishOnly`
- Test with demo file
- Always test both dry run and actual rendering
- No existing test suite or linting - rely on manual validation

### Module Detection Logic
The application automatically detects which modules to render based on naming conventions:
- `auto` (default): Detects naming pattern automatically
- `pascal`: Modules starting with capital letter (e.g., `Ball`, `Box`)
- `underscore`: Modules starting with underscore (e.g., `_ball`, `_box`)
- `all`: All top-level modules

## Common Tasks

### Repository Root Structure
```
.git/
.gitignore
.npmignore
README.md
demo/
  demo.scad
lib/            # Generated - TypeScript output
  cli.js
node_modules/   # Generated - npm dependencies
package-lock.json
package.json
src/
  cli.ts
tsconfig.json
```

### Key Dependencies
From package.json:
- Runtime: commander (CLI parsing), tmp (temporary files)
- Build: typescript, @types/node, @types/tmp
- External: OpenSCAD executable (must be installed separately)

### Testing New Changes
1. Make changes to `src/cli.ts`
2. `npm run prepublishOnly`
3. `node lib/cli.js demo/demo.scad --dry` (verify no errors)
4. `node lib/cli.js demo/demo.scad` (verify STL generation)
5. `ls -la demo/*.stl` (verify files created with reasonable sizes)
6. Clean up: `rm demo/*.stl`

Always manually verify that the application works end-to-end after making changes. The lack of automated tests means manual validation is critical for ensuring functionality.