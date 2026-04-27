import { useRef, useState } from 'react'

interface Props {
  onRecorded: (blob: Blob) => void
}

export default function Recorder({ onRecorded }: Props) {
  const [recording, setRecording] = useState(false)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const toggle = async () => {
    if (!recording) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mediaRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
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

  return (
    <button
      className={`rounded px-3 py-2 text-sm font-medium ${recording ? 'bg-red-500' : 'bg-indigo-600'} text-white`}
      onClick={toggle}
      type="button"
    >
      {recording ? 'Stop Recording' : 'Record Melody'}
    </button>
  )
}
