from time import sleep
from sys import exit, argv
import requests
import lib
import shutil
import os


def print_after_test(passed):
    global total_tests, passed_tests
    if passed:
        passed_tests += 1
        print(COLORS['passed'] + 'Test passed ✔')
    else:
        print(COLORS['failed'] + 'Test failed ✘')
        if CAN_WRITE:
            try:
                shutil.rmtree('tmp')
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
CAN_WRITE = argv[-1] != '--nofile'

total_tests = 5
passed_tests = 0


# TEST 1
try:
    print(COLORS['header'] + 'Test #1')
    print(COLORS['description'] + 'Generate keypairs' + COLORS['clear'])

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
    print(COLORS['header'] + 'Test #2')
    print(COLORS['description'] + 'Start several nodes' + COLORS['clear'])

    if CAN_WRITE:
        lib.run_in_background('--ws-port 11100 --genesis --keypair tmp/kp1', logging=LOGGING)
    else:
        lib.run_in_background('--ws-port 11100 --genesis --keypair ' + sk1, logging=LOGGING)
    sleep(0.2)
    lib.run_in_background('--ws-port 11101 --peer ws://127.0.0.1:11100', logging=LOGGING)
    sleep(0.2)
    if CAN_WRITE:
        lib.run_in_background('--ws-port 11102 --peer ws://127.0.0.1:11100 --keypair tmp/kp2', logging=LOGGING)
    else:
        lib.run_in_background('--ws-port 11102 --peer ws://127.0.0.1:11100 --keypair ' + sk2, logging=LOGGING)
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
    run1 = lib.run_and_wait(f'plov balance --account {pk1} --node http://127.0.0.1:8080', logging=LOGGING)
    run2 = lib.run_and_wait(f'plov balance --account {pk2} --node http://127.0.0.1:8080', logging=LOGGING)
    passed = run1 == '1000\n' and run2 == '0\n' and all(lib.status)
except Exception as e:
    print(e)
    passed = False
print_after_test(passed)


# TEST 4
try:
    print(COLORS['header'] + 'Test #4')
    print(COLORS['description'] + 'Transfer crypto' + COLORS['clear'])
    if CAN_WRITE:
        run = lib.run_and_wait(f'plov transfer 10 {pk2} --account tmp/kp1 --node http://127.0.0.1:8080', logging=LOGGING)
    else:
        run = lib.run_and_wait(f'plov transfer 10 {pk2} --account {sk1} --node http://127.0.0.1:8080', logging=LOGGING)
    passed = run.startswith('Success!') and all(lib.status)
    if passed:
        sleep(2)
        run1 = lib.run_and_wait(f'plov balance --account {pk1} --node http://127.0.0.1:8081', logging=LOGGING)
        run2 = lib.run_and_wait(f'plov balance --account {pk2} --node http://127.0.0.1:8081', logging=LOGGING)
        passed = run1 == '990\n' and run2 == '10\n' and all(lib.status)
        if passed:
            if CAN_WRITE:
                run = lib.run_and_wait(f'plov transfer 1.23 {pk1} --account tmp/kp2 --node http://127.0.0.1:8081', logging=LOGGING)
            else:
                run = lib.run_and_wait(f'plov transfer 1.23 {pk1} --account {sk2} --node http://127.0.0.1:8081', logging=LOGGING)
            passed = run.startswith('Success!') and all(lib.status)
            if passed:
                sleep(2)
                run1 = lib.run_and_wait(f'plov balance --account {pk1} --node http://127.0.0.1:8080', logging=LOGGING)
                run2 = lib.run_and_wait(f'plov balance --account {pk2} --node http://127.0.0.1:8080', logging=LOGGING)
                passed = run1 == '991.23\n' and run2 == '8.77\n' and all(lib.status)
except Exception as e:
    print(e)
    passed = False
print_after_test(passed)


# TEST 5
try:
    print(COLORS['header'] + 'Test #5')
    print(COLORS['description'] + 'Staking and unstaking' + COLORS['clear'])
    if CAN_WRITE:
        run = lib.run_and_wait(f'plov stake 1.77 --account tmp/kp2 --node http://127.0.0.1:8080', logging=LOGGING)
    else:
        run = lib.run_and_wait(f'plov stake 1.77 --account {sk2} --node http://127.0.0.1:8080', logging=LOGGING)
    passed = run.startswith('Success!') and all(lib.status)
    if passed:
        sleep(2)
        run1 = lib.run_and_wait(f'plov balance --account {pk2} --node http://127.0.0.1:8081', logging=LOGGING)
        passed = run1 == '7\n' and all(lib.status)
        if passed:
            if CAN_WRITE:
                run = lib.run_and_wait(f'plov unstake 1.78 --account tmp/kp2 --node http://127.0.0.1:8081', logging=LOGGING)
            else:
                run = lib.run_and_wait(f'plov unstake 1.78 --account {sk2} --node http://127.0.0.1:8081', logging=LOGGING)
            passed = run.startswith('Error!') and all(lib.status)
            if passed:
                if CAN_WRITE:
                    run = lib.run_and_wait(f'plov unstake 1.76 --account tmp/kp2 --node http://127.0.0.1:8081', logging=LOGGING)
                else:
                    run = lib.run_and_wait(f'plov unstake 1.76 --account {sk2} --node http://127.0.0.1:8081', logging=LOGGING)
                passed = run.startswith('Success!') and all(lib.status)
                if passed:
                    sleep(2)
                    run1 = lib.run_and_wait(f'plov balance --account {pk2} --node http://127.0.0.1:8080', logging=LOGGING)
                    passed = run1 == '8.76\n' and all(lib.status)
                    if passed:
                        if CAN_WRITE:
                            run = lib.run_and_wait(f'plov unstake 0.01 --account tmp/kp2 --node http://127.0.0.1:8080', logging=LOGGING)
                        else:
                            run = lib.run_and_wait(f'plov unstake 0.01 --account {sk2} --node http://127.0.0.1:8080', logging=LOGGING)
                        passed = run.startswith('Success!') and all(lib.status)
                        if passed:
                            sleep(2)
                            run1 = lib.run_and_wait(f'plov balance --account {pk2} --node http://127.0.0.1:8081', logging=LOGGING)
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
