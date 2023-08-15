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