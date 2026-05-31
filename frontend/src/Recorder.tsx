import { useRef, useState } from 'react'

interface Recording {
  id: number
  url: string
  blob: Blob
}

interface Props {
  onRecorded: (blob: Blob) => void
}

export default function Recorder({ onRecorded }: Props) {
  const [recording, setRecording] = useState(false)
  const [recordings, setRecordings] = useState<Recording[]>([])
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const counterRef = useRef(1)

  const toggle = async () => {
    if (!recording) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mediaRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        const id = counterRef.current++
        setRecordings((prev) => [...prev, { id, url, blob }])
        onRecorded(blob)
      }
      recorder.start()
      setRecording(true)
    } else {
      mediaRef.current?.stop()
      mediaRef.current?.stream.getTracks().forEach((t) => t.stop())
      setRecording(false)
    }
  }

  const useRecording = (r: Recording) => {
    onRecorded(r.blob)
  }

  const deleteRecording = (id: number) => {
    setRecordings((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <div className="space-y-2">
      <button
        className={`rounded px-3 py-2 text-sm font-medium ${recording ? 'bg-red-500' : 'bg-indigo-600'} text-white`}
        onClick={toggle}
        type="button"
      >
        {recording ? '⏹ Stop' : '🎙 Record'}
      </button>

      {recordings.map((r) => (
        <div key={r.id} className="flex items-center gap-2 text-sm">
          <span className="w-6 text-slate-500">{r.id}</span>
          <audio controls src={r.url} className="h-8" />
          <button
            className="rounded bg-emerald-600 px-2 py-1 text-xs text-white"
            onClick={() => useRecording(r)}
            type="button"
          >
            Use
          </button>
          <button
            className="rounded bg-rose-500 px-2 py-1 text-xs text-white"
            onClick={() => deleteRecording(r.id)}
            type="button"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  )
}
