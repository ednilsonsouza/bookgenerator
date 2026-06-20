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
  sectionsMap: Record<string, GeneratedSection[]>  // chapterId → sections
  coverImageBase64?: string                         // data:image/jpeg;base64,...
  authorName: string
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
}

export function LiteraryPdf({ book, chapters, sectionsMap, coverImageBase64, authorName }: Props) {
  const genre = book.literaryGenre ? LITERARY_GENRE_LABELS[book.literaryGenre] : 'Literatura'
  const year  = new Date().getFullYear()
  const generatedChapters = chapters.filter((c) => (sectionsMap[c.id] ?? []).length > 0)

  // Páginas:
  // 1: capa, 2: sumário
  // capítulos começam na página 3
  // página final após os capítulos
  const finalPage = generatedChapters.length + 3

  return (
    <Document
      title={book.title}
      author={authorName}
      subject={book.theme}
      creator="BookGenerator"
      producer="BookGenerator"
    >
      {/* ── CAPA ─────────────────────────────────────────────────────────── */}
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

      {/* ── SUMÁRIO ──────────────────────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <PageHeader title={book.title} authorName={authorName} fontFamily="Times-Roman" color="#666" />
        <Text style={s.tocTitle}>Sumário</Text>
        {generatedChapters.map((ch, idx) => (
          <View key={ch.id} style={s.toc}>
            <Text style={{ flex: 1 }}>{ch.order}. {ch.title}</Text>
            <Text style={{ color: '#666' }}>{idx + 3}</Text>
          </View>
        ))}
        <PageFooter pageNum={2} fontFamily="Times-Roman" color="#666" />
      </Page>

      {/* ── CAPÍTULOS ────────────────────────────────────────────────────── */}
      {generatedChapters.map((chapter, cidx) => {
        const sections = sectionsMap[chapter.id] ?? []
        const fullText = sections.map((s) => s.content).join('\n\n')
        const paragraphs = splitParagraphs(fullText)

        return (
          <Page key={chapter.id} size="A4" style={s.page}>
            {/* Cabeçalho do capítulo */}
            <View style={{ marginBottom: 32, alignItems: 'center' }}>
              <Text style={s.chapterNumber}>Capítulo {chapter.order}</Text>
              <Text style={s.chapterTitle}>{chapter.title}</Text>
            </View>

            {/* Parágrafos */}
            {paragraphs.map((para, pi) => (
              <Text key={pi} style={s.body}>{para}</Text>
            ))}
          </Page>
        )
      })}

      {/* ── PÁGINA FINAL ─────────────────────────────────────────────────── */}
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
        <PageFooter pageNum={finalPage} fontFamily="Times-Roman" color="#666" />
      </Page>
    </Document>
  )
}
