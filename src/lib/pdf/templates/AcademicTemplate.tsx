import React from 'react'
import { Document, Page, Text, View } from '@react-pdf/renderer'
import { academicStyles as s } from '../styles'
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

export function AcademicPdf({ book, chapters, sectionsMap, references, authorName }: Props) {
  const subtype  = book.academicSubtype ? ACADEMIC_SUBTYPE_LABELS[book.academicSubtype] : 'Trabalho Acadêmico'
  const year     = new Date().getFullYear()
  const generatedChapters = chapters.filter((c) => (sectionsMap[c.id] ?? []).length > 0)

  return (
    <Document
      title={book.title}
      author={authorName}
      subject={book.theme}
      creator="BookGenerator"
      producer="BookGenerator"
    >
      {/* ── CAPA (ABNT NBR 14724) ────────────────────────────────────────── */}
      <Page size="A4" style={s.coverPage}>
        {/* Instituição (topo) */}
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 12, textTransform: 'uppercase', textAlign: 'center', marginBottom: 4 }}>
          {authorName}
        </Text>

        {/* Título centralizado */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={s.coverTitle}>{book.title}</Text>
          <Text style={{ fontSize: 11, textAlign: 'center', marginTop: 8, color: '#333' }}>
            {subtype}
          </Text>
        </View>

        {/* Rodapé: cidade e ano */}
        <Text style={s.coverFooter}>{year}</Text>
      </Page>

      {/* ── FOLHA DE ROSTO ───────────────────────────────────────────────── */}
      <Page size="A4" style={s.coverPage}>
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 12, textTransform: 'uppercase', textAlign: 'center', marginBottom: 4 }}>
          {authorName}
        </Text>

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
          <Text style={s.coverTitle}>{book.title}</Text>

          {/* Caixa de descrição (ABNT: alinhada à direita, 7cm) */}
          <View style={{ width: '55%', alignSelf: 'flex-end', marginTop: 24 }}>
            <Text style={{ fontSize: 11, textAlign: 'left', fontFamily: 'Helvetica', lineHeight: 1.4 }}>
              {subtype} apresentado como requisito acadêmico.{'\n\n'}
              Tema: {book.theme}
            </Text>
          </View>
        </View>

        <Text style={s.coverFooter}>{year}</Text>
      </Page>

      {/* ── SUMÁRIO ──────────────────────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
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
            <Text style={{ flex: 1, textTransform: 'uppercase', fontSize: 12 }}>
              REFERÊNCIAS
            </Text>
            <Text style={{ color: '#555', fontSize: 12 }}>{generatedChapters.length + 4}</Text>
          </View>
        )}
        <Text style={s.pageNum}>{3}</Text>
      </Page>

      {/* ── CAPÍTULOS ────────────────────────────────────────────────────── */}
      {generatedChapters.map((chapter, cidx) => {
        const sections   = sectionsMap[chapter.id] ?? []
        const fullText   = sections.map((sec) => sec.content).join('\n\n')
        const paragraphs = splitParagraphs(fullText)

        return (
          <Page key={chapter.id} size="A4" style={s.page}>
            {/* Número de página */}
            <Text style={s.pageNum}>{cidx + 4}</Text>

            {/* Título do capítulo */}
            <Text style={[s.h2, { marginBottom: 16 }]}>
              {chapter.order}  {chapter.title.toUpperCase()}
            </Text>

            {/* Corpo */}
            {paragraphs.map((para, pi) => (
              <Text key={pi} style={s.body}>{para}</Text>
            ))}
          </Page>
        )
      })}

      {/* ── REFERÊNCIAS ──────────────────────────────────────────────────── */}
      {references.length > 0 && (
        <Page size="A4" style={s.page}>
          <Text style={s.pageNum}>{generatedChapters.length + 4}</Text>
          <Text style={[s.h2, { marginBottom: 16 }]}>REFERÊNCIAS</Text>
          {references.map((ref, i) => (
            <Text key={i} style={s.refItem}>{ref.abntFormattedReference}</Text>
          ))}
        </Page>
      )}
    </Document>
  )
}

