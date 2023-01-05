const EventEmitter = require('events');
const spawn = require('child_process').spawn;
const {Readable} = require('stream');

class AudioParse extends EventEmitter {
    constructor(updateState, mic) {
        super();
        this._parsers = {
            1: spawn('ffplay', [
                "-hide_banner",
                "-loglevel", "error",
                "-",
                "-f", "s16le",
                "-ac", "2",
                "-ar", `44100`,
                "-nodisp"]),
            2: spawn('ffplay', [
                "-hide_banner",
                "-loglevel", "error",
                "-",
                "-f", "s16le",
                "-ac", "2",
                "-ar", `44100`,
                "-nodisp"]),
            3: spawn('ffplay', [
                "-hide_banner",
                "-loglevel", "error",
                "-",
                "-f", "s16le",
                "-ac", "1",
                "-ar", `8000`,
                "-nodisp"]),
            4: spawn('ffplay', [
                "-hide_banner",
                "-loglevel", "error",
                "-",
                "-f", "s16le",
                "-ac", "2",
                "-ar", `48000`,
                "-nodisp"]),
            5: spawn('ffplay', [
                "-hide_banner",
                "-loglevel", "error",
                "-",
                "-f", "s16le",
                "-ac", "1",
                "-ar", `16000`,
                "-nodisp"]),
            6: spawn('ffplay', [
                "-hide_banner",
                "-loglevel", "error",
                "-",
                "-f", "s16le",
                "-ac", "1",
                "-ar", `24000`,
                "-nodisp"]),
            7: spawn('ffplay', [
                "-hide_banner",
                "-loglevel", "error",
                "-",
                "-f", "s16le",
                "-ac", "2",
                "-ar", `16000`,
                "-nodisp"])
        }
        this._mic = mic
        this.updateState = updateState;
        this._bytesToRead = 0;
        this._bytesRead = [];
        this._bytesSize = 0;
        this._audioParse = true;
        this._navi = false;
        this._audioType = 1;
        this._naviPendingStop = false;
        process.on('SIGABRT', () => {
            this.quit()
        })
        process.on('SIGINT', () => {
            this.quit()
        })
        process.on('SIGTERM', () => {
            this.quit()
        })
    }

    setActive = (bytesToRead) => {
        //console.log("sound active")
        if (bytesToRead > 0) {
            this._bytesToRead = bytesToRead
            if (bytesToRead < 16) {
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
        if (this._bytesSize === this._bytesToRead) {
            if (this._audioParse) {
                this.pipeData()
            } else {
                let type = Buffer.concat(this._bytesRead)
                type = type.readInt8(12)
                if (type === 6) {
                    console.log("setting audio to nav")
                    this._navi = true
                } else if (type === 7) {
                    console.log("setting audio to pending media")
                    this._naviPendingStop = true
                } else if (type === 2 && this._naviPendingStop) {
                    console.log("setting audio to media now")
                    this._navi = false
                    this._naviPendingStop = false
                } else if (type === 8) {
                    this._mic.start()
                } else if (type === 9) {
                    this._mic.stop()
                } else {
                    console.log("unknown audio type: ", type, this._naviPendingStop, this._navi)
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
        let outputData = fullData.slice(12, this._bytesToRead)
        // if(volume) {
        //outputData = this.lowerVolume(outputData)
        // }
        if(this._navi === true) {
            if(decodeType == 2) {
                this._parsers[decodeType].stdin.write(outputData)
            }
        } else {
            this._parsers[decodeType].stdin.write(outputData)
        }

        this._bytesToRead = 0;
        this._bytesRead = [];
        this._bytesSize = 0;
        this.updateState(0);
    }

    lowerVolume = (bytes) => {
        console.log("before Convert", bytes)
        let bytesToReturn = []
        for(let i=0;i<bytes.length;i+=2) {
            let data = (bytes.readUInt8(i)) * 0.9
            let data2 = (bytes.readUInt8(i+1)) * 0.9
            bytesToReturn.push(data)
            bytesToReturn.push(data2)

        }
        console.log("after", Buffer.from(bytesToReturn))
        return Buffer.from(bytesToReturn)
    }

    quit = () => {
        Object.keys(this._parsers).forEach((key) => {
            console.log("killing ffplay: ", key)
            this._parsers[key].kill("SIGINT")
        })
        process.exit()
    }
}

module.exports = AudioParse;
