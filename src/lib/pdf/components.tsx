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

export function PageHeader({ title, authorName, fontFamily = 'Helvetica', color = '#555' }: PageHeaderProps) {
  return (
    <View
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
  pageNum: number | string
  fontFamily?: string
  color?: string
}

export function PageFooter({ pageNum, fontFamily = 'Helvetica', color = '#555' }: PageFooterProps) {
  return (
    <Text
      style={{
        position: 'absolute',
        bottom: 28,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontFamily,
        fontSize: 10,
        color,
      }}
    >
      {pageNum}
    </Text>
  )
}
