'use client'
import { useState, useEffect } from 'react'
import { Input } from './input'
import { cn } from '@/lib/utils'
import { formatInputMoney, parseInputMoney } from '@/lib/utils'

interface MoneyInputProps {
  value: number | ''
  onChange: (n: number | '') => void
  placeholder?: string
  required?: boolean
  className?: string
}

export default function MoneyInput({ value, onChange, placeholder = '0', required, className }: MoneyInputProps) {
  const [display, setDisplay] = useState(value !== '' && value !== 0 ? formatInputMoney(String(value)) : '')

  useEffect(() => {
    if (value === '' || value === 0) setDisplay('')
    else setDisplay(formatInputMoney(String(value)))
  }, [value])

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground pointer-events-none">$</span>
      <Input
        type="text"
        inputMode="numeric"
        required={required}
        value={display}
        placeholder={placeholder}
        className={cn('pl-7 font-mono', className)}
        onChange={e => {
          const fmt = formatInputMoney(e.target.value)
          setDisplay(fmt)
          onChange(fmt === '' ? '' : parseInputMoney(fmt))
        }}
      />
    </div>
  )
}
