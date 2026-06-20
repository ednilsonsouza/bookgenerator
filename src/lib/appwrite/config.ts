// Centralizador de IDs — nunca usar strings literais fora deste arquivo

export const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ?? ''
export const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? ''
export const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? ''

// IDs do banco de dados
export const DATABASE_ID = process.env.APPWRITE_DATABASE_ID ?? 'bookgenerator'

// IDs das coleções
export const COLLECTIONS = {
  BOOK_PROJECTS: 'book_projects',
  REFERENCES: 'references',
  REFERENCE_CHUNKS: 'reference_chunks',
  WRITING_PLANS: 'writing_plans',
  CHAPTERS: 'chapters',
  GENERATED_SECTIONS: 'generated_sections',
  GENERATION_JOBS: 'generation_jobs',
  LIBRARY_ITEMS: 'library_items',
} as const

// IDs dos buckets de storage
export const BUCKETS = {
  REFERENCES: 'references',
  COVERS: 'covers',
  EXPORTS: 'exports',
} as const
