import subprocess
import sys
import threading


CMD_PREFIX = 'node ../src/main.js '

process_index = 0


def _run_in_background(cmd, prefix=''):
    process = subprocess.Popen(CMD_PREFIX + cmd,
                               shell=True,
                               stdout=subprocess.PIPE,
                               stderr=subprocess.STDOUT)
    for line in process.stdout:
        sys.stdout.write(prefix + line.decode())


def run_in_background(cmd):
    global process_index
    process_index += 1
    prefix = f'\x1b[1;{29 + process_index};{48 - process_index}m[{process_index}]\x1b[0m '
    threading.Thread(target=_run_in_background, args=(cmd, prefix,)).start()
