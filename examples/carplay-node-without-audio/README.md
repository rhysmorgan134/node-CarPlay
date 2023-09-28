# Running this example

**Note:** This example does not have audio processing, and relies on a separate bluetooth audio output device (optional) for audio.

In the root folder of node-CarPlay run:
```
npm i
```

Then in this folder:
```
npm i
npm start
```

The included client handles video and touch inputs. If you would like to access the raw video feed, it is available at
`http://localhost:3000/stream/video`

On Raspberry Pi make sure to also grant plugdev permissions to usb devices
```
echo "SUBSYSTEM==\"usb\", ATTR{idVendor}==\"1314\", ATTR{idProduct}==\"152*\", MODE=\"0660\", GROUP=\"plugdev\"" | sudo tee /etc/udev/rules.d/52-nodecarplay.rules
```
