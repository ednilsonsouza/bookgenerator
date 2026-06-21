import React from 'react'
import { View, Text } from '@react-pdf/renderer'
import type { TableData } from './tableParser'

interface TableBlockProps {
  data: TableData
  fontFamily?: string
}

/**
 * Renderiza um quadro no PDF usando @react-pdf.
 * Layout:
 *  - Título acima (negrito, centralizado)
 *  - Grade com cabeçalho sombreado e linhas zebradas
 *  - Fonte abaixo (itálico, alinhado à esquerda)
 */
export function TableBlock({ data, fontFamily = 'Helvetica' }: TableBlockProps) {
  const boldFamily  = fontFamily === 'Times-Roman' ? 'Times-Bold' : 'Helvetica-Bold'
  const italicFamily = fontFamily === 'Times-Roman' ? 'Times-Italic' : 'Helvetica-Oblique'

  const colCount  = Math.max(data.headers.length, ...data.rows.map((r) => r.length))
  const colWidth  = `${(100 / colCount).toFixed(2)}%`

  return (
    <View style={{ marginVertical: 14, width: '100%' }}>
      {/* Título do quadro — usa numeração global se disponível */}
      <Text
        style={{
          fontFamily: boldFamily,
          fontSize: 10,
          textAlign: 'center',
          marginBottom: 4,
          color: '#111',
        }}
      >
        {data.numberedTitle ?? data.title}
      </Text>

      {/* Tabela */}
      <View style={{ borderWidth: 1, borderColor: '#333', width: '100%' }}>
        {/* Cabeçalho */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#d0d7de',
          }}
        >
          {data.headers.map((h, ci) => (
            <View
              key={ci}
              style={{
                width: colWidth,
                borderRightWidth: ci < data.headers.length - 1 ? 1 : 0,
                borderRightColor: '#333',
                padding: 5,
              }}
            >
              <Text style={{ fontFamily: boldFamily, fontSize: 9, color: '#111', textAlign: 'center' }}>
                {h}
              </Text>
            </View>
          ))}
        </View>

        {/* Linhas de dados */}
        {data.rows.map((row, ri) => (
          <View
            key={ri}
            style={{
              flexDirection: 'row',
              backgroundColor: ri % 2 === 0 ? '#ffffff' : '#f5f5f5',
              borderTopWidth: 1,
              borderTopColor: '#ccc',
            }}
          >
            {Array.from({ length: colCount }, (_, ci) => (
              <View
                key={ci}
                style={{
                  width: colWidth,
                  borderRightWidth: ci < colCount - 1 ? 1 : 0,
                  borderRightColor: '#ccc',
                  padding: 5,
                }}
              >
                <Text style={{ fontFamily, fontSize: 9, color: '#111' }}>
                  {row[ci] ?? ''}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>

      {/* Fonte */}
      <Text
        style={{
          fontFamily: italicFamily,
          fontSize: 8,
          color: '#444',
          marginTop: 3,
          textAlign: 'left',
        }}
      >
        {data.source}
      </Text>
    </View>
  )
}
