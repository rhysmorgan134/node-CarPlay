
<h3 align="center">Node Carplay</h3>

  <p align="center">
    Node Carplay npm package
</p>

    



<!-- TABLE OF CONTENTS -->
<details open="open">
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
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
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgements">Acknowledgements</a></li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## About The Project

![node carplay Screen Shot](https://i.imgur.com/egkvgau.png)

[example video](https://youtu.be/mBeYd7RNw1w)

This is a carplay module for nodejs. It is currently in development, but is at a useable stage. Currently it interacts with a Carlinkit adapter, it opens communication with it, sends various
configuration settings and also downloads the APK file thats usually used with it. The APK file then gets extracted and its contents get sent over usb to the
dongle itself. The dongle then sends a h264 bytestream from the phone, this contains the video data. And it also sends an audio stream. 

### Built With

This project would not of been possible without electric monks work on a python version. It also heavily uses node-usb jsmpeg player
* [PyCarplay](https://github.com/electric-monk/pycarplay)
* [Node-usb](https://github.com/tessel/node-usb)
* [JSmpeg](https://github.com/phoboslab/jsmpeg)
* [JSmpeg-player](https://github.com/cycjimmy/jsmpeg-player)



<!-- GETTING STARTED -->
## Getting Started



### Prerequisites

The target machine should have FFMPEG/FFPLAY installed and working 

### Installation

```javascript
npm install node-carplay
```



<!-- USAGE EXAMPLES -->
## Usage

TODO see [react-carplay](https://github.com/rhysmorgan134/react-carplay)



<!-- ROADMAP -->
## Roadmap

* Enabled hardware accelleration
* Replace jsmpeg with lighter alternative
* Make wireless operational
* Integrate microphone


<!-- CONTRIBUTING -->
## Contributing

Contributions are what make the open source community such an amazing place to be learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request





<!-- CONTACT -->
## Contact

Your Name - Rhys Morgan - rhysm134@gmail.com

