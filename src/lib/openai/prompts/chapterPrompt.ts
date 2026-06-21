import type { BookProject, Chapter, SectionPlan } from '@/types/book'
import { LITERARY_GENRE_LABELS, ACADEMIC_SUBTYPE_LABELS } from '@/types/book'

export interface ChapterContext {
  book: BookProject
  chapter: Chapter
  allChapters: Chapter[]
  previousContent?: string
  section?: SectionPlan // Nova: seção que está sendo gerada
  sectionIndex?: number
  totalSections?: number
}

// ── Literário ─────────────────────────────────────────────────────────────────

export function buildLiteraryChapterSystem(book: BookProject): string {
  const genre = book.literaryGenre ? LITERARY_GENRE_LABELS[book.literaryGenre] : 'Literária'
  return `Você é um escritor profissional especializado em ${genre}.
Escreva em português brasileiro com qualidade editorial.
Crie prosa envolvente com parágrafos LONGOS, diálogos naturais quando aplicável e descrições vívidas.
Mantenha consistência com o tom, personagens e eventos dos capítulos anteriores.
Não use asteriscos, emojis nem markdown — apenas texto corrido com parágrafos.
Escreva APENAS o conteúdo da seção indicada, sem título.`
}

export function buildLiteraryChapterUser(ctx: ChapterContext): string {
  const { book, chapter, allChapters, previousContent, section, sectionIndex, totalSections } = ctx

  const planSummary = allChapters
    .map((c) => `Cap. ${c.order}: ${c.title}`)
    .join(' | ')

  const prevSection = previousContent
    ? `\n\nCONTINUIDADE (final da seção anterior):\n"${previousContent.slice(-600)}"`
    : ''

  const sectionInfo = section
    ? `\nSEÇÃO A ESCREVER: ${section.order} de ${totalSections} — "${section.title}"\nEscreva APENAS esta seção. Parágrafos longos, prosa envolvente.`
    : ''

  return `Escreva a seção abaixo para a obra "${book.title}".

DADOS DA OBRA:
- Gênero: ${book.literaryGenre ? LITERARY_GENRE_LABELS[book.literaryGenre] : ''}
- Tema: ${book.theme}
- Estrutura: ${planSummary}

CAPÍTULO: ${chapter.order} de ${allChapters.length} — "${chapter.title}"
- Objetivo: ${chapter.description ?? ''}${sectionInfo}${prevSection}

INSTRUÇÃO: Escreva parágrafos longos e envolventes. Aproxime-se de 600 palavras. NÃO inclua o título da seção, apenas o texto.`
}

// ── Acadêmico ─────────────────────────────────────────────────────────────────

export interface AcademicSource {
  chunkId: string
  citationKey: string
  abnt: string
  excerpt: string
  score: number
}

function detectChapterRole(chapter: Chapter): 'intro' | 'theoretical' | 'methodology' | 'analysis' | 'conclusion' | 'other' {
  const text = `${chapter.title} ${chapter.description ?? ''}`.toLowerCase()
  if (/introdu[cç][aã]o|apresenta[cç][aã]o|contextualiza[cç][aã]o/.test(text)) return 'intro'
  if (/referencial|fundamenta[cç][aã]o|revis[aã]o|te[oó]rico|literatura/.test(text)) return 'theoretical'
  if (/metodolog|m[eé]todo|procedimento|bardin|an[aá]lise de conte[uú]do|corpus|categoriz/.test(text)) return 'methodology'
  if (/resultado|discuss[aã]o|an[aá]lise|categoria|unidade de contexto|unidade de registro/.test(text)) return 'analysis'
  if (/conclus[aã]o|considera[cç][oõ]es|final|encerramento/.test(text)) return 'conclusion'
  return 'other'
}

