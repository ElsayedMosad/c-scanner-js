"use strict";

const fs = require("fs");
const path = require("path");
const { Lexer } = require("./lexer");
const { Parser, ParseError } = require("./parser");
const { TokenType } = require("./tokenTypes");

const inputPath = process.argv[2] || path.join(__dirname, "..", "input.c");
const source = fs.readFileSync(inputPath, "utf8");

// Function to convert token type to Python-style format
function convertTokenType(token) {
  const type = token.type;
  const lexeme = token.lexeme || "";

  // Keywords
  if (
    type === TokenType.IF ||
    type === TokenType.ELSE ||
    type === TokenType.INT ||
    type === TokenType.RETURN ||
    type === TokenType.FOR ||
    type === TokenType.WHILE
  ) {
    return ["KEYWORD", lexeme];
  }

  // Identifier
  if (type === TokenType.ID) {
    return ["IDENTIFIER", lexeme];
  }

  // Numeric constants
  if (type === TokenType.INT_LIT || type === TokenType.FLOAT_LIT) {
    return ["NUMERIC_CONSTANT", lexeme];
  }

  // Operators
  if (
    type === TokenType.PLUS ||
    type === TokenType.MINUS ||
    type === TokenType.STAR ||
    type === TokenType.SLASH ||
    type === TokenType.MOD ||
    type === TokenType.ASSIGN ||
    type === TokenType.EQ ||
    type === TokenType.NE ||
    type === TokenType.LT ||
    type === TokenType.GT ||
    type === TokenType.LE ||
    type === TokenType.GE
  ) {
    return ["OPERATOR", lexeme];
  }

  // Special Characters
  if (
    type === TokenType.LPAREN ||
    type === TokenType.RPAREN ||
    type === TokenType.LBRACE ||
    type === TokenType.RBRACE ||
    type === TokenType.LBRACKET ||
    type === TokenType.RBRACKET ||
    type === TokenType.SEMI ||
    type === TokenType.COMMA ||
    type === TokenType.DOT
  ) {
    return ["Special_Character", lexeme];
  }

  // EOF - skip it (Python project doesn't print it)
  if (type === TokenType.EOF) {
    return null;
  }

  return [type, lexeme];
}

// 1) Lexical analysis
const lexer = new Lexer(source);
const tokens = lexer.scanAll();

// اطبع التوكنز لو حابب تتأكد
console.log("=== TOKENS ===");
for (const t of tokens) {
  const converted = convertTokenType(t);
  if (converted) {
    console.log(`('${converted[0]}', '${converted[1]}')`);
  }
}

// 2) Parsing (Top-Down / Recursive Descent)
console.log("\n=== PARSE RESULT ===");
let parser;
try {
  parser = new Parser(tokens);
  const ast = parser.parseProgram();
  console.log("Parse succeeded.");
  console.dir(ast, { depth: null });
} catch (e) {
  if (e instanceof ParseError) {
    console.error("Parse error:", e.message);
    if (parser && parser.peek()) {
      console.error(
        `Current token: ${parser.peek().type} "${parser.peek().lexeme}" at (${
          parser.peek().line
        }:${parser.peek().col})`
      );
    }
  } else {
    console.error("Unexpected error:", e);
    console.error(e.stack);
  }
  process.exit(1);
}
