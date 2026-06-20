import React from 'react'
import { Document, Page, Text, View } from '@react-pdf/renderer'
import { academicStyles as s } from '../styles'
import { PageHeader, PageFooter } from '../components'
import { parseContentBlocks } from '../tableParser'
import { TableBlock } from '../TableBlock'
import type { BookProject, Chapter } from '@/types/book'
import { ACADEMIC_SUBTYPE_LABELS } from '@/types/book'
import type { GeneratedSection } from '@/lib/appwrite/generation'

interface Reference {
  abntFormattedReference: string
  title: string
}

interface Props {
  book: BookProject
  chapters: Chapter[]
  sectionsMap: Record<string, GeneratedSection[]>
  references: Reference[]
  authorName: string
}

function splitParagraphs(text: string): string[] {
  return text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
}

/**
 * Renderiza o conteúdo de uma seção, detectando quadros e texto corrido.
 */
function renderSection(content: string) {
  const blocks = parseContentBlocks(content)
  return blocks.map((block, bi) => {
    if (block.type === 'table') {
      return <TableBlock key={bi} data={block.data} fontFamily="Helvetica" />
    }
    // Texto: divide em parágrafos
    return splitParagraphs(block.content).map((para, pi) => (
      <Text key={`${bi}-${pi}`} style={s.body}>{para}</Text>
    ))
  })
}

export function AcademicPdf({ book, chapters, sectionsMap, references, authorName }: Props) {
  const subtype = book.academicSubtype ? ACADEMIC_SUBTYPE_LABELS[book.academicSubtype] : 'Trabalho Acadêmico'
  const year    = new Date().getFullYear()
  const generatedChapters = chapters.filter((c) => (sectionsMap[c.id] ?? []).length > 0)

  // capa=1, folha de rosto=2, sumário=3, cap1=4 ...
  const refsPage = generatedChapters.length + 4

  return (
    <Document
      title={book.title}
      author={authorName}
      subject={book.theme}
      creator="BookGenerator"
      producer="BookGenerator"
    >
      {/* ── CAPA ─────────────────────────────────────────────── sem header/footer */}
      <Page size="A4" style={s.coverPage}>
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 12, textTransform: 'uppercase', textAlign: 'center', marginBottom: 4 }}>
          {authorName}
        </Text>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={s.coverTitle}>{book.title}</Text>
          <Text style={{ fontSize: 11, textAlign: 'center', marginTop: 8, color: '#333' }}>
            {subtype}
          </Text>
        </View>
        <Text style={s.coverFooter}>{year}</Text>
      </Page>

      {/* ── FOLHA DE ROSTO ─────────────────────────────── sem header/footer */}
      <Page size="A4" style={s.coverPage}>
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 12, textTransform: 'uppercase', textAlign: 'center', marginBottom: 4 }}>
          {authorName}
        </Text>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
          <Text style={s.coverTitle}>{book.title}</Text>
          <View style={{ width: '55%', alignSelf: 'flex-end', marginTop: 24 }}>
            <Text style={{ fontSize: 11, textAlign: 'left', fontFamily: 'Helvetica', lineHeight: 1.4 }}>
              {subtype} apresentado como requisito acadêmico.{'\n\n'}
              Tema: {book.theme}
            </Text>
          </View>
        </View>
        <Text style={s.coverFooter}>{year}</Text>
      </Page>

      {/* ── SUMÁRIO ─────────────────────────────── header + footer automático */}
      <Page size="A4" style={s.page}>
        <PageHeader title={book.title} authorName={authorName} />
        <Text style={[s.h1, { marginBottom: 20 }]}>SUMÁRIO</Text>
        {generatedChapters.map((ch, idx) => (
          <View key={ch.id} style={s.toc}>
            <Text style={{ flex: 1, textTransform: 'uppercase', fontSize: 12 }}>
              {ch.order}  {ch.title}
            </Text>
            <Text style={{ color: '#555', fontSize: 12 }}>{idx + 4}</Text>
          </View>
        ))}
        {references.length > 0 && (
          <View style={s.toc}>
            <Text style={{ flex: 1, textTransform: 'uppercase', fontSize: 12 }}>REFERÊNCIAS</Text>
            <Text style={{ color: '#555', fontSize: 12 }}>{refsPage}</Text>
          </View>
        )}
        <PageFooter />
      </Page>

      {/* ── CAPÍTULOS ────────────────────────────── header + footer automático */}
      {generatedChapters.map((chapter) => {
        const sections = sectionsMap[chapter.id] ?? []
        const fullText = sections.map((sec) => sec.content).join('\n\n')

        return (
          <Page key={chapter.id} size="A4" style={s.page}>
            <PageHeader title={book.title} authorName={authorName} />
            <Text style={[s.h2, { marginBottom: 16 }]}>
              {chapter.order}  {chapter.title.toUpperCase()}
            </Text>
            {renderSection(fullText)}
            <PageFooter />
          </Page>
        )
      })}

      {/* ── REFERÊNCIAS ──────────────────────────── header + footer automático */}
      {references.length > 0 && (
        <Page size="A4" style={s.page}>
          <PageHeader title={book.title} authorName={authorName} />
          <Text style={[s.h2, { marginBottom: 16 }]}>REFERÊNCIAS</Text>
          {references.map((ref, i) => (
            <Text key={i} style={s.refItem}>{ref.abntFormattedReference}</Text>
          ))}
          <PageFooter />
        </Page>
      )}
    </Document>
  )
}
