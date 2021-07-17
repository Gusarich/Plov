import re


TOKENS = [
    ['INT', r'int\s+'],
    ['RETURN', r'return'],
    ['NUMBER', r'\d+'],
    ['LITERAL', r'\w+'],
    ['EQUAL', r'=='],
    ['SET', r'='],
    ['PLUS', r'\+'],
    ['MINUS', r'-'],
    ['MULT', r'\*'],
    ['DIV', r'/'],
    ['LEFT_BRACKET', r'\('],
    ['RIGHT_BRACKET', r'\)'],
    ['SEMICOLON', r';']
]


def lex(text):
    tokens = []

    while text:
        if text.startswith('#'):
            text = text[text.index('\n') + 1:]
            continue
        found_token = False
        for token in TOKENS:
            match = re.match(token[1], text)
            if match:
                found_token = True
                break
        if not match or match.span()[1] == 0:
            match = re.match('\s+', text)
            if not match:
                break
        text = text[match.span()[1]:]
        if found_token:
            tokens.append((token[0], match.group(0)))

    return tokens
