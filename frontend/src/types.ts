export type SectionType = 'Intro' | 'Verse' | 'Chorus' | 'Bridge' | 'Outro'

export interface MelodyInput {
  id: string
  name: string
  section_type: SectionType
  file?: File
  midi_path?: string
  bpm?: number
  note_preview?: string[]
}

export interface ArrangeResult {
  arrangement_midi: string
  section_midis: string[]
  tracks: string[]
}
