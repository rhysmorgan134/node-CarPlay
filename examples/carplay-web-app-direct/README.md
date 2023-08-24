# Running this example

In the root folder of node-CarPlay run:
```
pnpm i
pnpm build:node
pnpm build:web
```

Then in this folder:
```
npm i
npm start
```

Make sure chrome has "Experimental Web Platform features" enabled in chrome://flags.

You might need to run chrome with `--disable-webusb-security` as usb devices can be interacted from https only.

On Raspberry Pi make sure to also grant plugdev permissions to usb devices
```
echo "SUBSYSTEM==\"usb\", ATTR{idVendor}==\"1314\", ATTR{idProduct}==\"152*\", MODE=\"0660\", GROUP=\"plugdev\"" | sudo tee /etc/udev/rules.d/52-nodecarplay.rules
```