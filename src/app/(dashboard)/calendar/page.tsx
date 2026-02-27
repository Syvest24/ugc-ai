'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Calendar as CalendarIcon,
  Check,
  Clock,
  AlertCircle,
  Trash2,
  Edit3,
} from 'lucide-react'
import { PLATFORMS, PLATFORM_COLORS, PLATFORM_LABELS } from '@/lib/constants'

interface CalendarEvent {
  id: string
  title: string
  platform: string
  date: string
  time: string | null
  status: string
  notes: string | null
  color: string | null
  contentId: string | null
  content: {
    id: string
    productName: string
    platform: string
    hookBank: string[]
  } | null
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  scheduled: <Clock className="w-3 h-3" />,
  posted: <Check className="w-3 h-3" />,
  missed: <AlertCircle className="w-3 h-3" />,
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  posted: 'bg-green-500/20 text-green-400 border-green-500/30',
  missed: 'bg-red-500/20 text-red-400 border-red-500/30',
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarPage() {
  const router = useRouter()
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formPlatform, setFormPlatform] = useState('tiktok')
  const [formDate, setFormDate] = useState('')
  const [formTime, setFormTime] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formStatus, setFormStatus] = useState('scheduled')
  const [saving, setSaving] = useState(false)

  const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/calendar?month=${monthStr}`)
      const data = await res.json()
      if (data.data?.events) setEvents(data.data.events)
    } catch {
      toast.error('Failed to load calendar events')
    } finally {
      setLoading(false)
    }
  }, [monthStr])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Focus trap + Escape key for modal
  useEffect(() => {
    if (!showModal) return
    const el = modalRef.current
    if (!el) return

    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    first?.focus()

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false)
        return
      }
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [showModal])

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear(y => y - 1)
      setCurrentMonth(11)
    } else {
      setCurrentMonth(m => m - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear(y => y + 1)
      setCurrentMonth(0)
    } else {
      setCurrentMonth(m => m + 1)
    }
  }

  const goToToday = () => {
    setCurrentYear(today.getFullYear())
    setCurrentMonth(today.getMonth())
  }

  const openCreateModal = (date?: string) => {
    setEditingEvent(null)
    setFormTitle('')
    setFormPlatform('tiktok')
    setFormDate(date || `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`)
    setFormTime('')
    setFormNotes('')
    setFormStatus('scheduled')
    setShowModal(true)
  }

  const openEditModal = (event: CalendarEvent) => {
    setEditingEvent(event)
    setFormTitle(event.title)
    setFormPlatform(event.platform)
    setFormDate(event.date)
    setFormTime(event.time || '')
    setFormNotes(event.notes || '')
    setFormStatus(event.status)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formTitle.trim() || !formDate) {
      toast.error('Title and date are required')
      return
    }

    setSaving(true)
    try {
      if (editingEvent) {
        // Update
        const res = await fetch('/api/calendar', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingEvent.id,
            title: formTitle,
            platform: formPlatform,
            date: formDate,
            time: formTime || null,
            notes: formNotes || null,
            status: formStatus,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        toast.success('Event updated')
      } else {
        // Create
        const res = await fetch('/api/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formTitle,
            platform: formPlatform,
            date: formDate,
            time: formTime || null,
            notes: formNotes || null,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        toast.success('Event scheduled')
      }
      setShowModal(false)
      fetchEvents()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (eventId: string) => {
    try {
      const res = await fetch(`/api/calendar?id=${eventId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      toast.success('Event removed')
      fetchEvents()
      router.refresh()
    } catch {
      toast.error('Failed to delete event')
    }
  }

  const handleStatusToggle = async (event: CalendarEvent) => {
    const nextStatus =
      event.status === 'scheduled' ? 'posted' : event.status === 'posted' ? 'scheduled' : 'scheduled'
    try {
      await fetch('/api/calendar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: event.id, status: nextStatus }),
      })
      fetchEvents()
      router.refresh()
    } catch {
      toast.error('Failed to update status')
    }
  }

  // Build calendar grid
  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7

  const getEventsForDate = (dateStr: string) =>
    events.filter(e => e.date === dateStr)

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  // Stats
  const scheduledCount = events.filter(e => e.status === 'scheduled').length
  const postedCount = events.filter(e => e.status === 'posted').length
  const totalCount = events.length

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <CalendarIcon className="w-6 h-6 text-violet-400" />
            Content Calendar
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Plan and schedule your content across platforms
          </p>
        </div>
        <button
          onClick={() => openCreateModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Schedule Post
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{totalCount}</div>
          <div className="text-xs text-gray-400 mt-1">Total This Month</div>
        </div>
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{scheduledCount}</div>
          <div className="text-xs text-gray-400 mt-1">Scheduled</div>
        </div>
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{postedCount}</div>
          <div className="text-xs text-gray-400 mt-1">Posted</div>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-800 rounded-lg transition-colors" aria-label="Previous month">
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </button>
          <h2 className="text-xl font-semibold text-white min-w-[200px] text-center">
            {MONTHS[currentMonth]} {currentYear}
          </h2>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-800 rounded-lg transition-colors" aria-label="Next month">
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <button
          onClick={goToToday}
          className="px-3 py-1.5 text-sm text-violet-400 hover:bg-violet-600/10 rounded-lg transition-colors"
        >
          Today
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-gray-800">
          {WEEKDAYS.map(d => (
            <div key={d} className="p-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {Array.from({ length: totalCells }, (_, i) => {
            const dayNum = i - firstDay + 1
            const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth
            const dateStr = isCurrentMonth
              ? `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
              : ''
            const dayEvents = isCurrentMonth ? getEventsForDate(dateStr) : []
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDate

            return (
              <div
                key={i}
                onClick={() => {
                  if (isCurrentMonth) {
                    setSelectedDate(dateStr === selectedDate ? null : dateStr)
                  }
                }}
                className={`group min-h-[100px] border-b border-r border-gray-800/50 p-1.5 cursor-pointer transition-colors ${
                  !isCurrentMonth ? 'bg-gray-950/50' : 'hover:bg-gray-800/30'
                } ${isSelected ? 'bg-violet-600/10' : ''}`}
              >
                {isCurrentMonth && (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                          isToday
                            ? 'bg-violet-600 text-white'
                            : 'text-gray-400'
                        }`}
                      >
                        {dayNum}
                      </span>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          openCreateModal(dateStr)
                        }}
                        className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-0.5 hover:bg-gray-700 rounded transition-opacity"
                        style={{ opacity: isSelected ? 1 : undefined }}
                        aria-label="Add event"
                      >
                        <Plus className="w-3 h-3 text-gray-500" />
                      </button>
                    </div>

                    {/* Event pills */}
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map(event => (
                        <div
                          key={event.id}
                          onClick={e => {
                            e.stopPropagation()
                            openEditModal(event)
                          }}
                          className="text-[10px] px-1.5 py-0.5 rounded truncate cursor-pointer hover:brightness-125 transition-all flex items-center gap-1"
                          style={{
                            backgroundColor: `${PLATFORM_COLORS[event.platform] || '#A855F7'}20`,
                            color: PLATFORM_COLORS[event.platform] || '#A855F7',
                            borderLeft: `2px solid ${PLATFORM_COLORS[event.platform] || '#A855F7'}`,
                          }}
                        >
                          {STATUS_ICONS[event.status]}
                          <span className="truncate">{event.title}</span>
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-gray-500 pl-1">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected date detail panel */}
      {selectedDate && (
        <div className="mt-4 bg-gray-900/60 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </h3>
            <button
              onClick={() => openCreateModal(selectedDate)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          </div>

          {getEventsForDate(selectedDate).length === 0 ? (
            <p className="text-sm text-gray-500">No posts scheduled for this day</p>
          ) : (
            <div className="space-y-2">
              {getEventsForDate(selectedDate).map(event => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-3 bg-gray-800/40 rounded-lg border border-gray-700/50"
                >
                  {/* Status toggle */}
                  <button
                    onClick={() => handleStatusToggle(event)}
                    className={`w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${STATUS_COLORS[event.status]}`}
                    title={`Status: ${event.status}`}
                    aria-label={`Toggle status, currently ${event.status}`}
                  >
                    {STATUS_ICONS[event.status]}
                  </button>

                  {/* Platform badge */}
                  <span
                    className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: `${PLATFORM_COLORS[event.platform]}20`,
                      color: PLATFORM_COLORS[event.platform],
                    }}
                  >
                    {PLATFORM_LABELS[event.platform] || event.platform}
                  </span>

                  {/* Title & time */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium truncate">{event.title}</div>
                    {event.time && (
                      <div className="text-xs text-gray-500">{event.time}</div>
                    )}
                    {event.notes && (
                      <div className="text-xs text-gray-500 truncate mt-0.5">{event.notes}</div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEditModal(event)}
                      className="p-1.5 text-gray-500 hover:text-violet-400 hover:bg-violet-600/10 rounded-lg transition-colors"
                      aria-label="Edit event"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-600/10 rounded-lg transition-colors"
                      aria-label="Delete event"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-label={editingEvent ? 'Edit event' : 'Schedule post'}>
          <div ref={modalRef} className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white">
                {editingEvent ? 'Edit Event' : 'Schedule Post'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="e.g., Morning skincare routine reel"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2.5 text-sm text-gray-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              {/* Platform */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Platform</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(p => (
                    <button
                      key={p}
                      onClick={() => setFormPlatform(p)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                        formPlatform === p
                          ? 'border-transparent text-white'
                          : 'border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                      style={
                        formPlatform === p
                          ? { backgroundColor: PLATFORM_COLORS[p] }
                          : {}
                      }
                    >
                      {PLATFORM_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2.5 text-sm text-gray-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Time (optional)</label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={e => setFormTime(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2.5 text-sm text-gray-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
              </div>

              {/* Status (only when editing) */}
              {editingEvent && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                  <div className="flex gap-2">
                    {['scheduled', 'posted', 'missed'].map(s => (
                      <button
                        key={s}
                        onClick={() => setFormStatus(s)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border capitalize transition-colors ${
                          formStatus === s
                            ? STATUS_COLORS[s]
                            : 'border-gray-700 text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Notes (optional)</label>
                <textarea
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  rows={2}
                  placeholder="Content ideas, hashtags, reminders..."
                  className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2.5 text-sm text-gray-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
              >
                {saving ? 'Saving...' : editingEvent ? 'Update' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
