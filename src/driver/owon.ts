// Copyright 2020 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { crc32 } from "js-crc";
import ndarray from "ndarray";
import show from "ndarray-show";
import fpgaFirmwareUrl from "@/driver/VDS1022_FPGA_V3.7.firmware";

export enum Voltage {
  MV5 = 0,
  MV10 = 1,
  MV20 = 2,
  MV50 = 3,
  MV100 = 4,
  MV200 = 5,
  MV500 = 6,
  V1 = 7,
  V2 = 8,
  V5 = 9
}

export enum Coupling {
  AC = 0,
  DC = 1,
  GND = 2
}

export enum Channel {
  CH1 = 0,
  CH2 = 1
}

export interface ChannelOptions {
  channel: Channel;
  on: boolean;
  voltage: Voltage;
  coupling: Coupling;
}

export enum Timebase {
  msps100 = 0x1,
  msps50 = 0x2,
  msps32 = 0x3,
  msps16 = 0x6,
  msps8 = 0x18,
  msps4 = 0x30,
  mspsCopiedFromOwon = 0x50,
  msps2 = 0x60,
  msps1 = 0xc0,
  ksps500 = 0x180,
  ksps250 = 0x300,
  ksps125 = 0x600,
  ksps62 = 0xc00
}

export enum TriggerSource {
  CH1 = 0,
  CH2 = 1,
  EXTERNAL = 2
}

export enum TriggerType {
  EDGE = 0,
  SLOPE = 1,
  VIDEO = 2,
  PULSE = 3
}

export enum TriggerMode {
  SINGLE = 0,
  ALTERNATE = 1
}

export enum TriggerSlope {
  RISING = 0,
  FALLING = 1
}

export interface EdgeTriggerOptions {
  source: TriggerSource;
  mode: TriggerMode;
  type: TriggerType;
  slope: TriggerSlope;
  holdoffSeconds: number;
  triggerLevel: number;
}

export interface TriggerOptions {
  source: TriggerSource;
  type: TriggerMode;
  mode: TriggerType;
}

enum Address {
  CH1 = 0x111,
  CH2 = 0x110,
  CH1_VOLT_GAIN = 0x116,
  CH2_VOLT_GAIN = 0x114,
  CH1_ZERO_OFFSET = 0x10a,
  CH2_ZERO_OFFSET = 0x108,
  CH1_FREQUENCY_REFERENCE = 0x4a,
  CH2_FREQUENCY_REFERENCE = 0x4b,
  TIMEBASE = 0x52,
  PHASE_FINE = 0x18,
  TRIGGER = 0x24,
  TRIGGER_D = 0x1,
  CH1_TRIGGER_HOLDOFF_ARG = 0x26,
  CH1_TRIGGER_HOLDOFF_INDEX = 0x27,
  CH2_TRIGGER_HOLDOFF_ARG = 0x2a,
  CH2_TRIGGER_HOLDOFF_INDEX = 0x2b,
  EXT_TRIGGER_HOLDOFF_ARG = 0x26,
  EXT_TRIGGER_HOLDOFF_INDEX = 0x27,
  CH1_TRIGGER_EDGE_LEVEL = 0x2e,
  CH2_TRIGGER_EDGE_LEVEL = 0x30,
  EXT_TRIGGER_EDGE_LEVEL = 0x10c,
  PRE_TRIGGER = 0x5a,
  SUF_TRIGGER = 0x56,
  DEEP_MEMORY = 0x5c,
  SLOW_MOVE = 0xa,
  CHANNEL_ON = 0xb,
  SYNC_OUTPUT = 0x6,
  SAMPLE = 0x9,
  EMPTY = 0x10c,
  HAS_DATA = 0x1,
  DATA_FINISHED = 0x7a,
  GET_DATA = 0x1000,
  FPGA_UPLOAD_QUERY = 0x223,
  FPGA_UPLOAD = 0x4000
}

const TRIGGER_HOLDOFF_ARG_ADDRESS = new Map<TriggerSource, Address>([
  [TriggerSource.CH1, Address.CH1_TRIGGER_HOLDOFF_ARG],
  [TriggerSource.CH2, Address.CH2_TRIGGER_HOLDOFF_ARG],
  [TriggerSource.EXTERNAL, Address.EXT_TRIGGER_HOLDOFF_ARG]
]);

