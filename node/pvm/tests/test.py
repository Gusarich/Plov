import subprocess
import os
import json


def run_and_wait(cmd, logging):
    output = subprocess.check_output(cmd, shell=True)
    if logging:
        print(output.decode())
    return output.decode()


COLORS = {
    'header': '\033[95m',
    'description': '\033[90m',
    'passed': '\033[93m',
    'failed': '\033[91m',
    'clear': '\x1b[0m'
}

files = os.listdir()
files.remove('test.py')
files = [i for i in files if not i.endswith('.pfa')]

passed_tests = 0
total_tests = len(files)

for file in files:
    flag = False
    print('\n' + COLORS['header'] + file)
    with open(file, 'r') as f:
        a = f.readline()[2:-1]
        correct = json.loads(a)
    try:
        run_and_wait('python3.9 ../compiler.py ' + file, True)
        output = run_and_wait('node ../vm.js ' + file + 'a', False)
        stack = json.loads(output)[-len(correct):]
        if stack == correct:
            passed_tests += 1
            print(COLORS['passed'] + 'Test passed ✔')
            print(f'Total {passed_tests}/{total_tests}' + COLORS['clear'])
        else:
            print(COLORS['failed'] + 'Test failed ✘')
    except Exception as e:
        print(e)
        print(COLORS['failed'] + 'Test failed ✘')
        flag = True
    if flag:
        exit(1)
