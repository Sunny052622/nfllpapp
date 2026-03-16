import { useState, useMemo } from 'react'
import { Layout } from '../components/Layout'
import { useEmployees } from '../hooks/useEmployees'
import { useLeaves } from '../hooks/useLeaves'

function diffDays(start, end) {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  return Math.max(1, Math.round((e - s) / 86400000) + 1)
}

export function Leaves() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  const { employees } = useEmployees()
  const { leaves, loading, addLeave, deleteLeave } = useLeaves(selectedMonth)

  // Modal state
  const [modalEmp, setModalEmp] = useState(null)
  const [leaveType, setLeaveType] = useState('SL')
  const [mode, setMode] = useState('single') // 'single' or 'range'
  const [singleDate, setSingleDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [manualDays, setManualDays] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // Detail view
  const [detailEmp, setDetailEmp] = useState(null)

  const monthOptions = useMemo(() => {
    const options = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
      options.push({ value: val, label })
    }
    return options
  }, [])

  // Aggregate leaves per employee
  const leaveSummary = useMemo(() => {
    const map = {}
    for (const emp of employees) {
      map[emp.id] = { sl: 0, ml: 0 }
    }
    for (const l of leaves) {
      if (!map[l.employee_id]) continue
      const days = l.days || 1
      if (l.leave_type === 'SL') map[l.employee_id].sl += days
      else if (l.leave_type === 'ML') map[l.employee_id].ml += days
    }
    return map
  }, [employees, leaves])

  const sortedEmployees = useMemo(() => {
    return [...employees].sort(
      (a, b) => (a.location || '').localeCompare(b.location || '') || (a.name || '').localeCompare(b.name || '')
    )
  }, [employees])

  // Leaves for detail view
  const detailLeaves = useMemo(() => {
    if (!detailEmp) return []
    return leaves.filter((l) => l.employee_id === detailEmp.id)
  }, [leaves, detailEmp])

  const openModal = (emp) => {
    setModalEmp(emp)
    setLeaveType('SL')
    setMode('single')
    setSingleDate(new Date().toISOString().slice(0, 10))
    setRangeStart('')
    setRangeEnd('')
    setManualDays('')
    setNote('')
  }

  const closeModal = () => setModalEmp(null)

  const computedDays = useMemo(() => {
    if (mode === 'single') return 1
    if (rangeStart && rangeEnd) return diffDays(rangeStart, rangeEnd)
    return 0
  }, [mode, rangeStart, rangeEnd])

  const finalDays = manualDays ? parseInt(manualDays, 10) : computedDays

  const handleSave = async () => {
    if (!modalEmp) return
    if (mode === 'range' && (!rangeStart || !rangeEnd)) {
      setToast({ type: 'error', message: 'Select start and end dates' })
      return
    }
    if (finalDays <= 0) {
      setToast({ type: 'error', message: 'Days must be at least 1' })
      return
    }

    setSaving(true)
    const startDate = mode === 'single' ? singleDate : rangeStart
    const endDate = mode === 'single' ? singleDate : rangeEnd

    const { error } = await addLeave({
      employee_id: modalEmp.id,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      days: finalDays,
      note: note.trim() || null,
    })

    setSaving(false)
    if (error) {
      setToast({ type: 'error', message: error })
    } else {
      closeModal()
      setToast({ type: 'success', message: 'Leave recorded' })
      setTimeout(() => setToast(null), 2000)
    }
  }

  const handleDelete = async (id) => {
    await deleteLeave(id)
    setDeleteConfirm(null)
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Month selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full max-w-xs px-4 py-2 rounded-lg border border-gray-300"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Employee</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Location</th>
                    <th className="text-center px-3 py-3 font-medium text-gray-600">SL</th>
                    <th className="text-center px-3 py-3 font-medium text-gray-600">ML</th>
                    <th className="text-center px-3 py-3 font-medium text-gray-600">Total</th>
                    <th className="px-3 py-3 w-20" />
                  </tr>
                </thead>
                <tbody>
                  {sortedEmployees.map((emp) => {
                    const summary = leaveSummary[emp.id] || { sl: 0, ml: 0 }
                    const total = summary.sl + summary.ml
                    return (
                      <tr
                        key={emp.id}
                        className="border-b border-gray-100 cursor-pointer hover:bg-gray-50"
                        onClick={() => setDetailEmp(emp)}
                      >
                        <td className="px-4 py-3 font-medium">{emp.name}</td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                            {emp.location}
                          </span>
                        </td>
                        <td className="text-center px-3 py-3">
                          {summary.sl > 0 ? (
                            <span className="inline-block px-2 py-0.5 text-xs font-bold bg-orange-100 text-orange-700 rounded-full">
                              {summary.sl}
                            </span>
                          ) : (
                            <span className="text-gray-300">0</span>
                          )}
                        </td>
                        <td className="text-center px-3 py-3">
                          {summary.ml > 0 ? (
                            <span className="inline-block px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700 rounded-full">
                              {summary.ml}
                            </span>
                          ) : (
                            <span className="text-gray-300">0</span>
                          )}
                        </td>
                        <td className="text-center px-3 py-3 font-medium">
                          {total > 0 ? total : <span className="text-gray-300">0</span>}
                        </td>
                        <td className="px-3 py-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); openModal(emp) }}
                            className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 min-h-[36px]"
                          >
                            + Add
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detail modal — shows leave records for one employee */}
        {detailEmp && !modalEmp && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
            <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 max-h-[80vh] overflow-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">{detailEmp.name} — Leaves</h3>
                <button onClick={() => setDetailEmp(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
              </div>
              {detailLeaves.length === 0 ? (
                <p className="text-gray-500 text-sm">No leaves recorded this month.</p>
              ) : (
                <div className="space-y-2">
                  {detailLeaves.map((l) => (
                    <div key={l.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-full mr-2 ${
                          l.leave_type === 'SL' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {l.leave_type}
                        </span>
                        <span className="text-sm text-gray-700">
                          {l.start_date === l.end_date
                            ? l.start_date
                            : `${l.start_date} → ${l.end_date}`}
                        </span>
                        <span className="text-sm text-gray-500 ml-2">({l.days}d)</span>
                        {l.note && <p className="text-xs text-gray-400 mt-1">{l.note}</p>}
                      </div>
                      <button
                        onClick={() => setDeleteConfirm(l.id)}
                        className="text-red-500 hover:text-red-700 text-xs ml-2"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => { openModal(detailEmp); }}
                className="mt-4 w-full py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700"
              >
                + Add Leave
              </button>
            </div>
          </div>
        )}

        {/* Add Leave Modal */}
        {modalEmp && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
            <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-auto">
              <h3 className="text-lg font-semibold mb-4">
                Record Leave — {modalEmp.name}
              </h3>

              <div className="space-y-4">
                {/* Leave type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type</label>
                  <div className="flex gap-2">
                    {['SL', 'ML'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setLeaveType(t)}
                        className={`flex-1 py-2.5 rounded-lg font-medium text-sm ${
                          leaveType === t
                            ? t === 'SL'
                              ? 'bg-orange-100 text-orange-700 border-2 border-orange-300'
                              : 'bg-red-100 text-red-700 border-2 border-red-300'
                            : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                        }`}
                      >
                        {t === 'SL' ? 'Sick Leave (SL)' : 'Medical Leave (ML)'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mode toggle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMode('single')}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                        mode === 'single' ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300' : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                      }`}
                    >
                      Single Day
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('range')}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                        mode === 'range' ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300' : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                      }`}
                    >
                      Date Range
                    </button>
                  </div>
                </div>

                {/* Date inputs */}
                {mode === 'single' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={singleDate}
                      onChange={(e) => setSingleDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300"
                    />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={rangeStart}
                          onChange={(e) => { setRangeStart(e.target.value); setManualDays('') }}
                          className="w-full px-3 py-3 rounded-lg border border-gray-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                          type="date"
                          value={rangeEnd}
                          onChange={(e) => { setRangeEnd(e.target.value); setManualDays('') }}
                          className="w-full px-3 py-3 rounded-lg border border-gray-300"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Days <span className="text-gray-400 font-normal">(auto: {computedDays}, edit to override)</span>
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={manualDays}
                        onChange={(e) => setManualDays(e.target.value)}
                        placeholder={String(computedDays)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300"
                      />
                    </div>
                  </>
                )}

                {/* Note */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Reason or details"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => { closeModal() }}
                  className="flex-1 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Leave'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirmation */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full">
              <h3 className="font-semibold mb-2">Delete leave record?</h3>
              <p className="text-gray-600 text-sm mb-4">This cannot be undone.</p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 border rounded-lg">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className={`fixed bottom-20 left-4 right-4 max-w-md mx-auto py-3 px-4 rounded-lg text-center font-medium z-50 ${
            toast.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
          }`}>
            {toast.message}
          </div>
        )}
      </div>
    </Layout>
  )
}
