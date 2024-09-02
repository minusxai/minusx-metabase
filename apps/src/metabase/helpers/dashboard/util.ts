
// if url has /dashboard/ in it, then it's a dashboard
export const isDashboardPage = (url: string) => {
  return url.includes('/dashboard/');
}