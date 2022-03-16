const EventEmitter = require('events')
const Mic = require('node-microphone')

class Microphone extends EventEmitter {
    constructor(props) {
        super();
        this.mic = new Mic()
        this._active = false
        this.mic.on('data', (data) => {
            this.emit('data', data)
        })
        this.mic.on('info', (info) => {
            console.log(info)
        })

        this.mic.on('error', (error) => {
            console.log(error)
        })
        this.timeout;

    }

    start() {

        console.log("starting mic")
        this.mic.startRecording()
        this._active = true
        this.timeout = setTimeout(() => {
            this.stop()
        }, 10000)
    }

    stop() {
        this._active = false
        clearTimeout(this.timeout)
        this.mic.stopRecording()
    }

    get active() {
        return this._active
    }

    set active(value) {
        this._active=value
    }

}

module.exports = Microphone