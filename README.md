# scadr

Render multi-part OpenSCAD files from a single command

## Installation

### Prerequisites

[node.js](https://nodejs.org/en)

### Installing

Run

> `npm install -g scadr`

## Usage & Setup

### Syntax

> `scadr [options] path`

### Example

> `scadr my-file.scad`

Renders the top-level modules of `my-file.scad` to individual `.stl` files.

For example, if `my-file.scad` contained
```
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

```
scadr my-file.scad --define $fn=180 --define qual="high"
```

Defines a variable. Multiple definitions can be provided.

### `--module name`

Defines a module that should be rendered. Multiple modules can be provided
```
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
