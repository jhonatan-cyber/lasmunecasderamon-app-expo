import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { expect, it } from 'vitest';

it('no renderiza texto ni espacios sueltos fuera de Text', () => {
  const failures: string[] = [];
  const scan = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) { scan(file); continue; }
      if (!file.endsWith('.tsx')) continue;
      const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const visit = (node: ts.Node) => {
        if (ts.isJsxText(node) && node.text.length) {
          const parent = node.parent;
          const tag = ts.isJsxElement(parent) ? parent.openingElement.tagName.getText(source) : 'fragment';
          const rawText = !/^\s*$/.test(node.text) || !/[\r\n]/.test(node.text);
          if (rawText && !['Text', 'RNText', 'Animated.Text'].includes(tag)) {
            failures.push(`${file}:${source.getLineAndCharacterOfPosition(node.pos).line + 1}`);
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
  };
  scan('app');
  scan('components');
  expect(failures).toEqual([]);
});
