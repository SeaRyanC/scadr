// Use high-quality rendering when running from scadr
$fn = 180;

// Use a 'demo' module (naming doesn't matter)
// for previewing / development
demo();
module demo() {
    // use low-quality rendering for development purposes
    $fn = undef;
    $fa = 15;
    $fs = 1;

    translate([10, 0, 0]) {
        Ball();
    }
    Box();
}

// Top-level modules starting with a capital letter are rendered to STL

// This will produce demo-Ball.stl
module Ball() {
    sphere(d = 5);
}

// This will produce demo-Box.stl
module Box() {
    cube([5, 5, 5], center = true);
}
