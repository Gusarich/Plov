from lexer import lex
from parser import parse


def get_key(tree):
    return next(iter(tree))


def check_tree(tree):
    return type(tree) == type({}) or type(tree) == type([])


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
            code += 'sum;\n'
        elif key[0] == 'MINUS':
            code += 'sub;\n'
        elif key[0] == 'MULT':
            code += 'mul;\n'
        elif key[0] == 'DIV':
            code += 'div;\n'

    elif key[0] in ['EQUAL', 'NOT_EQUAL', 'LOWER', 'GREATER', 'LOWER_OR_EQUAL', 'GREATER_OR_EQUAL']:
        if check_tree(val[1]):
            compile(val[1])
        else:
            code += f'push {val[1][1]};\n'

        if check_tree(val[0]):
            compile(val[0])
        else:
            code += f'push {val[0][1]};\n'

        if key[0] == 'EQUAL':
            code += 'eq;\n'
        elif key[0] == 'NOT_EQUAL':
            code += 'eq;\nrev;'
        elif key[0] == 'LOWER':
            code += 'lt;\n'
        elif key[0] == 'GREATER':
            code += 'gt;\n'
        elif key[0] == 'LOWER_OR_EQUAL':
            code += 'lt;\neq;\nor;'
        elif key[0] == 'GREATER_OR_EQUAL':
            code += 'gt;\neq;\nor;'

    elif key[0] == 'IF':
        if check_tree(val[0]):
            compile(val[0])
        else:
            code += f'push {val[0][1]};\n'

        ln = len(jump_lines)
        code += f'rev;\njmp [{ln}];\n'
        jump_lines[ln] = -1

        for tr in val[1]:
            if check_tree(tr):
                compile(tr)
            else:
                code += f'push {tr[1]};\n'
        jump_lines[ln] = str(code.count(';'))


with open('example/code.pf', 'r') as f:
    code = f.read()

tokens = lex(code)
tree = parse(tokens)
jump_lines = {}
code = 'begin "";\n'
for line in tree:
    compile(line)


for k, v in jump_lines.items():
    code = code.replace(f'[{k}]', str(v), 1)

print(code)
