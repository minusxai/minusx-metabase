export const isSQLPageUrl = (url: string) => {
  return url.includes('/question');
}

export const isModelPageUrl = (url: string) => {
  return url.includes('/model');
}

