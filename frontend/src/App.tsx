import { useMemo, useState } from 'react'
import { api, downloadUrl } from './api'
import MidiPlayer from './MidiPlayer'
import Recorder from './Recorder'
import type { ArrangeResult, MelodyInput, SectionType } from './types'

const SECTION_TYPES: SectionType[] = ['Intro', 'Verse', 'Chorus', 'Bridge', 'Outro']
const ALL_TRACKS = ['Piano Chords', 'Bass', 'Drums', 'Pad']

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

export default function App() {
  const [sections, setSections] = useState<MelodyInput[]>([{ id: uid(), name: 'Verse 1', section_type: 'Verse' }])
  const [bpm, setBpm] = useState(100)
  const [keyRoot, setKeyRoot] = useState('C')
  const [mode, setMode] = useState<'major' | 'minor'>('major')
  const [complexity, setComplexity] = useState<'simple' | 'medium' | 'rich'>('medium')
  const [selectedTracks, setSelectedTracks] = useState<string[]>(ALL_TRACKS)

  const toggleTrack = (track: string) => {
    setSelectedTracks((prev) =>
      prev.includes(track) ? prev.filter((t) => t !== track) : [...prev, track]
    )
  }
  const [arranged, setArranged] = useState<ArrangeResult | null>(null)
  const [status, setStatus] = useState('Ready')

  const canArrange = useMemo(() => sections.every((s) => !!s.midi_path), [sections])

  const addSection = () => {
    setSections((prev) => [...prev, { id: uid(), name: `Section ${prev.length + 1}`, section_type: 'Verse' }])
  }

  const removeSection = (id: string) => setSections((prev) => prev.filter((s) => s.id !== id))

  const patchSection = (id: string, patch: Partial<MelodyInput>) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  const uploadAndRecognize = async (section: MelodyInput) => {
    if (!section.file) return
    setStatus(`Recognizing ${section.name} ...`)
    try {
      const form = new FormData()
      form.append('name', section.name)
      form.append('file', section.file)
      const { data } = await api.post('/api/recognize', form)
      patchSection(section.id, { midi_path: data.midi_path, bpm: data.bpm, note_preview: data.note_preview })
      setBpm(data.bpm)
      setKeyRoot(data.key_root)
      setMode(data.mode as 'major' | 'minor')
      setStatus(`Recognized ${section.name} — ${data.note_count} notes, BPM ${data.bpm}, Key ${data.key_root} ${data.mode}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setStatus(`Error recognizing ${section.name}: ${msg}`)
    }
  }

  const generateArrangement = async () => {
    setStatus('Generating arrangement ...')
    const payload = {
      bpm,
      key_root: keyRoot,
      mode,
      complexity,
      tracks: selectedTracks,
      sections: sections.map((s) => ({
        name: s.name,
        section_type: s.section_type,
        midi_path: s.midi_path,
      })),
    }
    const { data } = await api.post('/api/arrange', payload)
    setArranged(data)
    setStatus('Arrangement ready')
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Melody → Arrangement MVP</h1>
        <p className="text-slate-600">输入旋律 → 识别旋律 → 选择风格 → 生成编曲 → 播放导出</p>
      </header>

      <section className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">1) Melody Input</h2>
          <button className="rounded bg-slate-800 px-3 py-2 text-sm text-white" onClick={addSection} type="button">+ Add Section</button>
        </div>

        <div className="space-y-3">
          {sections.map((s) => (
            <div className="rounded border border-slate-200 p-3" key={s.id}>
              <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-4">
                <input className="input" value={s.name} onChange={(e) => patchSection(s.id, { name: e.target.value })} />
                <select className="input" value={s.section_type} onChange={(e) => patchSection(s.id, { section_type: e.target.value as SectionType })}>
                  {SECTION_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
                <input className="input" type="file" accept="audio/*" onChange={(e) => patchSection(s.id, { file: e.target.files?.[0] })} />
                <div className="flex gap-2">
                  <button className="rounded bg-indigo-600 px-3 py-2 text-sm text-white" onClick={() => uploadAndRecognize(s)} type="button">Recognize</button>
                  <button className="rounded bg-rose-600 px-3 py-2 text-sm text-white" onClick={() => removeSection(s.id)} type="button">Delete</button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <Recorder
                  onRecorded={(blob) => patchSection(s.id, { file: new File([blob], `${s.name}.webm`, { type: 'audio/webm' }) })}
                />
                {s.file && <span>📁 {s.file.name}</span>}
                {s.midi_path && <span>✅ MIDI ready</span>}
                {s.note_preview?.length ? <span>Notes: {s.note_preview.join(', ')}</span> : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card mt-6">
        <h2 className="mb-4 text-xl font-semibold">2) Arrange Settings</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="text-sm text-slate-600">
            BPM
            <input className="input mt-1 w-full" type="number" value={bpm} min={60} max={200} onChange={(e) => setBpm(Number(e.target.value))} />
          </label>
          <label className="text-sm text-slate-600">
            Key
            <input className="input mt-1 w-full" value={keyRoot} onChange={(e) => setKeyRoot(e.target.value)} />
          </label>
          <label className="text-sm text-slate-600">
            Mode
            <select className="input mt-1 w-full" value={mode} onChange={(e) => setMode(e.target.value as 'major' | 'minor')}><option>major</option><option>minor</option></select>
          </label>
          <label className="text-sm text-slate-600">
            Complexity
            <select className="input mt-1 w-full" value={complexity} onChange={(e) => setComplexity(e.target.value as 'simple' | 'medium' | 'rich')}><option>simple</option><option>medium</option><option>rich</option></select>
          </label>
        </div>
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-slate-700">Tracks</p>
          <div className="flex flex-wrap gap-3">
            {ALL_TRACKS.map((track) => (
              <label key={track} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedTracks.includes(track)}
                  onChange={() => toggleTrack(track)}
                />
                {track}
              </label>
            ))}
          </div>
        </div>

        <button
          className="mt-4 rounded bg-emerald-600 px-4 py-2 font-medium text-white disabled:bg-slate-300"
          onClick={generateArrangement}
          disabled={!canArrange}
          type="button"
        >
          Generate Arrangement
        </button>
        <p className="mt-2 text-sm text-slate-500">Status: {status}</p>
      </section>

      {arranged && (
        <section className="card mt-6">
          <h2 className="mb-3 text-xl font-semibold">3) Playback & Export</h2>
          <div className="mb-2 flex items-center gap-3">
            <MidiPlayer url={downloadUrl(arranged.arrangement_midi)} />
            <a className="rounded bg-slate-900 px-3 py-2 text-sm text-white" href={downloadUrl(arranged.arrangement_midi)}>
              Download Full MIDI
            </a>
          </div>
          <p className="text-sm text-slate-600">Tracks: {arranged.tracks.join(', ')}</p>
          <ul className="mt-2 list-inside list-disc text-sm text-slate-600">
            {arranged.section_midis.map((m) => (
              <li key={m}>
                <a className="text-indigo-700 underline" href={downloadUrl(m)}>{m}</a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
