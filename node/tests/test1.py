from lib import run_in_background
from time import sleep
from random import randint

run_in_background('--port 11100 --genesis')
sleep(0.15)
run_in_background('--port 11101 --peer ws://127.0.0.1:11100')
sleep(0.15)
run_in_background('--port 11102 --peer ws://127.0.0.1:11100')
sleep(0.15)
run_in_background('--port 11103 --peer ws://127.0.0.1:11101')
sleep(0.15)
run_in_background('--port 11104 --peer ws://127.0.0.1:11102')
sleep(0.15)
run_in_background('--port 11105 --peer ws://127.0.0.1:11104')

sleep(12)
run_in_background('--port 11106 --peer ws://127.0.0.1:11103')
