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
    }

    sendTouch = (x, y) => {
        this._dongle.sendTouch(x, y)
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

}

module.exports = Carplay;