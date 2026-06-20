import React from 'react'
import { Text, View } from '@react-pdf/renderer'

// A4 height em pontos (72 DPI). Usado para calcular posição do rodapé
// porque `bottom` com position absolute + fixed é buggy no @react-pdf.
const A4_HEIGHT = 841.89

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
 * Cabeçalho fixo que repete em TODAS as páginas geradas pelo <Page>,
 * inclusive overflow. Usa `fixed` obrigatoriamente.
 * Posição: top 28pt, entre as margens laterais.
 */
export function PageHeader({
  title,
  authorName,
  fontFamily = 'Helvetica',
  color = '#555',
}: PageHeaderProps) {
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
        alignItems: 'flex-end',
        borderBottomWidth: 0.5,
        borderBottomColor: '#ccc',
        paddingBottom: 5,
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
  fontFamily?: string
  color?: string
}

/**
 * Número de página fixo, inferior central.
 * Usa `top` calculado a partir da altura A4 porque `bottom` com
 * position absolute + fixed tem comportamento incorreto no @react-pdf
 * (renderiza no topo em vez do rodapé).
 * Usa render={({ pageNumber })} para numerar corretamente o overflow.
 */
export function PageFooter({
  fontFamily = 'Helvetica',
  color = '#555',
}: PageFooterProps) {
  // 28pt acima da borda inferior da página
  const topPos = A4_HEIGHT - 28

  return (
    <Text
      fixed
      style={{
        position: 'absolute',
        top: topPos,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontFamily,
        fontSize: 10,
        color,
      }}
      render={({ pageNumber }) => String(pageNumber)}
    />
  )
}
