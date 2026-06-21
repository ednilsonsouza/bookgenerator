import type { BookProject } from '@/types/book'
import { ACADEMIC_SUBTYPE_LABELS, LITERARY_GENRE_LABELS } from '@/types/book'

function wordsPerPage(type: BookProject['type']): number {
  return type === 'academic' ? 450 : 380
}

function wordsPerParagraph(): number {
  return 150  // parágrafos longos (~150 palavras cada)
}

function wordsPerSection(book: BookProject): number {
  return book.paragraphsPerSection * wordsPerParagraph()
}

export function buildPlanSystemPrompt(book: BookProject): string {
  const isAcademic = book.type === 'academic'

  const jsonFormat = `Responda APENAS com JSON válido neste formato exato:
{"chapters":[{"order":1,"title":"Título","description":"Descrição do capítulo.","targetPages":N,"targetWords":N,"sections":[{"order":1,"title":"Título da seção"},{"order":2,"title":"Título da seção"}]}]}`

  return isAcademic
    ? `Você é um especialista em metodologia científica e redação acadêmica.
Sua tarefa é criar um plano de escrita para uma obra acadêmica do tipo LEVANTAMENTO BIBLIOGRÁFICO em português brasileiro.
A metodologia é baseada na Análise de Conteúdo de Laurence Bardin.
O plano deve conter EXATAMENTE ${book.chapterCount} capítulos, cada um com EXATAMENTE ${book.sectionsPerChapter} seções.
Cada capítulo deve ter objetivo claro. Cada seção deve ter um título descritivo.
${jsonFormat}`
    : `Você é um escritor profissional especialista em obras literárias.
Sua tarefa é criar um plano de escrita para uma obra literária em português brasileiro.
O plano deve conter EXATAMENTE ${book.chapterCount} capítulos, cada um com EXATAMENTE ${book.sectionsPerChapter} seções.
Cada capítulo deve ter arco narrativo. Cada seção deve ter um título criativo.
${jsonFormat}`
}

export function buildPlanUserPrompt(book: BookProject): string {
  const isAcademic = book.type === 'academic'
  const wpg = wordsPerPage(book.type)
  const wps = wordsPerSection(book)
  const wpp = wordsPerParagraph()
  const totalSections = book.chapterCount * book.sectionsPerChapter
  const totalParagraphs = totalSections * book.paragraphsPerSection
  const totalWords = totalParagraphs * wpp
  const totalPages = Math.max(1, Math.round(totalWords / wpg))

  const subtypeLabel =
    isAcademic && book.academicSubtype
      ? ACADEMIC_SUBTYPE_LABELS[book.academicSubtype]
      : book.literaryGenre
      ? LITERARY_GENRE_LABELS[book.literaryGenre]
      : ''

  const structureHint = isAcademic
    ? buildAcademicStructureHint(book)
    : buildLiteraryStructureHint(book)

  return `Crie o plano de escrita para a seguinte obra:

TÍTULO: ${book.title}
TEMA: ${book.theme}
TIPO: ${isAcademic ? 'Acadêmica' : 'Literária'} — ${subtypeLabel}
DESCRIÇÃO: ${book.description}
CAPÍTULOS: ${book.chapterCount}
SEÇÕES POR CAPÍTULO: ${book.sectionsPerChapter}
PARÁGRAFOS POR SEÇÃO: ${book.paragraphsPerSection}
TOTAL DE SEÇÕES: ${totalSections}
TOTAL DE PARÁGRAFOS: ${totalParagraphs.toLocaleString('pt-BR')}
TOTAL DE PALAVRAS ESTIMADO: ${totalWords.toLocaleString('pt-BR')} 
PÁGINAS ESTIMADAS: ${totalPages}

${structureHint}

INSTRUÇÕES:
- Use EXATAMENTE: order, title, description, targetPages, targetWords, sections (em inglês).
- Gere EXATAMENTE ${book.chapterCount} capítulos, cada um com EXATAMENTE ${book.sectionsPerChapter} seções.
- Cada section deve ter order e title (títulos em português, descritivos).
- targetPages de cada capítulo = (${book.sectionsPerChapter} × ${book.paragraphsPerSection} × ${wpp}) / ${wpg} ≈ ${Math.round((book.sectionsPerChapter * book.paragraphsPerSection * wpp) / wpg)} páginas.
- targetWords de cada capítulo = ${book.sectionsPerChapter} × ${book.paragraphsPerSection} × ${wpp} = ${book.sectionsPerChapter * book.paragraphsPerSection * wpp}.
- Retorne SOMENTE o JSON, sem texto antes ou depois.`
}

function buildAcademicStructureHint(book: BookProject): string {
  const chapterCount = book.chapterCount
  const sectionsPerChapter = book.sectionsPerChapter

  if (chapterCount === 3) {
    return `ESTRUTURA PARA ${chapterCount} CAPÍTULOS COM ${sectionsPerChapter} SEÇÕES CADA:
Cap. 1 – Introdução: contextualização, problema, justificativa, objetivos, estrutura da obra.
Cap. 2 – Referencial Teórico + Metodologia: fundamentação teórica + levantamento bibliográfico + Análise de Conteúdo de Bardin (pré-análise, exploração do material, categorização).
Cap. 3 – Análise e Discussão + Considerações Finais: resultados por categoria, unidades de contexto, conclusões.`
  }

  if (chapterCount === 4) {
    return `ESTRUTURA PARA ${chapterCount} CAPÍTULOS COM ${sectionsPerChapter} SEÇÕES CADA:
Cap. 1 – Introdução: contextualização, problema, justificativa, objetivos.
Cap. 2 – Referencial Teórico: fundamentação, conceitos, autores, estudos.
Cap. 3 – Metodologia: levantamento bibliográfico + Análise de Conteúdo de Bardin (pré-análise, exploração, categorização).
Cap. 4 – Análise e Discussão + Considerações Finais: resultados por categoria, conclusões.`
  }

  return `ESTRUTURA PARA ${chapterCount} CAPÍTULOS COM ${sectionsPerChapter} SEÇÕES CADA:
Distribua: Introdução, Referencial Teórico (pode ser 1 ou 2 capítulos), Metodologia (Bardin), Análise por Categorias, Considerações Finais.
Cada capítulo deve ter EXATAMENTE ${sectionsPerChapter} seções.`
}

function buildLiteraryStructureHint(book: BookProject): string {
  const chapterCount = book.chapterCount
  const sectionsPerChapter = book.sectionsPerChapter

  return `ESTRUTURA NARRATIVA PARA ${chapterCount} CAPÍTULOS COM ${sectionsPerChapter} SEÇÕES CADA:
Distribua a narrativa em apresentação (~25%), desenvolvimento e conflito (~50%), clímax e resolução (~25%).
Cada capítulo deve ter EXATAMENTE ${sectionsPerChapter} seções com títulos criativos que guiem a leitura.`
}
