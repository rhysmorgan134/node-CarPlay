
<h3 align="center">Node Carplay</h3>
  <p align="center">
    Carplay dongle driver for Node.js & Browser
</p>

<a href="https://www.buymeacoffee.com/rhysm" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" height="41" width="174"></a>


<!-- TABLE OF CONTENTS -->
<details open="open">
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Acknowledgements</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## About The Project

![Node Carplay in Chrome](https://github.com/rhysmorgan134/node-CarPlay/assets/4278113/3cbb5cab-fd62-4282-9fad-1b1aed90ad33)

[Example Video (outdated)](https://youtu.be/mBeYd7RNw1w)

This repository contains the npm package `node-carplay` that can be used on the Web or in Node.js. It allows interfacing with the [Carlinkit USB adapter](https://amzn.to/3X6OaF9) and stream audio/video on your computer. The package can be used in the Node.js environment using native USB bindings ([`libudev-dev` required](https://github.com/node-usb/node-usb#prerequisites)), or in Chrome (or equivalent browsers) using [`WebUSB` API](https://developer.mozilla.org/en-US/docs/Web/API/WebUSB_API).

There are multiple Carplay dongles on the market, the ones that convert wired to wireless carplay WILL NOT WORK. You need one that converts android/factory infotainment systems into Carplay (CPC200-Autokit or CPC200-CCPA etc). The package forwards video feed in h264, and PCM audio coming in from the USB dongle.

There's an included example `carplay-web-app` that runs in the browser and renders the Carplay environment. It supports mic input and audio output through Chrome audio stack as well as touch / mouse input.

### Acknowledgements

This project is inspired by the work of @electric-monk on the Python version.

* [PyCarplay](https://github.com/electric-monk/pycarplay) by @electric-monk
* [Node-USB](https://github.com/node-usb/node-usb)
* [jMuxer](https://github.com/samirkumardas/jmuxer)


## Getting Started

### Prerequisites

If you are on macOS and want to use the microphone in `node` environment, you need `sox`

```shell
brew install sox
```

If you are on Linux, you need `libudev-dev` for USB support in `node` environment

```shell
sudo apt install -y libudev-dev
```

### Installation

```javascript
npm install node-carplay
```

## Usage

There is an included example (not in the NPM package, but in the [Git repository](https://github.com/rhysmorgan134/node-CarPlay)). It is recommended to take the example and modify your way out of it.


## Contributing

Contributions are what make the open source community such an amazing place to be learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request


## License

The contents of this repository are licensed under the terms of the MIT License.
See the `LICENSE` file for more info.


## Contact

Rhys Morgan - rhysm134@gmail.com
