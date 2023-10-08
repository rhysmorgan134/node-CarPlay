// Based on https://github.com/w3c/webcodecs/blob/main/samples/video-decode-display/renderer_webgl.js
// License: https://www.w3.org/copyright/software-license-2023/

import { FrameRenderer } from './Render.worker'

export class WebGL2Renderer implements FrameRenderer {
  #canvas: OffscreenCanvas | null = null
  #ctx: WebGL2RenderingContext | null = null

  static vertexShaderSource = `
      attribute vec2 xy;

      varying highp vec2 uv;

      void main(void) {
        gl_Position = vec4(xy, 0.0, 1.0);
        // Map vertex coordinates (-1 to +1) to UV coordinates (0 to 1).
        // UV coordinates are Y-flipped relative to vertex coordinates.
        uv = vec2((1.0 + xy.x) / 2.0, (1.0 - xy.y) / 2.0);
      }
    `

  static fragmentShaderSource = `
      varying highp vec2 uv;

      uniform sampler2D texture;

      void main(void) {
        gl_FragColor = texture2D(texture, uv);
      }
    `

  constructor(canvas: OffscreenCanvas) {
    this.#canvas = canvas
    const gl = (this.#ctx = canvas.getContext('webgl2'))
    if (!gl) {
      throw Error('WebGL context is null')
    }

    const vertexShader = gl.createShader(gl.VERTEX_SHADER)

    if (!vertexShader) {
      throw Error('VertexShader is null')
    }

    gl.shaderSource(vertexShader, WebGL2Renderer.vertexShaderSource)
    gl.compileShader(vertexShader)

    if (gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS) == null) {
      throw gl.getShaderInfoLog(vertexShader)
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)
    if (!fragmentShader) {
      throw Error('FragmentShader is null')
    }
    gl.shaderSource(fragmentShader, WebGL2Renderer.fragmentShaderSource)
    gl.compileShader(fragmentShader)
    if (gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS) == null) {
      throw gl.getShaderInfoLog(fragmentShader)
    }

    const shaderProgram = gl.createProgram()
    if (!shaderProgram) {
      throw Error('ShaderProgram is null')
    }
    gl.attachShader(shaderProgram, vertexShader)
    gl.attachShader(shaderProgram, fragmentShader)
    gl.linkProgram(shaderProgram)
    if (gl.getProgramParameter(shaderProgram, gl.LINK_STATUS) == null) {
      throw gl.getProgramInfoLog(shaderProgram)
    }
    gl.useProgram(shaderProgram)

    // Vertex coordinates, clockwise from bottom-left.
    const vertexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1.0, -1.0, -1.0, +1.0, +1.0, +1.0, +1.0, -1.0]),
      gl.STATIC_DRAW,
    )

    const xyLocation = gl.getAttribLocation(shaderProgram, 'xy')
    gl.vertexAttribPointer(xyLocation, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(xyLocation)

    // Create one texture to upload frames to.
    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  }

  draw(frame: VideoFrame): void {
    if (this.#canvas) {
      this.#canvas.width = frame.displayWidth
      this.#canvas.height = frame.displayHeight
    }

    const gl = this.#ctx!

    // Upload the frame.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frame)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    frame.close()

    // Configure and clear the drawing area.
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
    gl.clearColor(1.0, 0.0, 0.0, 1.0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    // Draw the frame.
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4)
  }
}
