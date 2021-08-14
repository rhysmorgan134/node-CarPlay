const EventEmitter = require('events');
const spawn = require('child_process').spawn;
const { Readable } = require('stream');

class VideoParseWS extends EventEmitter{
    constructor(width, height, bitrate, ws, updateState) {
        super();
        this._parser = spawn('ffmpeg', [
	    "-hide_banner",
	    "-loglevel", "error",
            "-threads", "2",
            "-i", "-",
	    "-c:v", "h264_v4l2m2m",
	    "-tune", "zerolatency",
            "-pix_fmt", "yuv420p",
            "-f", "mpegts",
            "-codec:v", "mpeg1video",
            "-s", `${width}x${height}`,
            "-b:v", bitrate.toString() + "k",
            "-bf", "0",
            ws])
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
        this._bytesToRead = bytesToRead;
        this.updateState(6)
    }

    addBytes = (bytes) => {
        this._bytesRead.push(bytes)
        this._bytesSize += Buffer.byteLength(bytes)
        if(this._bytesSize === this._bytesToRead) {
            this.pipeData()
        }
    }

    pipeData = () => {
        let fullData = Buffer.concat(this._bytesRead)
        let outputData = fullData.slice(20, this._bytesToRead)
        if(this._parser.stdin.writable) {
            this._parser.stdin.write(outputData)
        } else {
            this.emit('warning', 'Video Stream Full')
        }
        this._bytesToRead = 0;
        this._bytesRead = [];
        this._bytesSize = 0;
        this.updateState(0);
    }
}

module.exports = VideoParseWS;
