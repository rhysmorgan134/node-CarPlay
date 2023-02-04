const EventEmitter = require('events');
const spawn = require('child_process').spawn;
const { Readable } = require('stream');

class VideoParseWS extends EventEmitter{
    constructor(width, height, bitrate, ws, updateState, videoData) {
        super();
        this.videoData = videoData
        this.updateState = updateState;
        this._bytesToRead = 0;
        this._bytesRead = [];
        this._bytesSize = 0;
        this.storedBytes = 0
        this.chunks = []
        this.duration = 0
        this.date;
    }

    setActive = (bytesToRead) => {
        this._bytesToRead = bytesToRead;

        this.updateState(6)
    }

    addBytes = (bytes) => {
        this._bytesRead.push(bytes)
        this._bytesSize += Buffer.byteLength(bytes)
        if(this._bytesSize === this._bytesToRead) {
            if(this.testTime) {
                this.duration = 0// new Date().getTime() - this.testTime
                this.testTime = new Date().getTime()
            } else {
                this.duration = 0
                this.testTime = new Date().getTime()
            }
            this.pipeData()
        }
    }

    pipeData = () => {

        let fullData = Buffer.concat(this._bytesRead)
        let outputData = fullData.slice(20, this._bytesToRead)
        this.chunks.push(outputData)
        if(this.chunks.length ===1) {
            let durationBuffer = Buffer.alloc(4)
            durationBuffer.writeInt32BE(this.duration )
            this.chunks.unshift(durationBuffer)
            this.videoData(Buffer.concat(this.chunks))
            this.chunks = []
            this.duration = 0
            //this.testTime = new Date().getTime()
        }
        this._bytesToRead = 0;
        this._bytesRead = [];
        this._bytesSize = 0;
        this.updateState(0);

    }
}

module.exports = VideoParseWS;
