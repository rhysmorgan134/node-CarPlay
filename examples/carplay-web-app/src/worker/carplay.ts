  import CarplayWeb, {
    DongleConfig,
    SendTouch
  } from 'node-carplay/dist/web'
  
  let carplayWeb: CarplayWeb | null = null
  let config: DongleConfig | null = null

  onmessage = async (event) => {
    switch (event.data.type) {
      case 'start':
        config = event.data.data as DongleConfig;
        carplayWeb = new CarplayWeb(config)

        carplayWeb.on('video', message => {
          postMessage({type: 'video', message })
        })
        carplayWeb.on('audio', message => {
          postMessage({type: 'audio', message })
        })
        carplayWeb.on('media', message => {
          postMessage({type: 'media', message })
        })
        carplayWeb.on('plugged', () => {
          postMessage({type: 'plugged'});
        })
        carplayWeb.on('unplugged', () => {
          postMessage({type: 'unplugged'});
        })

        carplayWeb.start()
        break
      case 'touch':
        if (config && carplayWeb) {
          const { x, y, action } = event.data.data
          const data = new SendTouch(x / config.width, y / config.height, action)
          carplayWeb.dongleDriver.send(data);
        }
        break;
      case 'close':
        carplayWeb?.stop()
        break;
    }
  }

  export {};
  
