from scoping import scoping


PRIORITIES = [
    ['SET'],
    ['OR'],
    ['AND'],
    ['EQUAL', 'NOT_EQUAL', 'LOWER', 'GREATER', 'LOWER_OR_EQUAL', 'GREATER_OR_EQUAL'],
    ['PLUS', 'MINUS'],
    ['MULT', 'DIV'],
]


def split(tokens):
    lines = [[]]
    for token in tokens:
        if token[0] == 'SEMICOLON':
            lines.append([])
        else:
            lines[-1].append(token)
    lines.pop()
    return lines


def find_bracket_end(tokens, bracket='BRACKET'):
    brackets = 0
    for index, token in enumerate(tokens):
        if not check_tree(token) and token[0] == 'LEFT_' + bracket:
            brackets += 1
        elif not check_tree(token) and token[0] == 'RIGHT_' + bracket:
            brackets -= 1
            if brackets == 0:
                return index
    return len(tokens)


def expand_brackets(tokens):
    for index, token in enumerate(tokens):
        if not check_tree(token) and token[0] == 'LEFT_BRACKET':
            bracket = find_bracket_end(tokens[index:])
            parsed = parse_(tokens[index + 1:index + bracket])
            if check_tree(parsed):
                parsed = [parsed]
            return tokens[:index] + parsed + tokens[index + bracket + 1:]
    return False


def check_tree(tree):
    return type(tree) == type({}) or type(tree) == type([])


def parse_(tokens, priority=0):
    tree = {}

    # Step 1: Expand brackets
    expanded = expand_brackets(tokens)
    if expanded:
        tokens = expanded

    if not tokens:
        return tree

    check = check_tree(tokens[0])

    if not check and tokens[0][0] == 'RETURN':
        tree = [{tokens[0]: parse_(tokens[1:])}]
    elif not check and tokens[0][0] in ['INT', 'STR']:
        if tokens[1][0] == 'LITERAL':
            if len(tokens) > 2:
                tree = [{tokens[0]: tokens[1]}, parse_(tokens[1:])]
            else:
                tree = {tokens[0]: tokens[1]}
    else:
        for priority_tokens in PRIORITIES:
            for index, token in enumerate(tokens):
                if not check_tree(token) and token[0] in priority_tokens:
                    tree = {token: [parse_(tokens[:index]), parse_(tokens[index + 1:])]}
                    break
            else:
                continue
            break
        else:
            if len(tokens) == 1:
                return tokens[0]
            return tokens

    return tree


def parse(tokens):
    line = []
    tree = []
    wait_for_body = False

    index = 0

    while index < len(tokens):
        token = tokens[index]

        if token[0] in ['IF', 'WHILE']:
            ind = index + 1 + find_bracket_end(tokens[index + 1:])
            condition = tokens[index + 2:ind]

            end = find_bracket_end(tokens[ind:], 'CURLY_BRACKET')
            body = tokens[ind + 2:ind + end]

            condition, body = parse_(condition), parse(body)
            tree.append({token: [condition, body]})

            index = ind + end
        elif token[0] == 'SEMICOLON':
            parsed = parse_(line)
            if type(parsed) == type([]):
                tree += parsed
            else:
                tree.append(parsed)
            line = []
        else:
            line.append(token)

        index += 1

    return tree


"""
def pretty(d, indent=0):
    if type(d) != type({}):
        print(' ' * indent + str(d))
    else:
        for key, value in d.items():
            print(' ' * indent + str(key))
            if type(value) == type([]):
                for t in value:
                    pretty(t, indent + 2)
            else:
                if isinstance(value, dict):
                    pretty(value, indent + 2)
                else:
                    print(' ' * (indent + 2) + str(value))


from lexer import lex

with open('example/code.pf', 'r') as f:
    code = f.read()

tokens = lex(code)
tree = parse(tokens)

for dic in tree:
    pretty(dic)
    print('\n')
"""
