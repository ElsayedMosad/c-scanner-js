"use strict";

const fs = require("fs");
const path = require("path");
const { Lexer } = require("./lexer");
const { Parser, ParseError } = require("./parser");
const { TokenType } = require("./tokenTypes");

// قراءة ملف الإدخال
const inputPath = process.argv[2] || path.join(__dirname, "..", "input.c");
const source = fs.readFileSync(inputPath, "utf8");

// تحويل نوع الـ token إلى الشكل المطلوب
function getTokenType(token) {
  const type = token.type;
  const lexeme = token.lexeme || "";

  // Keywords
  if (
    [
      TokenType.IF,
      TokenType.ELSE,
      TokenType.INT,
      TokenType.RETURN,
      TokenType.FOR,
      TokenType.WHILE,
    ].includes(type)
  ) {
    return "KEYWORD";
  }
  // Identifier
  if (type === TokenType.ID) return "IDENTIFIER";
  // Numeric constants
  if (type === TokenType.INT_LIT || type === TokenType.FLOAT_LIT)
    return "NUMERIC_CONSTANT";
  // Operators
  if (
    [
      TokenType.PLUS,
      TokenType.MINUS,
      TokenType.STAR,
      TokenType.SLASH,
      TokenType.MOD,
      TokenType.ASSIGN,
      TokenType.EQ,
      TokenType.NE,
      TokenType.LT,
      TokenType.GT,
      TokenType.LE,
      TokenType.GE,
    ].includes(type)
  ) {
    return "OPERATOR";
  }
  // Special Characters
  if (
    [
      TokenType.LPAREN,
      TokenType.RPAREN,
      TokenType.LBRACE,
      TokenType.RBRACE,
      TokenType.LBRACKET,
      TokenType.RBRACKET,
      TokenType.SEMI,
      TokenType.COMMA,
      TokenType.DOT,
    ].includes(type)
  ) {
    return "Special_Character";
  }
  // EOF - نتخطاه
  if (type === TokenType.EOF) return null;

  return type;
}

// المسح (Lexical Analysis)
const lexer = new Lexer(source);
const tokens = lexer.scanAll();

// طباعة الـ tokens
for (const token of tokens) {
  const tokenType = getTokenType(token);
  if (tokenType) {
    console.log(`('${tokenType}', '${token.lexeme || ""}')`);
  }
}

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
  } else {
    console.error("Unexpected error:", e);
  }
}