const TRIGGER_HOLDOFF_INDEX_ADDRESS = new Map<TriggerSource, Address>([
  [TriggerSource.CH1, Address.CH1_TRIGGER_HOLDOFF_INDEX],
  [TriggerSource.CH2, Address.CH2_TRIGGER_HOLDOFF_INDEX],
  [TriggerSource.EXTERNAL, Address.EXT_TRIGGER_HOLDOFF_INDEX]
]);

const TRIGGER_EDGE_LEVEL_ADDRESS = new Map<TriggerSource, Address>([
  [TriggerSource.CH1, Address.CH1_TRIGGER_EDGE_LEVEL],
  [TriggerSource.CH2, Address.CH2_TRIGGER_EDGE_LEVEL],
  [TriggerSource.EXTERNAL, Address.EXT_TRIGGER_EDGE_LEVEL]
]);

const CHANNEL_ADDRESS = new Map<Channel, Address>([
  [Channel.CH1, Address.CH1],
  [Channel.CH2, Address.CH2]
]);

const VOLT_GAIN_ADDRESS = new Map<Channel, Address>([
  [Channel.CH1, Address.CH1_VOLT_GAIN],
  [Channel.CH2, Address.CH2_VOLT_GAIN]
]);

const ZERO_OFFSET_ADDRESS = new Map<Channel, Address>([
  [Channel.CH1, Address.CH1_ZERO_OFFSET],
  [Channel.CH2, Address.CH2_ZERO_OFFSET]
]);

enum CalibrationField {
  GAIN = 0,
  AMPLITUDE = 1,
  COMPENSATION = 2
}

type TypedArray =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Uint8ClampedArray
  | Float32Array
  | Float64Array;

function packCommand(address: number, data: TypedArray): ArrayBuffer {
  const headerSize = 4 + 1;
  const buffer = new ArrayBuffer(headerSize + data.byteLength);
  const uint8View = new Uint8Array(buffer);
  const dataView = new DataView(buffer);
  dataView.setUint32(0, address, true);
  dataView.setUint8(4, data.byteLength);
  uint8View.set(data, headerSize);
  return buffer;
}

const DEVICE_TYPE = 0x56;
const FLASH_HEADER = 0xaa55;
const CALIBRATION_INFO_COUNT = 3;
const CHANNEL_COUNT = 2;
const VOLTBASE_COUNT = 10;
const AFFIRMATIVE_RESPONSE = 0x53;
const FPGA_ACCEPTING_UPLOAD_RESPONSE = 0x44;

export class Owon {
  device_: USBDevice;
  inEndpoint_: USBEndpoint | undefined;
  outEndpoint_: USBEndpoint | undefined;
  calibrationData_: ndarray<number>;
  firmwareVersion_: string;
  serialNumber_: string;

  constructor(device: USBDevice) {
    this.device_ = device;
    this.inEndpoint_;
    this.outEndpoint_;
    this.calibrationData_ = ndarray(new Uint16Array(60), [
      CHANNEL_COUNT,
      CALIBRATION_INFO_COUNT,
      VOLTBASE_COUNT
    ]);
    this.firmwareVersion_ = "";
    this.serialNumber_ = "";
  }

  async open() {
    await this.device_
      .open()
      .then(() => this.device_.selectConfiguration(1))
      .then(() => this.device_.claimInterface(0));

    const alternateInterface = this.device_.configuration.interfaces[0]
      .alternates[0];
    this.inEndpoint_ = alternateInterface.endpoints.filter(
      endpoint => endpoint.direction === "in"
    )[0];
    this.outEndpoint_ = alternateInterface.endpoints.filter(
      endpoint => endpoint.direction === "out"
    )[0];

    const deviceType = await this.getDeviceType();
    if (deviceType !== DEVICE_TYPE) {
      throw new Error(
        `expected device type to be ${DEVICE_TYPE}, but was ${deviceType}`
      );
    }
  }

  async getDeviceType(): Promise<number> {
    await this.transferOut(packCommand(0x4001, Uint8Array.from([0x56])));

    const receivedData = await this.transferIn(5);
    return receivedData.getUint8(0);
  }

