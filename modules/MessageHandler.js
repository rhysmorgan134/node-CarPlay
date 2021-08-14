

class MessageHandler {
    constructor(updateState, plugged, quit) {
        this.active = null;
        this.functions = {
            20: this.parse20,
            8: this.parse8,
            204: this.parse204,
            10: this.parse10,
            12: this.parse12,
            2: this.parse2,
            4: this.parse4,
	    0: this.parse0
        };
        this.update = updateState;
        this.bytesToRead = 0;
        this.bytesRead = 0;
        this.bytes = []
        this.plugged = plugged;
	this.quit = quit;
    }

    callFunction = (data) => {
        switch (this.active) {
            case 20:
                this.parse20(data)
                break
            case 8:
                this.parse8(data)
                break
            case 204:
                this.parse204(data)
                break
            case 10:
                this.parse10(data)
                break
            case 12:
                this.parse12(data)
                break
            case 2:
                this.parse2(data)
                break
            case 4:
                this.parse4()
                break
	    case 0:
		    this.parse0()
            console.log("received 0", data)
		    break
        default:
            break
        }
    }

    parseHeader = (type, length, data) => {
        if(this.functions.hasOwnProperty(type)) {
            this.update(type)
            this.active = type;
            this.bytesToRead = length;
            if(length === 0) {
                this.parseData({})
            }
            console.log("parsing type: ", type, " for length: ", length, data);
        } else {
            console.log("unkown type: ", type, " with data:: ", data)
        }
    }

    addBytes

    parseData = (data) => {
        this.callFunction(data)
    }

    parse20 = (data) => {
        console.log("parsing 20", data)
        let a = data.readUInt32LE(0)
        let b = data.readUInt32LE(4)
        console.log("manufacturer data: ", a, b)
        this.active = null;
        this.update(0)
    }

    parse8 = (data) => {
        console.log("parsing 8", data)
        let value = {
            0: 'invalid',
            5: 'Siri Button',
            6: 'Car Microphone',
            100: 'Button Left',
            101: 'Button Right',
            104: 'Button Select Down',
            105: 'Button Select Up',
            106: 'Button Back',
            114: 'Button Down',
            200: 'Button Home',
            201: 'Button Play',
            202: 'Button Pause',
            204: 'Button Next Track',
            205: 'Button Prev Track',
            1000: 'Support Wifi',
            1012: 'Support Wifi Need Ko'
        }
        let message = data.readUInt32LE(0)
        console.log("Carplay message: ", value[message])
        if(!(value[message])) {
            console.log("test message", data.toString('ascii'))
        }
        this.update(0)
    }

    parse204 = (data) => {
        console.log("parsing 204", data)
        console.log("version number: ", data.toString('ascii'))
        this.update(0)
    }

    parse10 = (data) => {
        console.log("parsing 10", data)
        console.log("Bluetooth address: ", data.toString('ascii'))
        this.update(0)
    }

    parse12 = (data) => {
        console.log("parsing 12", data)
        console.log("Bluetooth Pin: ", data.toString('ascii'))
        this.update(0)
    }

    parse2 = (data) => {
        console.log("parsing 2", data)
        let wifi = Buffer.byteLength(data)
        if (wifi === 8) {
            let phoneType = data.readUInt32LE(0)
            let wifi = data.readUInt32LE(4)
            console.log("wifi avail, phone type: ", phoneType, " wifi: ", wifi)
        } else {
            let phoneType = data.readUInt32LE(0)
            console.log("no wifi avail, phone type: ", phoneType)
        }
        this.update(0)
        this.plugged(true)
    }

    parse4 = (data) => {
        console.log("sending unplugged event")
        this.plugged(false)
        this.update(0)
    }

    parse0 = (data) => {
        console.log("received 0 event")
        console.log(data)
        this.quit()
        this.update(0)
    }
}

module.exports = MessageHandler;
