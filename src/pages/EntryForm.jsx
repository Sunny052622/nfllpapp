import { useState, useMemo } from 'react'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { Layout } from '../components/Layout'
import { useEntries } from '../hooks/useEntries'
import { useEmployees } from '../hooks/useEmployees'
import { ENTRY_ROW_MASTER, LOCATIONS } from '../data/rowMaster'

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDateShort(d) {
  const date = typeof d === 'string' ? new Date(d + 'T00:00:00') : d
  return `${WEEKDAY_SHORT[date.getDay()]}, ${date.getDate()} ${MONTH_SHORT[date.getMonth()]}`
}

function formatDateISO(d) {
  return typeof d === 'string' ? d : d.toISOString().slice(0, 10)
}

function groupByHeader(rows) {
  const groups = {}
  for (const row of rows) {
    const h = row.header
    if (!groups[h]) groups[h] = []
    groups[h].push(row)
  }
  return groups
}

export function EntryForm() {
  const [selectedDate, setSelectedDate] = useState(() => formatDateISO(new Date()))
  const [showCalendar, setShowCalendar] = useState(false)
  const [modalRow, setModalRow] = useState(null)
  const [modalAmount, setModalAmount] = useState('')
  const [modalNote, setModalNote] = useState('')
  const [modalAdHocName, setModalAdHocName] = useState('')
  const [modalAdHocLocation, setModalAdHocLocation] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [expandedHeaders, setExpandedHeaders] = useState({})
  const [searchQuery, setSearchQuery] = useState('')

  const { entries, loading, error: entriesError, addEntry, refetch } = useEntries({ date: selectedDate })
  const { employees, error: employeesError } = useEmployees()

  const entriesByRow = useMemo(() => {
    const map = {}
    for (const e of entries) {
      const key = `${e.header}|${e.location || ''}|${e.h1 || ''}`
      if (!map[key]) map[key] = []
      map[key].push(e)
    }
    return map
  }, [entries])

  const rowTotals = useMemo(() => {
    const map = {}
    for (const e of entries) {
      const key = `${e.header}|${e.location || ''}|${e.h1 || ''}`
      map[key] = (map[key] || 0) + Number(e.amount)
    }
    return map
  }, [entries])

  const rowCounts = useMemo(() => {
    const map = {}
    for (const e of entries) {
      const key = `${e.header}|${e.location || ''}|${e.h1 || ''}`
      map[key] = (map[key] || 0) + 1
    }
    return map
  }, [entries])

  const headerTotals = useMemo(() => {
    const map = {}
    for (const e of entries) {
      map[e.header] = (map[e.header] || 0) + Number(e.amount)
    }
    return map
  }, [entries])

  const openModal = (row) => {
    setModalRow(row)
    setModalAmount(row.salary ? String(row.salary) : '')
    setModalNote('')
    setModalAdHocName('')
    setModalAdHocLocation(LOCATIONS[0] || '')
  }

  const closeModal = () => {
    setModalRow(null)
    setModalAmount('')
    setModalNote('')
    setModalAdHocName('')
    setModalAdHocLocation('')
  }

  const handleSaveEntry = async () => {
    if (!modalRow) return
    if (modalRow.requiresNote && !modalNote.trim()) {
      setToast({ type: 'error', message: 'Note is required for Repairs' })
      return
    }
    const amount = parseFloat(modalAmount)
    if (isNaN(amount) || amount <= 0) {
      setToast({ type: 'error', message: 'Enter a valid amount' })
      return
    }

    setSaving(true)

    let location = modalRow.location
    let h1 = modalRow.h1
    let employeeId = null

    if (modalRow.isAdHoc) {
      location = modalAdHocLocation
      h1 = modalAdHocName
      if (!location || !h1.trim()) {
        setToast({ type: 'error', message: 'Name and Location required' })
        setSaving(false)
        return
      }
    } else if (modalRow.employeeName) {
      const emp = employees.find((e) => e.name === modalRow.employeeName)
      employeeId = emp?.id ?? null
    }

    const { error } = await addEntry({
      entry_date: selectedDate,
      header: modalRow.header,
      location: location || '',
      h1: h1 || null,
      amount,
      note: modalNote.trim() || null,
      employee_id: employeeId,
    })

    setSaving(false)
    if (error) {
      setToast({ type: 'error', message: error })
    } else {
      closeModal()
      setToast({ type: 'success', message: 'Entry saved' })
      setTimeout(() => setToast(null), 2000)
    }
  }

  const rowGroups = useMemo(() => groupByHeader(ENTRY_ROW_MASTER), [])

  const filteredRowGroups = useMemo(() => {
    if (!searchQuery.trim()) return rowGroups
    const q = searchQuery.toLowerCase()
    const filtered = {}
    for (const [header, rows] of Object.entries(rowGroups)) {
      const matchingRows = rows.filter((row) => {
        const searchable = [row.header, row.location, row.h1, row.employeeName]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return searchable.includes(q)
      })
      if (matchingRows.length > 0) filtered[header] = matchingRows
    }
    return filtered
  }, [rowGroups, searchQuery])

  const toggleHeader = (header) => {
    setExpandedHeaders((prev) => ({ ...prev, [header]: !prev[header] }))
  }

  const isSearching = searchQuery.trim().length > 0

  const salaryAdvance = useMemo(() => {
    const year = new Date(selectedDate).getFullYear()
    const month = new Date(selectedDate).getMonth()
    const monthStart = new Date(year, month, 1).toISOString().slice(0, 10)
    const monthEnd = new Date(year, month + 1, 0).toISOString().slice(0, 10)

    return employees.map((emp) => {
      const advances = entries
        .filter(
          (e) =>
            e.header === 'Advance' &&
            Number(e.employee_id) === Number(emp.id) &&
            e.entry_date >= monthStart &&
            e.entry_date <= monthEnd
        )
        .reduce((s, e) => s + Number(e.amount), 0)
      return {
        ...emp,
        advances,
        balance: emp.monthly_salary - advances,
      }
    })
  }, [employees, entries, selectedDate])

  return (
    <Layout>
      {/* Sticky date + search bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-3 py-2">
          <button
            onClick={() => setShowCalendar(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-800 active:bg-gray-100 rounded-lg px-2 py-1.5 -ml-2"
          >
            <span>📅</span>
            <span>{formatDateShort(selectedDate)}</span>
            <span className="text-gray-400 text-xs ml-1">▼</span>
          </button>
          <div className="text-xs text-gray-500">
            Total: ₹{Object.values(headerTotals).reduce((s, v) => s + v, 0).toLocaleString('en-IN')}
          </div>
        </div>
        <div className="px-3 pb-2">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-8 pr-8 py-2 rounded-lg bg-gray-100 border-0 text-sm placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 active:text-gray-600 w-5 h-5 flex items-center justify-center"
              >
                ✕
              </button>
            )}
          </div>
          {isSearching && (
            <p className="text-[10px] text-gray-400 mt-1 px-1">
              {Object.values(filteredRowGroups).reduce((s, r) => s + r.length, 0)} results
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-gray-400 text-sm">Loading...</div>
        </div>
      ) : (
        <div className="px-3 py-3 space-y-2">
          {Object.keys(filteredRowGroups).length === 0 && isSearching && (
            <div className="text-center text-gray-400 py-12 text-sm">No matching items</div>
          )}

          {Object.entries(filteredRowGroups).map(([header, rows]) => {
            const isOpen = isSearching || expandedHeaders[header]
            const total = headerTotals[header] || 0
            return (
              <section key={header} className="bg-white rounded-xl overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => toggleHeader(header)}
                  className="w-full px-3 py-2.5 flex justify-between items-center active:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] text-gray-400 transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`}
                    >
                      ▶
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{header}</span>
                    <span className="text-[10px] text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">
                      {rows.length}
                    </span>
                  </div>
                  {total > 0 ? (
                    <span className="text-xs font-medium text-indigo-600">
                      ₹{total.toLocaleString('en-IN')}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">₹0</span>
                  )}
                </button>
                {isOpen && (
                  <div className="border-t border-gray-100">
                    {rows.map((row) => {
                      const key = `${row.header}|${row.location || ''}|${row.h1 || ''}`
                      const total = rowTotals[key] || 0
                      const count = rowCounts[key] || 0

                      return (
                        <div
                          key={key}
                          className="px-3 py-2 flex items-center justify-between border-b border-gray-50 last:border-b-0 active:bg-gray-50"
                          onClick={() => openModal(row)}
                        >
                          <div className="min-w-0 flex-1 flex items-center gap-1.5">
                            {row.location && (
                              <span className="shrink-0 text-[10px] font-medium text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
                                {row.location}
                              </span>
                            )}
                            <span className="text-sm text-gray-800 truncate">{row.h1 || row.header}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {total > 0 && (
                              <span className="text-xs text-gray-500">
                                ₹{total.toLocaleString('en-IN')}
                                {count > 1 && <span className="text-gray-400"> ({count})</span>}
                              </span>
                            )}
                            <span className="w-7 h-7 flex items-center justify-center rounded-full bg-indigo-600 text-white text-sm font-bold">
                              +
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })}

          {/* Salary section (read-only) */}
          <section className="bg-white rounded-xl overflow-hidden shadow-sm">
            <div className="px-3 py-2.5">
              <span className="text-sm font-semibold text-gray-900">Salary — Balance</span>
            </div>
            <div className="overflow-x-auto border-t border-gray-100">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-2 font-medium text-gray-500">Name</th>
                    <th className="text-left px-2 py-2 font-medium text-gray-500">Loc</th>
                    <th className="text-right px-2 py-2 font-medium text-gray-500">Salary</th>
                    <th className="text-right px-2 py-2 font-medium text-gray-500">Adv</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-500">Bal</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryAdvance.map((emp) => (
                    <tr key={emp.id} className="border-t border-gray-50">
                      <td className="px-3 py-2 font-medium">{emp.name}</td>
                      <td className="px-2 py-2 text-gray-500">{emp.location}</td>
                      <td className="px-2 py-2 text-right">₹{emp.monthly_salary?.toLocaleString('en-IN')}</td>
                      <td className="px-2 py-2 text-right">{emp.advances > 0 ? `₹${emp.advances.toLocaleString('en-IN')}` : '-'}</td>
                      <td
                        className={`px-3 py-2 text-right font-medium ${
                          emp.balance < 0 ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        ₹{emp.balance.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Bottom spacer */}
          <div className="h-4" />
        </div>
      )}

      {/* Calendar modal */}
      {showCalendar && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowCalendar(false)}>
          <div className="bg-white w-full max-w-xs rounded-2xl p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-semibold">Select date</h2>
              <button
                onClick={() => setShowCalendar(false)}
                className="text-indigo-600 font-medium text-sm"
              >
                Done
              </button>
            </div>
            <DayPicker
              mode="single"
              selected={new Date(selectedDate + 'T00:00:00')}
              onSelect={(d) => {
                if (d) setSelectedDate(formatDateISO(d))
                setShowCalendar(false)
              }}
            />
          </div>
        </div>
      )}

      {/* Add entry modal — centered */}
      {modalRow && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 pt-5 pb-3">
              <h3 className="text-base font-semibold text-gray-900">
                {modalRow.isAdHoc
                  ? 'Advance (Ad-hoc)'
                  : [modalRow.header, modalRow.location, modalRow.h1].filter(Boolean).join(' · ')}
              </h3>
            </div>

            <div className="px-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-50"
                />
              </div>

              {modalRow.isAdHoc && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                    <input
                      type="text"
                      value={modalAdHocName}
                      onChange={(e) => setModalAdHocName(e.target.value)}
                      placeholder="Employee name"
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
                    <select
                      value={modalAdHocLocation}
                      onChange={(e) => setModalAdHocLocation(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white"
                    >
                      {LOCATIONS.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={modalAmount}
                  onChange={(e) => setModalAmount(e.target.value)}
                  placeholder="0"
                  autoFocus
                  className="w-full px-3 py-3 text-xl font-semibold rounded-lg border border-gray-200 text-center"
                />
              </div>

              {modalRow.requiresNote && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Note (required)</label>
                  <input
                    type="text"
                    value={modalNote}
                    onChange={(e) => setModalNote(e.target.value)}
                    placeholder="Description"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm"
                  />
                </div>
              )}
            </div>

            <div className="p-5 flex gap-2">
              <button
                onClick={closeModal}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium active:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEntry}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium active:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-16 left-3 right-3 py-2.5 px-4 rounded-xl text-center text-sm font-medium z-50 shadow-lg ${
            toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}
    </Layout>
  )
}
