def split(tokens):
    lines = [[]]
    for token in tokens:
        if token[0] == 'SEMICOLON':
            lines.append([])
        else:
            lines[-1].append(token)
    lines.pop()
    return lines


def find_bracket_end(tokens):
    brackets = 0
    for index, token in enumerate(tokens):
        if token[0] == 'LEFT_BRACKET':
            brackets += 1
        elif token[0] == 'RIGHT_BRACKET':
            brackets -= 1
        elif brackets == 0 and token[0] not in ['MULT', 'DIV', 'NUMBER', 'LITERAL']:
            return index
    else:
        return -1


def parse_(tokens):
    tree = {}

    if tokens[0][0] == 'INT':
        if tokens[1][0] == 'LITERAL':
            if len(tokens) > 2:
                tree = [{tokens[0]: tokens[1]}, parse_(tokens[1:])]
            else:
                tree = {tokens[0]: tokens[1]}

    elif tokens[0][0] in ['NUMBER', 'LITERAL']:
        if len(tokens) > 1:
            if tokens[1][0] == 'SET':
                tree = {tokens[1]: [tokens[0], parse_(tokens[2:])]}
            elif tokens[1][0] == 'EQUAL':
                tree = {tokens[1]: [parse_([tokens[0]]), parse_(tokens[2:])]}
            elif tokens[1][0] in ['PLUS', 'MINUS', 'MULT', 'DIV']:
                if tokens[1][0] in ['PLUS', 'MINUS']:
                    tree = {tokens[1]: [tokens[0], parse_(tokens[2:])]}
                else:
                    bracket_end = find_bracket_end(tokens[2:])
                    if bracket_end == -1:
                        tree = {tokens[1]: [tokens[0], parse_(tokens[2:])]}
                    else:
                        tree = {tokens[bracket_end + 2]: [parse_(tokens[:bracket_end + 2]), parse_(tokens[bracket_end + 3:])]}
        else:
            tree = tokens[0]

    elif tokens[0][0] == 'LEFT_BRACKET':
        if tokens[-1][0] == 'RIGHT_BRACKET':
            return parse_(tokens[1:-1])

    elif tokens[0][0] == 'RETURN':
        tree = [{tokens[0]: parse_(tokens[1:])}]

    return tree


def parse(tokens):
    lines = split(tokens)
    tree = []

    for line in lines:
        parsed = parse_(line)
        if type(parsed) == type([]):
            tree += parsed
        else:
            tree.append(parsed)

    return tree