  async readFlash(): Promise<DataView> {
    console.log(
      await this.transferOut(packCommand(0x01b0, Uint8Array.from([0x1])))
    );

    const receivedData = await this.transferIn(2002);
    const header = receivedData.getUint16(0);
    if (header !== FLASH_HEADER) {
      throw Error(
        `Expected flash header to be 0x${FLASH_HEADER.toString(
          16
        )}, but was 0x${header.toString(16)}`
      );
    }
    const version = receivedData.getUint32(2, true);
    if (version !== 2) {
      throw Error(`Expected flash version to be 2, but was ${version}`);
    }

    const crc = crc32(new Uint8Array(receivedData.buffer));
    console.log(`Fetched flash crc32: 0x${crc}`);

    let bufferOffset = 6;
    for (
      let calibrationInfoIndex = 0;
      calibrationInfoIndex < CALIBRATION_INFO_COUNT;
      calibrationInfoIndex++
    ) {
      for (let channelIndex = 0; channelIndex < CHANNEL_COUNT; channelIndex++) {
        for (
          let voltbaseIndex = 0;
          voltbaseIndex < VOLTBASE_COUNT;
          voltbaseIndex++
        ) {
          const value = receivedData.getUint16(bufferOffset, true);
          this.calibrationData_.set(
            channelIndex,
            calibrationInfoIndex,
            voltbaseIndex,
            value
          );
          bufferOffset += 2;
        }
      }
    }

    console.log("calibration: ", show(this.calibrationData_));

    this.firmwareVersion_ = String.fromCharCode.apply(
      null,
      Array.from(new Uint8Array(receivedData.buffer, 207, 4))
    );

    this.serialNumber_ = String.fromCharCode.apply(
      null,
      Array.from(new Uint8Array(receivedData.buffer, 212, 15))
    );

    console.log(`${this.firmwareVersion_}: ${this.serialNumber_}`);

    return receivedData;
  }

  async transferOut(packedCommand: ArrayBuffer | TypedArray) {
    if (!this.outEndpoint_) {
      throw new Error("The device is missing the out endpoint");
    }

    await this.device_.transferOut(
      this.outEndpoint_.endpointNumber,
      packedCommand
    );
  }

  async transferIn(length: number): Promise<DataView> {
    if (!this.inEndpoint_) {
      throw new Error("The device is missing the in endpoint");
    }

    const response = await this.device_.transferIn(
      this.inEndpoint_.endpointNumber,
      length
    );
    return response.data;
  }

  async expectResponse(expected: number): Promise<DataView> {
    const data = await this.transferIn(5);
    const actual = data.getUint8(0);
    if (actual !== expected) {
      throw new Error(
        `Expected a response of 0x${expected.toString(
          16
        )}, but got 0x${actual.toString(16)}`
      );
    }
    return data;
  }

  async uploadFpgaBitstream() {
    const fetchResponse = await fetch(fpgaFirmwareUrl);
    const readResponse = await fetchResponse.body?.getReader().read();
    const fpgaFirmware = readResponse?.value;

    console.log(fpgaFirmware?.byteLength);
    console.log(fpgaFirmware);

    const firmwareSizeBuffer = new ArrayBuffer(4);
    const dataView = new DataView(firmwareSizeBuffer);
    dataView.setUint32(0, fpgaFirmware?.byteLength!, true);
    await this.transferOut(
      packCommand(Address.FPGA_UPLOAD, new Uint8Array(firmwareSizeBuffer))
    );
    const uploadResponseData = await this.expectResponse(
      FPGA_ACCEPTING_UPLOAD_RESPONSE
    );
    const mcuBufferSize = uploadResponseData.getUint32(1, true);
    const mcuDataSize = mcuBufferSize - 4;

    for (
      let i = 0, mcuFrameIndex = 0;
      i < fpgaFirmware?.byteLength!;
      i += mcuDataSize, mcuFrameIndex++
    ) {
      const transmitDataSize = Math.min(
        mcuDataSize,
        fpgaFirmware?.byteLength! - i
      );
      const transmitBufferSize = transmitDataSize + 4;
      console.log(transmitBufferSize);
      const mcuBuffer = new Uint8Array(transmitBufferSize);
      const mcuBufferDataView = new DataView(mcuBuffer.buffer);
      mcuBufferDataView.setUint32(0, mcuFrameIndex, true);
      mcuBuffer.set(
        new Uint8Array(fpgaFirmware?.buffer!, i, transmitDataSize),
        4
      );
      for (
        let chunkOffset = 0;
        chunkOffset < transmitBufferSize;
        chunkOffset += 64
      ) {
        const chunkBufferSize = Math.min(64, transmitBufferSize - chunkOffset);
        await this.transferOut(
          new Uint8Array(mcuBuffer.buffer, chunkOffset, chunkBufferSize)
        );
      }
      await this.expectResponse(AFFIRMATIVE_RESPONSE);
    }
  }

