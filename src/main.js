"use strict";

const fs = require("fs");
const path = require("path");
const { Lexer } = require("./lexer");

function main() {
  const file =
    process.argv[2] || path.join(__dirname, "..", "samples", "input.c");
  const src = fs.readFileSync(file, "utf8");
  const lex = new Lexer(src);
  const tokens = lex.scanAll();
  for (const t of tokens) {
    const lexeme = t.lexeme == null ? "" : `\t"${t.lexeme}"`;
    console.log(`${t.type}${lexeme}\t(${t.line}:${t.col})`);
  }
}

if (require.main === module) {
  main();
}
