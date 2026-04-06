/**
 * Status Badge component
 */
import React from 'react'
import clsx from 'clsx'
import { BoardStatus } from '@/src/types'

interface BadgeProps {
  status?: BoardStatus | string
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  children?: React.ReactNode
  className?: string
}

const statusVariantMap: Record<string, BadgeProps['variant']> = {
  draft: 'warning',
  active: 'primary',
  sent: 'success',
  DRAFT: 'warning',
  ACTIVE: 'primary',
  SENT: 'success',
}

const statusLabelMap: Record<string, string> = {
  draft: 'Draft',
  active: 'Active',
  sent: 'Sent',
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  SENT: 'Sent',
}

export const Badge = ({
  status,
  variant,
  children,
  className,
}: BadgeProps) => {
  const resolvedVariant = (status ? statusVariantMap[status] : undefined) ?? variant ?? 'default'

  const variantStyles = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
  }

  return (
    <span
      className={clsx(
        'badge',
        variantStyles[resolvedVariant],
        className
      )}
    >
      {children ?? (status ? (statusLabelMap[status] ?? status) : null)}
    </span>
  )
}
