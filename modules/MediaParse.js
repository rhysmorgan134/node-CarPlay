const EventEmitter = require("events")

class MediaParse extends EventEmitter {
    constructor(updateState, mediaData) {
        super()
        this.mediaData = mediaData
        this.updateState = updateState
        this._bytesToRead = 0
        this._bytesRead = []
        this._bytesSize = 0
        this.storedBytes = 0
        this.chunks = []
        this.duration = 0
    }

    setActive = (bytesToRead) => {
        this._bytesToRead = bytesToRead

        this.updateState(42)
    }

    addBytes = (bytes) => {
        this._bytesRead.push(bytes)
        this._bytesSize += Buffer.byteLength(bytes)
        if (this._bytesSize === this._bytesToRead) {
            if (this.testTime) {
                this.duration = 0 // new Date().getTime() - this.testTime
                this.testTime = new Date().getTime()
            } else {
                this.duration = 0
                this.testTime = new Date().getTime()
            }
            this.pipeData()
        }
    }

    pipeData = () => {
        const fullData = Buffer.concat(this._bytesRead)
        this.chunks.push(fullData)
        if (this.chunks.length === 1) {
            let durationBuffer = Buffer.alloc(4)
            durationBuffer.writeInt32BE(this.duration)
            this.chunks.unshift(durationBuffer)

            const buffer = new Buffer.concat(this.chunks)

            if (buffer.length > 512) {
                const jfifMarker = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])
                const start = buffer.indexOf(jfifMarker)

                if (start !== -1) {
                    const endMarker = Buffer.from([0xff, 0xd9])
                    const end = buffer.indexOf(endMarker,start + jfifMarker.length)

                    if (end === -1)
                        console.log("Unable to find end of the buffer")

                    const jfifBuffer = buffer.slice(start, end + endMarker.length)
                    this.mediaData(`{"MediaAlbumCover": "${jfifBuffer.toString("base64")}"}`
                    )
                }
            } else {
                const cleanData = buffer.slice(8, buffer.length - 1)
                this.mediaData(cleanData.toString("utf8"))
            }

            this.chunks = []
            this.duration = 0
            //this.testTime = new Date().getTime()
        }
        this._bytesToRead = 0
        this._bytesRead = []
        this._bytesSize = 0
        this.updateState(0)
    }
}

module.exports = MediaParse
