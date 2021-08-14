const EventEmitter = require('events');
const spawn = require('child_process').spawn;
const { Readable } = require('stream');

class AudioParse extends EventEmitter{
    constructor(updateState) {
        super();
        this._parser = spawn('ffplay', [
            "-hide_banner",
            "-loglevel", "error",
            "-",
            "-f", "s16le",
            "-ac", "2",
            "-ar", `44100`,
            "-nodisp"])
        this._parser.stderr.on('data', ((data) => {
            console.log(data.toString())
        }))

        this._parser.stdout.on('data', ((data) => {
            //console.log(data.toString())
        }))

        this._parser.stdout.on('error', ((data) => {
            console.log(data.toString())
        }))

        this._parser.stdout.pipe(process.stdout)

        this._readable = new Readable(1024);
        this._readable._read = () => {
            this._readable.pipe(this._parser.stdin)
        }
        this._parser2 = spawn('ffplay', [
            "-hide_banner",
            "-loglevel", "error",
            "-",
            "-f", "s16le",
            "-ac", "1",
            "-ar", `16000`,
            "-nodisp"])
        this._parser2.stderr.on('data', ((data) => {
            console.log(data.toString())
        }))

        this._parser2.stdout.on('data', ((data) => {
            //console.log(data.toString())
        }))

        this._parser2.stdout.on('error', ((data) => {
            console.log(data.toString())
        }))

        this._parser2.stdout.pipe(process.stdout)

        this._readable2 = new Readable(1024);
        this._readable2._read = () => {
            this._readable2.pipe(this._parser2.stdin)
        }
        this.updateState = updateState;
        this._bytesToRead = 0;
        this._bytesRead = [];
        this._bytesSize = 0;
	this._audioParse = true;
	this._navi = false;
	this._audioType = 1;
	this._naviPendingStop = false;
    }

    setActive = (bytesToRead) => {
        //console.log("sound active")
	if(bytesToRead >0) {
	    this._bytesToRead = bytesToRead
	    if(bytesToRead<16) {
		console.log("non-audio found")
		this._audioParse = false
	    } else {
		this._audioParse = true
	    }
	     this.updateState(7)
	}
    }

    addBytes = (bytes) => {
        this._bytesRead.push(bytes)
        this._bytesSize += Buffer.byteLength(bytes)
        //console.log(this._bytesSize, this._bytesToRead)
        if(this._bytesSize === this._bytesToRead) {
            if(this._audioParse) {
	        this.pipeData()
	    } else {
		let type = Buffer.concat(this._bytesRead)
		type = type.readInt8(12)
		if(type === 6) {
		    console.log("setting audio to nav")
		    this._navi = true
		} else if(type === 7) {
		    console.log("setting audio to pending media")
		    this._naviPendingStop = true
		} else if(type === 2 && this._naviPendingStop) {
		   console.log("setting audio to media now")
		   this._navi = false
		   this._naviPendingStop = false
		} else {
		   console.log("unknown type: ", type, this._naviPendingStop, this._navi)
		}
        	this._bytesToRead = 0;
        	this._bytesRead = [];
        	this._bytesSize = 0;
        	this.updateState(0);
	}
    }
}
    pipeData = () => {
        let fullData = Buffer.concat(this._bytesRead)
        let decodeType = fullData.readUInt32LE(0)
        let volume = fullData.readFloatLE(4)
        let audioType = fullData.readUInt32LE(8)
        //console.log(decodeType, volume, audioType)
        let outputData = fullData.slice(12, this._bytesToRead)
        if(decodeType === 2) {
	    if(this._navi && (audioType === 2)) {
            	    if(this._parser.stdin.writable) {
                  	    this._parser.stdin.write(outputData)
            	    } else {
                	    this.emit('warning', 'Audio Stream Full')
            	    }
	    } else if(!(this._navi)) {
		     if(this._parser.stdin.writable) {
                  	    this._parser.stdin.write(outputData)
            	    } else {
                	    this.emit('warning', 'Audio Stream Full')
            	    }
		}
        } else {
            if(this._parser2.stdin.writable) {
                this._parser2.stdin.write(outputData)
            } else {
                this.emit('warning', 'Audio Stream Full')
            }
        }

        this._bytesToRead = 0;
        this._bytesRead = [];
        this._bytesSize = 0;
        this.updateState(0);
    }
}

module.exports = AudioParse;
