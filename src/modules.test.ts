import { findModules } from './modules';
import { conventions } from './types';

describe('Module Parsing', () => {
  describe('findModules', () => {
    it('should find PascalCase modules', () => {
      const content = `
module Ball() {
  sphere(r=10);
}

module Box() {
  cube([10, 10, 10]);
}
`;
      const result = findModules(content, conventions.pascal);
      expect(result).toEqual(['Ball', 'Box']);
    });

    it('should find all top-level modules', () => {
      const content = `
module ball() {
  sphere(r=10);
}

module Box() {
  cube([10, 10, 10]);
}

module _helper() {
  circle(r=5);
}
`;
      const result = findModules(content, conventions.all);
      expect(result).toEqual(['ball', 'Box', '_helper']);
    });

    it('should return empty array when no modules match', () => {
      const content = 'sphere(r=10);';
      const result = findModules(content, conventions.pascal);
      expect(result).toEqual([]);
    });

    it('should not match modules in comments', () => {
      const content = `
// module NotReal() { }
module Actual() {
  cube([5, 5, 5]);
}
`;
      const result = findModules(content, conventions.pascal);
      expect(result).toEqual(['Actual']);
    });
  });
});
