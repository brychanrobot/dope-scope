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

<template>
  <div class="hello">
    <h1>{{ msg }}</h1>
    <button v-on:click="connect">Connect</button>
    <canvas ref="chart" class="Chart" />
  </div>
</template>

<script lang="ts">
import WebGLplot, { WebglLine, ColorRGBA } from "webgl-plot";
import { Component, Prop, Vue } from "vue-property-decorator";
import {
  Owon,
  Voltage,
  Channel,
  Coupling,
  Timebase,
  TriggerSource,
  TriggerType,
  TriggerMode,
  TriggerSlope
} from "../driver/owon";

@Component
export default class HelloWorld extends Vue {
  @Prop() private msg!: string;
  private ch1Line_?: WebglLine;
  private timeIndex_ = 0;
  private chart_?: WebGLplot;

  private mounted() {
    const chartCanvas = this.$refs.chart as HTMLCanvasElement;
    const devicePixelRatio = window.devicePixelRatio || 1;
    chartCanvas.width = chartCanvas.clientWidth * devicePixelRatio;
    chartCanvas.height = chartCanvas.clientHeight * devicePixelRatio;

    const numX = 1275;
    const color = new ColorRGBA(Math.random(), Math.random(), Math.random(), 1);
    this.ch1Line_ = new WebglLine(color, numX);
    this.chart_ = new WebGLplot(chartCanvas);
    this.ch1Line_.lineSpaceX(-1, 2 / numX);
    this.ch1Line_.scaleY = 0.15;
    this.chart_.addLine(this.ch1Line_);
  }

  private async connect() {
    const devices = await navigator.usb.getDevices();
    let device: USBDevice;
    if (devices.length > 0) {
      device = devices[0];
    } else {
      device = await navigator.usb.requestDevice({
        filters: [Owon.getFilter()]
      });
    }

    console.log(device);
    const owon = new Owon(device);
    await owon.open();
    console.log("opened");
    await owon.readFlash();

    await owon.uploadFpgaBitstream();

    console.log("configure phase fine");
    await owon.configurePhaseFine();

    console.log("configure edge trigger");
    await owon.configureEdgeTrigger({
      source: TriggerSource.CH1,
      type: TriggerType.EDGE,
      mode: TriggerMode.SINGLE,
      slope: TriggerSlope.RISING,
      holdoffSeconds: 0.001,
      triggerLevel: 36,
    });

    console.log("configure timebase");
    await owon.configureTimebase(Timebase.mspsCopiedFromOwon);

    console.log("configure channel");
    await owon.configureChannel({
      channel: Channel.CH1,
      on: true,
      voltage: Voltage.V2,
      coupling: Coupling.DC
    });

    console.log("turn on channel 1");
    await owon.turnOnChannel1();

    console.log("infinite test");
    await owon.sampleInfinitely(data => this.gotData(data));

    await owon.close();
    return Promise.resolve();
  }

  private async gotData(dataView: DataView) {
    const channel = dataView.getUint8(0);
    console.log("gotData: ", channel, dataView);
    const multiplier = 1 / 3096.0;
    const floatData= new Float32Array(1275);
    try {
      for (
        let byteIndex = 11 + 100, timeIndex = 0;
        byteIndex < dataView.byteLength;
        byteIndex += 4, timeIndex++
      ) {
        const value = dataView.getInt16(byteIndex, true) * multiplier;
        floatData[timeIndex] = value;
      }
    } catch (error) {
      console.log(error);
    }
    this.ch1Line_?.shiftAdd(floatData);
    this.chart_?.update();
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
.Chart {
  width: 100%;
  height: 800px;
}
</style>