  async configurePhaseFine() {
    await this.transferOut(
      packCommand(Address.PHASE_FINE, Uint8Array.from([0x00, 0x00]))
    );
    await this.expectResponse(AFFIRMATIVE_RESPONSE);
  }

  async configureChannel(options: Readonly<ChannelOptions>) {
    let channelBitField = 0;

    if (options.on) {
      channelBitField |= 0x80;
    }
    channelBitField |= options.coupling << 5;
    // delay attenuation? I don't know what this is, but the owon software is setting it
    channelBitField |= 0x2;

    await this.transferOut(
      packCommand(
        CHANNEL_ADDRESS.get(options.channel)!,
        Uint8Array.from([channelBitField])
      )
    );
    await this.expectResponse(AFFIRMATIVE_RESPONSE);

    const voltGain = this.calibrationData_.get(
      options.channel,
      CalibrationField.GAIN,
      options.voltage
    );

    const voltGainBuffer = new ArrayBuffer(2);
    const voltGainDataView = new DataView(voltGainBuffer);
    voltGainDataView.setUint16(0, voltGain, true);
    await this.transferOut(
      packCommand(
        VOLT_GAIN_ADDRESS.get(options.channel)!,
        new Uint8Array(voltGainBuffer)
      )
    );
    await this.expectResponse(AFFIRMATIVE_RESPONSE);

    const compensation = this.calibrationData_.get(
      options.channel,
      CalibrationField.COMPENSATION,
      options.voltage
    );
    const amplitude = this.calibrationData_.get(
      options.channel,
      CalibrationField.AMPLITUDE,
      options.voltage
    );
    // TODO: add position to this, should be compensation - Math.floor(position * amplitude/100)
    const zeroOffset = compensation - Math.floor(amplitude / 100);

    const zeroOffsetBuffer = new ArrayBuffer(2);
    const zeroOffsetDataView = new DataView(zeroOffsetBuffer);
    zeroOffsetDataView.setUint16(0, zeroOffset, true);
    await this.transferOut(
      packCommand(
        ZERO_OFFSET_ADDRESS.get(options.channel)!,
        new Uint8Array(zeroOffsetBuffer)
      )
    );
    await this.expectResponse(AFFIRMATIVE_RESPONSE);
  }

  async configureTimebase(timebase: Timebase) {
    const timebaseBuffer = new ArrayBuffer(4);
    const timebaseDataView = new DataView(timebaseBuffer);
    timebaseDataView.setUint32(0, timebase, true);
    await this.transferOut(
      packCommand(Address.TIMEBASE, new Uint8Array(timebaseBuffer))
    );
    await this.expectResponse(AFFIRMATIVE_RESPONSE);

    // slowmove?
  }

  async configureTrigger(options: TriggerOptions) {
    // alternate trigger mode?

    let triggerBitField = 0;

    triggerBitField |= options.type << 8;
  }

  async configureEdgeTrigger(options: EdgeTriggerOptions) {
    // Edge level
    let upperBound =
      options.slope === TriggerSlope.RISING
        ? options.triggerLevel
        : options.triggerLevel + 10;
    let lowerBound =
      options.slope === TriggerSlope.RISING
        ? options.triggerLevel - 10
        : options.triggerLevel;

    if (upperBound > 128) {
      upperBound = 128;
      lowerBound = upperBound - 10;
    }

    if (lowerBound < -128) {
      lowerBound = -128;
      upperBound = lowerBound + 10;
    }

    await this.transferOut(
      packCommand(
        TRIGGER_EDGE_LEVEL_ADDRESS.get(options.source)!,
        Int8Array.from([upperBound, lowerBound])
      )
    );
    await this.expectResponse(AFFIRMATIVE_RESPONSE);

    // Trigger type
    let triggerTypeBitField = 0;
    if (options.mode === TriggerMode.SINGLE) {
      triggerTypeBitField |= (options.type & 0x1) << 8;
      triggerTypeBitField |= ((options.type >> 1) & 0x1) << 14;
      if (options.source === TriggerSource.EXTERNAL) {
        triggerTypeBitField |= 0x1;
      } else {
        triggerTypeBitField |= (options.source & 0x1) << 13;
      }
    } else {
      // TriggerMode.ALTERNATE
      triggerTypeBitField |= 1 << 15;
      triggerTypeBitField |= (options.type & 0x1) << 13;
      triggerTypeBitField |= ((options.type >> 1) & 0x1) << 8;
      triggerTypeBitField |= (options.source & 0x1) << 14;
    }

    const sweep = 0; // [0, 1, 2] I don't understand what this is.
    triggerTypeBitField |= (options.slope & 0x1) << 12;
    if (options.mode === TriggerMode.SINGLE) {
      triggerTypeBitField |= (sweep & 0x1) << 10;
      triggerTypeBitField |= ((sweep >> 1) & 0x1) << 11;
    }

    const triggerTypeBuffer = new ArrayBuffer(2);
    const triggerTypeDataView = new DataView(triggerTypeBuffer);
    triggerTypeDataView.setUint16(0, triggerTypeBitField, true);
    await this.transferOut(
      packCommand(Address.TRIGGER, new Uint8Array(triggerTypeBuffer))
    );
    await this.expectResponse(AFFIRMATIVE_RESPONSE);
  }

