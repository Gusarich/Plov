from time import sleep
from sys import exit
import requests
import lib
import os


def print_after_test(passed):
    global total_tests, passed_tests
    if passed:
        passed_tests += 1
        print(COLORS['passed'] + 'Test passed ✔')
    else:
        print(COLORS['failed'] + 'Test failed ✘')
        try:
            os.remove('kp1')
            os.remove('kp2')
        except Exception as e:
            print(e)
        for process in lib.processes:
            process.kill()
        exit(passed_tests != total_tests)
    print(f'Total {passed_tests}/{total_tests}' + COLORS['clear'])


COLORS = {
    'header': '\033[95m',
    'description': '\033[90m',
    'passed': '\033[93m',
    'failed': '\033[91m',
    'clear': '\x1b[0m'
}
LOGGING = True

total_tests = 4
passed_tests = 0


# TEST 1
try:
    print(COLORS['header'] + 'Test #1')
    print(COLORS['description'] + 'Generate keypairs' + COLORS['clear'])

    run1 = lib.run_and_wait('plov keypair generate --path kp1', logging=LOGGING)
    run2 = lib.run_and_wait('plov keypair generate --path kp2', logging=LOGGING)

    pb1, pb2 = run1.split('\n')[-2], run2.split('\n')[-2]

    passed = run1.startswith('Keypair generated!') and run2.startswith('Keypair generated!')
except Exception as e:
    print(e)
    passed = False
print_after_test(passed)


# TEST 2
try:
    print(COLORS['header'] + 'Test #2')
    print(COLORS['description'] + 'Start several nodes' + COLORS['clear'])

    lib.run_in_background('--ws-port 11100 --genesis --keypair kp1', logging=LOGGING)
    sleep(0.2)
    lib.run_in_background('--ws-port 11101 --peer ws://127.0.0.1:11100', logging=LOGGING)
    sleep(0.2)
    lib.run_in_background('--ws-port 11102 --peer ws://127.0.0.1:11100', logging=LOGGING)
    sleep(0.2)
    lib.run_in_background('--ws-port 11103 --http-port 8080 --peer ws://127.0.0.1:11101', logging=LOGGING)
    sleep(0.2)
    lib.run_in_background('--ws-port 11104 --peer ws://127.0.0.1:11102', logging=LOGGING)
    sleep(0.2)
    lib.run_in_background('--ws-port 11105 --http-port 8081 --peer ws://127.0.0.1:11104', logging=LOGGING)
    sleep(3)

    passed = all(lib.status)
except Exception as e:
    print(e)
    passed = False
print_after_test(passed)


# TEST 3
try:
    print(COLORS['header'] + 'Test #3')
    print(COLORS['description'] + 'Check balance' + COLORS['clear'])
    run1 = lib.run_and_wait(f'plov balance --account {pb1} --node http://127.0.0.1:8080', logging=LOGGING)
    run2 = lib.run_and_wait(f'plov balance --account {pb2} --node http://127.0.0.1:8080', logging=LOGGING)
    passed = run1 == '1000\n' and run2 == '0\n' and all(lib.status)
except Exception as e:
    print(e)
    passed = False
print_after_test(passed)


# TEST 4
try:
    print(COLORS['header'] + 'Test #4')
    print(COLORS['description'] + 'Transfer crypto' + COLORS['clear'])
    run = lib.run_and_wait(f'plov transfer 10 {pb2} --account kp1 --node http://127.0.0.1:8080', logging=LOGGING)
    passed = run.startswith('Success!') and all(lib.status)
    if passed:
        sleep(2)
        run1 = lib.run_and_wait(f'plov balance --account {pb1} --node http://127.0.0.1:8080', logging=LOGGING)
        run2 = lib.run_and_wait(f'plov balance --account {pb2} --node http://127.0.0.1:8080', logging=LOGGING)
        passed = run1 == '990\n' and run2 == '10\n' and all(lib.status)
        if passed:
            run = lib.run_and_wait(f'plov transfer 1.23 {pb1} --account kp2 --node http://127.0.0.1:8080', logging=LOGGING)
            passed = run.startswith('Success!') and all(lib.status)
            if passed:
                sleep(2)
                run1 = lib.run_and_wait(f'plov balance --account {pb1} --node http://127.0.0.1:8080', logging=LOGGING)
                run2 = lib.run_and_wait(f'plov balance --account {pb2} --node http://127.0.0.1:8080', logging=LOGGING)
                passed = run1 == '991.23\n' and run2 == '8.77\n' and all(lib.status)
except Exception as e:
    print(e)
    passed = False
print_after_test(passed)


try:
    os.remove('kp1')
    os.remove('kp2')
except Exception as e:
    print(e)


for process in lib.processes:
    process.kill()
exit(passed_tests != total_tests)
