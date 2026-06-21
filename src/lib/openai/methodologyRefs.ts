/**
 * Referências metodológicas fixas para obras acadêmicas.
 *
 * Bardin (2011) é a referência canônica da Análise de Conteúdo.
 * Gil (2002) é a referência canônica de pesquisa bibliográfica no Brasil.
 *
 * Essas referências são adicionadas automaticamente a toda obra acadêmica
 * no momento da geração do plano de escrita.
 */

import { createAdminClient } from '@/lib/appwrite/server'
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite/config'
import { ID, Query } from 'node-appwrite'
import { truncate } from '@/lib/utils'

export interface MethodologyRef {
  title: string
  authors: string
  year: string
  publisher: string
  citationKey: string
  abntFormattedReference: string
  accessUrl?: string
}

/**
 * Referências metodológicas canônicas — imutáveis.
 * Bardin e Gil são os pilares do método adotado.
 */
export const METHODOLOGY_REFS: MethodologyRef[] = [
  {
    title:    'Análise de Conteúdo',
    authors:  'Laurence Bardin',
    year:     '2011',
    publisher: 'Edições 70',
    citationKey:            'BARDIN (2011)',
    abntFormattedReference: 'BARDIN, Laurence. Análise de Conteúdo. São Paulo: Edições 70, 2011.',
    accessUrl: undefined,
  },
  {
    title:    'Como elaborar projetos de pesquisa',
    authors:  'Antônio Carlos Gil',
    year:     '2002',
    publisher: 'Atlas',
    citationKey:            'GIL (2002)',
    abntFormattedReference: 'GIL, Antônio Carlos. Como elaborar projetos de pesquisa. 4. ed. São Paulo: Atlas, 2002.',
    accessUrl: undefined,
  },
]

/**
 * Adiciona as referências metodológicas a uma obra acadêmica,
 * somente se ainda não existirem (baseado no citationKey).
 * Retorna os IDs dos documentos criados ou já existentes.
 */
export async function ensureMethodologyRefs(bookProjectId: string): Promise<void> {
  const { databases } = createAdminClient()

  // Busca referências já existentes
  const existing = await databases.listDocuments(DATABASE_ID, COLLECTIONS.REFERENCES, [
    Query.equal('bookProjectId', bookProjectId),
    Query.limit(50),
  ])

  const existingKeys = new Set(
    existing.documents.map((d) => d.citationKey as string)
  )

  for (const ref of METHODOLOGY_REFS) {
    if (existingKeys.has(ref.citationKey)) continue // já existe

    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.REFERENCES,
      ID.unique(),
      {
        bookProjectId,
        fileId:                 null,
        title:                  truncate(ref.title, 512),
        authors:                truncate(ref.authors, 512),
        year:                   truncate(ref.year, 16),
        publisher:              truncate(ref.publisher, 255),
        extractedTextStatus:    'no_file',
        citationKey:            truncate(ref.citationKey, 128),
        abntFormattedReference: truncate(ref.abntFormattedReference, 1024),
        accessUrl:              ref.accessUrl ?? null,
      }
    )
  }
}
