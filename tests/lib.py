import subprocess
import sys
import threading


IS_WINDOWS = sys.platform == 'win32'

CMD_PREFIX = 'node ../node/main.js '

process_index = 0
status = []
processes = []


def _run_in_background(cmd, prefix, index, logging_enabled):
    status[index] = True
    process = subprocess.Popen(CMD_PREFIX + cmd,
                               shell=True,
                               stdout=subprocess.PIPE,
                               stderr=subprocess.STDOUT)
    processes.append(process)
    for line in process.stdout:
        if logging_enabled:
            sys.stdout.write(prefix + line.decode())
    status[index] = False


def run_in_background(cmd, logging_enabled):
    global process_index
    process_color = process_index % 8 + 1
    process_index += 1
    prefix = f'\x1b[1;{29 + process_color};{48 - process_color}m[{process_index}]\x1b[0m '
    status.append(False)
    threading.Thread(
        target=_run_in_background, args=(cmd, prefix, process_index - 1, logging_enabled), daemon=True).start()


def run_and_wait(cmd, logging_enabled):
    output = subprocess.check_output(cmd, shell=True)
    if logging_enabled:
        print(output.decode())
    return output.decode()
