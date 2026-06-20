/**
 * Helpers de URL para arquivos do Appwrite Storage.
 *
 * Todos os arquivos passam pelo proxy /api/files/[bucket]/[fileId]
 * para evitar problemas de CORS e autenticação cross-origin.
 */

const APP_URL =
  typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')

/** URL de visualização (inline no browser, sem forçar download) */
export function getFileViewUrl(bucketId: string, fileId: string): string {
  return `${APP_URL}/api/files/${bucketId}/${fileId}`
}

/** URL de download (força download no browser) */
export function getFileDownloadUrl(bucketId: string, fileId: string): string {
  return `${APP_URL}/api/files/${bucketId}/${fileId}?dl=1`
}

/** URL pública de capa — passa pelo proxy com cache */
export function getCoverUrl(fileId: string): string {
  return `${APP_URL}/api/files/covers/${fileId}`
}

/** URL de download de PDF exportado */
export function getPdfDownloadUrl(fileId: string): string {
  return `${APP_URL}/api/files/exports/${fileId}?dl=1`
}
