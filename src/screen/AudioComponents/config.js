/**
 * Created by iflytek on 2019/11/19.
 *
 * 在线语音合成调用demo
 * 此demo只是一个简单的调用示例，不适合用到实际生产环境中
 *
 * 在线语音合成 WebAPI 接口调用示例 接口文档（必看）：https://www.xfyun.cn/doc/tts/online_tts/API.html
 * 错误码链接：
 * https://www.xfyun.cn/doc/tts/online_tts/API.html
 * https://www.xfyun.cn/document/error-code （code返回错误码时必看）
 *
 */
// eslint-disable-next-line import/no-webpack-loader-syntax
// const transformWorker = require("exports-loader?window.transformWorker!imports-loader!./transform.worker.js");
// console.log(transformWorker);
// eslint-disable-next-line import/no-webpack-loader-syntax
import Worker from "worker-loader!./transform.worker.js";
const DEFAULT_TEXT = "这是一个例子，请输入您要合成的文本";

//APPID，APISecret，APIKey在控制台-我的应用-语音合成（流式版）页面获取
const APPID = "5e39361e";
const API_SECRET = "679fa5dd65e52fa1711a35d0355642e8";
const API_KEY = "51e1a5297a530fd55c86ad2dd0e19669";
let isChrome = navigator.userAgent.toLowerCase().match(/chrome/);
let notSupportTip = isChrome
  ? "您的浏览器暂时不支持体验功能，请升级您的浏览器"
  : "您现在使用的浏览器暂时不支持体验功能，<br />推荐使用谷歌浏览器Chrome";
const CryptoJS = window.CryptoJS;
const $ = window.$;
const MozWebSocket = window.MozWebSocket;
const Base64 = window.Base64;
function getWebsocketUrl() {
  return new Promise((resolve, reject) => {
    var apiKey = API_KEY;
    var apiSecret = API_SECRET;
    var url = "wss://tts-api.xfyun.cn/v2/tts";
    var host = window.location.host;
    var date = new Date().toGMTString();
    var algorithm = "hmac-sha256";
    var headers = "host date request-line";
    var signatureOrigin = `host: ${host}\ndate: ${date}\nGET /v2/tts HTTP/1.1`;
    var signatureSha = CryptoJS.HmacSHA256(signatureOrigin, apiSecret);
    var signature = CryptoJS.enc.Base64.stringify(signatureSha);
    var authorizationOrigin = `api_key="${apiKey}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`;
    var authorization = btoa(authorizationOrigin);
    url = `${url}?authorization=${authorization}&date=${date}&host=${host}`;
    resolve(url);
  });
}

let audioCtx;
let source;
let btnState = {
  unTTS: "立即合成",
  ttsing: "正在合成",
  endTTS: "立即播放",
  play: "停止播放",
  pause: "继续播放",
  endPlay: "重新播放",
  errorTTS: "合成失败"
};
class Experience {
  constructor({
    speed = 50,
    voice = 50,
    pitch = 50,
    text = "",
    engineType = "aisound",
    voiceName = "x_mengmengneutral",
    playBtn = ".js-base-play",
    defaultText = ""
  } = {}) {
    this.speed = speed;
    this.voice = voice;
    this.pitch = pitch;
    this.text = text;
    this.defaultText = defaultText;
    this.engineType = engineType;
    this.voiceName = voiceName;
    this.playBtn = playBtn;
    this.playState = "";
    this.audioDatas = [];
    this.pcmPlayWork = new Worker();
    this.pcmPlayWork.onmessage = e => {
      this.onmessageWork(e);
    };
  }

  setConfig({ speed, voice, pitch, text, defaultText, engineType, voiceName }) {
    speed && (this.speed = speed);
    voice && (this.voice = voice);
    pitch && (this.pitch = pitch);
    text && (this.text = text);
    defaultText && (this.defaultText = defaultText);
    engineType && (this.engineType = engineType);
    voiceName && (this.voiceName = voiceName);
    this.resetAudio();
  }

  onmessageWork(e) {
    // switch (e.data.command) {
    //   case "newAudioData": {
    //     this.audioDatas.push(e.data.data);
    //     if (this.playState === "ttsing" && this.audioDatas.length === 1) {
    //       this.playTimeout = setTimeout(() => {
    //         this.audioPlay();
    //       }, 1000);
    //     }
    //     break;
    //   }
    // }
    if (e.data.command === "newAudioData") {
      this.audioDatas.push(e.data.data);
      if (this.playState === "ttsing" && this.audioDatas.length === 1) {
        this.playTimeout = setTimeout(() => {
          this.audioPlay();
        }, 1000);
      }
    }
  }

