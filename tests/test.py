from time import sleep
from sys import argv
from collections import namedtuple
import os
import random
import shutil

import colorama

import lib

AnsiAppColors = namedtuple(
    'AnsiAppColors',
    ['header', 'description', 'passed', 'failed', 'user_default']
)
COLORS = AnsiAppColors(
    header='\033[95m',
    description='\033[90m',
    passed='\033[93m',
    failed='\033[91m',
    user_default='\033[39m',
)

if lib.IS_LINUX:
    PASSED_TEXT = 'Test passed ✔'
    FAILED_TEXT = 'Test failed ✘'
else:
    PASSED_TEXT = 'Test passed'
    FAILED_TEXT = 'Test failed'
    colorama.init()


def print_after_test(passed):
    global passed_tests
    if passed:
        passed_tests += 1
        print(COLORS.passed + PASSED_TEXT)
    else:
        print(COLORS.failed + FAILED_TEXT)
        if CAN_WRITE:
            try:
                shutil.rmtree('tmp')
            except Exception as e:
                print(e)
        for process in lib.processes:
            process.kill()
        exit(passed_tests != total_tests)
    print(f'Total {passed_tests}/{total_tests}' + COLORS.user_default)
    sleep(1)


LOGGING = True
CAN_WRITE = argv[-1] != '--nofile'
WS_PORT = random.randint(10000, 20000)
HTTP_PORT = random.randint(8000, 10000)

total_tests = 5
passed_tests = 0

# TEST 1
try:
    print(COLORS.header + 'Test #1')
    print(COLORS.description + 'Generate keypairs' + COLORS.user_default)

    if CAN_WRITE:
        os.makedirs('tmp', exist_ok=True)
        run1 = lib.run_and_wait('plov keypair generate --path tmp/kp1', logging=LOGGING)
        run2 = lib.run_and_wait('plov keypair generate --path tmp/kp2', logging=LOGGING)
        pk1, pk2 = run1.split('\n')[2], run2.split('\n')[2]
    else:
        run1 = lib.run_and_wait('plov keypair generate --nofile', logging=LOGGING)
        run2 = lib.run_and_wait('plov keypair generate --nofile', logging=LOGGING)
        pk1, pk2 = run1.split('\n')[2], run2.split('\n')[2]
        sk1, sk2 = run1.split('\n')[4], run2.split('\n')[4]

    passed = run1.startswith('Keypair generated!') and run2.startswith('Keypair generated!')
except Exception as e:
    print(e)
    passed = False
print_after_test(passed)

# TEST 2
try:
    print(COLORS.header + 'Test #2')
    print(COLORS.description + 'Start several nodes' + COLORS.user_default)

    if CAN_WRITE:
        lib.run_in_background(f'--ws-port {WS_PORT} --genesis --keypair tmp/kp1', logging=LOGGING)
    else:
        lib.run_in_background(f'--ws-port {WS_PORT} --genesis --keypair ' + sk1, logging=LOGGING)
    sleep(0.2)
    lib.run_in_background(f'--ws-port {WS_PORT + 1} --peer ws://127.0.0.1:{WS_PORT}', logging=LOGGING)
    sleep(0.2)
    if CAN_WRITE:
        lib.run_in_background(f'--ws-port {WS_PORT + 2} --peer ws://127.0.0.1:{WS_PORT} --keypair tmp/kp2',
                              logging=LOGGING)
    else:
        lib.run_in_background(f'--ws-port {WS_PORT + 2} --peer ws://127.0.0.1:{WS_PORT} --keypair ' + sk2,
                              logging=LOGGING)
    sleep(0.2)
    lib.run_in_background(f'--ws-port {WS_PORT + 3} --http-port {HTTP_PORT} --peer ws://127.0.0.1:{WS_PORT + 1}',
                          logging=LOGGING)
    sleep(0.2)
    lib.run_in_background(f'--ws-port {WS_PORT + 4} --peer ws://127.0.0.1:{WS_PORT + 2}', logging=LOGGING)
    sleep(0.2)
    lib.run_in_background(f'--ws-port {WS_PORT + 5} --http-port {HTTP_PORT + 1} --peer ws://127.0.0.1:{WS_PORT + 4}',
                          logging=LOGGING)
    sleep(3)

    passed = all(lib.status)
except Exception as e:
    print(e)
    passed = False
print_after_test(passed)

# TEST 3
try:
    print(COLORS.header + 'Test #3')
    print(COLORS.description + 'Check balance' + COLORS.user_default)
    run1 = lib.run_and_wait(f'plov balance --account {pk1} --node http://127.0.0.1:{HTTP_PORT}', logging=LOGGING)
    run2 = lib.run_and_wait(f'plov balance --account {pk2} --node http://127.0.0.1:{HTTP_PORT}', logging=LOGGING)
    passed = run1 == '1000\n' and run2 == '0\n' and all(lib.status)
except Exception as e:
    print(e)
    passed = False
print_after_test(passed)

