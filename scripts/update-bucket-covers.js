// Atualiza o bucket 'covers' no Appwrite para aceitar imagens de até 20 MB.
// Rode: node scripts/update-bucket-covers.js

const fs = require('fs')
const path = require('path')
const { Client, Storage } = require('node-appwrite')

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) return
  const content = fs.readFileSync(envPath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq)
    let value = trimmed.slice(eq + 1)
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnv()

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
const apiKey = process.env.APPWRITE_API_KEY
const bucketId = 'covers'

if (!endpoint || !projectId || !apiKey) {
  console.error('Missing env vars: NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID, APPWRITE_API_KEY')
  process.exit(1)
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey)

const storage = new Storage(client)

async function main() {
  try {
    const bucket = await storage.getBucket(bucketId)
    console.log('Current bucket:', {
      id: bucket.$id,
      name: bucket.name,
      maximumFileSize: bucket.maximumFileSize,
      allowedFileExtensions: bucket.allowedFileExtensions,
    })

    const maxSize = 20 * 1024 * 1024 // 20 MB
    const allowedExt = ['jpg', 'jpeg', 'png', 'webp']

    await storage.updateBucket(
      bucketId,
      bucket.name,
      bucket.permissions,
      bucket.fileSecurity,
      allowedExt,
      bucket.compression,
      bucket.encryption,
      bucket.antivirus,
      bucket.bucketsWrite,
      maxSize
    )

    console.log(`Bucket '${bucketId}' updated: maximumFileSize = ${maxSize} bytes (20 MB)`)
  } catch (err) {
    console.error('Error updating bucket:', err.message)
    process.exit(1)
  }
}

main()
