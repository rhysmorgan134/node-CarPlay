const EventEmitter = require('events');
const spawn = require('child_process').spawn;

class AudioParse extends EventEmitter {
    constructor(updateState, mic, audioData) {
        super();
        this._mic = mic
        this.updateState = updateState;
        this.audioData = audioData
        this._bytesToRead = 0;
        this._bytesRead = [];
        this._bytesSize = 0;
        this._audioParse = true;
        this._navi = false;
        this._audioType = 1;
        this._naviPendingStop = false;
        this.type= null;
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
        let type
        if (this._bytesSize === this._bytesToRead) {
            if (this._audioParse) {
                this.pipeData()
            } else {
                type = Buffer.concat(this._bytesRead)
                type = type.readInt8(12)
                this.type = type
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
                } else if (type === 8 || type===4) {
                    this._mic.start()
                } else if (type === 9 || type===5) {
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
    pipeData = async() => {
        let fullData = Buffer.concat(this._bytesRead)
        let decodeType = fullData.readUInt32LE(0)
        let volume = fullData.readFloatLE(4)
        let audioType = fullData.readUInt32LE(8)
        let outputData = fullData.slice(12, this._bytesToRead)
        this.audioData({type: this.type, decode: decodeType, volume: volume, audioType: audioType, data: outputData})

        this._bytesToRead = 0;
        this._bytesRead = [];
        this._bytesSize = 0;
        this.updateState(0);
    }
}

module.exports = AudioParse;