# TEST 4
try:
    print(COLORS.header + 'Test #4')
    print(COLORS.description + 'Transfer crypto' + COLORS.user_default)
    if CAN_WRITE:
        run = lib.run_and_wait(f'plov transfer 10 {pk2} --account tmp/kp1 --node http://127.0.0.1:{HTTP_PORT}',
                               logging=LOGGING)
    else:
        run = lib.run_and_wait(f'plov transfer 10 {pk2} --account {sk1} --node http://127.0.0.1:{HTTP_PORT}',
                               logging=LOGGING)
    passed = run.startswith('Success!') and all(lib.status)
    if passed:
        sleep(3)
        run1 = lib.run_and_wait(f'plov balance --account {pk1} --node http://127.0.0.1:{HTTP_PORT + 1}',
                                logging=LOGGING)
        run2 = lib.run_and_wait(f'plov balance --account {pk2} --node http://127.0.0.1:{HTTP_PORT + 1}',
                                logging=LOGGING)
        passed = run1 == '990\n' and run2 == '10\n' and all(lib.status)
        if passed:
            if CAN_WRITE:
                run = lib.run_and_wait(
                    f'plov transfer 1.23 {pk1} --account tmp/kp2 --node http://127.0.0.1:{HTTP_PORT + 1}',
                    logging=LOGGING)
            else:
                run = lib.run_and_wait(
                    f'plov transfer 1.23 {pk1} --account {sk2} --node http://127.0.0.1:{HTTP_PORT + 1}',
                    logging=LOGGING)
            passed = run.startswith('Success!') and all(lib.status)
            if passed:
                sleep(3)
                run1 = lib.run_and_wait(f'plov balance --account {pk1} --node http://127.0.0.1:{HTTP_PORT}',
                                        logging=LOGGING)
                run2 = lib.run_and_wait(f'plov balance --account {pk2} --node http://127.0.0.1:{HTTP_PORT}',
                                        logging=LOGGING)
                passed = run1 == '991.23\n' and run2 == '8.77\n' and all(lib.status)
except Exception as e:
    print(e)
    passed = False
print_after_test(passed)

# TEST 5
try:
    print(COLORS.header + 'Test #5')
    print(COLORS.description + 'Staking and unstaking' + COLORS.user_default)
    if CAN_WRITE:
        run = lib.run_and_wait(f'plov stake 1.77 --account tmp/kp2 --node http://127.0.0.1:{HTTP_PORT}',
                               logging=LOGGING)
    else:
        run = lib.run_and_wait(f'plov stake 1.77 --account {sk2} --node http://127.0.0.1:{HTTP_PORT}', logging=LOGGING)
    passed = run.startswith('Success!') and all(lib.status)
    if passed:
        sleep(3)
        run1 = lib.run_and_wait(f'plov balance --account {pk2} --node http://127.0.0.1:{HTTP_PORT + 1}',
                                logging=LOGGING)
        passed = run1 == '7\n' and all(lib.status)
        if passed:
            if CAN_WRITE:
                run = lib.run_and_wait(f'plov unstake 1.78 --account tmp/kp2 --node http://127.0.0.1:{HTTP_PORT + 1}',
                                       logging=LOGGING)
            else:
                run = lib.run_and_wait(f'plov unstake 1.78 --account {sk2} --node http://127.0.0.1:{HTTP_PORT + 1}',
                                       logging=LOGGING)
            passed = run.startswith('Error!') and all(lib.status)
            if passed:
                if CAN_WRITE:
                    run = lib.run_and_wait(
                        f'plov unstake 1.76 --account tmp/kp2 --node http://127.0.0.1:{HTTP_PORT + 1}', logging=LOGGING)
                else:
                    run = lib.run_and_wait(f'plov unstake 1.76 --account {sk2} --node http://127.0.0.1:{HTTP_PORT + 1}',
                                           logging=LOGGING)
                passed = run.startswith('Success!') and all(lib.status)
                if passed:
                    sleep(3)
                    run1 = lib.run_and_wait(f'plov balance --account {pk2} --node http://127.0.0.1:{HTTP_PORT}',
                                            logging=LOGGING)
                    passed = run1 == '8.76\n' and all(lib.status)
                    if passed:
                        if CAN_WRITE:
                            run = lib.run_and_wait(
                                f'plov unstake 0.01 --account tmp/kp2 --node http://127.0.0.1:{HTTP_PORT}',
                                logging=LOGGING)
                        else:
                            run = lib.run_and_wait(
                                f'plov unstake 0.01 --account {sk2} --node http://127.0.0.1:{HTTP_PORT}',
                                logging=LOGGING)
                        passed = run.startswith('Success!') and all(lib.status)
                        if passed:
                            sleep(3)
                            run1 = lib.run_and_wait(
                                f'plov balance --account {pk2} --node http://127.0.0.1:{HTTP_PORT + 1}',
                                logging=LOGGING)
                            passed = run1 == '8.77\n' and all(lib.status)
except Exception as e:
    print(e)
    passed = False
print_after_test(passed)

if CAN_WRITE:
    try:
        shutil.rmtree('tmp')
    except Exception as e:
        print(e)

for process in lib.processes:
    process.kill()
exit(passed_tests != total_tests)
