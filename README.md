# scadr

Quickly render multiple high-quality `.stl` files from a single OpenSCAD source

## Introduction / Demo

OpenSCAD files can contain many self-contained subparts, typically modelled with the `module` construct:

```scad
// demo.scad file contents

// Top-level renderings
ball();
translate([10, 0, 0])
box();

// Subparts
module ball() {
  sphere(d = 5);
}

module box() {
  cube([5, 5, 5], center = true);
}
```

Directly exporting this from OpenSCAD can be annoying.
Since the entire scene is included in a single `.stl` file, you usually need separate software to split these apart before they can be printed.
It's awkward to switch back and forth between commenting out various parts of your project -- ideally, you can design with the entire scene in view, then render out separate files and print them individually.

You might also want to iterate quickly on a design by looking at a low-poly render of it, but obviously want to print at a very high quality that can take a long time to render.

`scadr` solves both these problems.

### File Splitting

For example, let's say you want to render two shapes from the same file (maybe they actually depend on common parameters, for example).

If you run `scadr` on the demo file above, it'll automatically produce two outputs: `demo-ball.stl` and `demo-box.stl`:
```
> scadr demo.scad
Rendering ball to demo-ball.stl...
Rendering box to demo-box.stl...
Done!
```

Complex models might also have many sub-modules, only some of which you want to produce `.stl` files from.
`scadr` supports multiple ways of doing this.

For a zero-config solution, apply a naming convention to the modules you want exports of. Multiple conventions are supported to indicate which modules should be exported:
 * Use `Pascal` casing, e.g. `MyBox` *or*
 * Use leading underscores, e.g. `_myBox`

The naming convention will be detected automatically.

You can also pass a list of modules on the commandline:
```
scadr demo.scad --module ball --module box
```

### Development vs Production Quality

Another common issue is wanting fast iteration while designing an object, while producing `.stl` files with the highest necessary resolution.

You can pass commandline arguments to `scadr` to change resolution, just like in OpenSCAD:
```
> scadr demo.scad -d $fn=180
```

For a zero-config solution, put high-quality values at the top level of a file, and override those with lower-quality values in a previewing module:
```scad
// High-quality default
$fn = 180;

preview();
module preview() {
  // use low-quality rendering for development purposes
  $fn = undef;
  $fa = 15;
  $fs = 1;

  ball();
  translate([10, 0, 0])
  box();
}
```

## Installation

### Prerequisites

[node.js](https://nodejs.org/en)

### Installing

Run

```shell
npm install -g scadr
```

## Usage & Setup

### Syntax

```shell
scadr [options] path
```

### Basic Example

```shell
scadr my-file.scad
```

Renders the top-level modules of `my-file.scad` to individual `.stl` files.

For example, if `my-file.scad` contained
```scad
module ball() {
    sphere(r = 3);
}
module box() {
    cube([5, 5, 5]);
}
```
then the files `my-file-ball.stl` and `my-file-box.stl` would be produced.

## Options

```
Usage: scadr [options] <path>

Arguments:
  path                     .scad file to render

Options:
  -d, --define <value>     variable definitions (default: [])
  -m, --module <name>      specific module to render (default: [])
  -c, --convention <kind>  top-level naming convention (choices: "auto", "pascal", "all", "underscore", default: "auto")
  -l, --list               list modules without rendering
  --dry                    dry run (show what would happen)
  -h, --help               display help for command
```

### `--define n=v`

```shell
scadr my-file.scad --define $fn=180 --define qual="high"
```

Defines a variable. Multiple definitions can be provided.

### `--module name`

Defines a module that should be rendered. Multiple modules can be provided
```shell
scadr demo.scad --module Alpha --module Beta
```
If no modules are provided, the list of modules to render is determined by `convention` (see below).

### `--convention`

You can automatically filter which top-level modules are rendered by using a naming convention.

Supported conventions are:
 * `all`: Render every top-level module
 * `pascal`: Render `Alpha`, but not `alpha`
 * `underscore`: Render `_part1`, but not `part1`
 * `auto`: Infer the naming convention of the file

`auto` chooses `pascal` if some (but not all) modules are `Pascal`-cased, otherwise chooses `underscore` if some (but not all) modules are named with an initial `_`, otherwise renders everything (`all`)

### `--list`

Prints out which modules in this file would be rendered (as determined by `convention`).

### `--dry`

Prints out what would happen, but doesn't actually do it

## Changelog

#### 0.1.0

First release