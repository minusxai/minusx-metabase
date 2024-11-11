let _transcripts: string[] = []

export const storeTranscripts = (transcripts: string[]) => {
  _transcripts.push(...transcripts)
}

export const getTranscripts = () => {
  return _transcripts
}

export const endTranscript = () => {
  _transcripts = []
}