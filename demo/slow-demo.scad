$fn = 360;

module Part1() {
    minkowski() {
        sphere(r = 2);
        sphere(r = 2);
    }
}

module Part2() {
    minkowski() {
        sphere(r = 2);
        cube([10, 10, 10]);
    }
}

module Part3() {
    minkowski() {
        cube([10, 10, 10]);
        cube([10, 10, 10]);
    }
}
