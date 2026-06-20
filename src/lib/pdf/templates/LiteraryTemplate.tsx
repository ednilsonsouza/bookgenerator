import React from 'react'
import { Document, Page, Text, View, Image } from '@react-pdf/renderer'
import { literaryStyles as s } from '../styles'
import { PageHeader, PageFooter } from '../components'
import type { BookProject, Chapter } from '@/types/book'
import { LITERARY_GENRE_LABELS } from '@/types/book'
import type { GeneratedSection } from '@/lib/appwrite/generation'

interface Props {
  book: BookProject
  chapters: Chapter[]
  sectionsMap: Record<string, GeneratedSection[]>
  coverImageBase64?: string
  authorName: string
}

function splitParagraphs(text: string): string[] {
  return text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
}

export function LiteraryPdf({ book, chapters, sectionsMap, coverImageBase64, authorName }: Props) {
  const genre = book.literaryGenre ? LITERARY_GENRE_LABELS[book.literaryGenre] : 'Literatura'
  const year  = new Date().getFullYear()
  const generatedChapters = chapters.filter((c) => (sectionsMap[c.id] ?? []).length > 0)

  // Sumário: página 2 do sumário referencia capítulos começando em 3
  // (capa=1, sumário=2, cap1=3, cap2=4 ...)
  const finalPage = generatedChapters.length + 3

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
        {coverImageBase64 ? (
          <Image
            src={coverImageBase64}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : null}
        <View style={s.coverContent}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
            <Text style={s.coverGenre}>{genre.toUpperCase()}</Text>
            <Text style={s.coverTitle}>{book.title}</Text>
            <Text style={s.coverAuthor}>{authorName}</Text>
          </View>
          <Text style={{ fontFamily: 'Times-Roman', fontSize: 10, color: '#888', textAlign: 'center', marginBottom: 8 }}>
            {year} · BookGenerator
          </Text>
        </View>
      </Page>

      {/* ── SUMÁRIO ─────────────────────────────────── header + footer automático */}
      <Page size="A4" style={s.page}>
        <PageHeader title={book.title} authorName={authorName} fontFamily="Times-Roman" color="#666" />
        <Text style={s.tocTitle}>Sumário</Text>
        {generatedChapters.map((ch, idx) => (
          <View key={ch.id} style={s.toc}>
            <Text style={{ flex: 1 }}>{ch.order}. {ch.title}</Text>
            <Text style={{ color: '#666' }}>{idx + 3}</Text>
          </View>
        ))}
        <PageFooter fontFamily="Times-Roman" color="#666" />
      </Page>

      {/* ── CAPÍTULOS ────────────────────────────────── header + footer automático */}
      {generatedChapters.map((chapter) => {
        const sections  = sectionsMap[chapter.id] ?? []
        const fullText  = sections.map((sec) => sec.content).join('\n\n')
        const paragraphs = splitParagraphs(fullText)

        return (
          <Page key={chapter.id} size="A4" style={s.page}>
            <PageHeader title={book.title} authorName={authorName} fontFamily="Times-Roman" color="#666" />
            <View style={{ marginBottom: 32, alignItems: 'center' }}>
              <Text style={s.chapterNumber}>Capítulo {chapter.order}</Text>
              <Text style={s.chapterTitle}>{chapter.title}</Text>
            </View>
            {paragraphs.map((para, pi) => (
              <Text key={pi} style={s.body}>{para}</Text>
            ))}
            <PageFooter fontFamily="Times-Roman" color="#666" />
          </Page>
        )
      })}

      {/* ── PÁGINA FINAL ─────────────────────────────── header + footer automático */}
      <Page size="A4" style={s.page}>
        <PageHeader title={book.title} authorName={authorName} fontFamily="Times-Roman" color="#666" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontFamily: 'Times-Italic', fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 8 }}>
            {book.title}
          </Text>
          <Text style={{ fontFamily: 'Times-Roman', fontSize: 11, color: '#888', textAlign: 'center' }}>
            Gerado com BookGenerator · {year}
          </Text>
        </View>
        <PageFooter fontFamily="Times-Roman" color="#666" />
      </Page>
    </Document>
  )
}
