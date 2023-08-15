import { EventEmitter } from 'events'

export default interface IMicrophone extends EventEmitter {
  start(): void
  stop(): void
}
