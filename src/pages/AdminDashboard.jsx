import { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { Layout } from '../components/Layout'
import { useEntries } from '../hooks/useEntries'
import { useEmployees } from '../hooks/useEmployees'
import { USERS } from '../data/users'
import { LOCATIONS } from '../data/rowMaster'

const HEADERS = [
  'Transport',
  'Cylinder',
  'Electricity',
  'Repairs',
  'Advance',
  'Salary',
  'Milk',
  'Health and Medicine',
  'Stationery [Prints and Pins]',
  'Tickets',
  'Wastage',
  'Staff Benefits [Chappal etc.]',
  'BMC/Cleaners',
]

const DATE_PRESETS = [
  { label: 'This Week', getRange: () => {
    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - now.getDay())
    return { startDate: start.toISOString().slice(0, 10), endDate: now.toISOString().slice(0, 10) }
  }},
  { label: 'This Month', getRange: () => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return { startDate: start.toISOString().slice(0, 10), endDate: now.toISOString().slice(0, 10) }
  }},
  { label: 'Last Month', getRange: () => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 0)
    return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) }
  }},
  { label: 'Last 3 Months', getRange: () => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    return { startDate: start.toISOString().slice(0, 10), endDate: now.toISOString().slice(0, 10) }
  }},
]

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#84cc16', '#f97316']

function toCSV(rows, columns) {
  const header = columns.join(',')
  const body = rows
    .map((row) =>
      columns
        .map((col) => {
          const v = row[col]
          if (v == null) return ''
          const s = String(v)
          return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
        })
        .join(',')
    )
    .join('\n')
  return header + '\n' + body
}

