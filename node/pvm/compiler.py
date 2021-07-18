from lexer import lex
from parser import parse


def get_key(tree):
    return next(iter(tree))


def check_tree(tree):
    return type(tree) == type({})


def compile(tree):
    global code

    key = get_key(tree)
    val = tree[key]

    if key[0] == 'INT':
        code += f'var int, {val[1]};\n'
    elif key[0] == 'STR':
        code += f'var str, {val[1]};\n'
    elif key[0] == 'SET':
        if check_tree(val[1]):
            compile(val[1])
            code += f'set {val[0][1]};\n'
        else:
            code += f'push {val[1][1]};\n'
            code += f'set {val[0][1]};\n'
    elif key[0] in ['PLUS', 'MINUS', 'MULT', 'DIV']:
        if check_tree(val[1]):
            compile(val[1])
        else:
            code += f'push {val[1][1]};\n'

        if check_tree(val[0]):
            compile(val[0])
        else:
            code += f'push {val[0][1]};\n'

        if key[0] == 'PLUS':
            code += f'sum;\n'
        elif key[0] == 'MINUS':
            code += f'sub;\n'
        elif key[0] == 'MULT':
            code += f'mul;\n'
        elif key[0] == 'DIV':
            code += f'div;\n'


with open('example/code.pf', 'r') as f:
    code = f.read()

tokens = lex(code)
print(tokens)
tree = parse(tokens)
code = 'sub;\ntest;\nbegin "";\n'
for line in tree:
    compile(line)

print(code)
