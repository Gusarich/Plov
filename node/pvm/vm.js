class VM {
    /*

    begin "name"
    push value
    pop
    var type, "name"
    set "name"
    sum
    sub
    mul
    div

    */

    constructor (code) {
        let lines = []
        let lastIndex = 0

        while (code) {
            code = code.trimLeft()
            let index = min(code.indexOf(' '), code.indexOf(';'))
            let text = code.slice(0, index)

            if (text == '') break

            let prevIndex = index + 1

            lines.push([text])
            lastIndex = lines.length - 1

            if (text == 'push' || text == 'set' || text == 'begin') {
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

        console.log('Call =>', line)
        console.log('Stack =>', this.stack)
        console.log('Variables =>', this.variables)
        console.log()

        this.index += 1
    }

    run () {
        while (this.index < this.lines.length) {
            this.runNextLine()
        }
    }
}

const min = Math.min
const spawn = require('child_process').spawn
const pythonProcess = spawn('python3.9', ['compiler.py'])
pythonProcess.stdout.on('data', (data) => {
    console.log('compiled!')
    console.log(data.toString())
    vm = new VM(data.toString())
    vm.run()
    console.log(vm)
})
