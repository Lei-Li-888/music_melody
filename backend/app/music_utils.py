from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import librosa
import numpy as np
import pretty_midi

NOTE_MAP = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}

STYLE_TEMPLATES = {
    "Pop": {"drum_density": 1.0, "bass_pattern": [0, 0, 5, 5], "chords": [0, 5, 3, 4]},
    "R&B": {"drum_density": 0.8, "bass_pattern": [0, 0, 3, 4], "chords": [0, 3, 4, 5]},
    "Hip-hop": {"drum_density": 0.9, "bass_pattern": [0, 0, 0, 5], "chords": [0, 5, 4, 3]},
    "Rock": {"drum_density": 1.2, "bass_pattern": [0, 5, 4, 3], "chords": [0, 5, 4, 3]},
    "EDM": {"drum_density": 1.4, "bass_pattern": [0, 3, 4, 5], "chords": [0, 3, 4, 5]},
    "Lo-fi": {"drum_density": 0.6, "bass_pattern": [0, 0, 3, 5], "chords": [0, 3, 5, 4]},
    "Jazz": {"drum_density": 0.7, "bass_pattern": [0, 2, 5, 1], "chords": [0, 2, 5, 1]},
    "Cinematic": {"drum_density": 0.5, "bass_pattern": [0, 3, 5, 4], "chords": [0, 3, 5, 4]},
    "Chinese style": {"drum_density": 0.6, "bass_pattern": [0, 4, 5, 3], "chords": [0, 4, 5, 3]},
    "Acoustic": {"drum_density": 0.6, "bass_pattern": [0, 5, 3, 4], "chords": [0, 5, 3, 4]},
}

SCALE_STEPS = {
    "major": [0, 2, 4, 5, 7, 9, 11],
    "minor": [0, 2, 3, 5, 7, 8, 10],
}


@dataclass
class MelodyData:
    note_events: list[tuple[int, float, float]]
    bpm: int


def audio_to_melody(audio_path: Path, out_midi: Path) -> MelodyData:
    y, sr = librosa.load(str(audio_path), sr=22050, mono=True)
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    bpm = int(max(60, min(200, round(float(tempo)))))

    f0, voiced_flag, _ = librosa.pyin(y, fmin=librosa.note_to_hz("C2"), fmax=librosa.note_to_hz("C7"), frame_length=2048, hop_length=256)

    times = librosa.times_like(f0, sr=sr, hop_length=256)
    note_events: list[tuple[int, float, float]] = []

    current_note = None
    start_t = 0.0

    for idx, hz in enumerate(f0):
        if not voiced_flag[idx] or hz is None or np.isnan(hz):
            if current_note is not None:
                end_t = float(times[idx])
                if end_t - start_t > 0.08:
                    note_events.append((current_note, start_t, end_t))
                current_note = None
            continue

        midi_note = int(np.round(librosa.hz_to_midi(hz)))
        if current_note is None:
            current_note = midi_note
            start_t = float(times[idx])
            continue

        if abs(midi_note - current_note) > 1:
            end_t = float(times[idx])
            if end_t - start_t > 0.08:
                note_events.append((current_note, start_t, end_t))
            current_note = midi_note
            start_t = float(times[idx])

    if current_note is not None:
        note_events.append((current_note, start_t, float(times[-1]) if len(times) else start_t + 0.2))

    midi = pretty_midi.PrettyMIDI(initial_tempo=bpm)
    melody = pretty_midi.Instrument(program=0, name="Melody")
    for pitch, st, et in note_events:
        q_st = quantize_time(st, bpm)
        q_et = max(q_st + 0.25, quantize_time(et, bpm))
        melody.notes.append(pretty_midi.Note(velocity=95, pitch=pitch, start=q_st, end=q_et))

    midi.instruments.append(melody)
    out_midi.parent.mkdir(parents=True, exist_ok=True)
    midi.write(str(out_midi))
    return MelodyData(note_events=note_events, bpm=bpm)


def quantize_time(sec: float, bpm: int) -> float:
    beat = 60.0 / bpm
    grid = beat / 4.0
    return round(sec / grid) * grid


def degree_to_pitch(root: str, mode: str, degree: int, octave: int) -> int:
    root_pc = NOTE_MAP.get(root, 0)
    scale = SCALE_STEPS[mode]
    step = scale[degree % len(scale)]
    return 12 * (octave + 1) + (root_pc + step) % 12


