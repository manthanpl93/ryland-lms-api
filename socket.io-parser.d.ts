declare module 'socket.io-parser' {
  export interface Packet {
    type: string;
    data: any[];
  }

  export interface Encoder {
    encode(packet: Packet, callback: (encodedPackets: any) => void): void;
    encodeBase64(packet: Packet, callback: (encodedPackets: any) => void): void;
  }

  export interface Decoder {
    add(encodedPacket: any): void;
    destroy(): void;
  }

  export const encoder: Encoder;
  export const decoder: Decoder;
}
