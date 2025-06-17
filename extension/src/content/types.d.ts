export interface IframeInfo {
  tool: string
  toolVersion: string
  origin: string
  href: string
  mode: string
  r: string
  variant: 'default' | 'instructions'
  width: string,
  gitCommitId: string,
  npmPackageVersion: string,
  isEmbedded: boolean
}