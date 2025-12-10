"use strict";

const fs = require("fs");
const path = require("path");
const { Parser, ParseError } = require("./parser");

// ========= Token Types & Keywords =========
const TokenType = {
  IF: "IF",
  ELSE: "ELSE",
  INT: "INT",
  RETURN: "RETURN",
  FOR: "FOR",
  WHILE: "WHILE",
  ID: "ID",
  INT_LIT: "INT_LIT",
  FLOAT_LIT: "FLOAT_LIT",
  ASSIGN: "ASSIGN",
  EQ: "EQ",
  NE: "NE",
  LT: "LT",
  GT: "GT",
  LE: "LE",
  GE: "GE",
  PLUS: "PLUS",
  MINUS: "MINUS",
  STAR: "STAR",
  SLASH: "SLASH",
  MOD: "MOD",
  LPAREN: "LPAREN",
  RPAREN: "RPAREN",
  LBRACE: "LBRACE",
  RBRACE: "RBRACE",
  LBRACKET: "LBRACKET",
  RBRACKET: "RBRACKET",
  SEMI: "SEMI",
  COMMA: "COMMA",
  DOT: "DOT",
  EOF: "EOF",
};

const KeywordMap = new Map([
  ["if", TokenType.IF],
  ["else", TokenType.ELSE],
  ["int", TokenType.INT],
  ["return", TokenType.RETURN],
  ["for", TokenType.FOR],
  ["while", TokenType.WHILE],
]);

// ========= Token Class =========
class Token {
  constructor(type, lexeme, line, col) {
    this.type = type;
    this.lexeme = lexeme;
    this.line = line;
    this.col = col;
  }
}

// ========= Lexer Class =========
class Lexer {
  constructor(input) {
    this.input = input;
    this.len = input.length;
    this.i = 0;
    this.line = 1;
    this.col = 1;
  }

  peek(n = 0) {
    const idx = this.i + n;
    return idx >= this.len ? "\0" : this.input[idx];
  }

  advance(n = 1) {
    for (let k = 0; k < n; k++) {
      const ch = this.peek(0);
      this.i++;
      if (ch === "\n") {
        this.line++;
        this.col = 1;
      } else {
        this.col++;
      }
    }
  }

  makeToken(type, lexeme, line, col) {
    return new Token(type, lexeme, line, col);
  }

