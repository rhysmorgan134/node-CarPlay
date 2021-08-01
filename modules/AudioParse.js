const EventEmitter = require('events');
const spawn = require('child_process').spawn;
const { Readable } = require('stream');

class AudioParse extends EventEmitter{
    constructor(updateState) {
        super();
        this._parser = spawn('/usr/bin/ffplay', [
            "-",
            "-f", "s16le",
            "-ac", "2",
            "-ar", `44100`,
            "-nodisp"])
        this._parser.stderr.on('data', ((data) => {
            console.log(data.toString())
        }))

        this._parser.stdout.on('data', ((data) => {
            console.log(data.toString())
        }))

        this._parser.stdout.pipe(process.stdout)

        this._readable = new Readable(1024);
        this._readable._read = () => {
            this._readable.pipe(this._parser.stdin)
        }
        this.updateState = updateState;
        this._bytesToRead = 0;
        this._bytesRead = [];
        this._bytesSize = 0;
    }

    setActive = (bytesToRead) => {
        //console.log("sound active")
        this._bytesToRead = bytesToRead;
        this.updateState(2)
    }

    addBytes = (bytes) => {
        this._bytesRead.push(bytes)
        this._bytesSize += Buffer.byteLength(bytes)
        //console.log(this._bytesSize, this._bytesToRead)
        if(this._bytesSize === this._bytesToRead) {
            this.pipeData()
        }
    }

    pipeData = () => {
        let fullData = Buffer.concat(this._bytesRead)
        let outputData = fullData.slice(12, this._bytesToRead)
        if(this._parser.stdin.writable) {
            this._parser.stdin.write(outputData)
        } else {
            this.emit('warning', 'Audio Stream Full')
        }
        this._bytesToRead = 0;
        this._bytesRead = [];
        this._bytesSize = 0;
        this.updateState(0);
    }
}

module.exports = AudioParse;