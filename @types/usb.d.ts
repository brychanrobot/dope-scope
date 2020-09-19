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

interface Navigator {
    usb: USB
}

interface USB {
    getDevices(): Promise<Array<USBDevice>>
    requestDevice(options: USBRequestOptions): Promise<USBDevice>
}

interface USBRequestFilter {
    vendorId: number
    productId: number
    classCode: number
    subclassCode: number
    protocolCode: number
    serialNumber: number
}

interface USBRequestOptions {
    filters: Array<Partial<USBRequestFilter>>
}

interface USBDevice {
    configuration: Readonly<USBConfiguration>
    configurations: Readonly<Array<USBConfiguration>>
    deviceClass: number
    deviceProtocol: number
    deviceSubclass: number
    deviceVersionMajor: number
    deviceVersionMinor: number
    deviceVersionSubminor: number
    manufacturerName: string
    opened: boolean
    productId: number
    productName: string
    serialNumber: number
    usbVersionMajor: number
    usbVersionMinor: number
    usbVersionSubminor: number
    vendorId: number
    
    claimInterface(interfaceNumber: number): Promise
    clearHalt(direction: string, endpointNumber: number): Promise
    controlTransferIn(): Promise<USBInTransferResult>
    controlTransferOut(): Promise<USBOutTransferResult>
    close(): Promise
    isochronousTransferIn(): Promise<USBIsochronousInTransferResult>
    isochronousTransferOut(): Promise<USBIsochronousOutTransferResult>
    open(): Promise
    releaseInterface(interfaceNumber: number)
    reset(): Promise
    selectAlternateInterface(interfaceNumber: number, alternateSetting: number): Promise
    selectConfiguration(configurationValue: number): Promise
    transferIn(endpointNumber: number, length: number): Promise<USBInTransferResult>
    transferOut(endpointNumber: number, data: TypedArray): Promise<USBOutTransferResult>
}

interface USBInTransferResult {
    data: DataView
    status: string
}

interface USBOutTransferResult {
    bytesWritten: number
    status: string
}

interface USBIsochronousInTransferResult {

}

interface USBIsochronousOutTransferResult {

}

interface USBConfiguration {
    configurationValue: number
    configurationName: string
    interfaces: Array<USBInterface>
}

interface USBInterface {
    interfaceNumber: number
    alternate: USBAlternateInterface
    alternates: Array<USBAlternateInterface>
    claimed: true
}

interface USBAlternateInterface {
    alternateSetting: number
    interfaceClass: number
    interfaceSubclass: number
    interfaceProtocol: number
    interfaceName: string
    endpoints: Array<USBEndpoint>
}

interface USBEndpoint {
    endpointNumber: number
    direction: "in" | "out"
    type: string
    packetSize: number
}