  setBtnState(state) {
    let oldState = this.playState;
    this.playState = state;
    $(this.playBtn)
      .removeClass(oldState)
      .addClass(state)
      .text(btnState[state]);
  }

  getAudio() {
    this.setBtnState("ttsing");
    getWebsocketUrl().then(url => {
      this.connectWebsocket(url);
    });
  }

  connectWebsocket(url) {
    if ("WebSocket" in window) {
      this.websocket = new WebSocket(url);
    } else if ("MozWebSocket" in window) {
      this.websocket = new MozWebSocket(url);
    } else {
      alert(notSupportTip);
      return;
    }
    let self = this;
    this.websocket.onopen = e => {
      var params = {
        common: {
          app_id: APPID // APPID
        },
        business: {
          ent: self.engineType,
          aue: "raw",
          auf: "audio/L16;rate=16000",
          vcn: self.voiceName,
          speed: self.speed,
          volume: self.voice * 10,
          pitch: self.pitch,
          //'bgs': 1,
          tte: "UTF8"
        },
        data: {
          status: 2,
          text: Base64.encode(self.text || self.defaultText || DEFAULT_TEXT)
        }
      };
      this.websocket.send(JSON.stringify(params));
    };
    this.websocket.onmessage = e => {
      let jsonData = JSON.parse(e.data);
      // 合成失败
      if (jsonData.code !== 0) {
        alert(`${jsonData.code}:${jsonData.message}`);
        self.resetAudio();
        this.websocket.close();
        return;
      }
      self.pcmPlayWork.postMessage({
        command: "transData",
        data: jsonData.data.audio
      });

      if (jsonData.code === 0 && jsonData.data.status === 2) {
        this.websocket.close();
      }
    };
    this.websocket.onerror = e => {
      console.log(e);
      console.log(e.data);
    };
    this.websocket.onclose = e => {
      console.log(e);
    };
  }

  resetAudio() {
    this.audioPause();
    this.setBtnState("unTTS");
    this.audioDatasIndex = 0;
    this.audioDatas = [];
    this.websocket && this.websocket.close();
    clearTimeout(this.playTimeout);
  }

  audioPlay() {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (!audioCtx) {
        alert(notSupportTip);
        return;
      }
    } catch (e) {
      alert(notSupportTip);
      return;
    }
    console.log(`--------------->`, this.audioDatas.length);
    this.audioDatasIndex = 0;
    if (this.audioDatas.length) {
      this.playSource();
      this.setBtnState("play");
    } else {
      this.getAudio();
    }
  }

  audioPause(state) {
    if (this.playState === "play") {
      this.setBtnState(state || "endPlay");
    }
    clearTimeout(this.playTimeout);
    try {
      source && source.stop();
    } catch (e) {
      console.log(e);
    }
  }

  playSource() {
    let bufferLength = 0;
    let dataLength = this.audioDatas.length;
    for (let i = this.audioDatasIndex; i < dataLength; i++) {
      bufferLength += this.audioDatas[i].length;
    }
    let audioBuffer = audioCtx.createBuffer(1, bufferLength, 22050);
    let offset = 0;
    let nowBuffering = audioBuffer.getChannelData(0);
    for (let i = this.audioDatasIndex; i < dataLength; i++) {
      let audioData = this.audioDatas[i];
      if (audioBuffer.copyToChannel) {
        audioBuffer.copyToChannel(audioData, 0, offset);
      } else {
        for (let j = 0; j < audioData.length; j++) {
          nowBuffering[offset + j] = audioData[j];
        }
      }
      offset += audioData.length;
      this.audioDatasIndex++;
    }

    source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    source.start();
    source.onended = event => {
      if (this.playState !== "play") {
        return;
      }
      if (this.audioDatasIndex < this.audioDatas.length) {
        this.playSource();
      } else {
        this.audioPause("endPlay");
      }
    };
  }
}
export default Experience;
// let experience = new Experience({
//   speed: 50,
//   voice: 50,
//   pitch: 50,
//   playBtn: `.audio-ctrl-btn`
// });

// $(".audio-ctrl-btn").on("click", function() {
//   let text = $("textarea").val();
//   if (text !== experience.text) {
//     experience.setConfig({
//       text
//     });
//   }
//   if (experience.playState === "play") {
//     experience.audioPause();
//   } else {
//     experience.audioPlay();
//   }
// });
// $("textarea").on("change", function() {
//   var text = this.value || "";
//   experience.setConfig({ text });
//   $(this).keyup();
// });