def add_chord_track(pm: pretty_midi.PrettyMIDI, bpm: int, bars: int, root: str, mode: str, progression: list[int]) -> None:
    inst = pretty_midi.Instrument(program=0, name="Piano Chords")
    bar_dur = 60.0 / bpm * 4
    triad_offsets = [0, 2, 4]
    for bar in range(bars):
        deg = progression[bar % len(progression)]
        st = bar * bar_dur
        et = st + bar_dur
        for offset in triad_offsets:
            pitch = degree_to_pitch(root, mode, deg + offset, 4)
            inst.notes.append(pretty_midi.Note(velocity=80, pitch=pitch, start=st, end=et))
    pm.instruments.append(inst)


def add_bass_track(pm: pretty_midi.PrettyMIDI, bpm: int, bars: int, root: str, mode: str, pattern: list[int]) -> None:
    inst = pretty_midi.Instrument(program=33, name="Bass")
    beat = 60.0 / bpm
    for bar in range(bars):
        for beat_idx in range(4):
            deg = pattern[(bar + beat_idx) % len(pattern)]
            st = (bar * 4 + beat_idx) * beat
            et = st + beat * 0.9
            pitch = degree_to_pitch(root, mode, deg, 2)
            inst.notes.append(pretty_midi.Note(velocity=90, pitch=pitch, start=st, end=et))
    pm.instruments.append(inst)


def add_drum_track(pm: pretty_midi.PrettyMIDI, bpm: int, bars: int, density: float) -> None:
    drum = pretty_midi.Instrument(program=0, is_drum=True, name="Drums")
    step = 60.0 / bpm / 2
    steps = int(bars * 8)
    for s in range(steps):
        t = s * step
        if s % 4 == 0:
            drum.notes.append(pretty_midi.Note(velocity=110, pitch=36, start=t, end=t + 0.1))
        if s % 4 == 2:
            drum.notes.append(pretty_midi.Note(velocity=105, pitch=38, start=t, end=t + 0.1))
        if s % 2 == 0 and density >= 0.7:
            drum.notes.append(pretty_midi.Note(velocity=70, pitch=42, start=t, end=t + 0.05))
        if density >= 1.2:
            drum.notes.append(pretty_midi.Note(velocity=50, pitch=46, start=t + step / 2, end=t + step / 2 + 0.05))
    pm.instruments.append(drum)


def merge_sections(section_midis: list[Path], out_midi: Path) -> tuple[list[str], float]:
    full = pretty_midi.PrettyMIDI()
    track_names: list[str] = []
    cursor = 0.0

    for sec in section_midis:
        part = pretty_midi.PrettyMIDI(str(sec))
        section_len = part.get_end_time()
        for inst in part.instruments:
            if inst.name not in track_names:
                track_names.append(inst.name)
            cloned = pretty_midi.Instrument(program=inst.program, is_drum=inst.is_drum, name=inst.name)
            for n in inst.notes:
                cloned.notes.append(pretty_midi.Note(velocity=n.velocity, pitch=n.pitch, start=n.start + cursor, end=n.end + cursor))
            full.instruments.append(cloned)
        cursor += section_len

    out_midi.parent.mkdir(parents=True, exist_ok=True)
    full.write(str(out_midi))
    return track_names, cursor


def arrange_section(melody_midi: Path, out_midi: Path, *, style: str, bpm: int, root: str, mode: str, complexity: str) -> list[str]:
    template = STYLE_TEMPLATES.get(style, STYLE_TEMPLATES["Pop"])
    pm = pretty_midi.PrettyMIDI(initial_tempo=bpm)
    src = pretty_midi.PrettyMIDI(str(melody_midi))
    melody = src.instruments[0] if src.instruments else pretty_midi.Instrument(program=0, name="Melody")
    melody.name = "Melody"
    pm.instruments.append(melody)

    end_time = src.get_end_time() or 8.0
    bars = max(2, int(np.ceil(end_time / (60.0 / bpm * 4))))

    progression = template["chords"]
    bass_pattern = template["bass_pattern"]
    density = template["drum_density"]

    if complexity == "simple":
        density *= 0.8
    elif complexity == "rich":
        density *= 1.2

    add_chord_track(pm, bpm, bars, root, mode, progression)
    add_bass_track(pm, bpm, bars, root, mode, bass_pattern)
    add_drum_track(pm, bpm, bars, density)

    if complexity != "simple":
        pad = pretty_midi.Instrument(program=88, name="Pad")
        bar_dur = 60.0 / bpm * 4
        for bar in range(bars):
            deg = progression[bar % len(progression)]
            st = bar * bar_dur
            et = st + bar_dur
            pitch = degree_to_pitch(root, mode, deg, 5)
            pad.notes.append(pretty_midi.Note(velocity=55, pitch=pitch, start=st, end=et))
        pm.instruments.append(pad)

    out_midi.parent.mkdir(parents=True, exist_ok=True)
    pm.write(str(out_midi))
    return [inst.name for inst in pm.instruments]
