from __future__ import annotations

import shutil
import uuid
from pathlib import Path

import pretty_midi
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .models import ArrangeRequest, ArrangeResult, RecognizeResult
from .music_utils import arrange_section, audio_to_melody, merge_sections

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
MIDI_DIR = DATA_DIR / "midi"

for p in [UPLOAD_DIR, MIDI_DIR]:
    p.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Melody Arranger API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/recognize", response_model=RecognizeResult)
async def recognize_melody(name: str = Form(...), file: UploadFile = File(...)) -> RecognizeResult:
    uid = uuid.uuid4().hex[:8]
    ext = Path(file.filename or "input.wav").suffix or ".wav"
    audio_path = UPLOAD_DIR / f"{uid}_{name}{ext}"
    midi_path = MIDI_DIR / f"melody_{uid}.mid"

    with audio_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    melody_data = audio_to_melody(audio_path, midi_path)
    note_preview = [pretty_midi.note_number_to_name(n[0]) for n in melody_data.note_events[:12]]

    return RecognizeResult(
        name=name,
        bpm=melody_data.bpm,
        midi_path=str(midi_path.relative_to(BASE_DIR)),
        note_count=len(melody_data.note_events),
        note_preview=note_preview,
    )


@app.post("/api/arrange", response_model=ArrangeResult)
def arrange_song(payload: ArrangeRequest) -> ArrangeResult:
    section_files: list[Path] = []
    all_tracks: set[str] = set()

    for idx, section in enumerate(payload.sections):
        src_midi = BASE_DIR / section.midi_path
        out_midi = MIDI_DIR / f"arr_{idx}_{uuid.uuid4().hex[:8]}.mid"
        tracks = arrange_section(
            src_midi,
            out_midi,
            style=payload.style,
            bpm=payload.bpm,
            root=payload.key_root,
            mode=payload.mode,
            complexity=payload.complexity,
        )
        all_tracks.update(tracks)
        section_files.append(out_midi)

    full_midi = MIDI_DIR / f"full_{uuid.uuid4().hex[:8]}.mid"
    merged_tracks, _ = merge_sections(section_files, full_midi)
    all_tracks.update(merged_tracks)

    return ArrangeResult(
        arrangement_midi=str(full_midi.relative_to(BASE_DIR)),
        section_midis=[str(s.relative_to(BASE_DIR)) for s in section_files],
        tracks=sorted(all_tracks),
    )


@app.get("/api/download")
def download_midi(path: str) -> FileResponse:
    file_path = BASE_DIR / path
    return FileResponse(file_path, media_type="audio/midi", filename=file_path.name)
