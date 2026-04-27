import { useState } from 'react'
import * as Tone from 'tone'
import { Midi } from '@tonejs/midi'

interface Props {
  url: string
}

export default function MidiPlayer({ url }: Props) {
  const [loading, setLoading] = useState(false)

  const play = async () => {
    setLoading(true)
    await Tone.start()
    const bytes = await fetch(url).then((r) => r.arrayBuffer())
    const midi = new Midi(bytes)
    const now = Tone.now() + 0.1

    const synths = midi.tracks.map((t) => new Tone.PolySynth(Tone.Synth).toDestination())
    midi.tracks.forEach((track, idx) => {
      track.notes.forEach((note) => {
        synths[idx].triggerAttackRelease(note.name, note.duration, now + note.time, note.velocity)
      })
    })

    const maxDuration = midi.duration
    setTimeout(() => {
      synths.forEach((s) => s.dispose())
      setLoading(false)
    }, maxDuration * 1000 + 400)
  }

  return (
    <button className="rounded bg-emerald-600 px-3 py-2 text-sm text-white" onClick={play} disabled={loading} type="button">
      {loading ? 'Playing…' : 'Play MIDI'}
    </button>
  )
}
