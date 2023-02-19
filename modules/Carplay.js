const fs = require('fs');
const EventEmitter = require('events');
const {execSync} = require('child_process');
const DongleHandler = require('./DongleHandler')
const {Server} = require("socket.io")

const io = new Server(5005, {
    cors: {
        origin: '*',
        methods: ["GET", "POST"],
        credentials: true
    }
})

class Carplay extends EventEmitter {

    constructor(config) {
        super()
        this._width = config.width;
        this._height = config.height;
        this.getAssets()
        this._dongle = new DongleHandler(config, this.sendVideoData, this.sendAudioData)
        this._dongle.on('status', (data) => {
            io.emit('status', data)
        })
        this._dongle.on('quit', () => {
            io.emit('quit');
        })
        io.on('connection', (socket)=> {
            console.log("carplay connection")
            socket.on('statusReq', () => {
                console.log('status request')
                socket.emit('status', {status: this._dongle.getPlugged()})
            })
            socket.on('click', ({type, x, y}) => {
                this.sendTouch(type, x, y)
            })
        })
    }

    sendTouch = async (type, x, y) => {
        this._dongle.sendTouch(type, x, y)
    }

    getAssets = () => {
        const dir = './assets';
        if (fs.existsSync(dir)) {
            console.log("directory found")
        } else {
            console.log('Assets not present, downloading');
            execSync('curl "http://121.40.123.198:8080/AutoKit/AutoKit.apk" > AutoKit.apk')
            console.log("file downloaded, unzipping")
            execSync('unzip AutoKit.apk \'assets/*\'')
        }
    }

    getStatus = () => {
        return this._dongle.getPlugged()
    }

    sendKey = (action) => {
        this._dongle.sendKey(action)
    }

    sendVideoData = (data) => {
        io.emit('carplay', data)
    }

    sendAudioData = (data) => {
        io.emit('audio', data)
    }


}

module.exports = Carplay;