import React from 'react'
import { Text, View } from '@react-pdf/renderer'

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

interface PageHeaderProps {
  title: string
  authorName: string
  fontFamily?: string
  color?: string
}

/**
 * Cabeçalho fixo: aparece em TODAS as páginas do Page que o contém,
 * inclusive nas páginas de overflow geradas automaticamente pelo @react-pdf.
 * O prop `fixed` é obrigatório para isso funcionar.
 */
export function PageHeader({ title, authorName, fontFamily = 'Helvetica', color = '#555' }: PageHeaderProps) {
  return (
    <View
      fixed
      style={{
        position: 'absolute',
        top: 28,
        left: 57,
        right: 57,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 0.5,
        borderBottomColor: '#ccc',
        paddingBottom: 6,
      }}
    >
      <Text style={{ fontFamily, fontSize: 9, color, flex: 1, paddingRight: 12 }}>
        {truncate(title, 55)}
      </Text>
      <Text style={{ fontFamily, fontSize: 9, color, maxWidth: 180, textAlign: 'right' }}>
        {truncate(authorName, 35)}
      </Text>
    </View>
  )
}

interface PageFooterProps {
  /** Número fixo quando quiser sobrescrever (ex: capa = 1). Se omitido, usa pageNumber automático. */
  pageNum?: number | string
  fontFamily?: string
  color?: string
}

/**
 * Rodapé fixo com número de página centralizado.
 * Usa render={({ pageNumber })} do @react-pdf para numerar automaticamente
 * as páginas de overflow.
 */
export function PageFooter({ pageNum, fontFamily = 'Helvetica', color = '#555' }: PageFooterProps) {
  const baseStyle = {
    position: 'absolute' as const,
    bottom: 28,
    left: 0,
    right: 0,
    textAlign: 'center' as const,
    fontFamily,
    fontSize: 10,
    color,
  }

  if (pageNum !== undefined) {
    // Número fixo explícito (para quando sabemos o número exato)
    return (
      <Text fixed style={baseStyle}>
        {pageNum}
      </Text>
    )
  }

  // Número automático via render prop — funciona em páginas de overflow também
  return (
    <Text
      fixed
      style={baseStyle}
      render={({ pageNumber }) => String(pageNumber)}
    />
  )
}
