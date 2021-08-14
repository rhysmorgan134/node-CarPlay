const usb = require('usb');
const fs = require('fs');
const EventEmitter = require('events');
const {spawn, execSync} = require('child_process');
const { Readable, Transform } = require('stream');
const DongleHandler = require('./DongleHandler')

class Carplay extends EventEmitter {

    constructor(config) {
        super()
        this._width = config.width;
        this._height = config.height;
        this.getAssets()
        this._dongle = new DongleHandler(config)
        this._dongle.on('status', (data) => {
            this.emit('status', data)
        })
	this._dongle.on('quit', () => {
	   this.emit('quit');
	})
    }

    sendTouch = (type, x, y) => {
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


}

module.exports = Carplay;