  async turnOnChannel1() {
    await this.transferOut(
      packCommand(Address.CHANNEL_ON, Uint8Array.from([0x1]))
    );
    await this.expectResponse(AFFIRMATIVE_RESPONSE);
  }

  async getData() {
    await this.transferOut(
      packCommand(Address.GET_DATA, Uint8Array.from([0x05, 0x05]))
    );

    const receivedData = await this.transferIn(5211);

    const channel = receivedData.getUint8(0);
    console.log(channel, receivedData.buffer);
  }

  async sampleInfinitely(gotData: (data: DataView) => void) {
    await this.transferOut(
      packCommand(Address.CH1_TRIGGER_HOLDOFF_ARG, Uint8Array.from([0x00]))
    );
    await this.expectResponse(AFFIRMATIVE_RESPONSE);

    await this.transferOut(
      packCommand(Address.CH1_TRIGGER_HOLDOFF_INDEX, Uint8Array.from([0x42]))
    );
    await this.expectResponse(AFFIRMATIVE_RESPONSE);

    await this.transferOut(
      packCommand(Address.DEEP_MEMORY, Uint8Array.from([0xec, 0x13]))
    );
    await this.expectResponse(AFFIRMATIVE_RESPONSE);

    await this.transferOut(
      packCommand(Address.SYNC_OUTPUT, Uint8Array.from([0x00]))
    );
    await this.expectResponse(AFFIRMATIVE_RESPONSE);

    await this.transferOut(
      packCommand(Address.SAMPLE, Uint8Array.from([0x00]))
    );
    await this.expectResponse(AFFIRMATIVE_RESPONSE);

    // await this.transferOut(
    //   packCommand(Address.SLOW_MOVE, Uint8Array.from([0x00]))
    // );
    // await this.expectResponse(AFFIRMATIVE_RESPONSE);

    await this.transferOut(
      packCommand(Address.PRE_TRIGGER, Uint8Array.from([0xf1, 0x09]))
    );
    await this.expectResponse(AFFIRMATIVE_RESPONSE);

    await this.transferOut(
      packCommand(
        Address.SUF_TRIGGER,
        Uint8Array.from([0xfb, 0x09, 0x00, 0x00])
      )
    );
    await this.expectResponse(AFFIRMATIVE_RESPONSE);

    await this.transferOut(packCommand(Address.EMPTY, Uint8Array.from([0x1])));
    await this.expectResponse(AFFIRMATIVE_RESPONSE);

    // await this.transferOut(packCommand(Address.CH1_FREQUENCY_REFERENCE, Uint8Array.from([0x1e])));
    // await this.transferIn(AFFIRMATIVE_RESPONSE);

    for (let i = 0; i < 5000; i++) {
      await this.transferOut(
        packCommand(Address.TRIGGER_D, Uint8Array.from([0x00]))
      );
      await this.expectResponse(AFFIRMATIVE_RESPONSE);

      await this.transferOut(
        packCommand(Address.DATA_FINISHED, Uint8Array.from([0x00]))
      );
      await this.expectResponse(AFFIRMATIVE_RESPONSE);

      console.log("request data");
      await this.transferOut(packCommand(4096, Uint8Array.from([0x05, 0x04])));

      console.log("receive data");
      const receivedData = await this.transferIn(5211);

      console.log(gotData(receivedData));
    }
  }

  async close() {
    await this.device_.close();
  }

  static getFilter(): Partial<USBRequestFilter> {
    return { vendorId: 0x5345, productId: 0x1234 };
  }
}
