# Melody Arranger MVP

将用户哼唱/上传旋律自动转化为多轨 MIDI 编曲（FastAPI + React + TypeScript）。

## 项目结构

```text
music_melody/
├─ backend/
│  ├─ app/
│  │  ├─ main.py              # FastAPI API
│  │  ├─ models.py            # 请求/响应模型
│  │  └─ music_utils.py       # 旋律识别、rule-based 编曲、多 section 合并
│  ├─ requirements.txt
│  └─ data/
│     ├─ uploads/
│     └─ midi/
├─ frontend/
│  ├─ src/
│  │  ├─ App.tsx              # 主页面工作流
│  │  ├─ Recorder.tsx         # 浏览器录音
│  │  ├─ MidiPlayer.tsx       # Web 播放 MIDI
│  │  ├─ api.ts
│  │  ├─ types.ts
│  │  └─ styles.css
│  ├─ package.json
│  └─ ...vite/tailwind 配置
└─ README.md
```

## MVP 已实现能力

1. 支持多旋律 section 输入（上传文件 + 浏览器录音）。
2. 后端用 librosa.pyin 提取 pitch contour，离散化音高并量化时值。
3. 生成可编辑的 Melody MIDI。
4. 用户选择曲风 + BPM + 调式 + 情绪 + 编曲复杂度。
5. rule-based arranger 生成 Chords / Bass / Drums / Pad。
6. 支持多 section 顺序编排为完整作品。
7. 前端可播放并导出完整 MIDI / 分段 MIDI。

## 后端启动

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## 前端启动

```bash
cd frontend
npm install
npm run dev
```

打开 `http://localhost:5173`。

## API 概览

- `POST /api/recognize`：上传单段旋律音频并识别成 MIDI。
- `POST /api/arrange`：输入多个 section 的 melody MIDI 路径和编曲参数，生成段落 MIDI 和完整 MIDI。
- `GET /api/download?path=...`：下载 MIDI。

## 下一步建议

- 接入 CREPE/Magenta 提升旋律识别与编曲质量。
- 使用 Tone.js sampler + soundfont 支持更真实试听、solo/mute UI。
- 引入项目 JSON 持久化与 WAV/MP3 渲染（fluidsynth）。
