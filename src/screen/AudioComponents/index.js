import React, { useMemo, useState } from "react";
import Experience from "./config";
const AudioComponents = () => {
  const [textAreaValue, setTextAreaValue] = useState("");
  const [speed, setSpeed] = useState(50);
  const [volume, setVolume] = useState(50);
  const [pitch, setPitch] = useState(50);
  const experience = useMemo(() => {
    return new Experience({
      speed: Number(speed),
      voice: Number(volume),
      pitch: Number(pitch),
      playBtn: `.audio-ctrl-btn`,
      defaultText: "初始化自动播放测试语音，用来测试不同设备的表现"
    });
  }, [pitch, speed, volume]);
  const handleAudioPlay = e => {
    console.log(textAreaValue);
    console.log(experience);
    e.stopPropagation();
    if (textAreaValue !== experience.text) {
      experience.setConfig({
        text: textAreaValue
      });
    }
    if (experience.playState === "play") {
      experience.audioPause();
    } else {
      experience.audioPlay();
    }
  };
  const handleTextAreaValueChange = e => setTextAreaValue(e.target.value);
  console.log(experience);
  setTimeout(() => {
    experience.audioPlay();
  }, 1000);

  return (
    <>
      <form className="form-block">
        <div className="label-item">
          <label className="label">语速</label>
          <input
            type="range"
            max="100"
            min="0"
            onChange={e => setSpeed(e.target.value)}
            value={speed}
          />
          <div className="num">{speed}</div>
        </div>
        <div className="label-item">
          <label className="label">音量</label>
          <input
            type="range"
            max="100"
            min="0"
            onChange={e => setVolume(e.target.value)}
            value={volume}
          />
          <div className="num">{volume}</div>
        </div>
        <div className="label-item">
          <label className="label">音高</label>
          <input
            type="range"
            max="100"
            min="0"
            onChange={e => setPitch(e.target.value)}
            value={pitch}
          />
          <div className="num">{pitch}</div>
        </div>
        {/* <div className="label-item">
          <label className="label">发音人</label>
          <label>
            <input type="radio" name="xiaolin" />
            晓琳(台湾音)
          </label>
          <label>
            <input type="radio" name="mengmengneutral" />
            萌萌
          </label>
        </div> */}
        <div>请输入需要转换的语音文本</div>
        <textarea className="output-box" onChange={handleTextAreaValueChange} />
        <div>
          <button
            className="audio-ctrl-btn"
            onClick={handleAudioPlay}
            type="button"
          >
            立即合成
          </button>
        </div>
      </form>
    </>
  );
};
export default AudioComponents;
