$fn = 360;
// Use a 'demo' module (name doesn't matter)
// for previewing / development
demo();
module demo() {
    $fn = 20;
    
    Alpha();

    translate([10, 0, 0])
    Beta();

    translate([20, 0, 0])
    Gamma();
}

// Top-level modules start with a capital letter are rendered.
// This will produce demo-Alpha.stl
module Alpha() {
    linear_extrude(4) 
    text("A");
}

// This will produce demo-Beta.stl
module Beta() {
    linear_extrude(4) 
    text("B");
}

// This will produce demo-Gamma.stl
module Gamma() {
    linear_extrude(4) 
    text("C");
}