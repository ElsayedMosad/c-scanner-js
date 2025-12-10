"use strict";

const TokenType = {
  // Keywords
  IF: "IF",
  ELSE: "ELSE",
  INT: "INT",
  RETURN: "RETURN",
  FOR: "FOR",
  WHILE: "WHILE",

  // Identifiers & Literals
  ID: "ID",
  INT_LIT: "INT_LIT",
  FLOAT_LIT: "FLOAT_LIT",

  // Operators
  ASSIGN: "ASSIGN", // =
  EQ: "EQ", // ==
  NE: "NE", // !=
  LT: "LT", // <
  GT: "GT", // >
  LE: "LE", // <=
  GE: "GE", // >=
  PLUS: "PLUS", // +
  MINUS: "MINUS", // -
  STAR: "STAR", // *
  SLASH: "SLASH", // /
  MOD: "MOD", // %

  // Punctuations
  LPAREN: "LPAREN", // (
  RPAREN: "RPAREN", // )
  LBRACE: "LBRACE", // {
  RBRACE: "RBRACE", // }
  LBRACKET: "LBRACKET", // [
  RBRACKET: "RBRACKET", // ]
  SEMI: "SEMI", // ;
  COMMA: "COMMA", // ,
  DOT: "DOT", // .

  EOF: "EOF",
};

// Map keywords -> token types
const KeywordMap = new Map([
  ["if", TokenType.IF],
  ["else", TokenType.ELSE],
  ["int", TokenType.INT],
  ["return", TokenType.RETURN],
  ["for", TokenType.FOR],
  ["while", TokenType.WHILE],
]);

module.exports = { TokenType, KeywordMap };
