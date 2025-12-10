"use strict";

// TokenType definition (same as in main.js)
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

class ParseError extends Error {
  constructor(message, token) {
    super(
      token ? `${message} at line ${token.line}, col ${token.col}` : message
    );
    this.name = "ParseError";
  }
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.current = 0;
  }

  // ========= Helpers =========

  peek() {
    return this.tokens[this.current];
  }

  previous() {
    return this.tokens[this.current - 1];
  }

  isAtEnd() {
    return this.peek().type === TokenType.EOF;
  }

  check(type) {
    if (this.isAtEnd()) {
      return type === TokenType.EOF;
    }
    return this.peek().type === type;
  }

  advance() {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  match(...types) {
    for (const t of types) {
      if (this.check(t)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  expect(type, message) {
    if (this.check(type)) return this.advance();
    throw new ParseError(message, this.peek());
  }

  // ========= Entry =========

  parseProgram() {
    const func = this.parseFunction();
    this.expect(TokenType.EOF, "Expected end of file");
    return {
      type: "Program",
      functions: [func],
    };
  }

  // ========= Top level =========

  parseFunction() {
    this.expect(TokenType.INT, "Expected 'int' at start of function");
    const nameTok = this.expect(TokenType.ID, "Expected function name");
    this.expect(TokenType.LPAREN, "Expected '(' after function name");
    this.expect(TokenType.RPAREN, "Expected ')' after parameters");
    const body = this.parseBlock();
    return {
      type: "Function",
      returnType: "int",
      name: nameTok.lexeme,
      body,
    };
  }

  parseBlock() {
    this.expect(TokenType.LBRACE, "Expected '{' to start block");
    const items = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      if (this.check(TokenType.INT)) {
        items.push(this.parseDeclaration());
      } else {
        items.push(this.parseStatement());
      }
    }
    this.expect(TokenType.RBRACE, "Expected '}' to end block");
    return {
      type: "Block",
      items,
    };
  }

  parseDeclaration() {
    this.expect(TokenType.INT, "Expected 'int' in declaration");
    const names = [];
    const first = this.expect(
      TokenType.ID,
      "Expected identifier in declaration"
    );
    names.push(first.lexeme);
    while (this.match(TokenType.COMMA)) {
      const idTok = this.expect(TokenType.ID, "Expected identifier after ','");
      names.push(idTok.lexeme);
    }
    this.expect(TokenType.SEMI, "Expected ';' after declaration");
    return {
      type: "VarDecl",
      names,
    };
  }

  // ========= Statements =========

  parseStatement() {
    if (this.match(TokenType.IF)) return this.parseIfStatement();
    if (this.match(TokenType.RETURN)) return this.parseReturnStatement();
    if (this.check(TokenType.LBRACE)) return this.parseBlock();
    return this.parseExprStatement();
  }

  parseIfStatement() {
    this.expect(TokenType.LPAREN, "Expected '(' after 'if'");
    const condition = this.parseExpression();
    this.expect(TokenType.RPAREN, "Expected ')' after if condition");
    const thenBranch = this.parseStatement();
    let elseBranch = null;
    if (this.match(TokenType.ELSE)) {
      elseBranch = this.parseStatement();
    }
    return {
      type: "IfStmt",
      condition,
      thenBranch,
      elseBranch,
    };
  }

  parseReturnStatement() {
    let expr = null;
    if (!this.check(TokenType.SEMI)) {
      expr = this.parseExpression();
    }
    this.expect(TokenType.SEMI, "Expected ';' after return");
    return {
      type: "ReturnStmt",
      expression: expr,
    };
  }

  parseExprStatement() {
    const expr = this.parseExpression();
    this.expect(TokenType.SEMI, "Expected ';' after expression");
    return {
      type: "ExprStmt",
      expression: expr,
    };
  }

  // ========= Expressions =========

  parseExpression() {
    // assignment = ID '=' expression | equality
    if (
      this.check(TokenType.ID) &&
      this.tokens[this.current + 1].type === TokenType.ASSIGN
    ) {
      const idTok = this.advance(); // consume ID
      this.advance(); // consume '='
      const value = this.parseExpression();
      return {
        type: "AssignExpr",
        name: idTok.lexeme,
        value,
      };
    }
    return this.parseEquality();
  }

  parseEquality() {
    let expr = this.parseRelational();
    while (this.match(TokenType.EQ, TokenType.NE)) {
      const op = this.previous();
      const right = this.parseRelational();
      expr = {
        type: "BinaryExpr",
        operator: op.lexeme,
        left: expr,
        right,
      };
    }
    return expr;
  }

  parseRelational() {
    let expr = this.parseAdditive();
    while (this.match(TokenType.LT, TokenType.GT, TokenType.LE, TokenType.GE)) {
      const op = this.previous();
      const right = this.parseAdditive();
      expr = {
        type: "BinaryExpr",
        operator: op.lexeme,
        left: expr,
        right,
      };
    }
    return expr;
  }

  parseAdditive() {
    let expr = this.parseMultiplicative();
    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const op = this.previous();
      const right = this.parseMultiplicative();
      expr = {
        type: "BinaryExpr",
        operator: op.lexeme,
        left: expr,
        right,
      };
    }
    return expr;
  }

  parseMultiplicative() {
    let expr = this.parseUnary();
    while (this.match(TokenType.STAR, TokenType.SLASH)) {
      const op = this.previous();
      const right = this.parseUnary();
      expr = {
        type: "BinaryExpr",
        operator: op.lexeme,
        left: expr,
        right,
      };
    }
    return expr;
  }

  parseUnary() {
    if (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const op = this.previous();
      const right = this.parseUnary();
      return {
        type: "UnaryExpr",
        operator: op.lexeme,
        argument: right,
      };
    }
    return this.parsePrimary();
  }

  parsePrimary() {
    if (this.match(TokenType.INT_LIT, TokenType.FLOAT_LIT)) {
      return {
        type: "Literal",
        value: this.previous().lexeme,
      };
    }

    if (this.match(TokenType.ID)) {
      return {
        type: "Identifier",
        name: this.previous().lexeme,
      };
    }

    if (this.match(TokenType.LPAREN)) {
      const expr = this.parseExpression();
      this.expect(TokenType.RPAREN, "Expected ')' after expression");
      return expr;
    }

    throw new ParseError("Expected expression", this.peek());
  }
}

module.exports = {
  Parser,
  ParseError,
};
