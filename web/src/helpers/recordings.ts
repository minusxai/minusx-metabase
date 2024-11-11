let _transcripts: string[] = []

export const storeTranscripts = (transcript: string) => {
  _transcripts.push(transcript)
}

export const getTranscripts = () => {
  return _transcripts
}

export const endTranscript = () => {
  _transcripts = []
}