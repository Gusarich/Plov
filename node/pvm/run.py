from lexer import lex
from parser import parse

with open('example/code.pf', 'r') as f:
    code = f.read()

tokens = lex(code)
tree = parse(tokens)

print(tree)