  isAlpha(ch) {
    return (ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z") || ch === "_";
  }

  isDigit(ch) {
    return ch >= "0" && ch <= "9";
  }

  isAlnum(ch) {
    return this.isAlpha(ch) || this.isDigit(ch);
  }

  skipWhitespaceAndComments() {
    for (;;) {
      while (/\s/.test(this.peek())) this.advance();

      if (this.peek() === "/" && this.peek(1) === "/") {
        while (this.peek() !== "\n" && this.peek() !== "\0") this.advance();
        continue;
      }

      if (this.peek() === "/" && this.peek(1) === "*") {
        this.advance(2);
        while (true) {
          if (this.peek() === "\0") {
            throw new Error(
              `Unterminated block comment at ${this.line}:${this.col}`
            );
          }
          if (this.peek() === "*" && this.peek(1) === "/") {
            this.advance(2);
            break;
          }
          this.advance();
        }
        continue;
      }

      break;
    }
  }

  readIdentifierOrKeyword() {
    const startLine = this.line,
      startCol = this.col;
    let s = "";
    while (this.isAlnum(this.peek())) {
      s += this.peek();
      this.advance();
    }
    const kwType = KeywordMap.get(s);
    if (kwType) return this.makeToken(kwType, s, startLine, startCol);
    return this.makeToken(TokenType.ID, s, startLine, startCol);
  }

  readNumber() {
    const startLine = this.line,
      startCol = this.col;
    let s = "";
    let seenDot = false;
    let seenExp = false;

    const readDigits = () => {
      let had = false;
      while (this.isDigit(this.peek())) {
        s += this.peek();
        this.advance();
        had = true;
      }
      return had;
    };

    const firstIsDigit = this.isDigit(this.peek());
    if (firstIsDigit) {
      readDigits();
    }

    if (this.peek() === "." && this.isDigit(this.peek(1))) {
      seenDot = true;
      s += ".";
      this.advance();
      readDigits();
    } else if (!firstIsDigit && this.peek() === ".") {
      return null;
    }

    if (this.peek() === "e" || this.peek() === "E") {
      const next = this.peek(1);
      const next2 = this.peek(2);
      if (
        this.isDigit(next) ||
        ((next === "+" || next === "-") && this.isDigit(next2))
      ) {
        seenExp = true;
        s += this.peek();
        this.advance();
        if (this.peek() === "+" || this.peek() === "-") {
          s += this.peek();
          this.advance();
        }
        if (!readDigits()) {
          throw new Error(`Malformed exponent at ${this.line}:${this.col}`);
        }
      }
    }

    const type = seenDot || seenExp ? TokenType.FLOAT_LIT : TokenType.INT_LIT;
    return this.makeToken(type, s, startLine, startCol);
  }

  readOperatorOrPunct() {
    const startLine = this.line,
      startCol = this.col;
    const two = this.peek() + this.peek(1);

    switch (two) {
      case "==":
        this.advance(2);
        return this.makeToken(TokenType.EQ, "==", startLine, startCol);
      case "!=":
        this.advance(2);
        return this.makeToken(TokenType.NE, "!=", startLine, startCol);
      case "<=":
        this.advance(2);
        return this.makeToken(TokenType.LE, "<=", startLine, startCol);
      case ">=":
        this.advance(2);
        return this.makeToken(TokenType.GE, ">=", startLine, startCol);
    }

    const ch = this.peek();
    this.advance(1);
    switch (ch) {
      case "=":
        return this.makeToken(TokenType.ASSIGN, "=", startLine, startCol);
      case "+":
        return this.makeToken(TokenType.PLUS, "+", startLine, startCol);
      case "-":
        return this.makeToken(TokenType.MINUS, "-", startLine, startCol);
      case "*":
        return this.makeToken(TokenType.STAR, "*", startLine, startCol);
      case "/":
        return this.makeToken(TokenType.SLASH, "/", startLine, startCol);
      case "%":
        return this.makeToken(TokenType.MOD, "%", startLine, startCol);
      case "(":
        return this.makeToken(TokenType.LPAREN, "(", startLine, startCol);
      case ")":
        return this.makeToken(TokenType.RPAREN, ")", startLine, startCol);
      case "{":
        return this.makeToken(TokenType.LBRACE, "{", startLine, startCol);
      case "}":
        return this.makeToken(TokenType.RBRACE, "}", startLine, startCol);
      case "[":
        return this.makeToken(TokenType.LBRACKET, "[", startLine, startCol);
      case "]":
        return this.makeToken(TokenType.RBRACKET, "]", startLine, startCol);
      case ";":
        return this.makeToken(TokenType.SEMI, ";", startLine, startCol);
      case ",":
        return this.makeToken(TokenType.COMMA, ",", startLine, startCol);
      case ".":
        return this.makeToken(TokenType.DOT, ".", startLine, startCol);
      default:
        throw new Error(
          `Unrecognized character '${ch}' at ${startLine}:${startCol}`
        );
    }
  }

  nextToken() {
    this.skipWhitespaceAndComments();
    const ch = this.peek();
    if (ch === "\0") {
      return this.makeToken(TokenType.EOF, null, this.line, this.col);
    }

    if (this.isAlpha(ch)) {
      return this.readIdentifierOrKeyword();
    }

    if (this.isDigit(ch) || (ch === "." && this.isDigit(this.peek(1)))) {
      const t = this.readNumber();
      if (t) return t;
    }

    return this.readOperatorOrPunct();
  }

  scanAll() {
    const out = [];
    for (;;) {
      const t = this.nextToken();
      out.push(t);
      if (t.type === TokenType.EOF) break;
    }
    return out;
  }
}

// ========= Token Type Conversion =========
function getTokenType(token) {
  const type = token.type;
  const lexeme = token.lexeme || "";

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
  if (type === TokenType.ID) return "IDENTIFIER";
  if (type === TokenType.INT_LIT || type === TokenType.FLOAT_LIT)
    return "NUMERIC_CONSTANT";
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
  if (type === TokenType.EOF) return null;

  return type;
}

// ========= Main Code =========
const inputPath = process.argv[2] || path.join(__dirname, "..", "input.c");
const source = fs.readFileSync(inputPath, "utf8");

const lexer = new Lexer(source);
const tokens = lexer.scanAll();

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
