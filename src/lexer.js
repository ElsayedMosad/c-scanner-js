"use strict";

const { TokenType, KeywordMap } = require("./tokenTypes");

class Token {
  constructor(type, lexeme, line, col) {
    this.type = type;
    this.lexeme = lexeme;
    this.line = line;
    this.col = col; // starting column
  }
  toString() {
    const lx = this.lexeme == null ? "" : ` "${this.lexeme}"`;
    return `${this.type}${lx} (${this.line}:${this.col})`;
  }
}

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
      // whitespace
      while (/\s/.test(this.peek())) this.advance();

      // line comment //
      if (this.peek() === "/" && this.peek(1) === "/") {
        while (this.peek() !== "\n" && this.peek() !== "\0") this.advance();
        continue;
      }

      // block comment /* ... */
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

    // Leading digits (optional if starts with .)
    const firstIsDigit = this.isDigit(this.peek());
    if (firstIsDigit) {
      readDigits();
    }

    // Decimal point
    if (this.peek() === "." && this.isDigit(this.peek(1))) {
      seenDot = true;
      s += ".";
      this.advance();
      readDigits();
    } else if (!firstIsDigit && this.peek() === ".") {
      // Lone '.', not a number (handled elsewhere as DOT)
      return null;
    }

    // Exponent part
    if (this.peek() === "e" || this.peek() === "E") {
      const next = this.peek(1);
      const next2 = this.peek(2);
      // require e[+|-]?digit
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
      default:
        break;
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

    // Identifier / keyword
    if (this.isAlpha(ch)) {
      return this.readIdentifierOrKeyword();
    }

    // Number (int/float)
    if (this.isDigit(ch) || (ch === "." && this.isDigit(this.peek(1)))) {
      const t = this.readNumber();
      if (t) return t;
    }

    // Operators / punctuation
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

module.exports = { Lexer, Token };