function buildBardinChapterInstruction(role: ReturnType<typeof detectChapterRole>, section?: SectionPlan): string {
  const rolePrompts: Record<string, string> = {
    intro: `INTRODUÇÃO: Apresente o tema, justificativa, problema de pesquisa e objetivos. Mencione a abordagem metodológica (levantamento bibliográfico + Análise de Conteúdo de Bardin).`,
    theoretical: `REFERENCIAL TEÓRICO: Fundamente com as fontes disponíveis. Apresente conceitos, autores e teorias. Dialogue criticamente entre os autores. Cite usando (SOBRENOME, ano).`,
    methodology: `METODOLOGIA: Descreva o levantamento bibliográfico (GIL, 2002) e as 3 fases da Análise de Conteúdo de Bardin (BARDIN, 2011): pré-análise, exploração do material, categorização. Cite (BARDIN, 2011) e (GIL, 2002) obrigatoriamente.`,
    analysis: `ANÁLISE E DISCUSSÃO: Analise os resultados por categorias da Análise de Conteúdo (BARDIN, 2011). Apresente unidades de contexto, discuta padrões, relacione com o referencial teórico. Use linguagem analítica e crítica.`,
    conclusion: `CONSIDERAÇÕES FINAIS: Retome os objetivos. Sintetize os resultados por categoria. Aponte contribuições, limitações e pesquisas futuras.`,
    other: '',
  }
  const base = rolePrompts[role] || ''
  const sectionInfo = section ? `\nESCREVENDO A SEÇÃO: "${section.title}"` : ''
  return `${base}${sectionInfo}\nEscreva parágrafos LONGOS (pelo menos 150 palavras por parágrafo). Linguagem técnica e objetiva.`
}

export function buildAcademicChapterSystem(book: BookProject): string {
  const subtype = book.academicSubtype ? ACADEMIC_SUBTYPE_LABELS[book.academicSubtype] : 'Acadêmica'
  return `Você é um redator acadêmico experiente especializado em ${subtype}.
A obra é um LEVANTAMENTO BIBLIOGRÁFICO com ANÁLISE DE CONTEÚDO DE LAURENCE BARDIN.

REFERÊNCIAS METODOLÓGICAS FIXAS:
- BARDIN (2011) — Análise de Conteúdo. Edições 70.
- GIL (2002) — Como elaborar projetos de pesquisa. Atlas.

REGRAS:
1. SEMPRE escreva — NUNCA recuse.
2. Cite fontes quando disponíveis: (SOBRENOME, ano).
3. Parágrafos LONGOS (mínimo 150 palavras por parágrafo).
4. Citação direta: "texto" (SOBRENOME, ano) — sem número de página.
5. NUNCA invente autores, anos ou páginas.
6. NUNCA escreva "p. X", "p. XX".
7. Linguagem técnica e objetiva. Sem markdown.
8. Escreva APENAS o conteúdo da seção, sem título.`
}

export function buildAcademicChapterUser(ctx: ChapterContext, sources: AcademicSource[]): string {
  const { book, chapter, allChapters, section, sectionIndex, totalSections } = ctx
  const role = detectChapterRole(chapter)
  const specificInstruction = buildBardinChapterInstruction(role, section)

  const planSummary = allChapters.map((c) => `Cap. ${c.order}: ${c.title}`).join(' | ')

  const sourcesBlock = sources.length > 0
    ? sources.map((s, i) => `[FONTE ${i + 1}] ${s.citationKey}\nRef: ${s.abnt}\nTrecho: "${s.excerpt.slice(0, 600)}"`).join('\n\n')
    : 'Fontes bibliográficas disponíveis para embasamento teórico.'

  const sectionInfo = section
    ? `\nSEÇÃO: ${section.order}/${totalSections} — "${section.title}"\nCapítulo: ${chapter.order}. ${chapter.title}`
    : ''

  return `Escreva a seção abaixo para "${book.title}".

DADOS DA OBRA:
- Tipo: ${book.academicSubtype ? ACADEMIC_SUBTYPE_LABELS[book.academicSubtype] : ''} — Levantamento Bibliográfico
- Tema: ${book.theme}
- Estrutura: ${planSummary}${sectionInfo}
- Meta: ~600 palavras, parágrafos LONGOS (150+ palavras cada)

${specificInstruction}

FONTES:
${sourcesBlock}

INSTRUÇÃO FINAL: Escreva parágrafos longos e densos. ${sources.length > 0 ? 'Cite ao menos uma fonte por parágrafo.' : ''} Aproxime-se de 600 palavras. Não inclua título da seção.`
}
