import re


TOKENS = [
    ['INT', r'int\s+'],
    ['STR', r'str\s+'],
    ['RETURN', r'return'],
    ['IF', r'if'],
    ['WHILE', r'while'],
    ['NUMBER', r'\d+'],
    ['LITERAL', r'\w+'],
    ['OR', r'\|\|'],
    ['AND', r'\&\&'],
    ['EQUAL', r'=='],
    ['NOT_EQUAL', r'!='],
    ['LOWER_OR_EQUAL', r'<='],
    ['GREATER_OR_EQUAL', r'>='],
    ['LOWER', r'<'],
    ['GREATER', r'>'],
    ['SET', r'='],
    ['PLUS', r'\+'],
    ['MINUS', r'-'],
    ['MULT', r'\*'],
    ['DIV', r'/'],
    ['MOD', r'%'],
    ['LEFT_BRACKET', r'\('],
    ['RIGHT_BRACKET', r'\)'],
    ['LEFT_CURLY_BRACKET', r'\{'],
    ['RIGHT_CURLY_BRACKET', r'\}'],
    ['STRING', r'".*"'],
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
