import { Client, Databases, Storage, Users } from 'node-appwrite'
import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } from './config'

const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY ?? ''

function createAdminClient() {
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY)

  return {
    databases: new Databases(client),
    storage: new Storage(client),
    users: new Users(client),
    client,
  }
}

export { createAdminClient }