export function AdminDashboard() {
  const [datePreset, setDatePreset] = useState(1)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [headerFilter, setHeaderFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [enteredByFilter, setEnteredByFilter] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [salaryMonth, setSalaryMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [tablePage, setTablePage] = useState(0)
  const [tableSort, setTableSort] = useState({ col: 'entry_date', dir: 'desc' })
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const { employees } = useEmployees()

  const dateRange = useMemo(() => {
    if (datePreset === 4 && customStart && customEnd) {
      return { startDate: customStart, endDate: customEnd }
    }
    return DATE_PRESETS[datePreset]?.getRange() ?? { startDate: '', endDate: '' }
  }, [datePreset, customStart, customEnd])

  const { entries, deleteEntry, refetch } = useEntries({
    ...dateRange,
    header: headerFilter || undefined,
    location: locationFilter || undefined,
    enteredBy: enteredByFilter || undefined,
  })

  const filteredEntries = useMemo(() => {
    let list = [...entries]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (e) =>
          (e.header || '').toLowerCase().includes(q) ||
          (e.location || '').toLowerCase().includes(q) ||
          (e.h1 || '').toLowerCase().includes(q) ||
          (e.note || '').toLowerCase().includes(q)
      )
    }
    list.sort((a, b) => {
      const av = a[tableSort.col]
      const bv = b[tableSort.col]
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return tableSort.dir === 'asc' ? cmp : -cmp
    })
    return list
  }, [entries, searchQuery, tableSort])

  const paginatedEntries = useMemo(() => {
    const start = tablePage * 20
    return filteredEntries.slice(start, start + 20)
  }, [filteredEntries, tablePage])

  const totalPages = Math.ceil(filteredEntries.length / 20)

  const kpis = useMemo(() => {
    const total = entries.reduce((s, e) => s + Number(e.amount), 0)
    const transport = entries
      .filter((e) => e.header === 'Transport')
      .reduce((s, e) => s + Number(e.amount), 0)
    const salaryAdvance = entries
      .filter((e) => e.header === 'Advance' || e.header === 'Salary')
      .reduce((s, e) => s + Number(e.amount), 0)
    return {
      totalSpend: total,
      transportTotal: transport,
      salaryAdvanceTotal: salaryAdvance,
      entryCount: entries.length,
    }
  }, [entries])

  const byHeader = useMemo(() => {
    const map = {}
    for (const e of entries) {
      map[e.header] = (map[e.header] || 0) + Number(e.amount)
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [entries])

  const byLocation = useMemo(() => {
    const map = {}
    for (const e of entries) {
      const loc = e.location || 'Other'
      map[loc] = (map[loc] || 0) + Number(e.amount)
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [entries])

  const dailyTrend = useMemo(() => {
    const map = {}
    for (const e of entries) {
      const d = e.entry_date
      map[d] = (map[d] || 0) + Number(e.amount)
    }
    return Object.entries(map)
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [entries])

  const pieData = useMemo(() => {
    const total = entries.reduce((s, e) => s + Number(e.amount), 0)
    if (total === 0) return []
    return byHeader.map((d) => ({ ...d, percent: ((d.value / total) * 100).toFixed(1) }))
  }, [byHeader, entries])

  const salaryData = useMemo(() => {
    const [y, m] = salaryMonth.split('-').map(Number)
    const start = new Date(y, m - 1, 1).toISOString().slice(0, 10)
    const end = new Date(y, m, 0).toISOString().slice(0, 10)

    return employees.map((emp) => {
      const advances = entries
        .filter(
          (e) =>
            e.header === 'Advance' &&
            e.employee_id === emp.id &&
            e.entry_date >= start &&
            e.entry_date <= end
        )
        .reduce((s, e) => s + Number(e.amount), 0)
      return {
        id: emp.id,
        name: emp.name,
        location: emp.location,
        salary: emp.monthly_salary,
        advances,
        balance: emp.monthly_salary - advances,
      }
    })
  }, [employees, entries, salaryMonth])

  const handleExportCSV = () => {
    const cols = ['entry_date', 'header', 'location', 'h1', 'amount', 'note', 'entered_by']
    const rows = [...filteredEntries]
    const csv = toCSV(rows, cols)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expenses-${dateRange.startDate}-${dateRange.endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDelete = async (id) => {
    const err = await deleteEntry(id)
    if (err) alert(err.error)
    setDeleteConfirm(null)
  }

  const sortBy = (col) => {
    setTableSort((prev) => ({
      col,
      dir: prev.col === col && prev.dir === 'desc' ? 'asc' : 'desc',
    }))
    setTablePage(0)
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Filter bar */}
        <div className="sticky top-12 z-10 bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date range</label>
              <select
                value={datePreset}
                onChange={(e) => setDatePreset(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300"
              >
                {DATE_PRESETS.map((p, i) => (
                  <option key={i} value={i}>
                    {p.label}
                  </option>
                ))}
                <option value={4}>Custom</option>
              </select>
              {datePreset === 4 && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="flex-1 px-2 py-1 rounded border"
                  />
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="flex-1 px-2 py-1 rounded border"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Header</label>
              <select
                value={headerFilter}
                onChange={(e) => setHeaderFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300"
              >
                <option value="">All</option>
                {HEADERS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300"
              >
                <option value="">All</option>
                {LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entered by</label>
              <select
                value={enteredByFilter}
                onChange={(e) => setEnteredByFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300"
              >
                <option value="">All</option>
                {USERS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Apply
            </button>
            <button
              onClick={() => {
                setHeaderFilter('')
                setLocationFilter('')
                setEnteredByFilter('')
                setDatePreset(1)
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'overview' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('salary')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'salary' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Salary Analysis
          </button>
        </div>

        {activeTab === 'overview' && (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg border p-4">
                <p className="text-sm text-gray-500">Total Spend</p>
                <p className="text-xl font-bold">₹{kpis.totalSpend.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-white rounded-lg border p-4">
                <p className="text-sm text-gray-500">Transport</p>
                <p className="text-xl font-bold">₹{kpis.transportTotal.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-white rounded-lg border p-4">
                <p className="text-sm text-gray-500">Salary + Advances</p>
                <p className="text-xl font-bold">₹{kpis.salaryAdvanceTotal.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-white rounded-lg border p-4">
                <p className="text-sm text-gray-500">Entries</p>
                <p className="text-xl font-bold">{kpis.entryCount}</p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-semibold mb-4">Spend by Category</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byHeader} layout="vertical" margin={{ left: 80 }}>
                      <XAxis type="number" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
                      <Bar dataKey="value" fill="#6366f1" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-semibold mb-4">Daily Trend</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
                      <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-semibold mb-4">Spend by Location</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byLocation}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
                      <Bar dataKey="value" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-semibold mb-4">Category %</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name} ${percent}%`}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Data table */}
            <div className="bg-white rounded-lg border overflow-hidden">
              <div className="p-4 flex flex-wrap gap-2 items-center justify-between">
                <input
                  type="search"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setTablePage(0)
                  }}
                  className="px-3 py-2 rounded-lg border border-gray-300 max-w-xs"
                />
                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
                >
                  Export CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {['entry_date', 'header', 'location', 'h1', 'amount', 'note', 'entered_by'].map((col) => (
                        <th
                          key={col}
                          className="px-4 py-2 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                          onClick={() => sortBy(col)}
                        >
                          {col.replace('_', ' ')}
                          {tableSort.col === col && (tableSort.dir === 'asc' ? ' ↑' : ' ↓')}
                        </th>
                      ))}
                      <th className="px-4 py-2 w-16" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedEntries.map((e) => (
                      <tr key={e.id} className="border-b border-gray-100">
                        <td className="px-4 py-2">{e.entry_date}</td>
                        <td className="px-4 py-2">{e.header}</td>
                        <td className="px-4 py-2">{e.location}</td>
                        <td className="px-4 py-2">{e.h1 || '-'}</td>
                        <td className="px-4 py-2">₹{Number(e.amount).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-2 max-w-[120px] truncate" title={e.note}>
                          {e.note || '-'}
                        </td>
                        <td className="px-4 py-2">{e.entered_by || '-'}</td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => setDeleteConfirm(e.id)}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="p-4 flex justify-center gap-2">
                  <button
                    onClick={() => setTablePage((p) => Math.max(0, p - 1))}
                    disabled={tablePage === 0}
                    className="px-3 py-1 rounded border disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span className="py-1">
                    Page {tablePage + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() => setTablePage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={tablePage >= totalPages - 1}
                    className="px-3 py-1 rounded border disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'salary' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <input
                type="month"
                value={salaryMonth}
                onChange={(e) => setSalaryMonth(e.target.value)}
                className="px-4 py-2 rounded-lg border border-gray-300"
              />
            </div>
            <div className="bg-white rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-left font-medium">Employee</th>
                    <th className="px-4 py-3 text-left font-medium">Location</th>
                    <th className="px-4 py-3 text-right font-medium">Salary</th>
                    <th className="px-4 py-3 text-right font-medium">Advances</th>
                    <th className="px-4 py-3 text-right font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryData.map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="px-4 py-3">{row.name}</td>
                      <td className="px-4 py-3">{row.location}</td>
                      <td className="px-4 py-3 text-right">₹{row.salary?.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right">₹{row.advances.toLocaleString('en-IN')}</td>
                      <td
                        className={`px-4 py-3 text-right font-medium ${
                          row.balance < 0 ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        ₹{row.balance.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold mb-4">Salary vs Advances</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salaryData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
                    <Legend />
                    <Bar dataKey="salary" fill="#6366f1" name="Salary" />
                    <Bar dataKey="advances" fill="#f59e0b" name="Advances" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirmation */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full">
              <h3 className="font-semibold mb-2">Delete entry?</h3>
              <p className="text-gray-600 text-sm mb-4">This cannot be undone.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
