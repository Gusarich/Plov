class VM {
    /*

    <===Types===>
    01  int
    02  str
    03  bool
    <===Types===>

    <===Commands===>
    10  begin "name"         => Begin of function
    11  push 1/2 value/name  => Push value to stack
    12  pop                  => Pop value from stack
    13  var type, "name"     => Declare variable
    14  set "name"           => Set value from top of the stack to variable
    15  sum                  => Sum two top elements from stack and push result
    16  sub                  => Sub two top elements from stack and push result
    17  mul                  => Mul two top elements from stack and push result
    18  div                  => Div two top elements from stack and push result
    19  mod                  => Mod two top elements from stack and push result
    1a  eq                   => Check if two top elements in stack are equal and push boolean result
    1b  neq                  => Check if two top elements in stack are not equal and push boolean result
    1c  lt                   => Check if top element is lower than element under it and push boolean result
    1d  gt                   => Check if top element is greater than element under it and push boolean result
    1e  lte                  => Check if top element is lower or equal than element under it and push boolean result
    1f  gte                  => Check if top element is greater or equal than element under it and push boolean result
    20  or                   => Check if one of two top elements in stack is boolean true and push boolean result
    21  and                  => Check if two top elements in stack are boolean true and push boolean result
    22  rev                  => Reverse boolean value in top of the stack
    23  jmp value            => Jump to line
    24  jmpif value          => Jump to line if there is boolean false in top of the stack
    25  stop                 => Stop execution
    <===Commands===>

    */

    constructor (code) {
        let calls = []

        while (code) {
            let call = [parseInt(code.slice(0, 2), 16)]
            let ln

            if ([16, 20, 35, 36].includes(call[0])) {
                // 1 args
                ln = parseInt(code.slice(2, 4), 16)
                if (call[0] == 16 || call[0] == 20) {
                    // arg is string
                    let s = code.slice(4, 4 + ln)
                    let bytes = [...s.matchAll(/[^ ]{1,2}/g)].map(a => parseInt(a[0], 16))
                    call.push(Buffer.from(bytes).toString())
                }
                else {
                    // arg is not string
                    call.push(parseInt(code.slice(4, 4 + ln), 16))
                }
                code = code.slice(4 + ln)
            }
            else if ([17, 19].includes(call[0])) {
                // 2 args
                call.push(parseInt(code.slice(2, 4), 16))
                let ln = parseInt(code.slice(4, 6), 16)
                let s = code.slice(6, 6 + ln)
                if (call[0] == 19 || call[1] == 2) {
                    // arg is string
                    let bytes = [...s.matchAll(/[^ ]{1,2}/g)].map(a => parseInt(a[0], 16))
                    call.push(Buffer.from(bytes).toString())
                }
                else {
                    // arg is not string
                    call.push(parseInt(s, 16))
                }
                code = code.slice(6 + ln)
            }
            else {
                // 0 args
                code = code.slice(2)
            }
            calls.push(call)
        }

        this.stack = []
        this.calls = calls
        this.index = -1
        for (let i = 0; i < this.calls.length; i += 1) {
            if (this.calls[i][0] == 16 && this.calls[i][1] == '\x00') {
                this.index = i + 1
                break
            }
        }
        if (this.index == -1) {
            throw "no begin"
        }
        this.usedGas = 100
        this.variables = {}

        //console.log(this.calls)
    }

    runNextLine () {
        let line = this.calls[this.index]

        if (line[0] == 17) {
            //console.log(line, this.variables)
            if (line[1] == 1) this.stack.push(line[2])
            else this.stack.push(this.variables[line[2]][1])
            this.usedGas += 1
        }

        else if (line[0] == 18) {
            this.stack.pop()
            this.usedGas += 1
        }

        else if (line[0] == 19) {
            this.variables[line[2]] = [line[1], undefined]
            this.usedGas += 2
        }

        else if (line[0] == 20) {
            this.variables[line[1]][1] = this.stack.pop()
            this.usedGas += 2
        }

        else if (line[0] == 21) {
            this.stack.push(this.stack.pop() + this.stack.pop())
            this.usedGas += 4
        }

        else if (line[0] == 22) {
            this.stack.push(this.stack.pop() - this.stack.pop())
            this.usedGas += 4
        }

        else if (line[0] == 23) {
            this.stack.push(this.stack.pop() * this.stack.pop())
            this.usedGas += 5
        }

        else if (line[0] == 24) {
            this.stack.push(this.stack.pop() / this.stack.pop())
            this.usedGas += 5
        }

        else if (line[0] == 25) {
            this.stack.push(this.stack.pop() % this.stack.pop())
            this.usedGas += 5
        }

        else if (line[0] == 26) {
            this.stack.push(this.stack.pop() == this.stack.pop())
            this.usedGas += 4
        }

        else if (line[0] == 27) {
            this.stack.push(this.stack.pop() != this.stack.pop())
            this.usedGas += 4
        }

        else if (line[0] == 28) {
            this.stack.push(this.stack.pop() < this.stack.pop())
            this.usedGas += 4
        }

        else if (line[0] == 29) {
            this.stack.push(this.stack.pop() > this.stack.pop())
            this.usedGas += 4
        }

        else if (line[0] == 30) {
            this.stack.push(this.stack.pop() <= this.stack.pop())
            this.usedGas += 5
        }

        else if (line[0] == 31) {
            this.stack.push(this.stack.pop() >= this.stack.pop())
            this.usedGas += 5
        }

        else if (line[0] == 32) {
            let a = this.stack.pop()
            this.stack.push(this.stack.pop() || a)
            this.usedGas += 4
        }

        else if (line[0] == 33) {
            let a = this.stack.pop()
            this.stack.push(this.stack.pop() && a)
            this.usedGas += 4
        }

        else if (line[0] == 34) {
            this.stack.push(!this.stack.pop())
            this.usedGas += 3
        }

        else if (line[0] == 35) {
            this.index = line[1] - 1  // -1 so after index += 1 it's good
            this.usedGas += 1
        }

        else if (line[0] == 36) {
            if (!this.stack.pop()) {
                this.index = line[1] - 1  // -1 so after index += 1 it's good
                this.usedGas += 3
            }
            else this.usedGas += 2
        }

        else if (line[0] == 37) {
            this.index = this.calls.length
        }

        /*
        console.log('Call =>', line)
        console.log('Index =>', this.index)
        console.log('Stack =>', this.stack)
        console.log('Variables =>', this.variables)
        console.log()*/

        this.index += 1
    }

    run () {
        while (this.index < this.calls.length) {
            this.runNextLine()
        }
    }
}

const min = Math.min
const fs = require('fs')
code = fs.readFileSync(process.argv[2], 'utf8')
//console.time('prepare')
vm = new VM(code.toString())
//console.timeEnd('prepare')
//console.time('run')
vm.run()
//console.timeEnd('run')
if (process.argv.length <= 3) console.dir(vm.stack, {'maxArrayLength': null})
