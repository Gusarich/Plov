from sys import argv

from _lexer import lex
from _parser import parse


def get_key(tree):
    return next(iter(tree))


def check_tree(tree):
    return type(tree) == type({}) or type(tree) == type([])


def encode(value):
    if type(value) == type(0) or [1 for c in value if c in '0123456789']:
        ret = hex(int(value))[2:]
    else:
        ret = ''.join('{:02x}'.format(ord(c)) for c in value)
    length = hex(len(ret))[2:]
    return '0' * (2 - len(length)) + length + ret


def compile(tree):
    global code

    if not check_tree(tree):
        if tree[0] == 'NUMBER' or tree[0] == 'STRING':
            code += f'1101{encode(tree[1])};'
            return
        elif tree[0] == 'LITERAL':
            code += f'1102{encode(tree[1])};'
            return

    key = get_key(tree)
    val = tree[key]

    if key[0] == 'INT':
        code += f'1301{encode(val[1])};'
    elif key[0] == 'STR':
        code += f'1302{encode(val[1])};'
    elif key[0] == 'BOOL':
        code += f'1303{encode(val[1])};'

    elif key[0] == 'SET':
        if check_tree(val[1]):
            compile(val[1])
            code += f'14{encode(val[0][1])};'
        else:
            if val[1][0] == 'LITERAL':
                code += f'1102{encode(val[1][1])};'
            elif val[1][0] == 'BOOLEAN':
                if val[1][1] == 'true':
                    code += f'1101011;'
                else:
                    code += f'1101010;'
            else:
                code += f'1101{encode(val[1][1])};'
            code += f'14{encode(val[0][1])};'

    elif key[0] in ['OR', 'AND']:
        if check_tree(val[0]):
            compile(val[0])
        else:
            if val[0][0] == 'LITERAL':
                code += f'1102{encode(val[0][1])};'
            else:
                code += f'1101{encode(val[0][1])};'

        if check_tree(val[1]):
            compile(val[1])
        else:
            if val[1][0] == 'LITERAL':
                code += f'1102{encode(val[1][1])};'
            else:
                code += f'1101{encode(val[1][1])};'

        if key[0] == 'OR':
            code += '20;'
        elif key[0] == 'AND':
            code += '21;'

    elif key[0] in ['PLUS', 'MINUS', 'MULT', 'DIV', 'MOD']:
        if check_tree(val[1]):
            compile(val[1])
        else:
            if val[1][0] == 'LITERAL':
                code += f'1102{encode(val[1][1])};'
            else:
                code += f'1101{encode(val[1][1])};'

        if check_tree(val[0]):
            compile(val[0])
        else:
            if val[0][0] == 'LITERAL':
                code += f'1102{encode(val[0][1])};'
            else:
                code += f'1101{encode(val[0][1])};'

        if key[0] == 'PLUS':
            code += '15;'
        elif key[0] == 'MINUS':
            code += '16;'
        elif key[0] == 'MULT':
            code += '17;'
        elif key[0] == 'DIV':
            code += '18;'
        elif key[0] == 'MOD':
            code += '19;'

    elif key[0] in ['EQUAL', 'NOT_EQUAL', 'LOWER', 'GREATER', 'LOWER_OR_EQUAL', 'GREATER_OR_EQUAL']:
        if check_tree(val[1]):
            compile(val[1])
        else:
            if val[1][0] == 'LITERAL':
                code += f'1102{encode(val[1][1])};'
            else:
                code += f'1101{encode(val[1][1])};'

        if check_tree(val[0]):
            compile(val[0])
        else:
            if val[0][0] == 'LITERAL':
                code += f'1102{encode(val[0][1])};'
            else:
                code += f'1101{encode(val[0][1])};'

        if key[0] == 'EQUAL':
            code += '1a;'
        elif key[0] == 'NOT_EQUAL':
            code += '1b;'
        elif key[0] == 'LOWER':
            code += '1c;'
        elif key[0] == 'GREATER':
            code += '1d;'
        elif key[0] == 'LOWER_OR_EQUAL':
            code += '1e;'
        elif key[0] == 'GREATER_OR_EQUAL':
            code += '1f;'

    elif key[0] == 'RETURN':
        if check_tree(val):
            compile(val)
        else:
            if val[1][0] == 'LITERAL':
                code += f'1102{encode(val[1][1])};'
            else:
                code += f'1101{encode(val[1][1])};'
        code += '25;'

    elif key[0] == 'IF':
        is_else = len(val) == 3

        if check_tree(val[0]):
            compile(val[0])
        else:
            if val[0][0] == 'LITERAL':
                code += f'1102{encode(val[0][1])};'
            else:
                code += f'1101{encode(val[0][1])};'

        ln = len(jump_lines)
        code += f'24[{ln}];'
        jump_lines[ln] = -1

        for tr in val[1]:
            if check_tree(tr):
                compile(tr)
            else:
                if tr[0] == 'LITERAL':
                    code += f'1102{encode(tr[1])};'
                else:
                    code += f'1101{encode(tr[1])};'

        jump_lines[ln] = code.count(';') + is_else

        if is_else:
            else_ln = len(jump_lines)
            code += f'23[{else_ln}];'
            jump_lines[else_ln] = -1

        if is_else:
            for tr in val[2]:
                if check_tree(tr):
                    compile(tr)
                else:
                    if tr[0] == 'LITERAL':
                        code += f'1102{encode(tr[1])};'
                    else:
                        code += f'1101{encode(tr[1])};'

            jump_lines[else_ln] = code.count(';')

    elif key[0] == 'WHILE':
        after_jmp = code.count(';')

        if check_tree(val[0]):
            compile(val[0])
        else:
            if val[0][0] == 'LITERAL':
                code += f'1102{encode(val[0][1])};'
            else:
                code += f'1101{encode(val[0][1])};'

        ln = len(jump_lines)
        code += f'24[{ln}];'
        jump_lines[ln] = -1

        for tr in val[1]:
            if check_tree(tr):
                compile(tr)
            else:
                if tr[0] == 'LITERAL':
                    code += f'1102{encode(tr[1])};'
                else:
                    code += f'1101{encode(tr[1])};'

        code += f'23{encode(after_jmp)};'
        jump_lines[ln] = code.count(';')


with open(argv[1], 'r') as f:
    code = f.read()

tokens = lex(code)
tree = parse(tokens)
jump_lines = {}
code = '10010;'
for line in tree:
    compile(line)

code = code.replace(';', '')

for k, v in jump_lines.items():
    code = code.replace(f'[{k}]', encode(v), 1)

with open(argv[1] + 'a', 'w') as f:
    f.write(code)
