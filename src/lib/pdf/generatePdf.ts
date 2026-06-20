import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import type { BookProject, Chapter } from '@/types/book'
import type { GeneratedSection } from '@/lib/appwrite/generation'
import { LiteraryPdf } from './templates/LiteraryTemplate'
import { AcademicPdf } from './templates/AcademicTemplate'

interface Reference {
  abntFormattedReference: string
  title: string
}

interface GeneratePdfOptions {
  book: BookProject
  chapters: Chapter[]
  sectionsMap: Record<string, GeneratedSection[]>
  references: Reference[]
  authorName: string
  coverImageBase64?: string
}

export async function generatePdf(opts: GeneratePdfOptions): Promise<Buffer> {
  const { book, chapters, sectionsMap, references, authorName, coverImageBase64 } = opts

  const element =
    book.type === 'academic'
      ? React.createElement(AcademicPdf, { book, chapters, sectionsMap, references, authorName })
      : React.createElement(LiteraryPdf, { book, chapters, sectionsMap, coverImageBase64, authorName })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(element as any)
  return Buffer.from(buffer)
}
