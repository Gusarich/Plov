class VM {
    /*

    begin "name"       => Begin of function
    push value         => Push value to stack
    pop                => Pop value from stack
    var type, "name"   => Declare variable
    set "name"         => Set value to variable
    sum                => Sum two top elements from stack and push result
    sub                => Sub two top elements from stack and push result
    mul                => Mul two top elements from stack and push result
    div                => Div two top elements from stack and push result
    mod                => Mod two top elements from stack and push result
    eq                 => Check if two top elements in stack are equal and push boolean result
    lt                 => Check if top element is lower than element under it and push boolean result
    gt                 => Check if top element is greater than element under it and push boolean result
    lte                => Check if top element is lower or equal than element under it and push boolean result
    gte                => Check if top element is greater or equal than element under it and push boolean result
    or                 => Check if one of two top elements in stack is boolean true and push boolean result
    and                => Check if two top elements in stack are boolean true and push boolean result
    rev                => Reverse boolean value in top of the stack
    jmp value          => Jump to line
    jmpif value        => Jump to line if there is boolean true in top of the stack
    stop               => Stop execution

    */

    constructor (code) {
        let lines = []
        let lastIndex = 0

        while (code) {
            //console.log(code)
            code = code.trimLeft()
            let index = code.indexOf(';')
            let index2 = code.indexOf(' ')
            if (index2 < index && index2 != -1) index = index2
            let text = code.slice(0, index)

            if (text == '') break

            let prevIndex = index + 1

            lines.push([text])
            lastIndex = lines.length - 1

            if (['push', 'set', 'begin', 'jmp', 'jmpif'].includes(text)) {
                // 1 args
                index = code.indexOf(';')
                text = code.slice(prevIndex, index)
                if (!isNaN(text)) text = +text
                lines[lastIndex].push(text)
            }
            else if (text == 'var') {
                // 2 args
                index = code.indexOf(', ')
                text = code.slice(prevIndex, index)
                prevIndex = index + 2
                lines[lastIndex].push(text)
                index = code.indexOf(';')
                text = code.slice(prevIndex, index)
                lines[lastIndex].push(text)
            }

            code = code.slice(index + 1)
        }

        this.stack = []
        this.lines = lines
        this.index = -1
        for (let i = 0; i < this.lines.length; i += 1) {
            if (this.lines[i][0] == 'begin' && this.lines[i][1] == '""') {
                this.index = i + 1
                break
            }
        }
        if (this.index == -1) {
            throw "no begin"
        }
        this.usedGas = 100
        this.variables = {}
    }

    runNextLine () {
        let line = this.lines[this.index]

        if (line[0] == 'push') {
            if (isNaN(line[1])) {
                if (line[1][0] == '"') this.stack.push(line[1].slice(1, -1))
                else this.stack.push(this.variables[line[1]][1])
            }
            else this.stack.push(line[1])
            this.usedGas += 1
        }

        else if (line[0] == 'pop') {
            this.stack.pop()
            this.usedGas += 1
        }

        else if (line[0] == 'var') {
            this.variables[line[2]] = [line[1], undefined]
            this.usedGas += 2
        }

        else if (line[0] == 'set') {
            this.variables[line[1]][1] = this.stack.pop()
            this.usedGas += 2
        }

        else if (line[0] == 'sum') {
            this.stack.push(this.stack.pop() + this.stack.pop())
            this.usedGas += 4
        }

        else if (line[0] == 'sub') {
            this.stack.push(this.stack.pop() - this.stack.pop())
            this.usedGas += 4
        }

        else if (line[0] == 'mul') {
            this.stack.push(this.stack.pop() * this.stack.pop())
            this.usedGas += 5
        }

        else if (line[0] == 'div') {
            this.stack.push(this.stack.pop() / this.stack.pop())
            this.usedGas += 5
        }

        else if (line[0] == 'mod') {
            this.stack.push(this.stack.pop() % this.stack.pop())
            this.usedGas += 5
        }

        else if (line[0] == 'eq') {
            this.stack.push(this.stack.pop() == this.stack.pop())
            this.usedGas += 4
        }

        else if (line[0] == 'lt') {
            this.stack.push(this.stack.pop() < this.stack.pop())
            this.usedGas += 4
        }

        else if (line[0] == 'gt') {
            this.stack.push(this.stack.pop() > this.stack.pop())
            this.usedGas += 4
        }

        else if (line[0] == 'lte') {
            this.stack.push(this.stack.pop() <= this.stack.pop())
            this.usedGas += 5
        }

        else if (line[0] == 'gte') {
            this.stack.push(this.stack.pop() >= this.stack.pop())
            this.usedGas += 5
        }

        else if (line[0] == 'or') {
            let a = this.stack.pop()
            this.stack.push(this.stack.pop() || a)
            this.usedGas += 4
        }

        else if (line[0] == 'and') {
            let a = this.stack.pop()
            this.stack.push(this.stack.pop() && a)
            this.usedGas += 4
        }

        else if (line[0] == 'rev') {
            this.stack.push(!this.stack.pop())
            this.usedGas += 3
        }

        else if (line[0] == 'jmp') {
            this.index = line[1] - 1  // -1 so after index += 1 it's good
            this.usedGas += 1
        }

        else if (line[0] == 'jmpif') {
            if (this.stack.pop()) {
                this.index = line[1] - 1  // -1 so after index += 1 it's good
                this.usedGas += 3
            }
            else this.usedGas += 2
        }

        else if (line[0] == 'stop') {
            this.index = this.lines.length
        }

        /*console.log('Call =>', line)
        console.log('Index =>', this.index)
        console.log('Stack =>', this.stack)
        console.log('Variables =>', this.variables)
        console.log()*/

        this.index += 1
    }

    run () {
        while (this.index < this.lines.length) {
            this.runNextLine()
        }
    }
}

const min = Math.min
const fs = require('fs')
code = fs.readFileSync(process.argv[2], 'utf8')
vm = new VM(code.toString())
vm.run()
console.dir(vm.stack, {'maxArrayLength': null})
