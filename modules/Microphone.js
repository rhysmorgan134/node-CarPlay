const EventEmitter = require('events')
const Mic = require('node-microphone')

class Microphone extends EventEmitter {
    constructor(props) {
        super();
        this.mic = new Mic()
        this.active = false
        this.mic.pipe.on('data', (data) => {
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
        this.active = true
        this.timeout = setTimeout(() => {
            this.stop()
        }, 10000)
    }

    stop() {
        this.active = false
        this.mic.stopRecording()
    }

    get active() {
        return this.active
    }

}

module.exports = Microphone