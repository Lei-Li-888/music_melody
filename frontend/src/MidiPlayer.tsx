import { useEffect, useRef, useState } from 'react'
import * as Tone from 'tone'
import { Midi } from '@tonejs/midi'

interface Props {
  url: string
}

type State = 'idle' | 'loading' | 'playing' | 'paused'

export default function MidiPlayer({ url }: Props) {
  const [state, setState] = useState<State>('idle')
  const synthsRef = useRef<Tone.PolySynth[]>([])
  const durationRef = useRef(0)

  useEffect(() => {
    return () => {
      Tone.Transport.stop()
      Tone.Transport.cancel()
      synthsRef.current.forEach((s) => s.dispose())
    }
  }, [url])

  const load = async () => {
    setState('loading')
    await Tone.start()
    Tone.Transport.stop()
    Tone.Transport.cancel()
    synthsRef.current.forEach((s) => s.dispose())

    const bytes = await fetch(url).then((r) => r.arrayBuffer())
    const midi = new Midi(bytes)
    durationRef.current = midi.duration

    const synths = midi.tracks.map(() =>
      new Tone.PolySynth(Tone.Synth).toDestination()
    )
    synthsRef.current = synths

    midi.tracks.forEach((track, i) => {
      track.notes.forEach((note) => {
        Tone.Transport.schedule((time) => {
          synths[i].triggerAttackRelease(note.name, note.duration, time, note.velocity)
        }, note.time)
      })
    })

    Tone.Transport.schedule(() => {
      setState('idle')
    }, durationRef.current + 0.5)

    Tone.Transport.start()
    setState('playing')
  }

  const pause = () => {
    Tone.Transport.pause()
    setState('paused')
  }

  const resume = () => {
    Tone.Transport.start()
    setState('playing')
  }

  const stop = () => {
    Tone.Transport.stop()
    Tone.Transport.cancel()
    synthsRef.current.forEach((s) => s.dispose())
    synthsRef.current = []
    setState('idle')
  }

  return (
    <div className="flex items-center gap-2">
      {state === 'idle' && (
        <button className="rounded bg-emerald-600 px-3 py-2 text-sm text-white" onClick={load} type="button">
          Play
        </button>
      )}
      {state === 'loading' && (
        <button className="rounded bg-slate-400 px-3 py-2 text-sm text-white" disabled type="button">
          Loading…
        </button>
      )}
      {state === 'playing' && (
        <>
          <button className="rounded bg-yellow-500 px-3 py-2 text-sm text-white" onClick={pause} type="button">
            Pause
          </button>
          <button className="rounded bg-rose-500 px-3 py-2 text-sm text-white" onClick={stop} type="button">
            Stop
          </button>
        </>
      )}
      {state === 'paused' && (
        <>
          <button className="rounded bg-emerald-600 px-3 py-2 text-sm text-white" onClick={resume} type="button">
            Resume
          </button>
          <button className="rounded bg-rose-500 px-3 py-2 text-sm text-white" onClick={stop} type="button">
            Stop
          </button>
        </>
      )}
    </div>
  )
}
