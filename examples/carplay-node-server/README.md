# Running this example

In the root folder of node-CarPlay run:
```
pnpm i
pnpm build
```

Then in this folder:
```
npm i
npm start
# To listen to audio
ffplay -f s16le -ar 44100 -ac 2 http://localhost:3000/stream/audio
# To see video and initialize dongle
# open http://localhost:3000/ in your browser
# To see raw h264 stream, open http://localhost:3000/stream/video
# in your video player.
```

On Raspberry Pi make sure to also grant plugdev permissions to usb devices
```
echo "SUBSYSTEM==\"usb\", ATTR{idVendor}==\"1314\", ATTR{idProduct}==\"152*\", MODE=\"0660\", GROUP=\"plugdev\"" | sudo tee /etc/udev/rules.d/52-nodecarplay.rules
```
