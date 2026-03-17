import { useState, useMemo } from 'react'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { Layout } from '../components/Layout'
import { useEntries } from '../hooks/useEntries'
import { useEmployees } from '../hooks/useEmployees'
import { ENTRY_ROW_MASTER, LOCATIONS } from '../data/rowMaster'

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function formatDate(d) {
  const date = typeof d === 'string' ? new Date(d + 'T00:00:00') : d
  return `${WEEKDAY_NAMES[date.getDay()]}, ${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`
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
      <div className="max-w-md mx-auto">
        {/* Date bar */}
        <div
          className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between"
          onClick={() => setShowCalendar(true)}
        >
          <span className="text-lg font-medium text-gray-900">📅 {formatDate(selectedDate)}</span>
          <span className="text-gray-400 text-sm">Tap to change</span>
        </div>

        {showCalendar && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
            <div className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-4 max-h-[80vh] overflow-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Select date</h2>
                <button
                  onClick={() => setShowCalendar(false)}
                  className="text-indigo-600 font-medium"
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

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <div className="px-4 py-4 space-y-4">
            {/* Search bar */}
            <div className="sticky top-12 z-[9] bg-white pb-2 pt-1">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search category, location, employee..."
                  className="w-full pl-10 pr-10 py-3 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg"
                  >
                    ✕
                  </button>
                )}
              </div>
              {isSearching && (
                <p className="text-xs text-gray-500 mt-1 px-1">
                  {Object.values(filteredRowGroups).reduce((s, r) => s + r.length, 0)} results in{' '}
                  {Object.keys(filteredRowGroups).length} categories
                </p>
              )}
            </div>

            {Object.keys(filteredRowGroups).length === 0 && isSearching && (
              <div className="text-center text-gray-500 py-8">No matching items found</div>
            )}

            {Object.entries(filteredRowGroups).map(([header, rows]) => {
              const isOpen = isSearching || expandedHeaders[header]
              return (
                <section key={header} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleHeader(header)}
                    className="w-full px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-gray-500 text-xs transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                      >
                        ▶
                      </span>
                      <h3 className="font-semibold text-gray-900">{header}</h3>
                      <span className="text-xs text-gray-400">({rows.length})</span>
                    </div>
                    <span className="text-sm font-medium text-gray-600">
                      ₹{(headerTotals[header] || 0).toLocaleString('en-IN')}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="divide-y divide-gray-100">
                      {rows.map((row) => {
                        const key = `${row.header}|${row.location || ''}|${row.h1 || ''}`
                        const total = rowTotals[key] || 0
                        const count = rowCounts[key] || 0

                        return (
                          <div
                            key={key}
                            className="px-4 py-3 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0 flex-1">
                              {row.location && (
                                <span className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded mr-2">
                                  {row.location}
                                </span>
                              )}
                              <span className="text-gray-900">{row.h1 || row.header}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {total > 0 && (
                                <span className="text-sm text-gray-600">
                                  ₹{total.toLocaleString('en-IN')}
                                  {count > 1 && ` · ${count} entries`}
                                </span>
                              )}
                              <button
                                onClick={() => openModal(row)}
                                className="min-h-[48px] px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
                              >
                                + Add
                              </button>
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
            <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Salary — Balance</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Name</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Location</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-600">Salary</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-600">Advances</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-600">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaryAdvance.map((emp) => (
                      <tr key={emp.id} className="border-b border-gray-100">
                        <td className="px-4 py-2">{emp.name}</td>
                        <td className="px-4 py-2">{emp.location}</td>
                        <td className="px-4 py-2 text-right">₹{emp.monthly_salary?.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-2 text-right">₹{emp.advances.toLocaleString('en-IN')}</td>
                        <td
                          className={`px-4 py-2 text-right font-medium ${
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
          </div>
        )}

        {/* Add entry modal */}
        {modalRow && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl p-6 max-h-[85vh] overflow-auto">
              <h3 className="text-lg font-semibold mb-4">
                {modalRow.isAdHoc
                  ? 'Advance (Ad-hoc)'
                  : [modalRow.header, modalRow.location, modalRow.h1].filter(Boolean).join(' · ')}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300"
                  />
                </div>

                {modalRow.isAdHoc && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={modalAdHocName}
                        onChange={(e) => setModalAdHocName(e.target.value)}
                        placeholder="Employee name"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                      <select
                        value={modalAdHocLocation}
                        onChange={(e) => setModalAdHocLocation(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={modalAmount}
                    onChange={(e) => setModalAmount(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 text-lg rounded-lg border border-gray-300"
                  />
                </div>

                {modalRow.requiresNote && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Note (required)</label>
                    <input
                      type="text"
                      value={modalNote}
                      onChange={(e) => setModalNote(e.target.value)}
                      placeholder="Description"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300"
                    />
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={closeModal}
                  className="flex-1 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEntry}
                  disabled={saving}
                  className="flex-1 py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div
            className={`fixed bottom-20 left-4 right-4 max-w-md mx-auto py-3 px-4 rounded-lg text-center font-medium z-50 ${
              toast.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </Layout>
  )
}
