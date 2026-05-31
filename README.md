# Melody Arranger MVP

将用户哼唱/上传旋律自动转化为多轨 MIDI 编曲（FastAPI + React + TypeScript）。

## 环境要求

- Python **3.11+**
- Node.js **18+**（见下方安装说明）
- ffmpeg（用于解析浏览器录音格式）
- macOS / Linux

## 第一次运行

### 1. 安装 ffmpeg（如果没有）

```bash
# 方式一：从 https://evermeet.cx/ffmpeg/ 下载静态二进制（macOS Intel）
sudo cp ~/Downloads/ffmpeg /usr/local/bin/
sudo chmod +x /usr/local/bin/ffmpeg

# 方式二：conda
conda install -c conda-forge ffmpeg -y
```

### 2. 安装 Node.js（如果没有）

**推荐用 nvm 安装，避免系统版本冲突：**

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh"
nvm install 18
nvm use 18
```

> 每次新开终端需要运行 `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use 18`

### 3. 启动后端

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --port 8000
```

> **Anaconda 用户**：必须用 `.venv/bin/uvicorn` 而不是直接 `uvicorn`，避免 anaconda 环境覆盖。

后端运行在 `http://localhost:8000`，访问 `http://localhost:8000/docs` 可查看接口文档。

### 4. 启动前端（新开一个终端）

```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use 18 && cd frontend && npm install && npm run dev
```

浏览器打开 `http://localhost:5173`。

## 使用流程

1. **录音 / 上传**：每个 Section 可多次录音，选择最满意的一条点 Use，或直接上传音频文件
2. **识别**：点 Recognize，后端自动识别旋律、BPM 和调性，Arrange Settings 自动更新
3. **选择伴奏轨道**：勾选 Piano Chords / Bass / Drums / Pad（可任意组合）
4. **调整参数**：BPM、Key、Mode（major/minor）、Complexity 均可手动修改
5. **生成编曲**：点 Generate Arrangement
6. **播放 / 导出**：支持 Play / Pause / Resume / Stop，可下载完整或分段 MIDI

## 已实现功能

- 多 Section 录音，每次录音独立保存并显示编号，支持播放回听
- 用 `librosa.pyin` 提取音高轮廓，自动过滤背景杂音（RMS 能量过滤 + 中值滤波）
- 自动检测 BPM 和调性（Krumhansl-Schmuckler 算法），识别后自动填入设置
- 伴奏轨道独立勾选：Piano Chords / Bass / Drums / Pad
- 各轨道频率分层：Bass(八度2) → Chords(八度3) → Melody(八度4) → Pad(八度5)
- 音量层次：Melody 最突出，Chords/Pad 退为背景
- 多 Section 顺序合并为完整作品，支持 Play/Pause/Stop 播放

## 常见问题

**`ModuleNotFoundError: No module named 'pretty_midi'`**
没有用虚拟环境里的 uvicorn，改用 `.venv/bin/uvicorn` 启动。

**`[Errno 48] Address already in use`**
端口被占用，运行以下命令释放后重试：
```bash
lsof -ti :8000 | xargs kill -9
```

**`numba` / `llvmlite` 安装失败**
用预编译 wheel 安装，无需编译 LLVM：
```bash
.venv/bin/pip install numba --only-binary :all:
```

**`dyld: Symbol not found`（Node.js 报错）**
系统过旧，Node 版本太高，用 `nvm use 18` 切换到 Node 18。

**录音识别一直转不出结果**
缺少 ffmpeg，浏览器录音为 webm 格式需要 ffmpeg 解析，见上方安装步骤。

## API 概览

| 方法 | 路径 | 说明 |
|------|------|------|
| GET  | `/health` | 健康检查 |
| POST | `/api/recognize` | 上传音频，返回 MIDI、BPM、调性、音符预览 |
| POST | `/api/arrange` | 输入多段 MIDI 和编曲参数，生成完整编曲 |
| GET  | `/api/download?path=...` | 下载 MIDI 文件 |

## 项目结构

```text
music_melody/
├─ backend/
│  ├─ app/
│  │  ├─ main.py          # FastAPI 路由
│  │  ├─ models.py        # 请求/响应模型
│  │  └─ music_utils.py   # 旋律识别、调性检测、编曲、section 合并
│  ├─ requirements.txt
│  └─ data/
│     ├─ uploads/         # 上传的音频文件
│     └─ midi/            # 生成的 MIDI 文件
├─ frontend/
│  ├─ src/
│  │  ├─ App.tsx          # 主页面工作流
│  │  ├─ Recorder.tsx     # 多次录音、回听、选用
│  │  ├─ MidiPlayer.tsx   # MIDI 播放（Play/Pause/Stop）
│  │  ├─ api.ts
│  │  └─ types.ts
│  └─ package.json
└─ README.md
```
