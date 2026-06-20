import type { BookProject, Chapter } from '@/types/book'
import { LITERARY_GENRE_LABELS, ACADEMIC_SUBTYPE_LABELS } from '@/types/book'

export interface ChapterContext {
  book: BookProject
  chapter: Chapter
  allChapters: Chapter[]
  previousContent?: string   // últimas ~500 palavras do capítulo anterior
}

// ── Literário ─────────────────────────────────────────────────────────────────

export function buildLiteraryChapterSystem(book: BookProject): string {
  const genre = book.literaryGenre ? LITERARY_GENRE_LABELS[book.literaryGenre] : 'Literária'
  return `Você é um escritor profissional especializado em ${genre}.
Escreva em português brasileiro com qualidade editorial.
Crie prosa envolvente, com ritmo, diálogos naturais quando aplicável e descrições vívidas.
Mantenha consistência com o tom, personagens e eventos dos capítulos anteriores.
Não use asteriscos, emojis nem formatação markdown — apenas texto corrido com parágrafos.
Escreva somente o conteúdo do capítulo, sem título nem número.`
}

export function buildLiteraryChapterUser(ctx: ChapterContext): string {
  const { book, chapter, allChapters, previousContent } = ctx
  const genre = book.literaryGenre ? LITERARY_GENRE_LABELS[book.literaryGenre] : ''

  const planSummary = allChapters
    .map((c) => `Cap. ${c.order}: ${c.title} — ${c.description ?? ''}`)
    .join('\n')

  const prevSection = previousContent
    ? `\n\nCONTINUIDADE (final do capítulo anterior):\n"${previousContent.slice(-1200)}"`
    : ''

  return `Escreva o capítulo a seguir para a obra "${book.title}".

DADOS DA OBRA:
- Gênero: ${genre}
- Tema: ${book.theme}
- Descrição geral: ${book.description}

PLANO DA OBRA:
${planSummary}

CAPÍTULO A ESCREVER:
- Número: ${chapter.order} de ${allChapters.length}
- Título: ${chapter.title}
- Objetivo: ${chapter.description ?? ''}
- Meta: aproximadamente ${chapter.targetWords} palavras${prevSection}

INSTRUÇÃO: Escreva apenas o conteúdo do Capítulo ${chapter.order}. Não inclua o título. Aproxime-se de ${chapter.targetWords} palavras.`
}

// ── Acadêmico ─────────────────────────────────────────────────────────────────

export interface AcademicSource {
  chunkId: string
  citationKey: string       // Ex: "SILVA (2023)"
  abnt: string             // Referência completa ABNT
  excerpt: string          // Trecho relevante do texto
  score: number
}

export function buildAcademicChapterSystem(book: BookProject): string {
  const subtype = book.academicSubtype ? ACADEMIC_SUBTYPE_LABELS[book.academicSubtype] : 'Acadêmica'
  return `Você é um redator acadêmico experiente especializado em ${subtype}.
Escreva em português brasileiro formal, seguindo rigorosamente as normas ABNT.
REGRAS OBRIGATÓRIAS:
1. Todo parágrafo deve conter pelo menos uma citação das FONTES DISPONÍVEIS.
2. Citação indireta: (SOBRENOME, ano) — ex: (SILVA, 2023)
3. Citação direta curta (até 3 linhas): "texto" (SOBRENOME, ano, p. X)
4. Use APENAS as fontes fornecidas. NUNCA invente autores, anos ou páginas.
5. Escreva em linguagem técnica e objetiva.
6. Não use markdown, asteriscos nem emojis — apenas texto corrido acadêmico.
7. Escreva somente o corpo do texto, sem título de capítulo.`
}

export function buildAcademicChapterUser(ctx: ChapterContext, sources: AcademicSource[]): string {
  const { book, chapter, allChapters } = ctx
  const subtype = book.academicSubtype ? ACADEMIC_SUBTYPE_LABELS[book.academicSubtype] : ''

  const planSummary = allChapters
    .map((c) => `Cap. ${c.order}: ${c.title}`)
    .join(' | ')

  const sourcesBlock = sources.length > 0
    ? sources
        .map(
          (s, i) =>
            `[FONTE ${i + 1}] ${s.citationKey}\nReferência: ${s.abnt}\nTrecho: "${s.excerpt.slice(0, 600)}"`
        )
        .join('\n\n')
    : 'Nenhuma fonte disponível para este capítulo.'

  return `Escreva o seguinte capítulo acadêmico para a obra "${book.title}".

DADOS DA OBRA:
- Tipo: ${subtype}
- Tema: ${book.theme}
- Descrição: ${book.description}
- Estrutura: ${planSummary}

CAPÍTULO A ESCREVER:
- Número: ${chapter.order} de ${allChapters.length}
- Título: ${chapter.title}
- Objetivo: ${chapter.description ?? ''}
- Meta: aproximadamente ${chapter.targetWords} palavras

FONTES DISPONÍVEIS PARA CITAÇÃO:
${sourcesBlock}

INSTRUÇÃO: Escreva o corpo do Capítulo ${chapter.order} usando obrigatoriamente as fontes acima. Cada parágrafo deve citar pelo menos uma fonte. Alvo: ${chapter.targetWords} palavras.`
}
