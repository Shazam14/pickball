'use client'

import dynamic from 'next/dynamic'

const FlowCanvas = dynamic(() => import('./FlowCanvas'), { ssr: false })

export default function FlowPage() {
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <FlowCanvas />
    </div>
  )
}
