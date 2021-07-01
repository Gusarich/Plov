from time import sleep
from sys import exit
import lib


COLORS = {
    'header': '\033[95m',
    'description': '\033[90m',
    'passed': '\033[93m',
    'failed': '\033[91m',
    'clear': '\x1b[0m'
}
LOGGING = True

total_tests = 1
passed_tests = 0


# TEST 1
print(COLORS['header'] + 'Test #1')
print(COLORS['description'] + 'Start several nodes' + COLORS['clear'])

lib.run_in_background('--ws-port 11100 --genesis', logging=LOGGING)
sleep(0.1)
lib.run_in_background('--ws-port 11101 --peer ws://127.0.0.1:11100', logging=LOGGING)
sleep(0.1)
lib.run_in_background('--ws-port 11102 --peer ws://127.0.0.1:11100', logging=LOGGING)
sleep(0.1)
lib.run_in_background('--ws-port 11103 --http-port 8080 --peer ws://127.0.0.1:11101', logging=LOGGING)
sleep(0.1)
lib.run_in_background('--ws-port 11104 --peer ws://127.0.0.1:11102', logging=LOGGING)
sleep(0.1)
lib.run_in_background('--ws-port 11105 --http-port 8081 --peer ws://127.0.0.1:11104', logging=LOGGING)
sleep(0.1)
lib.run_in_background('--ws-port 11106 --peer ws://127.0.0.1:11104', logging=LOGGING)
sleep(5)
lib.run_in_background('--ws-port 11107 --peer ws://127.0.0.1:11102', logging=LOGGING)
sleep(3)

if all(lib.status):
    passed_tests += 1
    print(COLORS['passed'] + 'Test passed ✔')
else:
    print(COLORS['failed'] + 'Test failed ✘')
print(f'Total {passed_tests}/{total_tests}' + COLORS['clear'])


for process in lib.processes:
    process.kill()
exit(passed_tests != total_tests)
