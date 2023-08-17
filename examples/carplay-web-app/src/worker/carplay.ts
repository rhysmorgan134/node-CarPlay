import {
    Message,
    Plugged,
    Unplugged,
    VideoData,
    AudioData,
    MediaData,
    DongleDriver,
    DongleConfig,
    SendTouch
  } from 'node-carplay/dist/web'
  
  let initialised = false
  let _pairTimeout: NodeJS.Timeout | null = null
  const { knownDevices } = DongleDriver
  const driver = new DongleDriver()
  const { open, send, close } = driver
  
  export const config: DongleConfig = {
    dpi: 160,
    nightMode: false,
    hand: 0,
    boxName: 'nodePlay',
    width: 1280,
    height: 480,
    fps: 60,
  }

  driver.on('ready', async () => {
    await open(config)
  })
  
  driver.on('message', (message: Message) => {
    if (message instanceof Plugged) {
      if (_pairTimeout) {
        clearTimeout(_pairTimeout)
        _pairTimeout = null
      }
      postMessage({type: 'plugged'});
    } else if (message instanceof Unplugged) {
      postMessage({type: 'unplugged'});
    } else if (message instanceof VideoData) {
      postMessage({type: 'video', message });
    } else if (message instanceof AudioData) {
      postMessage({type: 'audio', message });
    } else if (message instanceof MediaData) {
      postMessage({type: 'media', message });
    }
  })
  
  const isCarplayDongle = (device: USBDevice) => {
    const known = knownDevices.some(
      kd => kd.productId === device.productId && kd.vendorId === device.vendorId,
    )
    return known
  }
  
  navigator.usb.addEventListener('connect', async (event) => {
    if (initialised) return
    if(isCarplayDongle(event.device)) {
      initialised = true
      await driver.initialise(event.device)
      postMessage({type: 'connect'});
    }
  });
  
  navigator.usb.addEventListener('disconnect', async (event) => {
    if(isCarplayDongle(event.device)) {
      try {
        await close()
        
      } catch {}
      finally { 
        postMessage({type: 'disconnect'});
      }
    }
  });
  
  onmessage = async (event) => {
    switch (event.data.type) {
      case 'touch':
        const { x, y, action } = event.data.data
        const data = new SendTouch(x / config.width, y / config.height, action)
        send(data);
        break;
      case 'close':
        close()
        break;
    }
  }

  export {};